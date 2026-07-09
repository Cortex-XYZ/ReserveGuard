# ReserveGuard Use-Case Matrix

This matrix tracks what has been observed so far and where more Monad testnet evidence is needed.

| Use case | Actor type | Can dip? | Can observe? | Can recover? | Current primitive | Status |
| --- | --- | --- | --- | --- | --- | --- |
| EIP-7702 drain/restore | Delegated EOA | Yes | Yes | Yes | `checkpoint()` | Observed on Monad testnet |
| Agent wallet payout | Delegated EOA | Likely | Yes | Maybe | `checkpoint()`, `reserveProtected` | Demo contract available |
| Normal contract drain/restore | Contract | Not observed in current run | Yes | Yes | `dipped()` | Observed false throughout on Monad testnet |
| Router execution | Contract/router | Unknown | Yes | Maybe | `reserveProtected` | Example available |
| Vault withdrawal | Contract/vault | Unknown | Yes | Maybe | `reserveHealthy` | Example available |
| Batch executor | Contract or delegated account | Unknown | Yes | Maybe | `checkpoint()` | Needs field testing |
| Paymaster/sponsor flow | Account abstraction infra | Unknown | Unknown | Unknown | Research | Needs field testing |
| Settlement flow | Protocol contract | Unknown | Yes | Maybe | `checkpoint()` | Needs field testing |

## How To Update This Matrix

Add a row when a new flow has credible evidence from local tests or Monad testnet.

Prefer Monad testnet evidence for reserve-state conclusions. Use local tests to show integration shape, expected control flow, and how an application places checkpoints.
