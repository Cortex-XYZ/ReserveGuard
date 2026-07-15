// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveTrace } from "../../contracts/experimental/ReserveTrace.sol";
import { TestnetRefundSink } from "./TestnetRefundSink.sol";

/// @notice EIP-7702 implementation that visualizes reserve state with ReserveTrace labels.
contract Testnet7702TracedDrainRestore {
    bytes32 public constant BEFORE_DRAIN = keccak256("reserveguard.7702.before-drain");
    bytes32 public constant DURING_DRAIN = keccak256("reserveguard.7702.during-drain");
    bytes32 public constant AFTER_RESTORE = keccak256("reserveguard.7702.after-restore");

    bool public lastBeforeDip;
    bool public lastDuringDip;
    bool public lastAfterDip;

    uint256 public lastBeforeBalance;
    uint256 public lastDuringBalance;
    uint256 public lastAfterBalance;

    receive() external payable {}

    function drainRestore(TestnetRefundSink sink, uint256 amount)
        external
        returns (bool beforeDip, bool duringDip, bool afterDip)
    {
        lastBeforeBalance = address(this).balance;
        beforeDip = ReserveTrace.observe(BEFORE_DRAIN);
        lastBeforeDip = beforeDip;

        (bool sent,) = address(sink).call{ value: amount }("");
        require(sent, "DRAIN_FAILED");

        lastDuringBalance = address(this).balance;
        duringDip = ReserveTrace.observe(DURING_DRAIN);
        lastDuringDip = duringDip;

        sink.refund(payable(address(this)), amount);

        lastAfterBalance = address(this).balance;
        afterDip = ReserveTrace.observe(AFTER_RESTORE);
        lastAfterDip = afterDip;
    }
}
