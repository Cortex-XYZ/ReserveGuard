// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveTrace } from "../../contracts/experimental/ReserveTrace.sol";

contract TracedExecutor {
    bytes32 public constant BEFORE_WORK = keccak256("reserveguard.before-work");
    bytes32 public constant AFTER_WORK = keccak256("reserveguard.after-work");

    event WorkExecuted(address indexed caller);

    function execute() external returns (bool beforeDip) {
        beforeDip = ReserveTrace.observe(BEFORE_WORK);

        emit WorkExecuted(msg.sender);

        ReserveTrace.checkpoint(AFTER_WORK);
    }
}
