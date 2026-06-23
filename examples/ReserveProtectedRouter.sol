// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveProtected } from "../contracts/abstract/ReserveProtected.sol";

contract ReserveProtectedRouter is ReserveProtected {
    event RouteExecuted(address indexed caller, address indexed target, bytes data);

    function execute(address target, bytes calldata data)
        external
        payable
        reserveProtected
        returns (bytes memory result)
    {
        (bool ok, bytes memory returndata) = target.call{ value: msg.value }(data);
        require(ok, "ROUTE_FAILED");

        emit RouteExecuted(msg.sender, target, data);
        return returndata;
    }
}
