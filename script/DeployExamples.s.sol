// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveProbe } from "../examples/ReserveProbe.sol";
import { CheckpointedExecutor } from "../examples/CheckpointedExecutor.sol";
import { ReserveAwareVault } from "../examples/ReserveAwareVault.sol";
import { ReserveProtectedRouter } from "../examples/ReserveProtectedRouter.sol";

interface Vm {
    function envUint(string calldata key) external returns (uint256);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployExamples {
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    event Deployed(
        address reserveProbe,
        address checkpointedExecutor,
        address reserveAwareVault,
        address reserveProtectedRouter
    );

    function run()
        external
        returns (
            address reserveProbeAddress,
            address checkpointedExecutorAddress,
            address reserveAwareVaultAddress,
            address reserveProtectedRouterAddress
        )
    {
        uint256 privateKey = VM.envUint("PRIVATE_KEY");

        VM.startBroadcast(privateKey);

        ReserveProbe reserveProbe = new ReserveProbe();
        CheckpointedExecutor checkpointedExecutor = new CheckpointedExecutor();
        ReserveAwareVault reserveAwareVault = new ReserveAwareVault();
        ReserveProtectedRouter reserveProtectedRouter = new ReserveProtectedRouter();

        VM.stopBroadcast();

        reserveProbeAddress = address(reserveProbe);
        checkpointedExecutorAddress = address(checkpointedExecutor);
        reserveAwareVaultAddress = address(reserveAwareVault);
        reserveProtectedRouterAddress = address(reserveProtectedRouter);

        emit Deployed(
            reserveProbeAddress,
            checkpointedExecutorAddress,
            reserveAwareVaultAddress,
            reserveProtectedRouterAddress
        );
    }
}
