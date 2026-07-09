import {
  BadgeCheck,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Play,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  createWalletClient,
  encodeFunctionData,
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
import { testnet7702AgentWalletGuardAbi } from "../abi/Testnet7702AgentWalletGuard";
import { TxLink } from "../components/TxLink";
import { monadTestnet } from "../config/chains";
import type { ContractAddressSet } from "../config/contracts";
import { formatDip, formatMon } from "../lib/format";

type AgentWalletGuardProps = {
  addresses: ContractAddressSet;
};

type TaskMode = "unguarded" | "guarded";
type RunStatus = {
  tone: "muted" | "error" | "success";
  message: string;
};

const AUTHORITY_STORAGE_KEY = "reserveguard:test-authority-private-key";
const RESERVE_FLOOR = parseEther("10");
const payoutRecipients = ["Ops contractor", "Data provider", "Keeper refund"] as const;
const readNames = [
  "lastMode",
  "lastBlocked",
  "lastBeforeBalance",
  "lastDuringBalance",
  "lastAfterBalance",
  "lastBeforeDip",
  "lastDuringDip",
  "lastAfterDip",
  "lastTaskSpendAmount",
] as const;

function loadAuthority(): PrivateKeyAccount | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedKey = window.localStorage.getItem(AUTHORITY_STORAGE_KEY);
  return storedKey ? privateKeyToAccount(storedKey as Hex) : null;
}

function shortAddress(address: Address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getFriendlyErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.toLowerCase().includes("reserve balance violation")) {
    return "The agent would end below reserve. Add more testnet MON or lower the task spend amount.";
  }

  return message;
}

function parseOptionalEther(value: string) {
  try {
    return value ? parseEther(value) : 0n;
  } catch {
    return 0n;
  }
}

