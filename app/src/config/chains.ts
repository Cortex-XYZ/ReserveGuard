import { defineChain } from "viem";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  network: "monad-testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_MONAD_TESTNET_RPC_URL ?? "https://testnet-rpc.monad.xyz"],
    },
    public: {
      http: [import.meta.env.VITE_MONAD_TESTNET_RPC_URL ?? "https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
});

export const MONAD_TESTNET_STATUS = "Target network";
