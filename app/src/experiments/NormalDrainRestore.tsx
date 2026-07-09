import { BanknoteArrowDown, CheckCircle2, Circle, Play, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { formatEther, parseEther, type Hash } from "viem";
import { useAccount, useBalance, useReadContracts, useSendTransaction, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { testnetDrainRestoreAbi } from "../abi/TestnetDrainRestore";
import { TxLink } from "../components/TxLink";
import type { ContractAddressSet } from "../config/contracts";
import { formatMon } from "../lib/format";

type NormalDrainRestoreProps = {
  addresses: ContractAddressSet;
};

const readNames = [
  "lastBeforeBalance",
  "lastDuringBalance",
  "lastAfterBalance",
  "lastBeforeDip",
  "lastDuringDip",
  "lastAfterDip",
] as const;

function parseMonInput(value: string) {
  try {
    return parseEther(value || "0");
  } catch {
    return null;
  }
}

export function NormalDrainRestore({ addresses }: NormalDrainRestoreProps) {
  const { isConnected } = useAccount();
  const [fundAmount, setFundAmount] = useState("19");
  const [drainAmount, setDrainAmount] = useState("10");
  const [fundHash, setFundHash] = useState<Hash | null>(null);
  const [runHash, setRunHash] = useState<Hash | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [lastFundingAmount, setLastFundingAmount] = useState<string | null>(null);
  const [lastDrainAmount, setLastDrainAmount] = useState<string | null>(null);
  const fundValue = parseMonInput(fundAmount);
  const drainValue = parseMonInput(drainAmount);
  const contractBalance = useBalance({
    address: addresses.testnetDrainRestore,
    query: {
      refetchInterval: 10_000,
    },
  });
  const observations = useReadContracts({
    contracts: readNames.map((functionName) => ({
      address: addresses.testnetDrainRestore,
      abi: testnetDrainRestoreAbi,
      functionName,
    })),
  });
  const fundTx = useSendTransaction();
  const fundReceipt = useWaitForTransactionReceipt({
    hash: fundTx.data,
    query: {
      enabled: Boolean(fundTx.data),
    },
  });
  const runTx = useWriteContract();
  const runReceipt = useWaitForTransactionReceipt({
    hash: runTx.data,
    query: {
      enabled: Boolean(runTx.data),
    },
  });
  const values = observations.data;
  const hasObservation = values?.every((item) => item.status === "success");
  const beforeBalance = hasObservation ? (values?.[0].result as bigint) : null;
  const duringBalance = hasObservation ? (values?.[1].result as bigint) : null;
  const afterBalance = hasObservation ? (values?.[2].result as bigint) : null;
  const beforeDip = hasObservation ? (values?.[3].result as boolean) : null;
  const duringDip = hasObservation ? (values?.[4].result as boolean) : null;
  const afterDip = hasObservation ? (values?.[5].result as boolean) : null;
  const canRunDrain =
    isConnected &&
    drainValue !== null &&
    contractBalance.data !== undefined &&
    contractBalance.data.value >= drainValue;
  const observedDipAmount =
    beforeBalance !== null && duringBalance !== null && beforeBalance >= duringBalance ? beforeBalance - duringBalance : null;

  useEffect(() => {
    if (fundTx.data) {
      setFundHash(fundTx.data);
    }
  }, [fundTx.data]);

  useEffect(() => {
    if (runTx.data) {
      setRunHash(runTx.data);
    }
  }, [runTx.data]);

  useEffect(() => {
    if (fundReceipt.isSuccess || runReceipt.isSuccess) {
      contractBalance.refetch();
      observations.refetch();
    }
  }, [contractBalance, fundReceipt.isSuccess, observations, runReceipt.isSuccess]);

  useEffect(() => {
    if (!runReceipt.isSuccess) {
      return;
    }

    setActiveStep(0);
    const timers = [window.setTimeout(() => setActiveStep(1), 600), window.setTimeout(() => setActiveStep(2), 1200)];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [runReceipt.isSuccess, runHash]);

  function fundContract() {
    if (!fundValue) {
      return;
    }

    fundTx.sendTransaction({
      to: addresses.testnetDrainRestore,
      value: fundValue,
    });
    setLastFundingAmount(fundAmount);
  }

  function runDrainRestore() {
    if (!drainValue) {
      return;
    }

    runTx.writeContract({
      address: addresses.testnetDrainRestore,
      abi: testnetDrainRestoreAbi,
      functionName: "drainRestore",
      args: [addresses.testnetRefundSink, drainValue],
    });
    setLastDrainAmount(drainAmount);
  }

  const flowSteps = [
    {
      label: "Before",
      balance: beforeBalance,
      dipped: beforeDip,
      body: "Contract records its starting balance and calls ReserveGuard before moving funds.",
    },
    {
      label: "During",
      balance: duringBalance,
      dipped: duringDip,
      body: "Contract sends MON to the refund sink, then samples reserve state while balance is lower.",
    },
    {
      label: "After",
      balance: afterBalance,
      dipped: afterDip,
      body: "Refund sink sends MON back, then the contract records the restored balance.",
    },
  ];

  return (
    <section className="experimentPanel" aria-labelledby="normal-drain-heading">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Write transaction</p>
          <h2 id="normal-drain-heading">Normal Drain/Restore</h2>
        </div>
        <button className="secondaryButton" type="button" onClick={() => observations.refetch()}>
          <RefreshCw aria-hidden="true" size={15} />
          Refresh
        </button>
      </div>
      <div className="explainerBand">
        <BanknoteArrowDown aria-hidden="true" size={18} />
        <div>
          <strong>What this comparison does</strong>
          <p>
            First fund the ordinary contract, then call `drainRestore(refundSink, amount)`. The contract records balance
            and ReserveGuard state before the transfer, during the temporary drain, and after the refund.
          </p>
        </div>
      </div>
      <div className="normalFlowGrid">
        <article>
          <span>Contract balance</span>
          <strong>{contractBalance.data ? formatMon(contractBalance.data.value) : "Loading..."}</strong>
          <small>Funds held by TestnetDrainRestore</small>
        </article>
        <article>
          <span>Expected reserve shape</span>
          <strong>{"false -> false -> false"}</strong>
          <small>Observed for ordinary contract movement on testnet</small>
        </article>
      </div>
      <div className="writeFormGrid twoActions">
        <label className="lookupField">
          <span>Funding amount</span>
          <div>
            <BanknoteArrowDown aria-hidden="true" size={17} />
            <input value={fundAmount} onChange={(event) => setFundAmount(event.target.value)} />
          </div>
        </label>
        <button className="primaryButton" type="button" disabled={!isConnected || !fundValue || fundTx.isPending} onClick={fundContract}>
          <BanknoteArrowDown aria-hidden="true" size={16} />
          {fundTx.isPending ? "Confirm funding" : "Fund contract"}
        </button>
        <label className="lookupField">
          <span>Drain amount</span>
          <div>
            <Play aria-hidden="true" size={17} />
            <input value={drainAmount} onChange={(event) => setDrainAmount(event.target.value)} />
          </div>
        </label>
        <button className="primaryButton" type="button" disabled={!canRunDrain || runTx.isPending} onClick={runDrainRestore}>
          <Play aria-hidden="true" size={16} />
          {runTx.isPending ? "Confirm run" : "Run drain/restore"}
        </button>
      </div>
      {!isConnected ? <p className="inlineMuted">Connect a wallet to fund and run the comparison flow.</p> : null}
      {drainValue && contractBalance.data && contractBalance.data.value < drainValue ? (
        <p className="inlineError">
          Contract balance is too low for a {Number(formatEther(drainValue)).toLocaleString()} MON drain.
        </p>
      ) : null}
      <div className="runInputsGrid">
        <article>
          <span>Last funding sent</span>
          <strong>{lastFundingAmount ? `${lastFundingAmount} MON` : "None this session"}</strong>
          <small>This is the amount you typed and sent from your wallet.</small>
        </article>
        <article>
          <span>Last drain requested</span>
          <strong>{lastDrainAmount ? `${lastDrainAmount} MON` : "No run this session"}</strong>
          <small>This is the amount passed to `drainRestore`.</small>
        </article>
        <article>
          <span>Observed run math</span>
          <strong>
            {beforeBalance !== null && duringBalance !== null
              ? `${Number(formatEther(beforeBalance)).toLocaleString()} - ${observedDipAmount ? Number(formatEther(observedDipAmount)).toLocaleString() : "0"} = ${Number(formatEther(duringBalance)).toLocaleString()} MON`
              : "Waiting for run"}
          </strong>
          <small>Uses the recorded before and during balances from the contract.</small>
        </article>
      </div>
      <div className="executionTimeline" aria-label="Drain restore execution steps">
        {flowSteps.map((step, index) => (
          <button
            className={index === activeStep ? "executionStep active" : "executionStep"}
            type="button"
            key={step.label}
            onClick={() => setActiveStep(index)}
          >
            {index <= activeStep && hasObservation ? (
              <CheckCircle2 aria-hidden="true" size={17} />
            ) : (
              <Circle aria-hidden="true" size={17} />
            )}
            <span>{step.label}</span>
            <strong>{step.balance !== null ? formatMon(step.balance) : "Waiting"}</strong>
            <small>dipped={step.dipped === null ? "unknown" : String(step.dipped)}</small>
          </button>
        ))}
      </div>
      <div className="stepExplanation">
        <strong>{flowSteps[activeStep].label} checkpoint</strong>
        <p>{flowSteps[activeStep].body}</p>
      </div>
      <div className="resultGrid">
        <article>
          <span>Before</span>
          <strong>{beforeBalance !== null ? formatMon(beforeBalance) : "No run yet"}</strong>
          <small>dipped={beforeDip === null ? "unknown" : String(beforeDip)}</small>
        </article>
        <article className={duringDip ? "dipped" : ""}>
          <span>During</span>
          <strong>{duringBalance !== null ? formatMon(duringBalance) : "No run yet"}</strong>
          <small>dipped={duringDip === null ? "unknown" : String(duringDip)}</small>
        </article>
        <article>
          <span>After</span>
          <strong>{afterBalance !== null ? formatMon(afterBalance) : "No run yet"}</strong>
          <small>dipped={afterDip === null ? "unknown" : String(afterDip)}</small>
        </article>
      </div>
      <div className="txList">
        {fundHash ? (
          <p className="inlineMuted">
            Funding tx: <TxLink hash={fundHash} />
          </p>
        ) : null}
        {runHash ? (
          <p className="inlineMuted">
            Drain/restore tx: <TxLink hash={runHash} />
          </p>
        ) : null}
      </div>
      {fundTx.error ? <p className="inlineError">{fundTx.error.message}</p> : null}
      {runTx.error ? <p className="inlineError">{runTx.error.message}</p> : null}
    </section>
  );
}