export function AgentWalletGuard({ addresses }: AgentWalletGuardProps) {
  const publicClient = usePublicClient();
  const [authority, setAuthority] = useState<PrivateKeyAccount | null>(() => loadAuthority());
  const [amount, setAmount] = useState("25");
  const [mode, setMode] = useState<TaskMode>("unguarded");
  const [runHash, setRunHash] = useState<Hash | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [status, setStatus] = useState<RunStatus>({
    tone: "muted",
    message: "Create and fund an agent authority to unlock the payout task.",
  });

  const authorityAddress = authority?.address;
  const implementationAddress = addresses.testnet7702AgentWalletGuard;
  const hasImplementation = isAddress(implementationAddress) && implementationAddress !== zeroAddress;
  const authorityBalance = useBalance({
    address: authorityAddress,
    query: {
      enabled: Boolean(authorityAddress),
      refetchInterval: 8_000,
    },
  });
  const hasReserveRoom = authorityBalance.data ? authorityBalance.data.value > RESERVE_FLOOR : false;
  const reads = useReadContracts({
    contracts:
      authorityAddress && hasImplementation
        ? readNames.map((functionName) => ({
            address: authorityAddress,
            abi: testnet7702AgentWalletGuardAbi,
            functionName,
          }))
        : [],
    query: {
      enabled: Boolean(authorityAddress && hasImplementation),
    },
  });
  const values = reads.data;
  const hasCompleteResult = values?.every((item) => item.status === "success");
  const lastMode = hasCompleteResult ? Number(values?.[0].result) : 0;
  const lastBlocked = hasCompleteResult ? (values?.[1].result as boolean) : null;
  const beforeBalance = hasCompleteResult ? (values?.[2].result as bigint) : null;
  const duringBalance = hasCompleteResult ? (values?.[3].result as bigint) : null;
  const afterBalance = hasCompleteResult ? (values?.[4].result as bigint) : null;
  const beforeDip = hasCompleteResult ? (values?.[5].result as boolean) : null;
  const duringDip = hasCompleteResult ? (values?.[6].result as boolean) : null;
  const afterDip = hasCompleteResult ? (values?.[7].result as boolean) : null;
  const lastSpendAmount = hasCompleteResult ? (values?.[8].result as bigint) : null;
  const unguardedDipped = lastMode === 1 && duringDip === true;
  const hasTaskResult = lastMode === 1 || lastMode === 2;
  const traceMode: TaskMode = lastMode === 1 ? "unguarded" : lastMode === 2 ? "guarded" : mode;
  const simulatedRecipientAmount = lastSpendAmount ?? parseOptionalEther(amount);
  const queueStatus = lastBlocked
    ? "Recovered"
    : hasTaskResult
      ? "Paid"
      : isRunning
        ? "Processing"
        : "Queued";
  const activityRows = [
    {
      label: "Authorization",
      value: runHash || hasTaskResult ? "attached" : authorityAddress ? "ready" : "waiting",
      detail: authorityAddress
        ? `${shortAddress(authorityAddress)} can execute the agent implementation for this transaction.`
        : "Create an agent authority before running a payout task.",
      tone: runHash || hasTaskResult || authorityAddress ? "ready" : "idle",
    },
    {
      label: "Opening balance",
      value: beforeBalance !== null ? formatMon(beforeBalance) : authorityBalance.data ? formatMon(authorityBalance.data.value) : "not sampled",
      detail: beforeBalance !== null ? `Reserve state before payout: dipped=${formatDip(beforeDip ?? false)}.` : "Captured when the task starts.",
      tone: beforeBalance !== null ? "ready" : "idle",
    },
    {
      label: "Payout dispatch",
      value: lastSpendAmount ? formatMon(lastSpendAmount) : `${amount || "0"} MON`,
      detail:
        duringBalance !== null
          ? `Queue spend executed. Agent balance at checkpoint: ${formatMon(duringBalance)}.`
          : "The queued recipient batch is sent as one task spend.",
      tone: duringDip ? "warning" : duringBalance !== null ? "ready" : isRunning ? "ready" : "idle",
    },
    {
      label: traceMode === "guarded" ? "ReserveGuard checkpoint" : "Observe-only checkpoint",
      value:
        lastBlocked === true
          ? "blocked"
          : duringDip === true
            ? "dipped"
            : duringDip === false
              ? "clear"
              : "pending",
      detail:
        lastBlocked === true
          ? "Reserve dipped below 10 MON, so the guarded path recorded the block and recovered."
          : duringDip === true
            ? "Reserve dipped below 10 MON, but observe-only mode lets the task complete."
            : duringDip === false
              ? "Reserve stayed above the 10 MON policy."
              : traceMode === "guarded"
                ? "Guarded mode will stop the risky path if the reserve dips."
                : "Observe-only mode records the dip without stopping the task.",
      tone: lastBlocked ? "blocked" : duringDip ? "warning" : duringDip === false ? "ready" : "idle",
    },
    {
      label: "Recovery",
      value: afterBalance !== null ? formatMon(afterBalance) : "pending",
      detail:
        afterBalance !== null
          ? `Refund sink restored the agent. Final reserve state: dipped=${formatDip(afterDip ?? false)}.`
          : "The demo refund restores funds so the evidence remains readable onchain.",
      tone: lastBlocked ? "blocked" : afterBalance !== null ? "ready" : "idle",
    },
  ];
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
  const canRun = Boolean(authority && authorityWallet && publicClient && hasImplementation && hasReserveRoom && amount);

  function createAuthority() {
    const privateKey = generatePrivateKey();
    window.localStorage.setItem(AUTHORITY_STORAGE_KEY, privateKey);
    const nextAuthority = privateKeyToAccount(privateKey);
    setAuthority(nextAuthority);
    setRunHash(null);
    setStatus({
      tone: "success",
      message: `Created agent authority ${shortAddress(nextAuthority.address)}. Fund it above 10 MON before running.`,
    });
  }

  async function copyAuthorityAddress() {
    if (!authorityAddress) {
      return;
    }

    await window.navigator.clipboard.writeText(authorityAddress);
    setCopiedAddress(true);
    setStatus({ tone: "success", message: "Agent address copied. Fund it with Monad testnet MON." });
    window.setTimeout(() => setCopiedAddress(false), 1400);
  }

  async function runTask() {
    if (!authority || !authorityWallet || !publicClient || !hasImplementation) {
      setStatus({ tone: "error", message: "Create a funded agent authority and set the agent implementation address first." });
      return;
    }

    try {
      setIsRunning(true);
      setStatus({ tone: "muted", message: `Signing ${mode} payout task authorization...` });
      const authorization = await authorityWallet.signAuthorization({
        account: authority,
        chainId: monadTestnet.id,
        contractAddress: implementationAddress,
        executor: "self",
      });
      const data = encodeFunctionData({
        abi: testnet7702AgentWalletGuardAbi,
        functionName: mode === "unguarded" ? "runObservedBatch" : "runGuardedBatch",
        args: [addresses.testnetRefundSink, parseEther(amount)],
      });

      const hash = await authorityWallet.sendTransaction({
        account: authority,
        to: authority.address,
        data,
        authorizationList: [authorization],
      } as never);
      setRunHash(hash);
      setStatus({ tone: "muted", message: "Payout task sent. Waiting for the agent result..." });
      await publicClient.waitForTransactionReceipt({ hash });
      await Promise.all([reads.refetch(), authorityBalance.refetch()]);
      setStatus({
        tone: "success",
        message:
          mode === "guarded"
            ? "Reserve-guarded task completed. If the agent dipped, the task was blocked and recovered."
            : "Unguarded task completed. The result shows whether the agent dipped during payout execution.",
      });
    } catch (error) {
      setStatus({ tone: "error", message: getFriendlyErrorMessage(error) });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="experimentPanel" aria-labelledby="agent-wallet-heading">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Real-world demo</p>
          <h2 id="agent-wallet-heading">Agent Wallet Reserve Guard</h2>
        </div>
      </div>
      <div className="eipHero">
        <ShieldAlert aria-hidden="true" size={20} />
        <div>
          <strong>Protect automated payouts from reserve dips</strong>
          <p>
            An automated wallet is executing a payout task. The task may complete, but the agent can dip below native
            reserve mid-execution. ReserveGuard catches that point before the agent strands itself.
          </p>
        </div>
      </div>
      <div className="eipPreflightGrid">
        <article className={authorityAddress ? "ready" : ""}>
          {authorityAddress ? <CheckCircle2 aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
          <span>Agent authority</span>
          <strong>{authorityAddress ? shortAddress(authorityAddress) : "No authority"}</strong>
        </article>
        <article className={hasReserveRoom ? "ready" : ""}>
          {hasReserveRoom ? <CheckCircle2 aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
          <span>Balance</span>
          <strong>{authorityBalance.data ? formatMon(authorityBalance.data.value) : "No balance yet"}</strong>
        </article>
        <article className="ready">
          <CheckCircle2 aria-hidden="true" />
          <span>Reserve policy</span>
          <strong>Keep 10 MON</strong>
        </article>
        <article className={hasImplementation ? "ready" : ""}>
          {hasImplementation ? <CheckCircle2 aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
          <span>Implementation</span>
          <strong>{hasImplementation ? shortAddress(implementationAddress) : "Deploy address needed"}</strong>
        </article>
      </div>
      <div className="flashAuthorityBar">
        <button className="primaryButton" type="button" onClick={createAuthority}>
          <Sparkles aria-hidden="true" size={15} />
          {authorityAddress ? "Create new agent" : "Create agent"}
        </button>
        <div className="flashAuthorityAddress">
          <span>Funding address</span>
          <strong>{authorityAddress ?? "Create an agent first"}</strong>
        </div>
        <button
          className={copiedAddress ? "secondaryButton copiedButton" : "secondaryButton"}
          type="button"
          disabled={!authorityAddress}
          onClick={copyAuthorityAddress}
        >
          {copiedAddress ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
          {copiedAddress ? "Copied" : "Copy address"}
        </button>
      </div>
      <div className="agentQueue">
        <div>
          <Users aria-hidden="true" size={18} />
          <strong>Agent payout queue</strong>
        </div>
        <span>Ops contractor</span>
        <span>Data provider</span>
        <span>Keeper refund</span>
      </div>
      <div className="flashRunPanel">
        <div className="modeSwitch" role="group" aria-label="Agent task mode">
          <button type="button" className={mode === "unguarded" ? "active" : ""} onClick={() => setMode("unguarded")}>
            Unguarded task
          </button>
          <button type="button" className={mode === "guarded" ? "active" : ""} onClick={() => setMode("guarded")}>
            Reserve-guarded task
          </button>
        </div>
        <label className="lookupField">
          <span>Task spend amount</span>
          <div>
            <BadgeCheck aria-hidden="true" size={17} />
            <input value={amount} onChange={(event) => setAmount(event.target.value)} />
          </div>
        </label>
        <button className="primaryButton fieldActionButton" type="button" disabled={!canRun || isRunning} onClick={runTask}>
          <Play aria-hidden="true" size={15} />
          {isRunning ? "Running..." : "Run task"}
        </button>
      </div>
      <p className={status.tone === "error" ? "inlineError" : status.tone === "success" ? "inlineSuccess" : "inlineMuted"}>
        {status.message}
      </p>
      {runHash ? (
        <div className="txList eipTxList">
          <span>
            Task tx: <TxLink hash={runHash} />
          </span>
        </div>
      ) : null}
      <div className="agentSimulator" aria-label="Agent wallet task simulator">
        <section className="payoutSimulator" aria-labelledby="payout-simulator-heading">
          <div className="simulatorHeader">
            <span>Simulator</span>
            <strong id="payout-simulator-heading">Queued payouts</strong>
          </div>
          <div className="payoutRows">
            {payoutRecipients.map((recipient) => (
              <article className={lastBlocked ? "recovered" : hasTaskResult ? "paid" : ""} key={recipient}>
                <div>
                  <strong>{recipient}</strong>
                  <small>{traceMode === "guarded" ? "Reserve-guarded batch" : "Observe-only batch"}</small>
                </div>
                <span>{simulatedRecipientAmount > 0n ? formatMon(simulatedRecipientAmount / 3n) : "--"}</span>
                <em>{queueStatus}</em>
              </article>
            ))}
          </div>
        </section>
        <section className="activityLog" aria-labelledby="activity-log-heading">
          <div className="simulatorHeader">
            <span>Activity log</span>
            <strong id="activity-log-heading">Agent execution</strong>
          </div>
          <ol>
            {activityRows.map((row) => (
              <li className={row.tone} key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
                <p>{row.detail}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <div className="resultGrid">
        <article>
          <span>Before</span>
          <strong>{beforeBalance !== null ? formatMon(beforeBalance) : "No result yet"}</strong>
          <small>dipped={beforeDip === null ? "unknown" : formatDip(beforeDip)}</small>
        </article>
        <article className={duringDip ? "dipped" : ""}>
          <span>{lastBlocked ? "Checkpoint" : "During"}</span>
          <strong>{duringBalance !== null ? formatMon(duringBalance) : "No result yet"}</strong>
          <small>dipped={duringDip === null ? "unknown" : formatDip(duringDip)}</small>
        </article>
        <article>
          <span>After</span>
          <strong>{afterBalance !== null ? formatMon(afterBalance) : "No result yet"}</strong>
          <small>dipped={afterDip === null ? "unknown" : formatDip(afterDip)}</small>
        </article>
      </div>
      <div className={lastBlocked ? "decisionBanner blocked" : unguardedDipped ? "decisionBanner warning" : "decisionBanner"}>
        <strong>
          {lastBlocked
            ? "ReserveGuard blocked the risky task and recovered"
            : unguardedDipped
              ? "Agent task completed but dipped below reserve"
              : lastMode === 1 || lastMode === 2
                ? "Task completed within reserve policy"
                : "Awaiting result"}
        </strong>
        <span>
          {lastBlocked
            ? "The payout would have crossed the 10 MON reserve policy, so the guarded task recovered instead of continuing."
            : unguardedDipped
              ? `The unguarded task spent ${lastSpendAmount ? formatMon(lastSpendAmount) : "funds"} and still completed, but the agent crossed below reserve during execution.`
              : lastMode === 1 || lastMode === 2
                ? "The agent completed this payout amount without crossing below reserve."
                : "Run an unguarded or reserve-guarded payout task to compare outcomes."}
        </span>
      </div>
    </section>
  );
}
