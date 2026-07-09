import { CheckCircle2, Circle, Info, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { decodeEventLog, formatEther, type Address, type Hash } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { testnetReserveProbeAbi } from "../abi/TestnetReserveProbe";
import { TxLink } from "../components/TxLink";
import type { ContractAddressSet } from "../config/contracts";

type SmokeProbeProps = {
  addresses: ContractAddressSet;
};

export function SmokeProbe({ addresses }: SmokeProbeProps) {
  const { address, isConnected } = useAccount();
  const [label, setLabel] = useState("ui-smoke");
  const [lastHash, setLastHash] = useState<Hash | null>(null);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: Boolean(hash),
    },
  });
  const lastDipped = useReadContract({
    address: addresses.testnetReserveProbe,
    abi: testnetReserveProbeAbi,
    functionName: "lastDipped",
    query: {
      enabled: Boolean(receipt.isSuccess || lastHash),
    },
  });
  const observation = receipt.data?.logs
    .map((log) => {
      try {
        const decoded = decodeEventLog({
          abi: testnetReserveProbeAbi,
          data: log.data,
          topics: log.topics,
        });

        return decoded.eventName === "ReserveObservation" ? decoded.args : null;
      } catch {
        return null;
      }
    })
    .find(Boolean) as
    | {
        label: string;
        account: Address;
        caller: Address;
        balance: bigint;
        dipped: boolean;
      }
    | undefined;
  const txState = isPending
    ? "wallet"
    : receipt.isLoading
      ? "pending"
      : receipt.isSuccess
        ? "confirmed"
        : "idle";
  const steps = [
    {
      label: "Prepare",
      text: "Choose a run label. It is emitted in the event so this browser run can be identified later.",
      complete: Boolean(label.trim()),
    },
    {
      label: "Sign",
      text: "Your wallet sends a transaction to TestnetReserveProbe.probe(label).",
      complete: txState === "pending" || txState === "confirmed",
    },
    {
      label: "Probe",
      text: "The contract calls ReserveGuard.dipped(), stores lastDipped, and emits ReserveObservation.",
      complete: txState === "confirmed",
    },
  ];

  useEffect(() => {
    if (hash) {
      setLastHash(hash);
    }
  }, [hash]);

  function runProbe() {
    writeContract({
      address: addresses.testnetReserveProbe,
      abi: testnetReserveProbeAbi,
      functionName: "probe",
      args: [label],
    });
  }

  return (
    <section className="experimentPanel" aria-labelledby="smoke-probe-heading">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Write transaction</p>
          <h2 id="smoke-probe-heading">Smoke Probe</h2>
        </div>
      </div>
      <div className="explainerBand">
        <Info aria-hidden="true" size={18} />
        <div>
          <strong>What does `ui-smoke` do?</strong>
          <p>
            It is only a label for this run. The transaction calls `probe(label)`, checks the current MIP-4 reserve
            state through ReserveGuard, stores `lastDipped`, and emits the label with the caller and contract balance.
          </p>
        </div>
      </div>
      <div className="probeTimeline">
        {steps.map((step) => (
          <article className={step.complete ? "complete" : ""} key={step.label}>
            {step.complete ? <CheckCircle2 aria-hidden="true" size={18} /> : <Circle aria-hidden="true" size={18} />}
            <div>
              <strong>{step.label}</strong>
              <p>{step.text}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="writeFormGrid">
        <label className="lookupField">
          <span>Probe label</span>
          <div>
            <Send aria-hidden="true" size={17} />
            <input value={label} onChange={(event) => setLabel(event.target.value)} />
          </div>
        </label>
        <button className="primaryButton" type="button" disabled={!isConnected || isPending} onClick={runProbe}>
          <Send aria-hidden="true" size={16} />
          {isPending ? "Confirm in wallet" : receipt.isLoading ? "Waiting for receipt" : "Send probe"}
        </button>
      </div>
      <div className="writeStatusGrid">
        <article>
          <span>Target contract</span>
          <strong>{addresses.testnetReserveProbe}</strong>
        </article>
        <article>
          <span>Wallet</span>
          <strong>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connect wallet first"}</strong>
        </article>
        <article>
          <span>Result</span>
          <strong>
            {receipt.isLoading
              ? "Waiting for receipt"
              : lastDipped.data === undefined
                ? "No probe result yet"
                : `lastDipped=${String(lastDipped.data)}`}
          </strong>
        </article>
      </div>
      {observation ? (
        <div className="observationGrid">
          <article>
            <span>Event label</span>
            <strong>{observation.label}</strong>
          </article>
          <article>
            <span>Caller</span>
            <strong>{observation.caller}</strong>
          </article>
          <article>
            <span>Probe balance</span>
            <strong>{Number(formatEther(observation.balance)).toFixed(4)} MON</strong>
          </article>
          <article className={observation.dipped ? "dipped" : ""}>
            <span>Observed reserve state</span>
            <strong>dipped={String(observation.dipped)}</strong>
          </article>
        </div>
      ) : null}
      {lastHash ? (
        <p className="inlineMuted">
          Transaction: <TxLink hash={lastHash} />
        </p>
      ) : null}
      {error ? <p className="inlineError">{error.message}</p> : null}
    </section>
  );
}
