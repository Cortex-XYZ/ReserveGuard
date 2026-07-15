// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveAware } from "../../abstract/ReserveAware.sol";

/// @notice Experimental base contract for application-defined reserve recovery.
/// @dev This module is not part of the stable V1 API.
abstract contract ReserveRecoverable is ReserveAware {
    error ReserveRecoveryFailed(bytes32 checkpoint);

    /// @notice Attempts recovery when the current transaction has dipped into reserve.
    /// @return recovered True when recovery was required and the post-recovery check is healthy.
    function _recoverReserveIfNeeded(bytes32 checkpoint) internal returns (bool recovered) {
        if (!_reserveDipped()) {
            return false;
        }

        _recoverReserve(checkpoint);

        if (_reserveDipped()) {
            revert ReserveRecoveryFailed(checkpoint);
        }

        return true;
    }

    /// @notice Application hook that performs the recovery action for a labeled boundary.
    /// @dev Implementations own authorization, reentrancy protection, accounting, and events.
    function _recoverReserve(bytes32 checkpoint) internal virtual;
}
