import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  KeyRound,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  createWalletClient,
  encodeFunctionData,
  getAddress,
  http,
  isAddress,
  parseEther,
  zeroAddress,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { useBalance, usePublicClient, useReadContracts } from "wagmi";
import { experimentObservationAbi } from "../abi/ExperimentObservation";
import { testnetDrainRestoreAbi } from "../abi/TestnetDrainRestore";
import {
  decodeReserveTraceEvents,
  ReserveTraceTimeline,
  type ReserveTraceEvent,
} from "../components/ReserveTraceTimeline";
import { monadTestnet } from "../config/chains";
import type { ContractAddressSet } from "../config/contracts";
import { formatDip, formatMon } from "../lib/format";
import { TxLink } from "../components/TxLink";

type Delegated7702DrainRestoreProps = {
  addresses: ContractAddressSet;
};

const AUTHORITY_STORAGE_KEY = "reserveguard:test-authority-private-key";
const LEGACY_AUTHORITY_STORAGE_KEY = "reserveguard:test-authority-private-key";
const RESERVE_FLOOR = parseEther("10");
const WITHDRAW_GAS_BUFFER = parseEther("0.05");
const WITHDRAW_KEEPALIVE = RESERVE_FLOOR + WITHDRAW_GAS_BUFFER;
const readNames = [
  "lastBeforeBalance",
  "lastDuringBalance",
  "lastAfterBalance",
  "lastBeforeDip",
  "lastDuringDip",
  "lastAfterDip",
] as const;

type RunStatus = {
  tone: "muted" | "error" | "success";
  message: string;
};

type ExecutionMode = "recorded" | "traced";

function loadAuthority(): PrivateKeyAccount | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedKey =
    window.localStorage.getItem(AUTHORITY_STORAGE_KEY) ?? window.sessionStorage.getItem(LEGACY_AUTHORITY_STORAGE_KEY);
  if (storedKey && !window.localStorage.getItem(AUTHORITY_STORAGE_KEY)) {
    window.localStorage.setItem(AUTHORITY_STORAGE_KEY, storedKey);
    window.sessionStorage.removeItem(LEGACY_AUTHORITY_STORAGE_KEY);
  }
  return storedKey ? privateKeyToAccount(storedKey as Hex) : null;
}

function shortAddress(address: Address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getFriendlyErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.toLowerCase().includes("reserve balance violation")) {
    return "Withdraw amount is too high. Leave at least 10 MON plus a little gas in the authority account.";
  }

  return message;
}

