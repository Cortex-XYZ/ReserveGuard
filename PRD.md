# PRD: ReserveGuard

## 1. Overview

ReserveGuard is an open-source Solidity library and execution-pattern framework for building reserve-aware smart contracts on Monad.

Built on top of MIP-4 (Reserve Balance Introspection), ReserveGuard abstracts direct interaction with Monad's reserve balance precompile and gives developers familiar Solidity primitives for detecting reserve violations, asserting healthy execution state, and defining explicit reserve safety boundaries inside transactions.

V1 focuses on a small, dependable developer tooling layer:

- Reserve state detection
- Reserve safety assertions
- Reserve checkpoints
- Reserve-aware modifiers
- Optional abstract base contracts
- Standardized errors and examples

The long-term vision is for ReserveGuard to become the standard reserve-awareness layer for Monad applications, similar in role to how OpenZeppelin standardized common Solidity security and application patterns.

## 2. Context: MIP-4

MIP-4 adds a reserve balance precompile to Monad at address `0x1001`.

The precompile exposes:

```solidity
interface IReserveBalance {
    function dippedIntoReserve() external returns (bool);
}
```

Key MIP-4 details relevant to ReserveGuard:

- Precompile address: `0x1001`
- Selector: `0x3a61584e`
- Gas cost: `100`
- Return value: ABI-encoded Solidity `bool`
- Invocation must use `CALL`
- `STATICCALL`, `DELEGATECALL`, `CALLCODE`, and EIP-7702 delegations to the precompile must revert
- Calldata must be exactly the 4-byte selector
- Nonzero value calls must revert

MIP-4 allows contracts to query whether the current execution state has dipped into reserve during a transaction. Without this primitive, reserve violations are only discovered at the end of execution, after potentially expensive work has already been performed.

ReserveGuard does not change MIP-4 semantics. It provides a safer and more ergonomic developer-facing abstraction over them.

## 3. Problem Statement

MIP-4 provides a powerful low-level primitive, but developers still need to decide how to use it correctly.

Without ReserveGuard, Monad developers must repeatedly solve the same problems:

- Calling the MIP-4 precompile directly
- Handling raw precompile behavior and failure modes
- Deciding where reserve checks should occur
- Creating reusable reserve assertions
- Creating reserve-aware modifiers and base contracts
- Standardizing reserve-related error handling
- Avoiding unnecessary execution after a reserve violation already exists
- Making reserve-aware logic understandable to auditors and maintainers

Without a shared abstraction layer, every Monad application is likely to reimplement similar reserve safety logic independently.

ReserveGuard standardizes reserve-aware execution patterns so application developers can build against clear, reusable primitives instead of raw precompile calls.

## 4. Vision

ReserveGuard should become the default Solidity library for reserve-aware execution on Monad.

Developers should think in terms of:

```solidity
ReserveGuard.dipped()
ReserveGuard.assertHealthy()
ReserveGuard.checkpoint()
ReserveAware
ReserveProtected
reserveHealthy
```

instead of manually interacting with the MIP-4 precompile.

V1 is intentionally narrow: detect reserve violations and fail earlier. Future versions may expand toward adaptive execution:

```text
Detect -> Adapt -> Recover -> Continue
```

## 5. Goals

### 5.1 Primary Goals

- Provide a simple Solidity interface for reserve state detection
- Eliminate routine direct interaction with the MIP-4 precompile
- Introduce reusable reserve safety assertions
- Introduce explicit reserve checkpoints
- Introduce reusable reserve-aware modifiers
- Provide optional abstract base contracts for common integration patterns
- Standardize reserve violation errors
- Provide examples, documentation, and tests sufficient for real integration

### 5.2 Secondary Goals

- Improve developer experience for Monad builders
- Encourage safe adoption of MIP-4
- Establish common reserve-aware design patterns
- Make reserve logic easier for auditors to review
- Create a foundation for future reserve-aware execution frameworks

## 6. Non-Goals for V1

The following are explicitly out of scope for the first release:

