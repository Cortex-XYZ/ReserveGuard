// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveGuard } from "../contracts/ReserveGuard.sol";

contract FlashLoanExample {
    event Step(string name);

    function execute() external {
        emit Step("borrow");
        ReserveGuard.checkpoint();

        emit Step("use-liquidity");
        ReserveGuard.checkpoint();

        emit Step("repay");
    }
}
