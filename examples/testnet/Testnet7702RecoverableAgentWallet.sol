// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    ReserveRecoverable
} from "../../contracts/experimental/abstract/ReserveRecoverable.sol";
import { TestnetRefundSink } from "./TestnetRefundSink.sol";

/// @notice EIP-7702 implementation that attempts application-defined recovery after a reserve dip.
contract Testnet7702RecoverableAgentWallet is ReserveRecoverable {
    bytes32 public constant BEFORE_PAYOUT = keccak256("reserveguard.agent.before-payout");
    bytes32 public constant AFTER_PAYOUT = keccak256("reserveguard.agent.after-payout");
    bytes32 public constant RECOVERY_ATTEMPT = keccak256("reserveguard.agent.recovery-attempt");
    bytes32 public constant TASK_COMPLETE = keccak256("reserveguard.agent.task-complete");

    bool public lastBeforeDip;
    bool public lastDuringDip;
    bool public lastAfterDip;
    bool public lastRecoveryAttempted;
    bool public lastRecoverySucceeded;

    uint256 public lastBeforeBalance;
    uint256 public lastDuringBalance;
    uint256 public lastAfterBalance;
    uint256 public lastTaskSpendAmount;

    TestnetRefundSink private recoverySink;
    uint256 private recoveryAmount;

    event RecoveryTaskStep(
        bytes32 indexed checkpoint,
        address indexed observer,
        address indexed caller,
        uint256 balance,
        bool dipped,
        bool recoveryAttempted,
        bool recoverySucceeded
    );

    receive() external payable {}

    function runRecoverableBatch(TestnetRefundSink payoutSink, uint256 spendAmount)
        external
        reserveHealthy
        returns (
            bool beforeDip,
            bool duringDip,
            bool recoveryAttempted,
            bool afterDip
        )
    {
        lastRecoveryAttempted = false;
        lastRecoverySucceeded = false;
        lastTaskSpendAmount = spendAmount;

        lastBeforeBalance = address(this).balance;
        beforeDip = _reserveDipped();
        lastBeforeDip = beforeDip;
        emit RecoveryTaskStep(
            BEFORE_PAYOUT, address(this), msg.sender, lastBeforeBalance, beforeDip, false, false
        );

        recoverySink = payoutSink;
        recoveryAmount = spendAmount;

        (bool sent,) = address(payoutSink).call{ value: spendAmount }("");
        require(sent, "PAYOUT_FAILED");

        lastDuringBalance = address(this).balance;
        duringDip = _reserveDipped();
        lastDuringDip = duringDip;
        emit RecoveryTaskStep(
            AFTER_PAYOUT, address(this), msg.sender, lastDuringBalance, duringDip, false, false
        );

        if (duringDip) {
            recoveryAttempted = _recoverReserveIfNeeded(AFTER_PAYOUT);
            lastRecoverySucceeded = recoveryAttempted;
        } else {
            delete recoverySink;
            delete recoveryAmount;
        }

        lastAfterBalance = address(this).balance;
        afterDip = _reserveDipped();
        lastAfterDip = afterDip;
        emit RecoveryTaskStep(
            TASK_COMPLETE,
            address(this),
            msg.sender,
            lastAfterBalance,
            afterDip,
            lastRecoveryAttempted,
            lastRecoverySucceeded
        );

        _reserveCheckpoint();
    }

    function _recoverReserve(bytes32) internal override {
        lastRecoveryAttempted = true;

        TestnetRefundSink sink = recoverySink;
        uint256 amount = recoveryAmount;
        delete recoverySink;
        delete recoveryAmount;

        emit RecoveryTaskStep(
            RECOVERY_ATTEMPT,
            address(this),
            msg.sender,
            address(this).balance,
            true,
            true,
            false
        );

        sink.refund(payable(address(this)), amount);
    }
}
