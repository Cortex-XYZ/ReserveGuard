import { Github } from "lucide-react";
import { MONAD_TESTNET_STATUS, monadTestnet } from "../config/chains";

export function Header() {
  return (
    <header className="appHeader">
      <div className="headerTitle">
        <p className="eyebrow">ReserveGuard Lab</p>
        <h1>Practical MIP-4 Experiments</h1>
      </div>
      <div className="headerMeta" aria-label="Lab status">
        <span>No wallet connect required</span>
        <span>Manual testnet funding</span>
        <span>
          {monadTestnet.name} / {monadTestnet.id}
        </span>
        <span>{MONAD_TESTNET_STATUS}</span>
      </div>
      <div className="headerActions">
        <nav className="headerLinks" aria-label="Project links">
          <a className="iconLink" href="https://github.com/Cortex-XYZ/ReserveGuard" target="_blank" rel="noreferrer">
            <Github aria-hidden="true" size={17} strokeWidth={2.3} />
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
