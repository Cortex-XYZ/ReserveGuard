// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveTrace } from "../contracts/experimental/ReserveTrace.sol";
import { TracedExecutor } from "../examples/experimental/TracedExecutor.sol";

interface Vm {
    function clearMockedCalls() external;
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData)
        external;
    function expectRevert(bytes calldata revertData) external;
    function mockCall(address callee, bytes calldata data, bytes calldata returnData) external;
    function mockCallRevert(address callee, bytes calldata data, bytes calldata revertData) external;
}

contract ReserveTraceHarness {
    function observe(bytes32 checkpoint_) external returns (bool) {
        return ReserveTrace.observe(checkpoint_);
    }

    function checkpoint(bytes32 checkpoint_) external {
        ReserveTrace.checkpoint(checkpoint_);
    }
}

contract ReserveTraceTest {
    address internal constant RESERVE_BALANCE_PRECOMPILE = address(0x1001);
    bytes32 internal constant OBSERVE_LABEL = keccak256("reserveguard.observe");
    bytes32 internal constant CHECKPOINT_LABEL = keccak256("reserveguard.checkpoint");
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    ReserveTraceHarness internal trace;

    event ReserveObserved(
        bytes32 indexed checkpoint,
        address indexed account,
        address indexed caller,
        uint256 balance,
        bool dipped
    );

    event ReserveCheckpoint(
        bytes32 indexed checkpoint,
        address indexed account,
        address indexed caller,
        uint256 balance,
        bool dipped
    );

    event WorkExecuted(address indexed caller);

    function setUp() external {
        trace = new ReserveTraceHarness();
    }

    function testObserveReturnsFalseAndEmitsWhenHealthy() external {
        _setDipped(false);

        VM.expectEmit(true, true, true, true);
        emit ReserveObserved(OBSERVE_LABEL, address(trace), address(this), 0, false);

        bool dipped = trace.observe(OBSERVE_LABEL);

        _assertFalse(dipped);
    }

    function testObserveReturnsTrueAndEmitsWhenDipped() external {
        _setDipped(true);

        VM.expectEmit(true, true, true, true);
        emit ReserveObserved(OBSERVE_LABEL, address(trace), address(this), 0, true);

        bool dipped = trace.observe(OBSERVE_LABEL);

        _assertTrue(dipped);
    }

    function testCheckpointSucceedsAndEmitsWhenHealthy() external {
        _setDipped(false);

        VM.expectEmit(true, true, true, true);
        emit ReserveCheckpoint(CHECKPOINT_LABEL, address(trace), address(this), 0, false);

        trace.checkpoint(CHECKPOINT_LABEL);
    }

    function testCheckpointRevertsWithLabelWhenDipped() external {
        _setDipped(true);

        VM.expectRevert(
            abi.encodeWithSelector(ReserveTrace.ReserveTraceViolation.selector, CHECKPOINT_LABEL)
        );
        trace.checkpoint(CHECKPOINT_LABEL);
    }

    function testObservePropagatesPrecompileFailure() external {
        bytes memory revertData = bytes("PRECOMPILE_FAILED");
        VM.clearMockedCalls();
        VM.mockCallRevert(
            RESERVE_BALANCE_PRECOMPILE, abi.encodeWithSignature("dippedIntoReserve()"), revertData
        );

        VM.expectRevert(revertData);
        trace.observe(OBSERVE_LABEL);
    }

    function testTracedExecutorUsesReserveTraceLabels() external {
        _setDipped(false);

        TracedExecutor executor = new TracedExecutor();

        VM.expectEmit(true, true, true, true);
        emit ReserveObserved(executor.BEFORE_WORK(), address(executor), address(this), 0, false);
        VM.expectEmit(true, true, true, true);
        emit WorkExecuted(address(this));
        VM.expectEmit(true, true, true, true);
        emit ReserveCheckpoint(executor.AFTER_WORK(), address(executor), address(this), 0, false);

        bool beforeDip = executor.execute();

        _assertFalse(beforeDip);
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
