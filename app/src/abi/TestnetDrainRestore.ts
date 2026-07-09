export const testnetDrainRestoreAbi = [
  {
    type: "function",
    name: "drainRestore",
    stateMutability: "nonpayable",
    inputs: [
      { name: "sink", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [
      { name: "beforeDip", type: "bool" },
      { name: "duringDip", type: "bool" },
      { name: "afterDip", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "lastBeforeBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "lastDuringBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "lastAfterBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "lastBeforeDip",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "lastDuringDip",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "lastAfterDip",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