- Automated recovery systems
- Adaptive execution engines
- Reserve-aware workflow engines
- Transaction simulation tooling
- Monitoring infrastructure
- Analytics dashboards
- Frontend SDKs
- TypeScript SDK
- Flash loan frameworks
- Self-healing contract frameworks
- Full account abstraction frameworks

These may be explored after the ecosystem has more practical experience with MIP-4.

## 7. Target Users

### 7.1 Primary Users

- Solidity developers building on Monad
- Protocol teams
- DeFi application developers
- Account abstraction developers
- Infrastructure teams

### 7.2 Secondary Users

- Smart contract auditors
- Security researchers
- Hackathon participants
- Educational content creators

## 8. User Stories

### Smart Contract Developer

As a smart contract developer, I want to check reserve state through a simple Solidity function so I do not need to interact directly with the MIP-4 precompile.

### Protocol Developer

As a protocol developer, I want reusable reserve assertions so reserve safety checks are standardized across my contracts.

### DeFi Developer

As a DeFi developer, I want reserve checkpoints between major execution steps so my contract can fail before performing additional work after a violation is detected.

### Account Abstraction Developer

As an account abstraction developer, I want predictable reserve-aware primitives so bundler, paymaster, or entrypoint-style contracts can reason about reserve state during execution.

### Auditor

As an auditor, I want a common reserve safety library so reserve-related logic is easier to identify, reason about, and review.

## 9. Design Principles

### Explicit Over Implicit

Reserve checks should happen at clearly defined checkpoints. Developers should intentionally decide where reserve safety boundaries exist.

### Lightweight By Default

ReserveGuard should introduce minimal overhead beyond the MIP-4 precompile call itself.

### Solidity-Native Ergonomics

ReserveGuard should feel familiar to Solidity developers through libraries, modifiers, abstract contracts, and custom errors.

### Framework Path, Library Core

V1 should be a small library, but its architecture should leave room for future framework-level features.

### MIP-4 Compatibility

ReserveGuard must preserve MIP-4 behavior and avoid hiding important protocol semantics from developers who need to reason about them.

## 10. Product Scope

### 10.1 V1 Included

V1 includes:

- `IReserveBalance` interface
- `ReserveGuard` library
- `ReserveGuard.dipped()`
- `ReserveGuard.assertHealthy()`
- `ReserveGuard.checkpoint()`
- `ReserveAware` abstract contract
- `ReserveProtected` abstract contract, if it meaningfully differs from `ReserveAware`
- `reserveHealthy` modifier
- `ReserveViolation` custom error
- Unit tests
- Integration-test scaffolding or documented Monad testnet integration path
- Example contracts
- README and docs

### 10.2 Deferred Features

Deferred features include:

- Recovery hooks
- Recovery policies
- Adaptive execution helpers
- Safe execution wrappers
- Reserve flow engine
- Self-healing contracts
- TypeScript SDK
- Monitoring and analytics
- Reference DeFi frameworks

## 11. Functional Requirements

### FR-1: Reserve Detection

The library must expose reserve introspection through a simple Solidity API.

```solidity
bool unhealthy = ReserveGuard.dipped();
```

Behavior:

- Calls the MIP-4 reserve balance precompile at `0x1001`
- Uses the `dippedIntoReserve()` selector
- Returns the current reserve violation state
- Does not modify contract storage
- Propagates failure if the precompile call fails

### FR-2: Reserve Assertions

The library must expose assertion helpers that halt execution when reserve state is unhealthy.

```solidity
ReserveGuard.assertHealthy();
```

Behavior:

- Calls reserve detection
- Reverts if reserve violation exists
- Uses a ReserveGuard-specific custom error

### FR-3: Reserve Checkpoints

The library must expose a checkpoint helper for explicit reserve safety boundaries.

```solidity
ReserveGuard.checkpoint();
```

Behavior:

- Semantically equivalent to `assertHealthy()` in V1
- Communicates developer intent at execution boundaries
- Provides a stable API for future richer checkpoint behavior

Example:

```solidity
function execute() external {
    swap();
    ReserveGuard.checkpoint();

    borrow();
    ReserveGuard.checkpoint();

    stake();
}
```

