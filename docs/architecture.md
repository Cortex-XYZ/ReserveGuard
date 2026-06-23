# Architecture

ReserveGuard has three layers.

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
