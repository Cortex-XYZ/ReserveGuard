// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal smart account used as a UserOperation target in the ERC-4337 bundler experiment.
/// @dev Holds MON on behalf of a user. The bundler calls execute() to carry out each UserOperation.
///      In a real ERC-4337 system this would also handle signature verification and nonce management.
///      For this experiment those are omitted so the reserve violation behaviour stays observable.
contract TestnetUserAccount {
    /// @notice The owner of this account. Only the owner or bundler may call execute().
    address public immutable owner;

    event Executed(address indexed to, uint256 value, bool success);

    constructor(address _owner) {
        owner = _owner;
    }

    receive() external payable {}

    /// @notice Execute a single UserOperation: send `value` MON to `to`.
    /// @dev Called by the bundler once per UserOp. Returns false rather than reverting
    ///      so the bundler can observe the result and decide how to proceed.
    function execute(address to, uint256 value)
        external
        returns (bool success)
    {
        (success,) = to.call{ value: value }("");
        emit Executed(to, value, success);
    }
}