import { zeroAddress, type Address } from "viem";

export type ContractKey =
  | "testnetReserveProbe"
  | "testnetRefundSink"
  | "testnetDrainRestore"
  | "testnet7702DelegatedDrainRestore"
  | "testnet7702TracedDrainRestore"
  | "testnet7702AgentWalletGuard";

export type ContractConfig = {
  key: ContractKey;
  label: string;
  envName: string;
  queryParam: string;
  defaultAddress: Address;
};

export type ContractAddressSet = Record<ContractKey, Address>;

function envAddress(value: string | undefined): Address {
  const trimmed = value?.trim();
  return (trimmed ? trimmed : zeroAddress) as Address;
}

export const contractConfigs = [
  {
    key: "testnetReserveProbe",
    label: "TestnetReserveProbe",
    envName: "VITE_TESTNET_PROBE",
    queryParam: "probe",
    defaultAddress: envAddress(import.meta.env.VITE_TESTNET_PROBE),
  },
  {
    key: "testnetRefundSink",
    label: "TestnetRefundSink",
    envName: "VITE_REFUND_SINK",
    queryParam: "refundSink",
    defaultAddress: envAddress(import.meta.env.VITE_REFUND_SINK),
  },
  {
    key: "testnetDrainRestore",
    label: "TestnetDrainRestore",
    envName: "VITE_DRAIN_RESTORE",
    queryParam: "drainRestore",
    defaultAddress: envAddress(import.meta.env.VITE_DRAIN_RESTORE),
  },
  {
    key: "testnet7702DelegatedDrainRestore",
    label: "Testnet7702DelegatedDrainRestore",
    envName: "VITE_DELEGATED_IMPL",
    queryParam: "delegatedImpl",
    defaultAddress: envAddress(import.meta.env.VITE_DELEGATED_IMPL),
  },
  {
    key: "testnet7702TracedDrainRestore",
    label: "Testnet7702TracedDrainRestore",
    envName: "VITE_TRACED_DELEGATED_IMPL",
    queryParam: "tracedDelegatedImpl",
    defaultAddress: envAddress(import.meta.env.VITE_TRACED_DELEGATED_IMPL),
  },
  {
    key: "testnet7702AgentWalletGuard",
    label: "Testnet7702AgentWalletGuard",
    envName: "VITE_AGENT_WALLET_GUARD_IMPL",
    queryParam: "agentWalletGuard",
    defaultAddress: envAddress(import.meta.env.VITE_AGENT_WALLET_GUARD_IMPL),
  },
] satisfies ContractConfig[];

export function getDefaultContractAddresses(): ContractAddressSet {
  return contractConfigs.reduce((addresses, contract) => {
    addresses[contract.key] = contract.defaultAddress;
    return addresses;
  }, {} as ContractAddressSet);
}
