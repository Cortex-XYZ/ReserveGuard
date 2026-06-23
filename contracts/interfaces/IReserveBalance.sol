// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice MIP-4 reserve balance introspection precompile interface.
interface IReserveBalance {
    function dippedIntoReserve() external returns (bool);
}
