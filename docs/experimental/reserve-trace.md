# ReserveTrace

`ReserveTrace` is an experimental post-V1 library for labeled reserve observations and checkpoints.

It is not part of the stable V1 API. It exists to test whether named reserve boundaries and structured events help Monad developers debug real transaction flows.

## API

```solidity
ReserveTrace.observe(bytes32 checkpoint) returns (bool dipped);
ReserveTrace.checkpoint(bytes32 checkpoint);
```

The library also defines:

```solidity
error ReserveTraceViolation(bytes32 checkpoint);

event ReserveObserved(
    bytes32 indexed checkpoint,
    address indexed account,
    address indexed caller,
    uint256 balance,
    bool dipped
);

event ReserveCheckpoint(
    bytes32 indexed checkpoint,
    address indexed account,
    address indexed caller,
    uint256 balance,
    bool dipped
);
```

## Labels

Use `bytes32` labels so checkpoints stay Solidity-native and gas-conscious.

```solidity
bytes32 public constant BEFORE_PAYOUT = keccak256("reserveguard.before-payout");
bytes32 public constant AFTER_PAYOUT = keccak256("reserveguard.after-payout");
```

Prefer stable, namespaced labels that describe the execution boundary.

## Behavior

`observe`:

- calls `ReserveGuard.dipped()`
- emits `ReserveObserved`
- returns the reserve state
- does not revert when reserve has dipped

`checkpoint`:

- calls `ReserveGuard.dipped()`
- emits `ReserveCheckpoint` when healthy
- reverts with `ReserveTraceViolation(checkpoint)` when unhealthy
- propagates precompile failures

Reverted EVM logs do not persist, so `checkpoint` does not rely on an event in the unhealthy path. The failed label is carried by `ReserveTraceViolation(bytes32)`.

## Example

See `examples/experimental/TracedExecutor.sol` for a small labeled observe/checkpoint flow.

```solidity
function execute() external returns (bool beforeDip) {
    beforeDip = ReserveTrace.observe(BEFORE_WORK);

    // work happens here

    ReserveTrace.checkpoint(AFTER_WORK);
}
```

For a live Monad testnet visualization path, use `examples/testnet/Testnet7702TracedDrainRestore.sol` as the EIP-7702 delegated implementation. It emits labeled reserve observations around the proven drain/restore flow:

```text
reserveguard.7702.before-drain
reserveguard.7702.during-drain
reserveguard.7702.after-restore
```

## Graduation Criteria

`ReserveTrace` can move toward core if field testing shows that:

- labels make reserve reports easier to compare
- emitted trace events are useful in live Monad testnet runs
- developers repeatedly need observe-only reserve checks
- named checkpoint errors improve debugging enough to justify new API surface

Until then, keep production integrations on the stable V1 primitives unless they intentionally opt into experimental behavior.
