// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveGuard } from "../contracts/ReserveGuard.sol";
import { ReserveAware } from "../contracts/abstract/ReserveAware.sol";
import { ReserveProtected } from "../contracts/abstract/ReserveProtected.sol";

interface Vm {
    function clearMockedCalls() external;
    function expectRevert(bytes calldata revertData) external;
    function expectRevert(bytes4 revertData) external;
    function mockCall(address callee, bytes calldata data, bytes calldata returnData) external;
    function mockCallRevert(address callee, bytes calldata data, bytes calldata revertData) external;
}

contract ReserveGuardHarness {
    function dipped() external returns (bool) {
        return ReserveGuard.dipped();
    }

    function assertHealthy() external {
        ReserveGuard.assertHealthy();
    }

    function checkpoint() external {
        ReserveGuard.checkpoint();
    }
}

contract ReserveAwareHarness is ReserveAware {
    function guarded() external reserveHealthy returns (bool) {
        return true;
    }

    function reserveDipped() external returns (bool) {
        return _reserveDipped();
    }
}

contract ReserveProtectedHarness is ReserveProtected {
    function protectedCall() external reserveProtected returns (bool) {
        return true;
    }
}

contract ReserveProtectedFlippingHarness is ReserveProtected {
    address internal constant RESERVE_BALANCE_PRECOMPILE = address(0x1001);
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function protectedCallThatDips() external reserveProtected returns (bool) {
        VM.mockCall(
            RESERVE_BALANCE_PRECOMPILE,
            abi.encodeWithSignature("dippedIntoReserve()"),
            abi.encode(true)
        );
        return true;
    }
}

contract ReserveGuardTest {
    address internal constant RESERVE_BALANCE_PRECOMPILE = address(0x1001);
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    ReserveGuardHarness internal guard;
    ReserveAwareHarness internal aware;
    ReserveProtectedHarness internal protectedHarness;
    ReserveProtectedFlippingHarness internal flippingProtectedHarness;

    function setUp() external {
        guard = new ReserveGuardHarness();
        aware = new ReserveAwareHarness();
        protectedHarness = new ReserveProtectedHarness();
        flippingProtectedHarness = new ReserveProtectedFlippingHarness();
    }

    function testDippedReturnsFalseWhenHealthy() external {
        _setDipped(false);

        bool dipped = guard.dipped();

        _assertFalse(dipped);
    }

    function testDippedReturnsTrueWhenUnhealthy() external {
        _setDipped(true);

        bool dipped = guard.dipped();

        _assertTrue(dipped);
    }

    function testAssertHealthySucceedsWhenHealthy() external {
        _setDipped(false);

        guard.assertHealthy();
    }

    function testAssertHealthyRevertsWhenUnhealthy() external {
        _setDipped(true);

        VM.expectRevert(ReserveGuard.ReserveViolation.selector);
        guard.assertHealthy();
    }

    function testDippedPropagatesPrecompileFailure() external {
        bytes memory revertData = bytes("PRECOMPILE_FAILED");
        VM.clearMockedCalls();
        VM.mockCallRevert(
            RESERVE_BALANCE_PRECOMPILE, abi.encodeWithSignature("dippedIntoReserve()"), revertData
        );

        VM.expectRevert(revertData);
        guard.dipped();
    }

    function testCheckpointSucceedsWhenHealthy() external {
        _setDipped(false);

        guard.checkpoint();
    }

    function testCheckpointRevertsWhenUnhealthy() external {
        _setDipped(true);

        VM.expectRevert(ReserveGuard.ReserveViolation.selector);
        guard.checkpoint();
    }

    function testReserveAwareModifierSucceedsWhenHealthy() external {
        _setDipped(false);

        bool ok = aware.guarded();

        _assertTrue(ok);
    }

    function testReserveAwareModifierRevertsWhenUnhealthy() external {
        _setDipped(true);

        VM.expectRevert(ReserveGuard.ReserveViolation.selector);
        aware.guarded();
    }

    function testReserveProtectedChecksBeforeExecution() external {
        _setDipped(true);

        VM.expectRevert(ReserveGuard.ReserveViolation.selector);
        protectedHarness.protectedCall();
    }

    function testReserveProtectedChecksAfterExecution() external {
        _setDipped(false);

        VM.expectRevert(ReserveGuard.ReserveViolation.selector);
        flippingProtectedHarness.protectedCallThatDips();
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
}
