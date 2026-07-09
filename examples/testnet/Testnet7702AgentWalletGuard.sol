// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReserveGuard } from "../../contracts/ReserveGuard.sol";
import { TestnetRefundSink } from "./TestnetRefundSink.sol";

/// @notice EIP-7702 implementation that models an automated wallet running a payout task.
contract Testnet7702AgentWalletGuard {
    enum TaskMode {
        None,
        Unguarded,
        Guarded
    }

    TaskMode public lastMode;
    bool public lastBlocked;

    bool public lastBeforeDip;
    bool public lastDuringDip;
    bool public lastAfterDip;

    uint256 public lastBeforeBalance;
    uint256 public lastDuringBalance;
    uint256 public lastAfterBalance;
    uint256 public lastTaskSpendAmount;

    event AgentTaskStep(
        string label,
        address indexed agent,
        address indexed caller,
        uint256 balance,
        uint256 taskSpendAmount,
        bool dipped,
        bool blocked
    );

    receive() external payable {}

    function runObservedBatch(TestnetRefundSink payoutSink, uint256 spendAmount)
        external
        returns (bool beforeDip, bool duringDip, bool afterDip)
    {
        _begin(TaskMode.Unguarded, spendAmount);
        beforeDip = lastBeforeDip;

        _sendPayout(payoutSink, spendAmount);
        duringDip = _record("payout-sent", spendAmount, false);

        payoutSink.refund(payable(address(this)), spendAmount);
        afterDip = _record("payout-recovered", spendAmount, false);
    }

    function runGuardedBatch(TestnetRefundSink payoutSink, uint256 spendAmount)
        external
        returns (bool allowed, bool beforeDip, bool duringDip, bool afterDip)
    {
        _begin(TaskMode.Guarded, spendAmount);
        beforeDip = lastBeforeDip;

        _sendPayout(payoutSink, spendAmount);
        lastDuringBalance = address(this).balance;
        duringDip = ReserveGuard.dipped();
        lastDuringDip = duringDip;

        if (duringDip) {
            lastBlocked = true;
            emit AgentTaskStep(
                "reserve-check-blocked",
                address(this),
                msg.sender,
                lastDuringBalance,
                spendAmount,
                duringDip,
                true
            );

            payoutSink.refund(payable(address(this)), spendAmount);
            afterDip = _record("payout-recovered", spendAmount, true);
            return (false, beforeDip, duringDip, afterDip);
        }

        ReserveGuard.checkpoint();
        payoutSink.refund(payable(address(this)), spendAmount);
        afterDip = _record("payout-complete", spendAmount, false);
        return (true, beforeDip, duringDip, afterDip);
    }

    function _begin(TaskMode mode, uint256 spendAmount) private {
        lastMode = mode;
        lastBlocked = false;
        lastTaskSpendAmount = spendAmount;
        lastBeforeBalance = address(this).balance;
        lastBeforeDip = ReserveGuard.dipped();

        emit AgentTaskStep(
            "task-start",
            address(this),
            msg.sender,
            lastBeforeBalance,
            spendAmount,
            lastBeforeDip,
            false
        );
    }

    function _sendPayout(TestnetRefundSink payoutSink, uint256 spendAmount) private {
        (bool sent,) = address(payoutSink).call{ value: spendAmount }("");
        require(sent, "PAYOUT_FAILED");
    }

    function _record(string memory label, uint256 spendAmount, bool blocked) private returns (bool dipped) {
        bool isDuring = keccak256(bytes(label)) == keccak256("payout-sent");

        if (isDuring) {
            lastDuringBalance = address(this).balance;
            dipped = ReserveGuard.dipped();
            lastDuringDip = dipped;
            emit AgentTaskStep(label, address(this), msg.sender, lastDuringBalance, spendAmount, dipped, blocked);
            return dipped;
        }

        lastAfterBalance = address(this).balance;
        dipped = ReserveGuard.dipped();
        lastAfterDip = dipped;
        emit AgentTaskStep(label, address(this), msg.sender, lastAfterBalance, spendAmount, dipped, blocked);
    }
}
