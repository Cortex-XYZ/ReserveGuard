import { useEffect, useMemo, useState } from "react";

type ScenarioId = "delegated" | "normal";

type ReserveStep = {
  label: string;
  phase: string;
  balance: number;
  dipped: boolean;
  actor: string;
  note: string;
  call: string;
};

const scenarios: Record<
  ScenarioId,
  { label: string; shortLabel: string; expected: string; thesis: string; steps: ReserveStep[] }
> = {
  delegated: {
    label: "Delegated EOA",
    shortLabel: "7702 wallet",
    expected: "false -> true -> false",
    thesis: "A delegated account can dip mid-transaction and recover before completion. ReserveGuard makes that hidden moment visible.",
    steps: [
      {
        label: "Before",
        phase: "Open transaction",
        balance: 19.16,
        dipped: false,
        actor: "EOA authority",
        call: "authorize",
        note: "The wallet begins above the 10 MON reserve threshold.",
      },
      {
        label: "During",
        phase: "Risk checkpoint",
        balance: 9.16,
        dipped: true,
        actor: "Delegated code",
        call: "checkpoint",
        note: "The authorization-list transaction dips below reserve mid-execution.",
      },
      {
        label: "After",
        phase: "Recover state",
        balance: 19.16,
        dipped: false,
        actor: "Refund sink",
        call: "restore",
        note: "The account is restored before transaction completion.",
      },
    ],
  },
  normal: {
    label: "Normal contract",
    shortLabel: "contract",
    expected: "false -> false -> false",
    thesis: "The comparison path keeps the observed reserve flag clear, even when the balance graph crosses the same visual floor.",
    steps: [
      {
        label: "Before",
        phase: "Open call",
        balance: 19,
        dipped: false,
        actor: "Contract account",
        call: "start",
        note: "The comparison contract starts with enough MON for the experiment.",
      },
      {
        label: "During",
        phase: "Spend",
        balance: 9,
        dipped: false,
        actor: "Contract account",
        call: "transfer",
        note: "The ordinary contract balance crosses below 10 MON.",
      },
      {
        label: "After",
        phase: "Refund",
        balance: 19,
        dipped: false,
        actor: "Refund sink",
        call: "restore",
        note: "The refund restores the balance, and the observed reserve state remains false.",
      },
    ],
  },
};

