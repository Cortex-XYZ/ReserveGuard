# ReserveGuard Use-Case Matrix

This matrix tracks what has been observed so far and where more Monad testnet evidence is needed.

| Use case | Actor type | Can dip? | Can observe? | Can recover? | Current primitive | Status |
| --- | --- | --- | --- | --- | --- | --- |
| EIP-7702 drain/restore | Delegated EOA | Yes | Yes | Yes | `checkpoint()` | Observed on Monad testnet |
| Agent wallet payout | Delegated EOA | Likely | Yes | Maybe | `checkpoint()`, `reserveProtected` | Demo contract available |
| Recoverable agent wallet, fresh authorization | Delegated EOA | Yes | Yes | Yes, when refund succeeds | `ReserveRecoverable` | Successful recovery observed on Monad testnet |
| Recoverable agent wallet, repeated authorization | Delegated EOA | Final transaction rejected after crossing reserve | Not in current run | No; recovery was skipped | `ReserveRecoverable` | MIP-4/replay discrepancy under investigation |
| Normal contract drain/restore | Contract | Not observed in current run | Yes | Yes | `dipped()` | Observed false throughout on Monad testnet |
| Router execution | Contract/router | Unknown | Yes | Maybe | `reserveProtected` | Example available |
| Vault withdrawal | Contract/vault | Unknown | Yes | Maybe | `reserveHealthy` | Example available |
| Batch executor | Contract or delegated account | Unknown | Yes | Maybe | `checkpoint()` | Needs field testing |
| Paymaster/sponsor flow | Account abstraction infra | Unknown | Unknown | Unknown | Research | Needs field testing |
| Settlement flow | Protocol contract | Unknown | Yes | Maybe | `checkpoint()` | Needs field testing |

## How To Update This Matrix

Add a row when a new flow has credible evidence from local tests or Monad testnet.

Prefer Monad testnet evidence for reserve-state conclusions. Use local tests to show integration shape, expected control flow, and how an application places checkpoints.

The repeated-authorization result is documented in [the 2026-07-15 field observation](observations/2026-07-15-repeated-7702-authorization.md). Do not generalize it until additional runs isolate delegation state and sink behavior.
