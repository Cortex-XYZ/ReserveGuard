# Architecture

ReserveGuard V1 has three stable layers.

## Interface Layer

`IReserveBalance` mirrors the MIP-4 precompile interface.

## Library Layer

`ReserveGuard` provides internal Solidity helpers:

- `dipped()`
- `assertHealthy()`
- `checkpoint()`

## Abstract Contract Layer

`ReserveAware` provides integration helpers and the `reserveHealthy` modifier.

`ReserveProtected` provides a stricter `reserveProtected` modifier that checks reserve state before and after function execution.

## Experimental Layer

Post-V1 experiments live under `contracts/experimental/` and do not expand the stable API:

- `ReserveTrace` adds labeled observations, checkpoint events, and labeled errors.
- `ReserveRecoverable` invokes an application-defined recovery hook after a detected dip and verifies reserve health afterward.

Applications must opt into these contracts deliberately. Live Monad testnet evidence, rather than their presence in the repository, determines whether an experimental primitive is ready to graduate.