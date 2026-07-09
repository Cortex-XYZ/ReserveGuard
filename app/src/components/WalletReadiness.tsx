import { formatEther, parseEther } from "viem";
import { useAccount, useBalance, useChainId } from "wagmi";
import { monadTestnet } from "../config/chains";

const RESERVE_THRESHOLD = parseEther("10");

function formatMon(value: bigint) {
  const numeric = Number(formatEther(value));
  return `${numeric.toLocaleString(undefined, {
    maximumFractionDigits: numeric >= 1 ? 3 : 6,
  })} MON`;
}

export function WalletReadiness() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance, isLoading } = useBalance({
    address,
    chainId: monadTestnet.id,
    query: {
      enabled: Boolean(address),
      refetchInterval: 12_000,
    },
  });
  const isWrongNetwork = isConnected && chainId !== monadTestnet.id;
  const hasReserveRoom = balance ? balance.value > RESERVE_THRESHOLD : false;
  const status = !isConnected
    ? "Connect wallet"
    : isWrongNetwork
      ? "Switch network"
      : isLoading
        ? "Checking balance"
        : hasReserveRoom
          ? "Ready for testnet reads"
          : "Needs test MON";

  return (
    <section className="readinessPanel" aria-labelledby="readiness-heading">
      <div>
        <p className="eyebrow">Connected wallet path</p>
        <h2 id="readiness-heading">What happens next?</h2>
      </div>
      <div className="readinessGrid">
        <article>
          <span>Wallet</span>
          <strong>{isConnected && address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected"}</strong>
        </article>
        <article>
          <span>Balance</span>
          <strong>{balance ? formatMon(balance.value) : isLoading ? "Checking..." : "Unknown"}</strong>
        </article>
        <article>
          <span>Reserve threshold</span>
          <strong>10 MON</strong>
        </article>
        <article className={hasReserveRoom ? "ready" : isConnected ? "warn" : ""}>
          <span>Status</span>
          <strong>{status}</strong>
        </article>
      </div>
      <div className="nextSteps">
        <button type="button" className="stepCard">
          <span>1</span>
          <strong>Inspect a recorded result</strong>
          <small>Paste an authority address or use the connected wallet in Result Viewer.</small>
        </button>
        <button type="button" className="stepCard">
          <span>2</span>
          <strong>Run a smoke probe</strong>
          <small>Confirm ReserveGuard can call the MIP-4 precompile from the browser.</small>
        </button>
        <button type="button" className="stepCard">
          <span>3</span>
          <strong>Compare guarded flows</strong>
          <small>Use normal and delegated drain/restore experiments to see the reserve-state contrast.</small>
        </button>
      </div>
    </section>
  );
}