export function Delegated7702DrainRestore({ addresses }: Delegated7702DrainRestoreProps) {
  const publicClient = usePublicClient();
  const [authority, setAuthority] = useState<PrivateKeyAccount | null>(() => loadAuthority());
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("traced");
  const [drainAmount, setDrainAmount] = useState("10");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [runStatus, setRunStatus] = useState<RunStatus>({
    tone: "muted",
    message: "Create a persistent test authority, manually fund it above 10 MON, then run the 7702 drain/restore.",
  });
  const [runHash, setRunHash] = useState<Hash | null>(null);
  const [withdrawHash, setWithdrawHash] = useState<Hash | null>(null);
  const [traceReceiptHash, setTraceReceiptHash] = useState<Hash | null>(null);
  const [traceEvents, setTraceEvents] = useState<ReserveTraceEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const authorityAddress = authority?.address;
  const authorityBalance = useBalance({
    address: authorityAddress,
    query: {
      enabled: Boolean(authorityAddress),
      refetchInterval: 8_000,
    },
  });
  const reads = useReadContracts({
    contracts: authorityAddress
      ? readNames.map((functionName) => ({
          address: authorityAddress,
          abi: experimentObservationAbi,
          functionName,
        }))
      : [],
    query: {
      enabled: Boolean(authorityAddress),
    },
  });
  const values = reads.data;
  const hasCompleteResult = values?.every((item) => item.status === "success");
  const beforeBalance = hasCompleteResult ? (values?.[0].result as bigint) : null;
  const duringBalance = hasCompleteResult ? (values?.[1].result as bigint) : null;
  const afterBalance = hasCompleteResult ? (values?.[2].result as bigint) : null;
  const beforeDip = hasCompleteResult ? (values?.[3].result as boolean) : null;
  const duringDip = hasCompleteResult ? (values?.[4].result as boolean) : null;
  const afterDip = hasCompleteResult ? (values?.[5].result as boolean) : null;
  const hasReserveRoom = authorityBalance.data ? authorityBalance.data.value > RESERVE_FLOOR : false;
  const selectedImplementation =
    executionMode === "traced"
      ? addresses.testnet7702TracedDrainRestore
      : addresses.testnet7702DelegatedDrainRestore;
  const hasSelectedImplementation = isAddress(selectedImplementation) && selectedImplementation !== zeroAddress;
  const validWithdrawAddress = isAddress(withdrawAddress.trim()) ? getAddress(withdrawAddress.trim()) : null;
  const parsedWithdrawAmount = (() => {
    try {
      return withdrawAmount.trim() ? parseEther(withdrawAmount) : null;
    } catch {
      return null;
    }
  })();
  const withdrawableBalance =
    authorityBalance.data && authorityBalance.data.value > WITHDRAW_KEEPALIVE
      ? authorityBalance.data.value - WITHDRAW_KEEPALIVE
      : 0n;
  const leavesReserveAfterWithdraw =
    parsedWithdrawAmount !== null && authorityBalance.data
      ? authorityBalance.data.value - parsedWithdrawAmount >= WITHDRAW_KEEPALIVE
      : false;
  const canRun = Boolean(publicClient && authority && drainAmount && hasReserveRoom && hasSelectedImplementation);
  const canWithdraw = Boolean(publicClient && authority && validWithdrawAddress && parsedWithdrawAmount && leavesReserveAfterWithdraw);

  const progressSteps = useMemo(
    () => [
      {
        label: "Create authority",
        ready: Boolean(authorityAddress),
        detail: authorityAddress ? shortAddress(authorityAddress) : "No authority yet",
      },
      {
        label: "Manual fund",
        ready: hasReserveRoom,
        detail: authorityBalance.data ? formatMon(authorityBalance.data.value) : "Waiting for funds",
      },
      {
        label: "Run delegated call",
        ready: Boolean(runHash),
        detail: runHash ? `${runHash.slice(0, 10)}...${runHash.slice(-8)}` : "Not run yet",
      },
    ],
    [authorityAddress, authorityBalance.data, hasReserveRoom, runHash],
  );

  const authorityWallet = useMemo(() => {
    if (!authority) {
      return null;
    }

    return createWalletClient({
      account: authority,
      chain: monadTestnet,
      transport: http(monadTestnet.rpcUrls.default.http[0]),
    });
  }, [authority]);

  function createAuthority() {
    const privateKey = generatePrivateKey();
    window.localStorage.setItem(AUTHORITY_STORAGE_KEY, privateKey);
    const nextAuthority = privateKeyToAccount(privateKey);
    setAuthority(nextAuthority);
    setRunHash(null);
    setWithdrawHash(null);
    setTraceReceiptHash(null);
    setTraceEvents([]);
    setRunStatus({
      tone: "success",
      message: `Created test authority ${shortAddress(nextAuthority.address)}. Copy the address and fund it from any Monad testnet wallet.`,
    });
  }

  function resetAuthority() {
    window.localStorage.removeItem(AUTHORITY_STORAGE_KEY);
    window.sessionStorage.removeItem(LEGACY_AUTHORITY_STORAGE_KEY);
    setAuthority(null);
    setRunHash(null);
    setWithdrawHash(null);
    setTraceReceiptHash(null);
    setTraceEvents([]);
    setRunStatus({
      tone: "muted",
      message: "Authority cleared. Create a fresh test authority when you are ready.",
    });
  }

  async function copyAuthorityAddress() {
    if (!authorityAddress) {
      return;
    }

    try {
      await window.navigator.clipboard.writeText(authorityAddress);
      setRunStatus({ tone: "success", message: "Authority address copied. Fund it manually with Monad testnet MON." });
    } catch (error) {
      setRunStatus({
        tone: "error",
        message: getFriendlyErrorMessage(error),
      });
    }
  }

  async function runDelegatedDrainRestore() {
    if (!authorityWallet || !publicClient || !authority) {
      setRunStatus({ tone: "error", message: "Create and fund a test authority first." });
      return;
    }

    try {
      setIsRunning(true);
      setTraceReceiptHash(null);
      setTraceEvents([]);
      setRunStatus({
        tone: "muted",
        message: "Signing the EIP-7702 authorization with the disposable authority...",
      });
      const authorization = await authorityWallet.signAuthorization({
        account: authority,
        chainId: monadTestnet.id,
        contractAddress: selectedImplementation,
        executor: "self",
      });
      const data = encodeFunctionData({
        abi: testnetDrainRestoreAbi,
        functionName: "drainRestore",
        args: [addresses.testnetRefundSink, parseEther(drainAmount)],
      });

      setRunStatus({
        tone: "muted",
        message: "Authorization signed. Sending the delegated transaction from the test authority...",
      });
      const hash = await authorityWallet.sendTransaction({
        account: authority,
        to: authority.address,
        data,
        authorizationList: [authorization],
      } as never);
      setRunHash(hash);
      setRunStatus({
        tone: "muted",
        message: "Transaction sent. Waiting for the reserve trace to land onchain...",
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      await Promise.all([reads.refetch(), authorityBalance.refetch()]);

      if (executionMode === "traced") {
        const events = decodeReserveTraceEvents(receipt.logs);
        setTraceReceiptHash(hash);
        setTraceEvents(events);

        if (events.length === 0) {
          setRunStatus({
            tone: "error",
            message: "The transaction completed, but no ReserveTrace events decoded. Confirm the traced implementation address.",
          });
          return;
        }

        setRunStatus({
          tone: "success",
          message: `Run complete. Decoded ${events.length} ReserveTrace events directly from the transaction receipt.`,
        });
        return;
      }

      setRunStatus({
        tone: "success",
        message: "Run complete. The cards below show what ReserveGuard observed inside the test authority.",
      });
    } catch (error) {
      setRunStatus({
        tone: "error",
        message:
          error instanceof Error
            ? getFriendlyErrorMessage(error)
            : "The local authority transaction failed or the chain did not accept the authorization list.",
      });
    } finally {
      setIsRunning(false);
    }
  }

  async function withdrawFunds() {
    if (!authorityWallet || !publicClient || !authority || !validWithdrawAddress || parsedWithdrawAmount === null) {
      setRunStatus({ tone: "error", message: "Enter a valid withdraw address and MON amount first." });
      return;
    }

    if (!leavesReserveAfterWithdraw) {
      setRunStatus({
        tone: "error",
        message: `Withdraw amount is too high. Available now: ${formatMon(withdrawableBalance)} after keeping 10.05 MON for reserve and gas.`,
      });
      return;
    }

    try {
      setIsWithdrawing(true);
      setRunStatus({ tone: "muted", message: "Sending MON out of the test authority..." });
      const hash = await authorityWallet.sendTransaction({
        account: authority,
        to: validWithdrawAddress,
        value: parsedWithdrawAmount,
      });
      setWithdrawHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      await authorityBalance.refetch();
      setRunStatus({ tone: "success", message: "Withdraw complete. The authority balance has been refreshed." });
    } catch (error) {
      setRunStatus({
        tone: "error",
        message: getFriendlyErrorMessage(error),
      });
    } finally {
      setIsWithdrawing(false);
    }
  }

  return (
    <section className="experimentPanel" aria-labelledby="delegated-7702-heading">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Primary path</p>
          <h2 id="delegated-7702-heading">EIP-7702 Test Authority</h2>
        </div>
        <button className="secondaryButton" type="button" onClick={() => reads.refetch()} disabled={!authorityAddress}>
          <RefreshCw aria-hidden="true" size={15} />
          Refresh result
        </button>
      </div>
      <div className="eipHero">
        <ShieldAlert aria-hidden="true" size={20} />
        <div>
          <strong>How this browser demo works</strong>
          <p>
            The browser creates a test authority and keeps it locally. You fund that address manually with testnet MON;
            then the authority signs and sends the EIP-7702 drain/restore transaction itself.
          </p>
        </div>
      </div>
      <div className="authorityLab">
        <div className="authorityActions">
          <button className="primaryButton" type="button" onClick={createAuthority}>
            <Sparkles aria-hidden="true" size={15} />
            {authorityAddress ? "Create new authority" : "Create test authority"}
          </button>
          <button className="secondaryButton" type="button" onClick={resetAuthority} disabled={!authorityAddress}>
            <RotateCcw aria-hidden="true" size={15} />
            Reset
          </button>
        </div>
        <div className="authorityAddress">
          <span>Persistent test authority</span>
          <strong>{authorityAddress ?? "Not created yet"}</strong>
          <small>Stored in this browser only. Use testnet funds, and withdraw before clearing browser storage.</small>
        </div>
        <button className="secondaryButton copyAuthorityButton" type="button" disabled={!authorityAddress} onClick={copyAuthorityAddress}>
          <Copy aria-hidden="true" size={15} />
          Copy address
        </button>
      </div>
      <div className="eipPreflightGrid">
        <article className={Boolean(authorityAddress) ? "ready" : ""}>
          {authorityAddress ? <CheckCircle2 aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
          <span>7702 authority</span>
          <strong>{authorityAddress ? shortAddress(authorityAddress) : "Generated in browser"}</strong>
          <small>The generated account signs the authorization and sends the demo transaction.</small>
        </article>
        <article className={hasReserveRoom ? "ready" : ""}>
          {hasReserveRoom ? <CheckCircle2 aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
          <span>Authority balance</span>
          <strong>{authorityBalance.data ? formatMon(authorityBalance.data.value) : "No balance yet"}</strong>
          <small>Send MON to the copied authority address from any Monad testnet wallet.</small>
        </article>
        <article className={hasSelectedImplementation ? "ready" : ""}>
          {hasSelectedImplementation ? <CheckCircle2 aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
          <span>Implementation</span>
          <strong>{hasSelectedImplementation ? shortAddress(selectedImplementation) : "Address needed"}</strong>
          <small>
            {executionMode === "traced"
              ? "ReserveTrace implementation emits the receipt timeline below."
              : "Base implementation records results in delegated authority storage."}
          </small>
        </article>
      </div>
      <div className="traceModeBar">
        <div>
          <span>Execution evidence</span>
          <small>
            {executionMode === "traced"
              ? "Decode labeled ReserveTrace events from the completed transaction."
              : "Read the delegated authority's stored before, during, and after state."}
          </small>
        </div>
        <div className="modeSwitch" role="group" aria-label="Delegated experiment mode">
          <button
            type="button"
            className={executionMode === "traced" ? "active" : ""}
            aria-pressed={executionMode === "traced"}
            onClick={() => setExecutionMode("traced")}
          >
            ReserveTrace
          </button>
          <button
            type="button"
            className={executionMode === "recorded" ? "active" : ""}
            aria-pressed={executionMode === "recorded"}
            onClick={() => setExecutionMode("recorded")}
          >
            Stored state
          </button>
        </div>
      </div>
      <div className="eipRunGrid selfRun">
        <label className="lookupField">
          <span>Drain amount</span>
          <div>
            <BadgeCheck aria-hidden="true" size={17} />
            <input value={drainAmount} onChange={(event) => setDrainAmount(event.target.value)} />
          </div>
        </label>
        <button className="primaryButton fieldActionButton" type="button" disabled={!canRun || isRunning} onClick={runDelegatedDrainRestore}>
          <Send aria-hidden="true" size={15} />
          {isRunning ? "Running..." : "Sign auth + run"}
        </button>
      </div>
      <div className="runProgress">
        {progressSteps.map((step) => (
          <article key={step.label} className={step.ready ? "ready" : ""}>
            {step.ready ? <CheckCircle2 aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
            <span>{step.label}</span>
            <strong>{step.detail}</strong>
          </article>
        ))}
      </div>
      <p className={runStatus.tone === "error" ? "inlineError" : runStatus.tone === "success" ? "inlineSuccess" : "inlineMuted"}>
        {runStatus.message}
      </p>
      <div className="txList eipTxList">
        {runHash ? (
          <span>
            7702 run tx: <TxLink hash={runHash} />
          </span>
        ) : null}
        {withdrawHash ? (
          <span>
            Withdraw tx: <TxLink hash={withdrawHash} />
          </span>
        ) : null}
      </div>
      {reads.isError ? <p className="inlineError">This authority has not exposed the expected 7702 observation state yet.</p> : null}
      <div className="resultGrid">
        <article>
          <span>Before</span>
          <strong>{beforeBalance !== null ? formatMon(beforeBalance) : "No result yet"}</strong>
          <small>dipped={beforeDip === null ? "unknown" : formatDip(beforeDip)}</small>
        </article>
        <article className={duringDip ? "dipped" : ""}>
          <span>During</span>
          <strong>{duringBalance !== null ? formatMon(duringBalance) : "No result yet"}</strong>
          <small>dipped={duringDip === null ? "unknown" : formatDip(duringDip)}</small>
        </article>
        <article>
          <span>After</span>
          <strong>{afterBalance !== null ? formatMon(afterBalance) : "No result yet"}</strong>
          <small>dipped={afterDip === null ? "unknown" : formatDip(afterDip)}</small>
        </article>
      </div>
      {traceReceiptHash ? <ReserveTraceTimeline events={traceEvents} /> : null}
      <div className="withdrawPanel" aria-labelledby="withdraw-heading">
        <div className="withdrawHeader">
          <div>
            <p className="eyebrow">After testing</p>
            <h3 id="withdraw-heading">Withdraw authority funds</h3>
          </div>
          <span>{authorityBalance.data ? formatMon(authorityBalance.data.value) : "No balance yet"}</span>
        </div>
        <p className="withdrawHint">
          Available to withdraw: <strong>{formatMon(withdrawableBalance)}</strong>. Keep at least 10 MON plus gas in the
          authority account.
        </p>
        <div className="eipRunGrid withdrawGrid">
          <label className="lookupField">
            <span>Withdraw to</span>
            <div>
              <WalletCards aria-hidden="true" size={17} />
              <input value={withdrawAddress} spellCheck={false} onChange={(event) => setWithdrawAddress(event.target.value)} />
            </div>
          </label>
          <label className="lookupField">
            <span>Amount</span>
            <div>
              <BadgeCheck aria-hidden="true" size={17} />
              <input value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} />
            </div>
          </label>
          <button className="secondaryButton fieldActionButton" type="button" disabled={!canWithdraw || isWithdrawing} onClick={withdrawFunds}>
            <Send aria-hidden="true" size={15} />
            {isWithdrawing ? "Withdrawing..." : "Withdraw"}
          </button>
        </div>
      </div>
    </section>
  );
}