### FR-4: Reserve-Aware Modifier

The project must provide a reusable modifier for enforcing healthy reserve state.

```solidity
modifier reserveHealthy()
```

Behavior:

- Executes a reserve check
- Reverts when reserve state is unhealthy
- Can be used by inheriting from an abstract base contract

### FR-5: Reserve-Aware Base Contracts

The project must provide optional abstract contracts that simplify integration.

```solidity
contract LendingVault is ReserveAware {
    function withdraw() external reserveHealthy {
        // ...
    }
}
```

At minimum, V1 must include `ReserveAware`.

`ReserveProtected` should be included only if it has a clear, distinct role. For example:

- `ReserveAware`: exposes internal helpers and modifiers
- `ReserveProtected`: applies stricter patterns or additional wrapper behavior

If no meaningful distinction exists during implementation, `ReserveProtected` should be deferred.

### FR-6: Standardized Errors

The project must define a custom error for reserve violations.

```solidity
error ReserveViolation();
```

Future versions may add more granular errors if real usage requires them.

### FR-7: Low-Level Precompile Interface

The project must expose an interface matching MIP-4.

```solidity
interface IReserveBalance {
    function dippedIntoReserve() external returns (bool);
}
```

The high-level API should be preferred in examples and documentation.

## 12. Proposed Architecture

### 12.1 Repository Structure

```text
contracts/
  ReserveGuard.sol
  interfaces/
    IReserveBalance.sol
  abstract/
    ReserveAware.sol
    ReserveProtected.sol

examples/
  CheckpointedExecutor.sol
  ReserveAwareVault.sol
  ReserveProtectedRouter.sol
  testnet/
    Testnet7702AgentWalletGuard.sol

test/

docs/
  overview.md
  mip4.md
  architecture.md
  use-cases.md
```

### 12.2 Interface Layer

```solidity
interface IReserveBalance {
    function dippedIntoReserve() external returns (bool);
}
```

### 12.3 Library Layer

```solidity
library ReserveGuard {
    error ReserveViolation();

    address internal constant RESERVE_BALANCE_PRECOMPILE = address(0x1001);

    function dipped() internal returns (bool);

    function assertHealthy() internal;

    function checkpoint() internal;
}
```

### 12.4 Abstract Contract Layer

```solidity
abstract contract ReserveAware {
    modifier reserveHealthy();

    function _reserveDipped() internal returns (bool);

    function _assertReserveHealthy() internal;
}
```

## 13. Developer Experience

### 13.1 Direct Library Usage

```solidity
function execute() external {
    swap();

    ReserveGuard.assertHealthy();

    borrow();

    ReserveGuard.assertHealthy();
}
```

### 13.2 Checkpoint Usage

```solidity
function execute() external {
    swap();
    ReserveGuard.checkpoint();

    borrow();
    ReserveGuard.checkpoint();

    stake();
}
```

### 13.3 Modifier Usage

```solidity
contract LendingVault is ReserveAware {
    function withdraw() external reserveHealthy {
        // ...
    }
}
```

## 14. Example Execution Flow

Without ReserveGuard:

```text
Swap
  -> Borrow
  -> Stake
  -> Reserve violation remains at end of execution
  -> Transaction reverts
```

With ReserveGuard:

```text
Swap
  -> Checkpoint
  -> Reserve violation detected
  -> Fail before Borrow and Stake
```

## 15. Testing Requirements

### 15.1 Unit Tests

V1 should target 100% coverage for ReserveGuard contracts.

Required coverage:

- Reserve detection returns healthy state
- Reserve detection returns unhealthy state
- Assertion succeeds when healthy
- Assertion reverts when unhealthy
- Checkpoint succeeds when healthy
- Checkpoint reverts when unhealthy
- Modifier succeeds when healthy
- Modifier reverts when unhealthy
- Precompile call failure behavior is handled or propagated as designed

### 15.2 Integration Tests

Integration tests should be run against a Monad environment that supports MIP-4 when available.

Scenarios:

