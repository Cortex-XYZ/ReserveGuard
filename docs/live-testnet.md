# Live Monad Testnet Testing

ReserveGuard local tests validate the Solidity integration shape. Monad testnet is the source of truth for MIP-4 reserve semantics.

## Setup

You need three things before deploying:

| Value | Where to get it |
| --- | --- |
| `MONAD_RPC_URL` | A Monad testnet RPC endpoint from your RPC provider or Monad testnet docs. |
| `PRIVATE_KEY` | A funded testnet-only deployer wallet. Do not use a wallet that holds real funds. |
| Test MON | Monad faucet: `https://faucet.monad.xyz`. |

```bash
export MONAD_RPC_URL="https://..."
export PRIVATE_KEY="0x..."
```

Get test MON from the Monad faucet:

```text
https://faucet.monad.xyz
```

## Deploy Examples

```bash
forge script script/DeployExamples.s.sol:DeployExamples \
  --rpc-url "$MONAD_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

## Deploy Testnet Experiments

```bash
forge script script/DeployTestnetExperiments.s.sol:DeployTestnetExperiments \
  --rpc-url "$MONAD_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

Record the deployed addresses from the script output.

## Save Deployed Addresses

Foundry prints `Contract Address:` lines in deployment order.

For `DeployExamples`, use this mapping:

| Output order | Contract | Env var |
| --- | --- | --- |
| 1 | `ReserveProbe` | `RESERVE_PROBE` |
| 2 | `CheckpointedExecutor` | `CHECKPOINTED_EXECUTOR` |
| 3 | `ReserveAwareVault` | `RESERVE_AWARE_VAULT` |
| 4 | `ReserveProtectedRouter` | `RESERVE_PROTECTED_ROUTER` |

For `DeployTestnetExperiments`, use this mapping:

| Output order | Contract | Env var |
| --- | --- | --- |
| 1 | `TestnetReserveProbe` | `TESTNET_PROBE` |
| 2 | `TestnetRefundSink` | `REFUND_SINK` |
| 3 | `TestnetDrainRestore` | `DRAIN_RESTORE` |
| 4 | `Testnet7702DelegatedDrainRestore` | `DELEGATED_IMPL` |

Set the deployed addresses in your shell:

```bash
export RESERVE_PROBE="0x..."
export CHECKPOINTED_EXECUTOR="0x..."
export RESERVE_AWARE_VAULT="0x..."
export RESERVE_PROTECTED_ROUTER="0x..."

export TESTNET_PROBE="0x..."
export REFUND_SINK="0x..."
export DRAIN_RESTORE="0x..."
export DELEGATED_IMPL="0x..."
```

You can also extract them from Foundry's broadcast JSON with `jq`:

```bash
jq -r '.transactions[] | "\(.contractName)=\(.contractAddress)"' \
  broadcast/DeployExamples.s.sol/10143/run-latest.json

jq -r '.transactions[] | "\(.contractName)=\(.contractAddress)"' \
  broadcast/DeployTestnetExperiments.s.sol/10143/run-latest.json
```

To export them directly:

```bash
export RESERVE_PROBE=$(jq -r '.transactions[] | select(.contractName=="ReserveProbe") | .contractAddress' broadcast/DeployExamples.s.sol/10143/run-latest.json)
export CHECKPOINTED_EXECUTOR=$(jq -r '.transactions[] | select(.contractName=="CheckpointedExecutor") | .contractAddress' broadcast/DeployExamples.s.sol/10143/run-latest.json)
export RESERVE_AWARE_VAULT=$(jq -r '.transactions[] | select(.contractName=="ReserveAwareVault") | .contractAddress' broadcast/DeployExamples.s.sol/10143/run-latest.json)
export RESERVE_PROTECTED_ROUTER=$(jq -r '.transactions[] | select(.contractName=="ReserveProtectedRouter") | .contractAddress' broadcast/DeployExamples.s.sol/10143/run-latest.json)

export TESTNET_PROBE=$(jq -r '.transactions[] | select(.contractName=="TestnetReserveProbe") | .contractAddress' broadcast/DeployTestnetExperiments.s.sol/10143/run-latest.json)
export REFUND_SINK=$(jq -r '.transactions[] | select(.contractName=="TestnetRefundSink") | .contractAddress' broadcast/DeployTestnetExperiments.s.sol/10143/run-latest.json)
export DRAIN_RESTORE=$(jq -r '.transactions[] | select(.contractName=="TestnetDrainRestore") | .contractAddress' broadcast/DeployTestnetExperiments.s.sol/10143/run-latest.json)
export DELEGATED_IMPL=$(jq -r '.transactions[] | select(.contractName=="Testnet7702DelegatedDrainRestore") | .contractAddress' broadcast/DeployTestnetExperiments.s.sol/10143/run-latest.json)
```

