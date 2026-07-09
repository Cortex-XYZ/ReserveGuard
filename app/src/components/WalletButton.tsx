import { formatUnits } from "viem";
import { useAccount, useBalance, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { monadTestnet } from "../config/chains";

function shorten(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const activeChainId = useChainId();
  const { data: balance, isLoading: isBalanceLoading } = useBalance({
    address,
    chainId: monadTestnet.id,
    query: {
      enabled: Boolean(address),
      refetchInterval: 12_000,
    },
  });
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const injectedConnector = connectors[0];
  const isWrongNetwork = isConnected && activeChainId !== monadTestnet.id;
  const formattedBalance = balance ? Number(formatUnits(balance.value, balance.decimals)).toFixed(3) : null;

  if (!isConnected) {
    return (
      <button
        className="connectWalletButton"
        type="button"
        disabled={!injectedConnector || isPending}
        onClick={() => injectedConnector && connect({ connector: injectedConnector, chainId: monadTestnet.id })}
      >
        <span>{isPending ? "Connecting..." : "Connect wallet"}</span>
        <small>Monad testnet</small>
      </button>
    );
  }

  return (
    <div className={isWrongNetwork ? "walletCard warn" : "walletCard"}>
      <div className="walletIdentity">
        <strong>{shorten(address ?? "")}</strong>
      </div>
      <div className="walletBalance">
        <small>Balance</small>
        <strong>
          {isBalanceLoading ? "..." : formattedBalance ? `${formattedBalance} ${balance?.symbol}` : "Unavailable"}
        </strong>
      </div>
      {isWrongNetwork ? (
        <button
          className="compactButton"
          type="button"
          disabled={isSwitching}
          onClick={() => switchChain({ chainId: monadTestnet.id })}
        >
          {isSwitching ? "Switching..." : "Switch network"}
        </button>
      ) : null}
      <button className="disconnectButton" type="button" onClick={() => disconnect()} aria-label="Disconnect wallet">
        Disconnect
      </button>
    </div>
  );
}
