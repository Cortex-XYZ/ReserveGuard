import { http } from "viem";
import { createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { monadTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0]),
  },
});