If `jq` is not installed, copy the addresses manually from the terminal output using the order tables above.

## Smoke Test MIP-4

Call the testnet probe first:

```bash
cast send "$TESTNET_PROBE" "probe(string)" "smoke" \
  --rpc-url "$MONAD_RPC_URL" \
  --private-key "$PRIVATE_KEY"
```

Then inspect the stored result:

```bash
cast call "$TESTNET_PROBE" "lastDipped()(bool)" \
  --rpc-url "$MONAD_RPC_URL"
```

In a normal transaction context this will usually return `false`. A `true` result requires a transaction context that has actually dipped into reserve.

## Test Normal Drain/Restore

Fund the normal testnet drain/restore contract:

```bash
cast send "$DRAIN_RESTORE" \
  --value 19ether \
  --rpc-url "$MONAD_RPC_URL" \
  --private-key "$PRIVATE_KEY"
```

Run the drain/restore experiment:

```bash
cast send "$DRAIN_RESTORE" "drainRestore(address,uint256)" \
  "$REFUND_SINK" 10ether \
  --rpc-url "$MONAD_RPC_URL" \
  --private-key "$PRIVATE_KEY"
```

Inspect balances:

```bash
cast call "$DRAIN_RESTORE" "lastBeforeBalance()(uint256)" --rpc-url "$MONAD_RPC_URL"
cast call "$DRAIN_RESTORE" "lastDuringBalance()(uint256)" --rpc-url "$MONAD_RPC_URL"
cast call "$DRAIN_RESTORE" "lastAfterBalance()(uint256)" --rpc-url "$MONAD_RPC_URL"
```

Inspect reserve observations:

```bash
cast call "$DRAIN_RESTORE" "lastBeforeDip()(bool)" --rpc-url "$MONAD_RPC_URL"
cast call "$DRAIN_RESTORE" "lastDuringDip()(bool)" --rpc-url "$MONAD_RPC_URL"
cast call "$DRAIN_RESTORE" "lastAfterDip()(bool)" --rpc-url "$MONAD_RPC_URL"
```

This normal-contract experiment helps distinguish ordinary contract balance movement from EIP-7702 delegated EOA behavior.

## 7702 Reserve-Dip Experiment

The currently verified sufficient condition is:

```text
EIP-7702 delegated EOA
+ real Monad testnet authorization-list transaction
+ delegated account balance crosses from above 10 MON to below 10 MON during execution
= dippedIntoReserve() observed true
```

Use `Testnet7702DelegatedDrainRestore` as the implementation attached to the delegated EOA, and call:

```solidity
drainRestore(TestnetRefundSink sink, uint256 amount)
```

### 7702 Roles

| Role | Meaning |
| --- | --- |
| `DELEGATED_IMPL` | Deployed `Testnet7702DelegatedDrainRestore` implementation contract. |
| `DELEGATED_AUTHORITY` | EOA that signs the EIP-7702 authorization and temporarily runs `DELEGATED_IMPL` code. |
| `DELEGATED_AUTHORITY_PRIVATE_KEY` | Private key for `DELEGATED_AUTHORITY`, used only to sign the authorization. |
| `PRIVATE_KEY` | Sponsor/deployer private key that broadcasts the transaction and pays gas. |

The delegated authority is not one of the deployed contracts. It is a normal EOA whose account is authorized to execute the deployed implementation code.

Create or choose a testnet-only delegated authority wallet:

```bash
export DELEGATED_AUTHORITY_PRIVATE_KEY="0x..."
export DELEGATED_AUTHORITY=$(cast wallet address --private-key "$DELEGATED_AUTHORITY_PRIVATE_KEY")
```

Fund the delegated authority above the reserve threshold:

```bash
cast send "$DELEGATED_AUTHORITY" \
  --value 19ether \
  --rpc-url "$MONAD_RPC_URL" \
  --private-key "$PRIVATE_KEY"

cast balance "$DELEGATED_AUTHORITY" --ether --rpc-url "$MONAD_RPC_URL"
```

Sign the EIP-7702 authorization with the delegated authority key. The RPC URL is required so `cast` can resolve the correct chain and nonce context:

```bash
export AUTH=$(cast wallet sign-auth "$DELEGATED_IMPL" \
  --rpc-url "$MONAD_RPC_URL" \
  --private-key "$DELEGATED_AUTHORITY_PRIVATE_KEY")
```

Submit the authorization-list transaction from the sponsor/deployer:

