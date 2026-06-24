# Use Cases

## Explicit Checkpoints

Use checkpoints between expensive or semantically distinct execution steps.

```solidity
swap();
ReserveGuard.checkpoint();

borrow();
ReserveGuard.checkpoint();
```

## Guarded Entry Points

Use `reserveHealthy` when a function should only start if reserve state is healthy.

```solidity
function withdraw(uint256 amount) external reserveHealthy {
    // ...
}
```

## Protected Flows

Use `reserveProtected` when a function should start and end in healthy reserve state.
This is stricter than a pre-check alone.

## EIP-7702 Delegated Accounts

Monad reserve-balance behavior is especially relevant when an EIP-7702 delegated EOA can move MON from its own account during execution.

Use the contracts under `examples/testnet/` to run live testnet experiments that observe reserve state before, during, and after a delegated account drain/restore flow.

After deploying the testnet experiment contracts, run the repeatable 7702 flow with:

```bash
bash scripts/run-7702-drain-restore.sh
```

Local Foundry tests validate the integration shape. Live Monad testnet transactions are the authority for reserve-state semantics.
