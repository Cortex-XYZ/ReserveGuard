// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveAware } from "./ReserveAware.sol";

/// @notice Stricter reserve-aware base contract that checks before and after protected execution.
abstract contract ReserveProtected is ReserveAware {
    modifier reserveProtected() {
        _assertReserveHealthy();
        _;
        _assertReserveHealthy();
    }
}
