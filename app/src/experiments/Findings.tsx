import { BadgeCheck, GitBranch, ShieldCheck, WalletCards, Zap } from "lucide-react";

export function Findings() {
  return (
    <section className="experimentPanel" aria-labelledby="findings-heading">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Evidence</p>
          <h2 id="findings-heading">Findings</h2>
        </div>
      </div>
      <div className="findingsHero">
        <div>
          <p className="eyebrow">Observed result</p>
          <h3>ReserveGuard catches the mid-transaction dip</h3>
          <p>
            The authority can start healthy and finish healthy, while still crossing below reserve during execution.
            That temporary state is the useful signal.
          </p>
        </div>
        <div className="findingTrace" aria-label="Observed reserve trace">
          <span>Before</span>
          <strong>false</strong>
          <span>During</span>
          <strong className="dipped">true</strong>
          <span>After</span>
          <strong>false</strong>
        </div>
      </div>
      <div className="findingsList">
        <article>
          <GitBranch aria-hidden="true" />
          <h3>What the demo proves</h3>
          <p>
            EIP-7702 delegated execution runs in the authority account context. ReserveGuard can inspect that
            authority's live MON reserve while the transaction is executing.
          </p>
        </article>
        <article>
          <Zap aria-hidden="true" />
          <h3>Why that matters</h3>
          <p>
            A before/after balance check can miss temporary reserve violations. ReserveGuard makes the execution-time
            reserve state visible, so apps can detect or block flows that only become unsafe in the middle.
          </p>
        </article>
        <article>
          <WalletCards aria-hidden="true" />
          <h3>What users just ran</h3>
          <p>
            The browser generated a test authority, the user funded it manually, and the authority delegated execution
            to demo implementations that record the account's reserve state at each checkpoint.
          </p>
        </article>
        <article>
          <ShieldCheck aria-hidden="true" />
          <h3>Where this fits</h3>
          <p>
            The pattern is useful for delegated accounts, agents, wallets, vaults, settlement flows, paymasters, and
            any system where a minimum native balance must hold during execution.
          </p>
        </article>
        <article className="nextFinding">
          <BadgeCheck aria-hidden="true" />
          <h3>Agent wallet demo</h3>
          <p>
            The Agent Wallet page turns the primitive into a product workflow: an automated wallet runs a batch payout,
            then ReserveGuard shows whether the task stayed within the 10 MON reserve policy.
          </p>
        </article>
      </div>
    </section>
  );
}
