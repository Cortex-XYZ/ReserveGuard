import { BadgeCheck, GitBranch, KeyRound, WalletCards, Zap } from "lucide-react";
import type { TabId } from "../components/Tabs";

type WriteLabProps = {
  onSelectTab: (tab: TabId) => void;
};

export function WriteLab({ onSelectTab }: WriteLabProps) {
  return (
    <section className="experimentPanel writeLab" aria-labelledby="write-lab-heading">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Write-first lab</p>
          <h2 id="write-lab-heading">Run transactions, then inspect what changed</h2>
        </div>
      </div>
      <div className="writeHero">
        <div>
          <h3>Start with a generated test authority</h3>
          <p>
            ReserveGuard Lab should feel like a controlled testnet bench: create a browser-held authority, fund it
            manually, run the EIP-7702 transaction, and inspect the reserve checkpoints.
          </p>
        </div>
        <button className="primaryButton" type="button" onClick={() => onSelectTab("eip-7702")}>
          <Zap aria-hidden="true" size={16} />
          Open 7702 lab
        </button>
      </div>
      <div className="writeActionGrid">
        <button className="writeActionCard" type="button" onClick={() => onSelectTab("eip-7702")}>
          <KeyRound aria-hidden="true" />
          <span>1</span>
          <strong>Create authority</strong>
          <small>Generate a browser-held test account that can sign the EIP-7702 authorization locally.</small>
        </button>
        <button className="writeActionCard" type="button" onClick={() => onSelectTab("eip-7702")}>
          <WalletCards aria-hidden="true" />
          <span>2</span>
          <strong>Fund manually</strong>
          <small>Copy the authority address and send testnet MON from any wallet, without connecting it here.</small>
        </button>
        <button className="writeActionCard" type="button" onClick={() => onSelectTab("eip-7702")}>
          <GitBranch aria-hidden="true" />
          <span>3</span>
          <strong>Run 7702 trace</strong>
          <small>Send the delegated drain/restore transaction and watch the authority dip below reserve.</small>
        </button>
        <button className="writeActionCard" type="button" onClick={() => onSelectTab("findings")}>
          <BadgeCheck aria-hidden="true" />
          <span>4</span>
          <strong>Inspect findings</strong>
          <small>Compare the observed reserve shape and what it proves about delegated account context.</small>
        </button>
        <button className="writeActionCard" type="button" onClick={() => onSelectTab("agent-wallet")}>
          <Zap aria-hidden="true" />
          <span>5</span>
          <strong>Agent wallet guard</strong>
          <small>Run an automated payout task and compare unguarded vs reserve-guarded execution.</small>
        </button>
      </div>
    </section>
  );
}
