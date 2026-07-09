# MIP-4 Notes

MIP-4 adds a reserve balance precompile at `0x1001`.

```solidity
interface IReserveBalance {
    function dippedIntoReserve() external returns (bool);
}
```

The precompile returns whether the current transaction execution state is in reserve balance violation.

ReserveGuard uses this primitive through `ReserveGuard.dipped()`, `ReserveGuard.assertHealthy()`, and `ReserveGuard.checkpoint()`.

Important details:

- The precompile selector is `0x3a61584e`.
- The MIP-4 gas cost is `100`.
- The return value is an ABI-encoded Solidity `bool`.
- The precompile must be invoked via `CALL`.
- ReserveGuard checkpoints fail early; they do not automatically recover an unhealthy reserve state.
- A healthy checkpoint only describes the point where it runs. Later execution can still dip into reserve.
- Local tests use mocked precompile responses. Live Monad testnet transactions should be used for protocol-accurate reserve-state observations.
