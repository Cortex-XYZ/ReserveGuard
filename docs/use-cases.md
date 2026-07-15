# Use Cases

## Explicit Checkpoints

Use checkpoints between expensive or semantically distinct execution steps.
In V1, a checkpoint is intentionally the same behavior as `assertHealthy()`, but it communicates that the check is a deliberate execution boundary.

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
It is useful for routers, executors, and other functions where the body may call external contracts before control returns.

## EIP-7702 Delegated Accounts

Monad reserve-balance behavior is especially relevant when an EIP-7702 delegated EOA can move MON from its own account during execution.

Use the contracts under `examples/testnet/` to run live testnet experiments that observe reserve state before, during, and after a delegated account drain/restore flow.

After deploying the testnet experiment contracts, run the repeatable 7702 flow with:

```bash
bash scripts/run-7702-drain-restore.sh
```

Local Foundry tests validate the integration shape with mocked precompile calls and delegated routing. Live Monad testnet transactions are the authority for reserve-state semantics.

## Experimental Recovery

Use `ReserveRecoverable` only when the application has an explicit, authorized way to restore reserve health. The helper:

1. checks whether the transaction has dipped
2. invokes the application's recovery hook when needed
3. checks MIP-4 again
4. reverts if recovery did not restore health

A fresh EIP-7702 authorization successfully completed this flow on Monad testnet. Re-authorizing an already-installed implementation produced a discrepant result in one run: replay reported no dip while the on-chain transaction failed and rolled back.

Treat fresh, repeated, and persisted delegation as separate test shapes. See `docs/experimental/reserve-recoverable.md` and the dated report under `docs/observations/`.