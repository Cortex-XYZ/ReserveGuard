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
