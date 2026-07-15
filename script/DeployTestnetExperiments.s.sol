// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { TestnetReserveProbe } from "../examples/testnet/TestnetReserveProbe.sol";
import { TestnetRefundSink } from "../examples/testnet/TestnetRefundSink.sol";
import { TestnetDrainRestore } from "../examples/testnet/TestnetDrainRestore.sol";
import {
    Testnet7702DelegatedDrainRestore
} from "../examples/testnet/Testnet7702DelegatedDrainRestore.sol";
import { Testnet7702AgentWalletGuard } from "../examples/testnet/Testnet7702AgentWalletGuard.sol";
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
        address agentWalletGuardImplementation
    );

    function run()
        external
        returns (
            address reserveProbeAddress,
            address refundSinkAddress,
            address drainRestoreAddress,
            address delegatedDrainRestoreImplementationAddress,
            address tracedDelegatedDrainRestoreImplementationAddress,
            address agentWalletGuardImplementationAddress
        )
    {
        uint256 privateKey = VM.envUint("PRIVATE_KEY");

        VM.startBroadcast(privateKey);

        TestnetReserveProbe reserveProbe = new TestnetReserveProbe();
        TestnetRefundSink refundSink = new TestnetRefundSink();
        TestnetDrainRestore drainRestore = new TestnetDrainRestore();
        Testnet7702DelegatedDrainRestore delegatedImplementation =
            new Testnet7702DelegatedDrainRestore();
        Testnet7702TracedDrainRestore tracedDelegatedImplementation =
            new Testnet7702TracedDrainRestore();
        Testnet7702AgentWalletGuard agentWalletGuardImplementation =
            new Testnet7702AgentWalletGuard();

        VM.stopBroadcast();

        reserveProbeAddress = address(reserveProbe);
        refundSinkAddress = address(refundSink);
        drainRestoreAddress = address(drainRestore);
        delegatedDrainRestoreImplementationAddress = address(delegatedImplementation);
        tracedDelegatedDrainRestoreImplementationAddress = address(tracedDelegatedImplementation);
        agentWalletGuardImplementationAddress = address(agentWalletGuardImplementation);

        emit Deployed(
            reserveProbeAddress,
            refundSinkAddress,
            drainRestoreAddress,
            delegatedDrainRestoreImplementationAddress,
            tracedDelegatedDrainRestoreImplementationAddress,
            agentWalletGuardImplementationAddress
        );
    }
}
