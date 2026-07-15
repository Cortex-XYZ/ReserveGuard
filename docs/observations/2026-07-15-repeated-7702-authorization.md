# Repeated EIP-7702 Authorization Reserve-Signal Discrepancy

**Status:** Reproduced once on Monad testnet; protocol confirmation and stricter control runs are still needed.

**Suggested issue title:** `MIP-4: dippedIntoReserve() remains false during repeated EIP-7702 authorization while the transaction is rejected`

## Summary

Two sponsored EIP-7702 transactions called the same recoverable wallet implementation through the same delegated authority. The first installed the recoverable implementation and successfully observed and repaired a reserve dip. The second authorized the same implementation again, moved the authority below the reserve floor, but observed `dippedIntoReserve() == false` at every checkpoint.

The second transaction's replay returned successfully, but its on-chain receipt had `status = 0`, used the full explicit gas limit, emitted no retained logs, and rolled back the balance change. This suggests that transaction-final reserve enforcement rejected the transaction even though the MIP-4 precompile did not expose the mid-execution dip to the delegated code. That interpretation is a hypothesis, not a confirmed protocol explanation.

## Environment

| Item | Value |
| --- | --- |
| Network | Monad testnet, chain `10143` |
| Date observed | 2026-07-15 |
| RPC used | `https://rpc.testnet.monad.xyz` |
| Delegated authority | `0x188F267e6B31080b6DD087cFC8BA25310Bee2d72` |
| Sponsor/caller | `0x5ee198D6C1b8a3a1D5a7aBDcd8c3d906f907B2DB` |
| Recoverable implementation | `0x904F043A524bE8B4832dC7355B33Ca20603dEc1F` |
| Refunding sink | `0xB5734E9e52492b92E2FC256Ac87802493d856c05` |
| No-op sink | `0xDDB0b3960f6d9AE2a7195F06b516B1832569Fd37` |
| Starting authority balance | `17.8313790704 MON` |
| Payout and post-payout balance | `10 MON`, then `7.8313790704 MON` |

## Control A: Recovery Succeeds

The first type-4 transaction authorized the recoverable implementation, paid the refunding sink, observed the dip, recovered the payout, and completed above reserve.

```text
transaction: 0x040bbdb0818ad296099df9462775d627073c0b691b6dbb5e2f02f9f9c16834bf
block:       45245743
type/status: 4 / success
gas used:    221411
balance:     17.8313790704 -> 7.8313790704 -> 17.8313790704 MON
```

| Checkpoint | Dipped | Recovery attempted | Recovery succeeded |
| --- | --- | --- | --- |
| Before payout | `false` | `false` | `false` |
| After payout | `true` | `false` | `false` |
| Recovery attempt | `true` | `true` | `false` |
| Task complete | `false` | `true` | `true` |

## Control B: Repeated Authorization Does Not Expose Dip

The second type-4 transaction signed another authorization for the implementation already installed on the authority. Its no-op sink accepted the payout without refunding it.

```text
transaction: 0x4e75ae92aa87cfc03ac96f7a725669bfe1c9559c7985946205cd68b8e7599e90
block:       45246894
type/status: 4 / failed
gas:         1000000 used of 1000000
logs:        []
balance after rollback: 17.8313790704 MON
```

`cast run` replayed the call as follows:

```text
before payout:  balance 17.8313790704 MON, dipped false
after payout:   balance  7.8313790704 MON, dipped false
recovery:       skipped because dipped was false
final check:    dipped false
trace result:   Transaction successfully executed
trace gas used: 144340
```

The contract did not enter its recovery hook and therefore could not raise `ReserveRecoveryFailed`. The on-chain transaction nevertheless failed and reverted the payout.

## Expected Behavior

Once the delegated authority crossed below the reserve floor, one of these outcomes was expected:

1. `dippedIntoReserve()` returns `true`, allowing recovery and post-recovery verification; or
2. the transaction is rejected under a documented rule explaining why the MIP-4 signal remains `false` in this context.

The discrepancy is between the in-execution MIP-4 signal and the final on-chain outcome.

## Reproduction

Use disposable testnet keys and an authority funded above `10 MON`.

```bash
# Install the recoverable implementation and use the refunding sink.
export AUTH=$(cast wallet sign-auth "$RECOVERABLE_AGENT_WALLET_IMPL" \
  --rpc-url "$MONAD_RPC_URL" \
  --private-key "$DELEGATED_AUTHORITY_PRIVATE_KEY")

cast send "$DELEGATED_AUTHORITY" \
  "runRecoverableBatch(address,uint256)" "$REFUND_SINK" 10ether \
  --auth "$AUTH" --rpc-url "$MONAD_RPC_URL" --private-key "$PRIVATE_KEY"

# Authorize the same already-installed implementation and use the no-op sink.
export REPEATED_AUTH=$(cast wallet sign-auth "$RECOVERABLE_AGENT_WALLET_IMPL" \
  --rpc-url "$MONAD_RPC_URL" \
  --private-key "$DELEGATED_AUTHORITY_PRIVATE_KEY")

cast send "$DELEGATED_AUTHORITY" \
  "runRecoverableBatch(address,uint256)" "$NOOP_REFUND_SINK" 10ether \
  --auth "$REPEATED_AUTH" --rpc-url "$MONAD_RPC_URL" \
  --private-key "$PRIVATE_KEY" --gas-limit 1000000
```

## Limits Of The Evidence

This pair of runs does not isolate one variable:

- The first transaction changed the authority's delegation; the second authorized the already-installed implementation again.
- The first run used a refunding sink; the second used a no-op sink.
- The second transaction supplied an explicit gas limit.
- `cast run` is a historical replay and may model transaction-final reserve validation differently from block execution.

The observation is evidence of a mismatch, but it is not enough to assign a root cause.

## Protocol Questions

1. Should `dippedIntoReserve()` become `true` when an already-delegated EOA crosses below the reserve floor?
2. Does authorizing an implementation already installed on the authority change reserve tracking?
3. Are the MIP-4 result and transaction-final reserve validation expected to agree?
4. Is historical replay expected to omit transaction-final reserve enforcement?
5. What EIP-7702 state transition activates reserve-dip tracking?

## Impact On ReserveGuard

`ReserveRecoverable` can only attempt recovery after MIP-4 reports a dip. If the precompile returns `false` while final reserve enforcement rejects the transaction, delegated wallets cannot use the signal to recover gracefully in that execution shape.

The successful fresh-authorization result remains valid. Repeated or persisted delegation flows need separate field validation before the experimental primitive can be considered reliable for them.

## Next Experiments

1. Revoke the delegation, reinstall the recoverable implementation, and use the no-op sink in the same transaction.
2. Repeat both controls with a previously unused authority.
3. Use the same sink for fresh and repeated authorization runs.
4. Call the persisted delegation without an authorization list.
5. Repeat without an explicit gas limit and compare receipt and replay behavior.