- Healthy reserve state
- Reserve violation state
- Multiple contract calls in one transaction
- Nested calls
- Reserve state checked at different call depths

### 15.3 Mocking Strategy

Because the MIP-4 precompile may not be available in local EVM tooling by default, tests should include either:

- A local mock contract at the precompile address, if supported by the framework
- A test wrapper that allows dependency injection for the reserve balance interface
- Fork or testnet integration tests for protocol-accurate behavior

The final implementation should document the chosen approach.

## 16. Documentation Requirements

### 16.1 README

The README must include:

- Project overview
- Installation instructions
- Basic usage examples
- API reference
- MIP-4 explanation
- Testing instructions
- Security notes

### 16.2 Docs

Required docs:

- `docs/overview.md`
- `docs/mip4.md`
- `docs/architecture.md`
- `docs/use-cases.md`

### 16.3 MIP-4 Notes

Documentation should clearly explain:

- What `dippedIntoReserve()` means
- Why reserve checks are useful mid-execution
- That ReserveGuard does not prevent all reserve-related reverts
- That a transaction may still revert if it ends in reserve violation
- That checkpoints are explicit fail-fast boundaries, not automatic recovery

## 17. Security Considerations

ReserveGuard is a thin abstraction over a read-only precompile, but incorrect usage can still create bad assumptions.

The documentation and examples must make clear:

- `dipped()` reports current transaction execution state, not future safety
- A healthy checkpoint does not guarantee the transaction will remain healthy later
- An unhealthy state may be recoverable later in the same transaction, depending on Monad reserve mechanics and application behavior
- `checkpoint()` intentionally fails early in V1 instead of attempting recovery
- Frequent reserve checks cost gas and should be placed intentionally

## 18. Success Metrics

### 18.1 Adoption Metrics

- Monad ecosystem integrations
- Contracts importing ReserveGuard
- GitHub stars
- External contributors
- Example projects built with ReserveGuard

### 18.2 Developer Experience Metrics

- Time required to integrate a reserve check
- Documentation completeness
- API simplicity
- Community feedback
- Auditor feedback

### 18.3 Quality Metrics

- V1 contract test coverage
- Number of documented examples
- Number of known integration issues
- Clarity of MIP-4 compatibility documentation

## 19. Roadmap

### V1: Detect -> Fail Earlier

Features:

- Detection
- Assertions
- Checkpoints
- Base contracts
- Modifiers
- Standard errors
- Examples and docs

### V2: Detect -> Adapt

Potential features:

- Recovery hooks
- Recovery policies
- Execution strategies
- Custom checkpoint metadata
- More granular errors

### V3: Detect -> Adapt -> Recover -> Continue

Potential features:

- Reserve flow engine
- Self-healing contract patterns
- Adaptive transaction framework
- Reserve-aware DeFi primitives

### V4: Ecosystem Integrations

Potential features:

- Reserve-aware agent wallet executor
- Reserve-aware router
- Account abstraction integrations
- Monitoring and analytics
- TypeScript SDK

## 20. Open Questions

1. Can reserve state transition from healthy to violation to healthy within a single transaction?
2. Are reserve violations expected to be recoverable during execution in common real-world flows?
3. Should V1 include `ReserveProtected`, or should it wait until there is a distinct abstraction beyond `ReserveAware`?
4. Should ReserveGuard expose only high-level abstractions in docs, or also document low-level precompile access for advanced users?
5. What gas optimization opportunities exist around repeated reserve checks?
6. Should V1 assertions support only `ReserveViolation()`, or allow caller-defined errors later?
7. What reserve-aware patterns emerge after Monad developers begin using MIP-4 in production-like applications?

## 21. Build Readiness Checklist

- Decide Solidity tooling: Foundry, Hardhat, or both
- Define package layout
- Implement `IReserveBalance`
- Implement `ReserveGuard`
- Implement `ReserveAware`
- Decide whether `ReserveProtected` belongs in V1
- Add examples
- Add unit tests
- Add integration-test strategy
- Write README
- Write docs
- Validate behavior against MIP-4-compatible Monad environment
