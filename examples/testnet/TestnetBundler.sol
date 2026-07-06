// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveGuard } from "../../contracts/ReserveGuard.sol";
import { TestnetUserAccount } from "./TestnetUserAccount.sol";

/// @notice ERC-4337-style bundler experiment demonstrating MIP-4 reserve introspection.
/// @dev Processes a batch of UserOperations in a single transaction. After each op it calls
///      dippedIntoReserve() to check whether any account touched in the transaction has
///      crossed below the 10 MON reserve threshold. If a violation is detected the offending
///      op is recorded and the remaining ops continue — exactly the behaviour MIP-4 enables
///      for bundlers that would otherwise have no way to identify the offending UserOp.
contract TestnetBundler {
    /// @notice Represents a single UserOperation: a target account plus the MON amount to send.
    struct UserOp {
        TestnetUserAccount account;
        address to;
        uint256 value;
    }

    /// @notice Result recorded for each UserOp after execution.
    struct OpResult {
        uint256 index;
        bool executed;
        bool dippedAfter;
        uint256 balanceAfter;
    }

    OpResult[] public lastResults;

    event BundleExecuted(uint256 opCount, uint256 skippedCount);

    event OpObservation(
        uint256 indexed index,
        address indexed account,
        address indexed to,
        uint256 value,
        bool executed,
        bool dippedAfter,
        uint256 balanceAfter
    );

    /// @notice Execute a bundle of UserOperations, checking reserve state after each op.
    /// @dev If dippedIntoReserve() returns true after an op, that op's effect is recorded
    ///      as a violation and the bundle continues with the next op rather than reverting
    ///      the entire transaction. This isolates the offending UserOp without punishing others.
    function executeBundle(UserOp[] calldata ops) external {
        // clear results from any previous bundle run
        delete lastResults;

        uint256 skippedCount = 0;

        for (uint256 i = 0; i < ops.length; i++) {
            UserOp calldata op = ops[i];

            // execute the UserOp — send MON from the smart account to the target
            bool executed = op.account.execute(op.to, op.value);

            // check reserve state across ALL accounts touched so far in this transaction
            bool dipped = ReserveGuard.dipped();

            uint256 balanceAfter = address(op.account).balance;

            lastResults.push(OpResult({
                index: i,
                executed: executed,
                dippedAfter: dipped,
                balanceAfter: balanceAfter
            }));

            emit OpObservation(
                i,
                address(op.account),
                op.to,
                op.value,
                executed,
                dipped,
                balanceAfter
            );

            if (dipped) {
                skippedCount++;
            }
        }

        emit BundleExecuted(ops.length, skippedCount);
    }

    /// @notice Returns the number of results recorded from the last bundle run.
    function lastResultCount() external view returns (uint256) {
        return lastResults.length;
    }
}