// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveGuard } from "../contracts/ReserveGuard.sol";

contract CheckpointedExecutor {
    event Step(address indexed caller, string name);

    function execute() external {
        emit Step(msg.sender, "prepare");
        ReserveGuard.checkpoint();

        emit Step(msg.sender, "execute");
        ReserveGuard.checkpoint();

        emit Step(msg.sender, "settle");
    }
}
