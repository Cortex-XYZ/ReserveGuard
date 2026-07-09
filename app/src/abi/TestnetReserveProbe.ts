export const testnetReserveProbeAbi = [
  {
    type: "function",
    name: "probe",
    stateMutability: "nonpayable",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "lastDipped",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "ReserveObservation",
    inputs: [
      { name: "label", type: "string", indexed: false },
      { name: "account", type: "address", indexed: true },
      { name: "caller", type: "address", indexed: true },
      { name: "balance", type: "uint256", indexed: false },
      { name: "dipped", type: "bool", indexed: false },
    ],
  },
] as const;
