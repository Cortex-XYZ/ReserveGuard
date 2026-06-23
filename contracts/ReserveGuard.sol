// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IReserveBalance } from "./interfaces/IReserveBalance.sol";

/// @notice Reserve-aware execution helpers for Monad's MIP-4 precompile.
library ReserveGuard {
    error ReserveViolation();

    address internal constant RESERVE_BALANCE_PRECOMPILE = address(0x1001);

    /// @notice Returns true when the current transaction execution state is in reserve violation.
    function dipped() internal returns (bool) {
        return IReserveBalance(RESERVE_BALANCE_PRECOMPILE).dippedIntoReserve();
    }

    /// @notice Reverts if the current execution state has dipped into reserve.
    function assertHealthy() internal {
        if (dipped()) {
            revert ReserveViolation();
        }
    }

    /// @notice Explicit reserve safety boundary.
    /// @dev V1 behavior is equivalent to assertHealthy().
    function checkpoint() internal {
        assertHealthy();
    }
}
