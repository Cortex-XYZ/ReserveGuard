// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { TestnetBundler } from "../examples/testnet/TestnetBundler.sol";
import { TestnetUserAccount } from "../examples/testnet/TestnetUserAccount.sol";

interface Vm {
    function envUint(string calldata key) external returns (uint256);
    function envAddress(string calldata key) external returns (address);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// @notice Deploys the ERC-4337 bundler experiment contracts.
/// @dev Deploys one TestnetBundler and three TestnetUserAccounts (one per UserOp slot).
///      After deployment, fund each account above 10 MON before running the bundle.
///      The sponsor wallet (PRIVATE_KEY) pays deployment gas.
contract DeployBundlerExperiment {
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    event Deployed(
        address bundler,
        address userAccountA,
        address userAccountB,
        address userAccountC
    );

    function run()
        external
        returns (
            address bundlerAddress,
            address userAccountAAddress,
            address userAccountBAddress,
            address userAccountCAddress
        )
    {
        uint256 privateKey = VM.envUint("PRIVATE_KEY");
        address owner = VM.envAddress("SPONSOR_ADDRESS");

        VM.startBroadcast(privateKey);

        TestnetBundler bundler = new TestnetBundler();

        // three separate smart accounts — one per UserOp in the experiment bundle
        // account A: safe op (small send, stays above reserve)
        // account B: violating op (large send, dips below 10 MON reserve)
        // account C: safe op (small send, stays above reserve)
        TestnetUserAccount userAccountA = new TestnetUserAccount(owner);
        TestnetUserAccount userAccountB = new TestnetUserAccount(owner);
        TestnetUserAccount userAccountC = new TestnetUserAccount(owner);

        VM.stopBroadcast();

        bundlerAddress = address(bundler);
        userAccountAAddress = address(userAccountA);
        userAccountBAddress = address(userAccountB);
        userAccountCAddress = address(userAccountC);

        emit Deployed(
            bundlerAddress,
            userAccountAAddress,
            userAccountBAddress,
            userAccountCAddress
        );
    }
}