// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveAware } from "../contracts/abstract/ReserveAware.sol";

contract ReserveAwareVault is ReserveAware {
    mapping(address account => uint256 balance) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external reserveHealthy {
        balances[msg.sender] -= amount;

        (bool ok,) = msg.sender.call{ value: amount }("");
        require(ok, "WITHDRAW_FAILED");
    }
}
