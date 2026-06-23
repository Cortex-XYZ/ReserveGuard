// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveGuard } from "../contracts/ReserveGuard.sol";

contract ReserveProbe {
    event ReserveState(address indexed caller, bool dipped);

    function dipped() external returns (bool isDipped) {
        isDipped = ReserveGuard.dipped();
        emit ReserveState(msg.sender, isDipped);
    }

    function assertHealthy() external {
        ReserveGuard.assertHealthy();
        emit ReserveState(msg.sender, false);
    }
}
