// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveGuard } from "../../contracts/ReserveGuard.sol";

contract TestnetReserveProbe {
    bool public lastDipped;

    event ReserveObservation(
        string label,
        address indexed account,
        address indexed caller,
        uint256 balance,
        bool dipped
    );

    function probe(string calldata label) external returns (bool dipped) {
        dipped = ReserveGuard.dipped();
        lastDipped = dipped;

        emit ReserveObservation(label, address(this), msg.sender, address(this).balance, dipped);
    }
}
