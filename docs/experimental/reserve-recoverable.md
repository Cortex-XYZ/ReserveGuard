# ReserveRecoverable

`ReserveRecoverable` is an experimental abstract contract for applications that can restore reserve health after detecting a MIP-4 violation.

It extends the ReserveGuard abstract-contract model without changing the stable V1 API:

| Base contract | Behavioral promise |
| --- | --- |
| `ReserveAware` | Inspect reserve state and place application-defined boundaries. |
| `ReserveProtected` | Enter and return from a protected function in healthy reserve state. |
| `ReserveRecoverable` | Invoke application recovery after a detected dip and verify that recovery succeeded. |

## API

```solidity
abstract contract ReserveRecoverable is ReserveAware {
    error ReserveRecoveryFailed(bytes32 checkpoint);

    function _recoverReserveIfNeeded(bytes32 checkpoint)
        internal
        returns (bool recovered);

    function _recoverReserve(bytes32 checkpoint) internal virtual;
}
```

## Behavior

`_recoverReserveIfNeeded`:

- returns `false` without invoking the hook when reserve state is healthy
- invokes `_recoverReserve(checkpoint)` after a detected dip
- checks MIP-4 again after the hook returns
- returns `true` when recovery was required and reserve state is now healthy
- reverts with `ReserveRecoveryFailed(checkpoint)` when the transaction remains dipped
- propagates recovery-hook and precompile failures

The helper is deliberately explicit instead of being a modifier. Recovery can transfer funds, call external contracts, and change application accounting, so it should remain visible in the function body.

## Application Responsibilities

`ReserveRecoverable` does not define a financial recovery policy. Implementations remain responsible for:

- deciding which funds or credit source can restore health
- authorizing callers and recovery sources
- protecting external recovery calls against reentrancy
- maintaining application accounting
- emitting domain-specific recovery events
- deciding whether execution should continue after successful recovery

MIP-4 reserve state is transaction-wide. A detected dip does not identify `address(this)` as the account responsible for the violation.

## Example

```solidity
contract RecoverableWallet is ReserveRecoverable {
    bytes32 internal constant AFTER_PAYOUT = keccak256("wallet.after-payout");

    function executePayout(uint256 amount) external reserveHealthy {
        _sendPayout(amount);

        bool recovered = _recoverReserveIfNeeded(AFTER_PAYOUT);

        if (recovered) {
            _recordRecovery();
        }

        _reserveCheckpoint();
    }

    function _recoverReserve(bytes32 checkpoint) internal override {
        _claimRefund(checkpoint);
    }
}
```

See `examples/testnet/Testnet7702RecoverableAgentWallet.sol` for a delegated-account experiment that uses a refund sink as its application-defined recovery source.

## Field Status

A fresh EIP-7702 authorization successfully dipped, invoked the recovery hook, restored the delegated authority, and passed the post-recovery check on Monad testnet.

A later repeated authorization to the already-installed implementation did not expose the dip during replay, while the on-chain transaction was rejected and rolled back. The run also changed the refund sink, so it does not isolate a protocol root cause.

See `docs/live-testnet.md` and `docs/observations/2026-07-15-repeated-7702-authorization.md` for transaction hashes, balances, limitations, and next experiments.

## Remaining Graduation Criteria

Keep this base contract experimental until:

- recovery failure behavior is confirmed onchain
- fresh, repeated, and persisted delegation behavior is understood
- another unrelated integration fits the same hook without awkward state or parameters
- implementers can use the abstraction without mistaking transaction-wide reserve state for account attribution