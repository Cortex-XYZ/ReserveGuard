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

or use the installed binary directly, for example:

```bash
~/.foundry/bin/forge test
```

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

V1 intentionally keeps the API small. Checkpoints are explicit fail-fast boundaries; they do not emit events, label checkpoints, or attempt recovery.

## MIP-4 Notes

MIP-4 defines a reserve balance precompile at `0x1001` with:

```solidity
function dippedIntoReserve() external returns (bool);
```

ReserveGuard preserves MIP-4 semantics and provides developer-friendly Solidity wrappers. A healthy checkpoint does not guarantee the transaction will remain healthy later; it only validates reserve state at the point where the check runs.

## Examples

Developer-facing examples live in `examples/`.

Testnet experiments live in `examples/testnet/`, including an EIP-7702 delegated drain/restore experiment. See `docs/live-testnet.md` for the live Monad testnet workflow, authorization commands, verified observations, and caveats.

The optional browser lab in `app/` can be used to inspect the same testnet experiment patterns, but the Solidity library and examples are the primary integration path for Monad developers.

See `docs/v1.md` for the V1 release scope, non-goals, verification path, and testnet caveats.

## Deploy to Monad Testnet

Set your environment variables in Bash:

```bash
export MONAD_RPC_URL="https://..."
export PRIVATE_KEY="0x..."
```

Deploy the developer-facing examples:

```bash
forge script script/DeployExamples.s.sol:DeployExamples \
  --rpc-url "$MONAD_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

Deploy the live testnet experiment contracts:

```bash
forge script script/DeployTestnetExperiments.s.sol:DeployTestnetExperiments \
  --rpc-url "$MONAD_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

For where to get each value, how to map Foundry's `Contract Address:` output to env vars, post-deploy smoke tests, drain/restore checks, and the EIP-7702 reserve-dip workflow, see `docs/live-testnet.md`.

After deploying testnet experiments, the 7702 drain/restore flow can be repeated with:

```bash
bash scripts/run-7702-drain-restore.sh
```

The EIP-7702 delegated drain/restore experiment is intentionally documented as a live testnet workflow because local Monad Foundry validates delegated routing but may not reproduce the same reserve-dip semantics observed on testnet.
