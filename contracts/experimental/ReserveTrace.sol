// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveGuard } from "../ReserveGuard.sol";

/// @notice Experimental labeled reserve observations and checkpoints.
/// @dev This module is not part of the stable V1 API.
library ReserveTrace {
    error ReserveTraceViolation(bytes32 checkpoint);

    event ReserveObserved(
        bytes32 indexed checkpoint,
        address indexed account,
        address indexed caller,
        uint256 balance,
        bool dipped
    );

    event ReserveCheckpoint(
        bytes32 indexed checkpoint,
        address indexed account,
        address indexed caller,
        uint256 balance,
        bool dipped
    );

    /// @notice Records the current reserve state without reverting.
    function observe(bytes32 checkpoint_) internal returns (bool dipped) {
        dipped = ReserveGuard.dipped();
        emit ReserveObserved(checkpoint_, address(this), msg.sender, address(this).balance, dipped);
    }

    /// @notice Records a healthy labeled reserve boundary, or reverts with the label.
    function checkpoint(bytes32 checkpoint_) internal {
        bool dipped = ReserveGuard.dipped();

        if (dipped) {
            revert ReserveTraceViolation(checkpoint_);
        }

        emit ReserveCheckpoint(checkpoint_, address(this), msg.sender, address(this).balance, false);
    }
}
