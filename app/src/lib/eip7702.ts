import type { Address, WalletClient } from "viem";

export type Browser7702Capability = {
  supported: boolean;
  label: string;
  detail: string;
  blocker?: string;
};

type WalletClientWithAuthorization = WalletClient & {
  account?: WalletClient["account"] & {
    type?: string;
    signAuthorization?: (parameters: unknown) => Promise<unknown>;
  };
  signAuthorization?: (parameters: unknown) => Promise<unknown>;
};

export function detectBrowser7702Support(walletClient: WalletClient | undefined): Browser7702Capability {
  if (!walletClient) {
    return {
      supported: false,
      label: "Connect wallet",
      detail: "Connect a browser wallet before checking EIP-7702 authorization support.",
    };
  }

  const client = walletClient as WalletClientWithAuthorization;

  if (client.account?.type === "json-rpc") {
    return {
      supported: false,
      label: "Injected JSON-RPC wallet",
      detail:
        "Rabby is connected as a normal injected JSON-RPC account. It may support EIP-7702 internally, but this dapp session does not expose an authorization signer.",
      blocker:
        "Browser signing needs a wallet API that can sign EIP-7702 authorization tuples, not only normal transactions.",
    };
  }

  if (typeof client.account?.signAuthorization === "function") {
    return {
      supported: true,
      label: "Browser authorization available",
      detail: "This wallet account exposes an EIP-7702 authorization signer.",
    };
  }

  return {
    supported: false,
    label: "Wallet does not expose authorization signing",
    detail:
      "The connected wallet is a JSON-RPC account. viem cannot sign EIP-7702 authorizations for JSON-RPC accounts unless the wallet exposes a 7702 signer.",
  };
}

export async function requestBrowser7702Authorization(
  walletClient: WalletClient,
  contractAddress: Address,
) {
  const client = walletClient as WalletClientWithAuthorization;

  if (client.account?.type === "json-rpc") {
    throw new Error(
      "Rabby is connected as a JSON-RPC wallet account. This connection can send normal transactions, but it does not expose EIP-7702 authorization signing to the dapp.",
    );
  }

  if (typeof client.account?.signAuthorization === "function") {
    return client.account.signAuthorization({
      contractAddress,
    });
  }

  throw new Error(
    "Connected wallet does not expose EIP-7702 authorization signing to this browser app.",
  );
}