```bash
cast send "$DELEGATED_AUTHORITY" "drainRestore(address,uint256)" \
  "$REFUND_SINK" 10ether \
  --auth "$AUTH" \
  --rpc-url "$MONAD_RPC_URL" \
  --private-key "$PRIVATE_KEY"
```

The resulting transaction should be type `4`. The logs should be emitted from `DELEGATED_AUTHORITY`, not `DELEGATED_IMPL`, because the implementation code runs in the delegated authority account context.

The contract emits:

```solidity
ReserveObservation("before", account, caller, balance, dipped)
ReserveObservation("during", account, caller, balance, dipped)
ReserveObservation("after", account, caller, balance, dipped)
```

The expected successful testnet shape is:

```text
before: balance above 10 MON, dipped false
during: balance below 10 MON, dipped true
after: balance restored above 10 MON, dipped false
```

After running the EIP-7702 transaction, inspect:

```bash
cast call "$DELEGATED_AUTHORITY" "lastBeforeBalance()(uint256)" --rpc-url "$MONAD_RPC_URL"
cast call "$DELEGATED_AUTHORITY" "lastDuringBalance()(uint256)" --rpc-url "$MONAD_RPC_URL"
cast call "$DELEGATED_AUTHORITY" "lastAfterBalance()(uint256)" --rpc-url "$MONAD_RPC_URL"

cast call "$DELEGATED_AUTHORITY" "lastBeforeDip()(bool)" --rpc-url "$MONAD_RPC_URL"
cast call "$DELEGATED_AUTHORITY" "lastDuringDip()(bool)" --rpc-url "$MONAD_RPC_URL"
cast call "$DELEGATED_AUTHORITY" "lastAfterDip()(bool)" --rpc-url "$MONAD_RPC_URL"
```

`DELEGATED_AUTHORITY` is the EOA with EIP-7702 delegation attached to `DELEGATED_IMPL`.

`DELEGATED_AUTHORITY` does not come from the deployment script. It is the EOA that receives the EIP-7702 delegation. Fund it above the reserve threshold before the experiment:

```bash
export DELEGATED_AUTHORITY="0x..."

cast balance "$DELEGATED_AUTHORITY" --ether --rpc-url "$MONAD_RPC_URL"
```

For the drain/restore shape, the delegated authority should start above `10 MON`, drain below `10 MON` during execution, and return above `10 MON` before completion.

## Verified Live Testnet Observations

The following observations have been reproduced with these contracts on Monad testnet.

### Normal Contract Drain/Restore

Transaction shape:

```text
TestnetDrainRestore balance: 19 MON -> 9 MON -> 19 MON
```

Observed reserve state:

```text
beforeDip = false
duringDip = false
afterDip = false
```

Deduction:

```text
An ordinary contract account temporarily crossing below 10 MON was not sufficient to make dippedIntoReserve() return true in this run.
```

### EIP-7702 Delegated EOA Drain/Restore

Transaction:

```text
hash: 0xeed485392dfe48c55d7ac517599e3c5cb7fe448707fc755de58bc1f5d6e03ac8
type: 4
delegated authority: 0x188F267e6B31080b6DD087cFC8BA25310Bee2d72
sponsor/caller: 0x5ee198D6C1b8a3a1D5a7aBDcd8c3d906f907B2DB
```

Observed balances:

```text
before balance = 19169866400000000000
during balance = 9169866400000000000
after balance = 19169866400000000000
```

Observed reserve state:

```text
beforeDip = false
duringDip = true
afterDip = false
```

Deduction:

```text
In a real EIP-7702 authorization-list transaction, a delegated EOA crossing below the reserve threshold during execution was observed by ReserveGuard through MIP-4.
```

This validates the primary ReserveGuard use case for explicit reserve checkpoints in delegated-account flows.

## Record Evidence

For each live run, record:

```text
transaction hash
deployed contract addresses
delegated authority address, if applicable
sponsor/caller address
starting balance
during balance
ending balance
beforeDip
duringDip
afterDip
whether the flow used a normal contract or EIP-7702 delegated EOA
```

Use this evidence to separate verified behavior from hypotheses about the broader MIP-4 state machine.

## Local Foundry Caveat

Local Monad Foundry can validate EIP-7702 delegated execution routing, but external experiments have observed a fidelity gap: local tests did not reproduce the same reserve-dip result seen on Monad testnet.

Do not treat local reserve-dip results as the complete MIP-4 state machine.

## Safety Notes

Foundry may print:

```text
Sensitive values saved to: cache/...
```

The `cache/`, `out/`, and `broadcast/` directories are ignored by git in this repo. Do not commit cache or broadcast artifacts, and do not paste real private keys into docs, issues, or terminal transcripts.
