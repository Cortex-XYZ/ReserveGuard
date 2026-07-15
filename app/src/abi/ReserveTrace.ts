export const reserveTraceAbi = [
  {
    type: "event",
    name: "ReserveObserved",
    anonymous: false,
    inputs: [
      { name: "checkpoint", type: "bytes32", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "caller", type: "address", indexed: true },
      { name: "balance", type: "uint256", indexed: false },
      { name: "dipped", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ReserveCheckpoint",
    anonymous: false,
    inputs: [
      { name: "checkpoint", type: "bytes32", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "caller", type: "address", indexed: true },
      { name: "balance", type: "uint256", indexed: false },
      { name: "dipped", type: "bool", indexed: false },
    ],
  },
] as const;
