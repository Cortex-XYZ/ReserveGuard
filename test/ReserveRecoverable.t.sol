// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveRecoverable } from "../contracts/experimental/abstract/ReserveRecoverable.sol";

interface Vm {
    function clearMockedCalls() external;
    function expectRevert(bytes calldata revertData) external;
    function expectRevert(bytes4 revertData) external;
    function mockCall(address callee, bytes calldata data, bytes calldata returnData) external;
    function mockCallRevert(address callee, bytes calldata data, bytes calldata revertData) external;
}

contract ReserveRecoverableHarness is ReserveRecoverable {
    error RecoveryHookFailed();

    enum RecoveryMode {
        RemainDipped,
        Recover,
        RevertHook,
        FailPostCheck
    }

    address internal constant RESERVE_BALANCE_PRECOMPILE = address(0x1001);
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    RecoveryMode public recoveryMode;
    uint256 public recoveryCalls;
    bytes32 public lastCheckpoint;

    function setRecoveryMode(RecoveryMode mode) external {
        recoveryMode = mode;
    }

    function recoverIfNeeded(bytes32 checkpoint) external returns (bool) {
        return _recoverReserveIfNeeded(checkpoint);
    }

    function _recoverReserve(bytes32 checkpoint) internal override {
        recoveryCalls += 1;
        lastCheckpoint = checkpoint;

        if (recoveryMode == RecoveryMode.RevertHook) {
            revert RecoveryHookFailed();
        }

        if (recoveryMode == RecoveryMode.Recover) {
            VM.mockCall(
                RESERVE_BALANCE_PRECOMPILE,
                abi.encodeWithSignature("dippedIntoReserve()"),
                abi.encode(false)
            );
        }

        if (recoveryMode == RecoveryMode.FailPostCheck) {
            VM.mockCallRevert(
                RESERVE_BALANCE_PRECOMPILE,
                abi.encodeWithSignature("dippedIntoReserve()"),
                bytes("POST_CHECK_FAILED")
            );
        }
    }
}

contract ReserveRecoverableTest {
    address internal constant RESERVE_BALANCE_PRECOMPILE = address(0x1001);
    bytes32 internal constant CHECKPOINT = keccak256("reserveguard.recovery.test");
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    ReserveRecoverableHarness internal recoverable;

    function setUp() external {
        recoverable = new ReserveRecoverableHarness();
    }

    function testHealthyStateSkipsRecovery() external {
        _setDipped(false);

        bool recovered = recoverable.recoverIfNeeded(CHECKPOINT);

        _assertFalse(recovered);
        _assertEq(recoverable.recoveryCalls(), 0);
    }

    function testDippedStateRecoversAndReturnsTrue() external {
        _setDipped(true);
        recoverable.setRecoveryMode(ReserveRecoverableHarness.RecoveryMode.Recover);

        bool recovered = recoverable.recoverIfNeeded(CHECKPOINT);

        _assertTrue(recovered);
        _assertEq(recoverable.recoveryCalls(), 1);
        _assertEqBytes32(recoverable.lastCheckpoint(), CHECKPOINT);
    }

    function testRecoveryThatRemainsDippedRevertsWithCheckpoint() external {
        _setDipped(true);

        VM.expectRevert(
            abi.encodeWithSelector(ReserveRecoverable.ReserveRecoveryFailed.selector, CHECKPOINT)
        );
        recoverable.recoverIfNeeded(CHECKPOINT);
    }

    function testRecoveryHookRevertPropagates() external {
        _setDipped(true);
        recoverable.setRecoveryMode(ReserveRecoverableHarness.RecoveryMode.RevertHook);

        VM.expectRevert(ReserveRecoverableHarness.RecoveryHookFailed.selector);
        recoverable.recoverIfNeeded(CHECKPOINT);
    }

    function testInitialPrecompileFailurePropagates() external {
        bytes memory revertData = bytes("PRE_CHECK_FAILED");
        VM.clearMockedCalls();
        VM.mockCallRevert(
            RESERVE_BALANCE_PRECOMPILE, abi.encodeWithSignature("dippedIntoReserve()"), revertData
        );

        VM.expectRevert(revertData);
        recoverable.recoverIfNeeded(CHECKPOINT);
    }

    function testPostRecoveryPrecompileFailurePropagates() external {
        _setDipped(true);
        recoverable.setRecoveryMode(ReserveRecoverableHarness.RecoveryMode.FailPostCheck);

        bytes memory revertData = bytes("POST_CHECK_FAILED");
        VM.expectRevert(revertData);
        recoverable.recoverIfNeeded(CHECKPOINT);
    }

    function testIndependentCheckpointsCanRecoverSeparately() external {
        recoverable.setRecoveryMode(ReserveRecoverableHarness.RecoveryMode.Recover);

        _setDipped(true);
        _assertTrue(recoverable.recoverIfNeeded(CHECKPOINT));

        bytes32 secondCheckpoint = keccak256("reserveguard.recovery.second");
        _setDipped(true);
        _assertTrue(recoverable.recoverIfNeeded(secondCheckpoint));

        _assertEq(recoverable.recoveryCalls(), 2);
        _assertEqBytes32(recoverable.lastCheckpoint(), secondCheckpoint);
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

    function _assertEqBytes32(bytes32 actual, bytes32 expected) internal pure {
        require(actual == expected, "ASSERT_EQ_BYTES32_FAILED");
    }
}
