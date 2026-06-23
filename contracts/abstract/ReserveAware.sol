// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveGuard } from "../ReserveGuard.sol";

/// @notice Optional base contract for reserve-aware Monad applications.
abstract contract ReserveAware {
    modifier reserveHealthy() {
        ReserveGuard.assertHealthy();
        _;
    }

    function _reserveDipped() internal returns (bool) {
        return ReserveGuard.dipped();
    }

    function _assertReserveHealthy() internal {
        ReserveGuard.assertHealthy();
    }

    function _reserveCheckpoint() internal {
        ReserveGuard.checkpoint();
    }
}
