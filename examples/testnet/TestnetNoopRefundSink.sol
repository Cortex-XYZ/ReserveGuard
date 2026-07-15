// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Accepts payouts but deliberately performs no refund for recovery-failure testing.
contract TestnetNoopRefundSink {
    receive() external payable {}

    function refund(address payable, uint256) external pure {}
}
