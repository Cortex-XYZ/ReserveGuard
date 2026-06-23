// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { TestnetReserveProbe } from "../examples/testnet/TestnetReserveProbe.sol";
import { TestnetRefundSink } from "../examples/testnet/TestnetRefundSink.sol";
import { TestnetDrainRestore } from "../examples/testnet/TestnetDrainRestore.sol";
import {
    Testnet7702DelegatedDrainRestore
} from "../examples/testnet/Testnet7702DelegatedDrainRestore.sol";

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
        address delegatedDrainRestoreImplementation
    );

    function run()
        external
        returns (
            address reserveProbeAddress,
            address refundSinkAddress,
            address drainRestoreAddress,
            address delegatedDrainRestoreImplementationAddress
        )
    {
        uint256 privateKey = VM.envUint("PRIVATE_KEY");

        VM.startBroadcast(privateKey);

        TestnetReserveProbe reserveProbe = new TestnetReserveProbe();
        TestnetRefundSink refundSink = new TestnetRefundSink();
        TestnetDrainRestore drainRestore = new TestnetDrainRestore();
        Testnet7702DelegatedDrainRestore delegatedImplementation =
            new Testnet7702DelegatedDrainRestore();

        VM.stopBroadcast();

        reserveProbeAddress = address(reserveProbe);
        refundSinkAddress = address(refundSink);
        drainRestoreAddress = address(drainRestore);
        delegatedDrainRestoreImplementationAddress = address(delegatedImplementation);

        emit Deployed(
            reserveProbeAddress,
            refundSinkAddress,
            drainRestoreAddress,
            delegatedDrainRestoreImplementationAddress
        );
    }
}
