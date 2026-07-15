// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { TestnetReserveProbe } from "../examples/testnet/TestnetReserveProbe.sol";
import { TestnetRefundSink } from "../examples/testnet/TestnetRefundSink.sol";
import { TestnetNoopRefundSink } from "../examples/testnet/TestnetNoopRefundSink.sol";
import { TestnetDrainRestore } from "../examples/testnet/TestnetDrainRestore.sol";
import {
    Testnet7702DelegatedDrainRestore
} from "../examples/testnet/Testnet7702DelegatedDrainRestore.sol";
import { Testnet7702AgentWalletGuard } from "../examples/testnet/Testnet7702AgentWalletGuard.sol";
import {
    Testnet7702RecoverableAgentWallet
} from "../examples/testnet/Testnet7702RecoverableAgentWallet.sol";
import {
    Testnet7702TracedDrainRestore
} from "../examples/testnet/Testnet7702TracedDrainRestore.sol";

interface Vm {
    function envUint(string calldata key) external returns (uint256);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployTestnetExperiments {
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    event Deployed(
        address reserveProbe,
        address refundSink,
        address drainRestore,
        address delegatedDrainRestoreImplementation,
        address tracedDelegatedDrainRestoreImplementation,
        address agentWalletGuardImplementation,
        address recoverableAgentWalletImplementation,
        address noopRefundSink
    );

    function run()
        external
        returns (
            address reserveProbeAddress,
            address refundSinkAddress,
            address drainRestoreAddress,
            address delegatedDrainRestoreImplementationAddress,
            address tracedDelegatedDrainRestoreImplementationAddress,
            address agentWalletGuardImplementationAddress,
            address recoverableAgentWalletImplementationAddress,
            address noopRefundSinkAddress
        )
    {
        uint256 privateKey = VM.envUint("PRIVATE_KEY");

        VM.startBroadcast(privateKey);

        reserveProbeAddress = address(new TestnetReserveProbe());
        refundSinkAddress = address(new TestnetRefundSink());
        drainRestoreAddress = address(new TestnetDrainRestore());
        delegatedDrainRestoreImplementationAddress = address(new Testnet7702DelegatedDrainRestore());
        tracedDelegatedDrainRestoreImplementationAddress =
            address(new Testnet7702TracedDrainRestore());
        agentWalletGuardImplementationAddress = address(new Testnet7702AgentWalletGuard());
        recoverableAgentWalletImplementationAddress =
            address(new Testnet7702RecoverableAgentWallet());
        noopRefundSinkAddress = address(new TestnetNoopRefundSink());

        VM.stopBroadcast();

        emit Deployed(
            reserveProbeAddress,
            refundSinkAddress,
            drainRestoreAddress,
            delegatedDrainRestoreImplementationAddress,
            tracedDelegatedDrainRestoreImplementationAddress,
            agentWalletGuardImplementationAddress,
            recoverableAgentWalletImplementationAddress,
            noopRefundSinkAddress
        );
    }
}
