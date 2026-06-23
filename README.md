# ReserveGuard

ReserveGuard is an open-source Solidity library for building reserve-aware smart contracts on Monad.

It wraps Monad's MIP-4 Reserve Balance Introspection precompile at `0x1001` and provides simple primitives for detecting reserve violations, asserting healthy execution state, and placing explicit reserve checkpoints inside transaction flows.

## Install

This project is scaffolded for Monad Foundry.

```bash
forge build
forge test
```

If `forge` is not on your shell path yet, run:

```bash
source ~/.bashrc
```

or use the installed binary directly.

## Usage

```solidity
import { ReserveGuard } from "./contracts/ReserveGuard.sol";

function execute() external {
    swap();
    ReserveGuard.checkpoint();

    borrow();
    ReserveGuard.checkpoint();

    stake();
}
```

With the base contract:

```solidity
import { ReserveAware } from "./contracts/abstract/ReserveAware.sol";

contract Vault is ReserveAware {
    function withdraw() external reserveHealthy {
        // ...
    }
}
```

## API

- `ReserveGuard.dipped()` returns whether the current execution state has dipped into reserve.
- `ReserveGuard.assertHealthy()` reverts with `ReserveViolation()` if reserve state is unhealthy.
- `ReserveGuard.checkpoint()` is a semantic alias for `assertHealthy()` in V1.
- `ReserveAware` exposes internal helpers and the `reserveHealthy` modifier.
- `ReserveProtected` exposes a stricter `reserveProtected` modifier that checks before and after function execution.

## MIP-4 Notes

MIP-4 defines a reserve balance precompile at `0x1001` with:

```solidity
function dippedIntoReserve() external returns (bool);
```

ReserveGuard preserves MIP-4 semantics and provides developer-friendly Solidity wrappers. A healthy checkpoint does not guarantee the transaction will remain healthy later; it only validates reserve state at the point where the check runs.

## Status

Initial scaffold for V1: detect and fail earlier.