export function ReservePlayground() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("delegated");
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const scenario = scenarios[scenarioId];
  const step = scenario.steps[stepIndex];
  const fillPercent = Math.min(100, Math.max(0, (step.balance / 25) * 100));
  const reservePercent = (10 / 25) * 100;
  const dipStates = useMemo(() => scenario.steps.map((item) => item.dipped), [scenario]);
  const activeDipCount = dipStates.filter(Boolean).length;

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const timer = window.setInterval(() => {
      setStepIndex((current) => {
        const next = current + 1;

        if (next >= scenario.steps.length) {
          setIsPlaying(false);
          return current;
        }

        return next;
      });
    }, 950);

    return () => window.clearInterval(timer);
  }, [isPlaying, scenario.steps.length]);

  function chooseScenario(nextScenario: ScenarioId) {
    setScenarioId(nextScenario);
    setStepIndex(0);
    setIsPlaying(false);
  }

  function goToOffset(offset: number) {
    setStepIndex((current) => Math.min(scenario.steps.length - 1, Math.max(0, current + offset)));
    setIsPlaying(false);
  }

  return (
    <section className="playground" aria-labelledby="playground-heading">
      <div className="playgroundHeader">
        <div>
          <p className="eyebrow">Interactive reserve visualizer</p>
          <h2 id="playground-heading">See the hidden reserve moment</h2>
        </div>
        <p>Use the beats to compare what the balance does, what the precompile reports, and where a guard belongs.</p>
      </div>

      <div className="scenarioControls" aria-label="Scenario selector">
        {(Object.keys(scenarios) as ScenarioId[]).map((id) => (
          <button
            key={id}
            className="scenarioButton"
            type="button"
            aria-pressed={scenarioId === id}
            onClick={() => chooseScenario(id)}
          >
            <span>{scenarios[id].shortLabel}</span>
            <strong>{scenarios[id].expected}</strong>
          </button>
        ))}
      </div>

      <aside className="reserveStory" aria-label="Current reserve beat">
        <div className="storyStep">
          <span>Beat {stepIndex + 1} / {scenario.steps.length}</span>
          <strong>{step.phase}</strong>
        </div>
        <p>{scenario.thesis}</p>
        <div className={step.dipped ? "storyCallout dipped" : "storyCallout"}>
          <span>{step.call}</span>
          <strong>dipped={String(step.dipped)}</strong>
          <small>{step.note}</small>
        </div>
      </aside>

      <div className="reserveStage">
        <div className="executionMap" aria-label={`${scenario.label} reserve execution map`}>
          <div className="mapHeader">
            <span>{scenario.label}</span>
            <strong>{step.actor}</strong>
          </div>
          <div className="flowRail">
            {scenario.steps.map((item, index) => {
              const isActive = index === stepIndex;
              const nodeFill = Math.min(100, Math.max(0, (item.balance / 25) * 100));

              return (
                <button
                  key={`${scenarioId}-${item.label}`}
                  type="button"
                  className={[
                    "flowNode",
                    isActive ? "active" : "",
                    item.dipped ? "dipped" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    setStepIndex(index);
                    setIsPlaying(false);
                  }}
                >
                  <span>{item.label}</span>
                  <strong>{item.call}</strong>
                  <i style={{ width: `${nodeFill}%` }} />
                </button>
              );
            })}
          </div>
          <div className="reserveFloor">
            <span style={{ left: `${reservePercent}%` }}>10 MON reserve floor</span>
          </div>
        </div>

        <div className="balanceViz" aria-label={`${step.label} balance ${step.balance} MON`}>
          <div className="compactCheckpoint">
            <span>{step.label} balance</span>
            <strong>{step.balance.toFixed(2).replace(/\.00$/, "")} MON</strong>
          </div>
          <div className="balanceTrack">
            <div className="reserveLine" style={{ left: `${reservePercent}%` }}>
              <span>floor</span>
            </div>
            <div
              className={step.dipped ? "balanceFill dipped" : "balanceFill"}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>

        <div className="tracePanel">
          <div>
            <p className="eyebrow">Current checkpoint</p>
            <h3>{step.actor}</h3>
          </div>
          <p>{step.note}</p>
          <div className="dipSequence" aria-label="Reserve states">
            {dipStates.map((dipped, index) => (
              <button
                key={`${scenarioId}-${index}`}
                className={index === stepIndex ? "dipPill active" : "dipPill"}
                type="button"
                onClick={() => {
                  setStepIndex(index);
                  setIsPlaying(false);
                }}
              >
                {scenario.steps[index].label}: {String(dipped)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="visualizerTakeaways" aria-label="Reserve visualizer takeaways">
        <article>
          <span>Signal</span>
          <strong>{activeDipCount ? "Mid-call dip exists" : "No dip observed"}</strong>
          <small>The boolean trace is the thing ReserveGuard turns into a decision.</small>
        </article>
        <article>
          <span>Boundary</span>
          <strong>{scenarioId === "delegated" ? "Checkpoint before payout" : "Observe only"}</strong>
          <small>The useful guard sits between spend intent and the next irreversible action.</small>
        </article>
        <article>
          <span>Outcome</span>
          <strong>{scenarioId === "delegated" ? "Fail earlier or recover" : "Comparison baseline"}</strong>
          <small>The visual trace shows why the same balance line can mean different execution risk.</small>
        </article>
      </div>

      <div className="timelineControls">
        <button className="secondaryButton" type="button" disabled={stepIndex === 0} onClick={() => goToOffset(-1)}>
          Prev
        </button>
        <input
          aria-label="Timeline step"
          type="range"
          min="0"
          max={scenario.steps.length - 1}
          value={stepIndex}
          onChange={(event) => {
            setStepIndex(Number(event.target.value));
            setIsPlaying(false);
          }}
        />
        <button
          className="secondaryButton"
          type="button"
          disabled={stepIndex === scenario.steps.length - 1}
          onClick={() => goToOffset(1)}
        >
          Next
        </button>
        <button
          className="primaryButton"
          type="button"
          onClick={() => {
            setStepIndex(0);
            setIsPlaying(true);
          }}
        >
          {isPlaying ? "Playing..." : "Run trace"}
        </button>
      </div>
    </section>
  );
}
