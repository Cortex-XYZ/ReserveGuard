// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveGuard } from "../../contracts/ReserveGuard.sol";
import { TestnetRefundSink } from "./TestnetRefundSink.sol";

/// @notice Implementation intended to be attached to an EIP-7702 delegated EOA.
contract Testnet7702DelegatedDrainRestore {
    bool public lastBeforeDip;
    bool public lastDuringDip;
    bool public lastAfterDip;

    uint256 public lastBeforeBalance;
    uint256 public lastDuringBalance;
    uint256 public lastAfterBalance;

    event ReserveObservation(
        string label,
        address indexed account,
        address indexed caller,
        uint256 balance,
        bool dipped
    );

    receive() external payable {}

    function drainRestore(TestnetRefundSink sink, uint256 amount)
        external
        returns (bool beforeDip, bool duringDip, bool afterDip)
    {
        lastBeforeBalance = address(this).balance;
        beforeDip = ReserveGuard.dipped();
        lastBeforeDip = beforeDip;
        emit ReserveObservation("before", address(this), msg.sender, lastBeforeBalance, beforeDip);

        (bool sent,) = address(sink).call{ value: amount }("");
        require(sent, "DRAIN_FAILED");

        lastDuringBalance = address(this).balance;
        duringDip = ReserveGuard.dipped();
        lastDuringDip = duringDip;
        emit ReserveObservation("during", address(this), msg.sender, lastDuringBalance, duringDip);

        sink.refund(payable(address(this)), amount);

        lastAfterBalance = address(this).balance;
        afterDip = ReserveGuard.dipped();
        lastAfterDip = afterDip;
        emit ReserveObservation("after", address(this), msg.sender, lastAfterBalance, afterDip);
    }
}
