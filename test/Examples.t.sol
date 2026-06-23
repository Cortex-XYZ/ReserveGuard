// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveGuard } from "../contracts/ReserveGuard.sol";
import { CheckpointedExecutor } from "../examples/CheckpointedExecutor.sol";
import { ReserveAwareVault } from "../examples/ReserveAwareVault.sol";
import { ReserveProbe } from "../examples/ReserveProbe.sol";
import { ReserveProtectedRouter } from "../examples/ReserveProtectedRouter.sol";
import {
    Testnet7702DelegatedDrainRestore
} from "../examples/testnet/Testnet7702DelegatedDrainRestore.sol";
import { TestnetDrainRestore } from "../examples/testnet/TestnetDrainRestore.sol";
import { TestnetRefundSink } from "../examples/testnet/TestnetRefundSink.sol";
import { TestnetReserveProbe } from "../examples/testnet/TestnetReserveProbe.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function clearMockedCalls() external;
    function deal(address account, uint256 newBalance) external;
    function expectRevert(bytes4 revertData) external;
    function mockCall(address callee, bytes calldata data, bytes calldata returnData) external;
    function prank(address msgSender) external;
    function signAndAttachDelegation(address implementation, uint256 privateKey) external;
}

contract EchoTarget {
    event Called(address indexed caller, uint256 value, bytes data);

    function echo(bytes calldata data) external payable returns (bytes memory) {
        emit Called(msg.sender, msg.value, data);
        return data;
    }
}

contract ExamplesTest {
    address internal constant RESERVE_BALANCE_PRECOMPILE = address(0x1001);
    uint256 internal constant AUTHORITY_PK = 0xA11CE;
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    receive() external payable { }

    function testReserveProbeReturnsMockedState() external {
        _setDipped(true);

        ReserveProbe probe = new ReserveProbe();

        bool dipped = probe.dipped();

        _assertTrue(dipped);
    }

    function testCheckpointedExecutorRevertsWhenUnhealthy() external {
        _setDipped(true);

        CheckpointedExecutor executor = new CheckpointedExecutor();

        VM.expectRevert(ReserveGuard.ReserveViolation.selector);
        executor.execute();
    }

    function testReserveAwareVaultModifierAllowsHealthyWithdraw() external {
        _setDipped(false);

        ReserveAwareVault vault = new ReserveAwareVault();
        VM.deal(address(this), 1 ether);

        vault.deposit{ value: 1 ether }();
        vault.withdraw(0.25 ether);

        _assertEq(vault.balances(address(this)), 0.75 ether);
    }

    function testReserveProtectedRouterCallsTargetWhenHealthy() external {
        _setDipped(false);

        EchoTarget target = new EchoTarget();
        ReserveProtectedRouter router = new ReserveProtectedRouter();

        bytes memory result =
            router.execute(address(target), abi.encodeCall(EchoTarget.echo, (bytes("hello"))));

        _assertEqBytes(result, abi.encode(bytes("hello")));
    }

    function testTestnetReserveProbeStoresMockedState() external {
        _setDipped(true);

        TestnetReserveProbe probe = new TestnetReserveProbe();

        bool dipped = probe.probe("local");

        _assertTrue(dipped);
        _assertTrue(probe.lastDipped());
    }

    function testTestnetDrainRestoreRecordsBalances() external {
        _setDipped(false);

        TestnetRefundSink sink = new TestnetRefundSink();
        TestnetDrainRestore drainRestore = new TestnetDrainRestore();
        VM.deal(address(drainRestore), 19 ether);

        (bool beforeDip, bool duringDip, bool afterDip) = drainRestore.drainRestore(sink, 10 ether);

        _assertFalse(beforeDip);
        _assertFalse(duringDip);
        _assertFalse(afterDip);
        _assertEq(drainRestore.lastBeforeBalance(), 19 ether);
        _assertEq(drainRestore.lastDuringBalance(), 9 ether);
        _assertEq(drainRestore.lastAfterBalance(), 19 ether);
    }

    function test7702DelegatedDrainRestoreRoutesThroughAuthority() external {
        _setDipped(false);

        address payable authority = payable(VM.addr(AUTHORITY_PK));
        address sponsor = address(0xBEEF);

        TestnetRefundSink sink = new TestnetRefundSink();
        Testnet7702DelegatedDrainRestore implementation = new Testnet7702DelegatedDrainRestore();

        VM.deal(authority, 19 ether);
        VM.deal(sponsor, 1 ether);
        VM.signAndAttachDelegation(address(implementation), AUTHORITY_PK);

        bytes memory code = authority.code;
        _assertEq(code.length, 23);
        _assertEq(uint256(uint8(code[0])), 0xef);
        _assertEq(uint256(uint8(code[1])), 0x01);
        _assertEq(uint256(uint8(code[2])), 0x00);

        VM.prank(sponsor);
        (bool beforeDip, bool duringDip, bool afterDip) =
            Testnet7702DelegatedDrainRestore(authority).drainRestore(sink, 10 ether);

        _assertFalse(beforeDip);
        _assertFalse(duringDip);
        _assertFalse(afterDip);
        _assertEq(authority.balance, 19 ether);
        _assertEq(Testnet7702DelegatedDrainRestore(authority).lastBeforeBalance(), 19 ether);
        _assertEq(Testnet7702DelegatedDrainRestore(authority).lastDuringBalance(), 9 ether);
        _assertEq(Testnet7702DelegatedDrainRestore(authority).lastAfterBalance(), 19 ether);
    }

    function _setDipped(bool value) internal {
        VM.clearMockedCalls();
        VM.mockCall(
            RESERVE_BALANCE_PRECOMPILE,
            abi.encodeWithSignature("dippedIntoReserve()"),
            abi.encode(value)
        );
    }

    function _assertTrue(bool value) internal pure {
        require(value, "ASSERT_TRUE_FAILED");
    }

    function _assertFalse(bool value) internal pure {
        require(!value, "ASSERT_FALSE_FAILED");
    }

    function _assertEq(uint256 actual, uint256 expected) internal pure {
        require(actual == expected, "ASSERT_EQ_FAILED");
    }

    function _assertEqBytes(bytes memory actual, bytes memory expected) internal pure {
        require(keccak256(actual) == keccak256(expected), "ASSERT_EQ_BYTES_FAILED");
    }
}
