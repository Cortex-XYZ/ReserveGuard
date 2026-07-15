import { CircleDot } from "lucide-react";
import { decodeEventLog, keccak256, toHex, type Address, type Hex } from "viem";
import { reserveTraceAbi } from "../abi/ReserveTrace";
import { formatDip, formatMon } from "../lib/format";

type ReceiptLog = {
  data: Hex;
  topics: readonly Hex[];
};

export type ReserveTraceEvent = {
  checkpoint: Hex;
  account: Address;
  caller: Address;
  balance: bigint;
  dipped: boolean;
  eventName: "ReserveObserved" | "ReserveCheckpoint";
};

type ReserveTraceTimelineProps = {
  events: ReserveTraceEvent[];
};

const knownCheckpoints = new Map<Hex, { title: string; detail: string }>([
  [
    keccak256(toHex("reserveguard.7702.before-drain")),
    { title: "Before drain", detail: "Authority balance before the delegated payout." },
  ],
  [
    keccak256(toHex("reserveguard.7702.during-drain")),
    { title: "During drain", detail: "Reserve state after MON leaves the delegated authority." },
  ],
  [
    keccak256(toHex("reserveguard.7702.after-restore")),
    { title: "After restore", detail: "Reserve state after the refund sink restores MON." },
  ],
]);

function shortAddress(address: Address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function checkpointDetails(checkpoint: Hex) {
  return (
    knownCheckpoints.get(checkpoint) ?? {
      title: "Custom checkpoint",
      detail: checkpoint,
    }
  );
}

export function decodeReserveTraceEvents(logs: readonly ReceiptLog[]): ReserveTraceEvent[] {
  return logs.flatMap((log) => {
    if (log.topics.length === 0) {
      return [];
    }

    try {
      const decoded = decodeEventLog({
        abi: reserveTraceAbi,
        data: log.data,
        topics: [log.topics[0], ...log.topics.slice(1)],
      });

      if (decoded.eventName !== "ReserveObserved" && decoded.eventName !== "ReserveCheckpoint") {
        return [];
      }

      const { checkpoint, account, caller, balance, dipped } = decoded.args;

      if (
        typeof checkpoint !== "string" ||
        typeof account !== "string" ||
        typeof caller !== "string" ||
        typeof balance !== "bigint" ||
        typeof dipped !== "boolean"
      ) {
        return [];
      }

      return [
        {
          checkpoint,
          account,
          caller,
          balance,
          dipped,
          eventName: decoded.eventName,
        },
      ];
    } catch {
      return [];
    }
  });
}

export function ReserveTraceTimeline({ events }: ReserveTraceTimelineProps) {
  return (
    <section className="reserveTraceReceipt" aria-labelledby="reserve-trace-heading">
      <div className="reserveTraceHeader">
        <div>
          <p className="eyebrow">Onchain receipt</p>
          <h3 id="reserve-trace-heading">Decoded ReserveTrace</h3>
        </div>
        <span>{events.length} event{events.length === 1 ? "" : "s"}</span>
      </div>
      <div className="reserveTraceEvents">
        {events.map((event, index) => {
          const checkpoint = checkpointDetails(event.checkpoint);

          return (
            <article className={event.dipped ? "dipped" : ""} key={`${event.checkpoint}-${index}`}>
              <CircleDot aria-hidden="true" size={18} />
              <div>
                <span>{checkpoint.title}</span>
                <strong>{formatMon(event.balance)}</strong>
                <small>{checkpoint.detail}</small>
              </div>
              <dl>
                <div>
                  <dt>Reserve</dt>
                  <dd>dipped={formatDip(event.dipped)}</dd>
                </div>
                <div>
                  <dt>Account</dt>
                  <dd>{shortAddress(event.account)}</dd>
                </div>
                <div>
                  <dt>Caller</dt>
                  <dd>{shortAddress(event.caller)}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
