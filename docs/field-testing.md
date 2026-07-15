# Field Testing ReserveGuard

ReserveGuard is in early alpha. The goal is to learn which Monad transaction flows actually benefit from reserve-aware checkpoints before expanding the library API.

Use the current V1 primitives first:

```solidity
ReserveGuard.dipped();
ReserveGuard.assertHealthy();
ReserveGuard.checkpoint();
reserveHealthy;
reserveProtected;
```

Use these stable primitives first. Opt into `ReserveTrace` or `ReserveRecoverable` only for deliberate experimental testing, and report the exact authorization and recovery shape.

## What To Test

Useful early flows include:

- EIP-7702 delegated EOAs
- agent wallets and automated payout wallets
- routers and batch executors
- vault deposits and withdrawals
- paymaster or sponsorship flows
- settlement flows that temporarily move native MON
- any protocol path where an account may cross below reserve mid-transaction

## Evidence Format

When reporting a result, include:

```text
Project or experiment:
Monad network:
Transaction hash:
Actor type:
  - EOA
  - EIP-7702 delegated EOA
  - contract
  - router
  - vault
  - paymaster
  - other

Flow summary:
Checkpoint location:

Before balance:
During balance:
After balance:

beforeDip:
duringDip:
afterDip:

Did the transaction recover before completion?
Was recovery attempted?
Did the post-recovery reserve check pass?
Did ReserveGuard fail early?
What primitive felt useful or missing?
```

## How To Interpret Results

Local Foundry tests are useful for integration shape and mocked precompile behavior. Live Monad testnet transactions are the source of truth for real MIP-4 reserve semantics.

The most useful reports separate:

- what happened onchain
- where ReserveGuard was called
- whether the flow recovered
- which library primitive helped
- which missing primitive would have made the integration clearer

## Early Direction Signals

These are the questions field testing should answer:

- Do developers need a non-reverting `observe()` helper?
- Are named checkpoints useful enough to add to the core API?
- Should checkpoint events be emitted by the library or by application contracts?
- Which actor types can realistically dip and recover?
- Which flows should fail early instead of attempting recovery?
- Are agent-wallet or paymaster helpers worth standardizing?
