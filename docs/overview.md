# ReserveGuard Overview

ReserveGuard is a Solidity library for reserve-aware execution on Monad.

It wraps MIP-4's reserve balance introspection precompile and gives developers simple primitives for checking whether the current execution state has dipped into reserve.

V1 focuses on explicit fail-fast behavior:

- Detect reserve violations
- Assert healthy reserve state
- Place reserve checkpoints between execution phases
- Use reserve-aware modifiers and base contracts

ReserveGuard does not attempt automatic recovery in V1. Its job is to make important reserve boundaries visible in Solidity code and fail early when execution is already unhealthy.

The current public demo path is Solidity-first:

- import the library or base contracts
- place checkpoints between meaningful execution phases
- use `reserveHealthy` for guarded entry points
- use `reserveProtected` when a function must start and finish healthy
- compare local mocked tests with live Monad testnet observations
