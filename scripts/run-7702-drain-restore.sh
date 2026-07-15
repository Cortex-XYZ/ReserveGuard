#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Run the ReserveGuard EIP-7702 drain/restore testnet experiment.

Required environment:
  MONAD_RPC_URL
  PRIVATE_KEY or SPONSOR_PRIVATE_KEY
  DELEGATED_AUTHORITY_PRIVATE_KEY
  DELEGATED_IMPL       Use either the base delegated implementation or traced implementation.
  REFUND_SINK

Optional environment:
  DELEGATED_AUTHORITY  If set, must match DELEGATED_AUTHORITY_PRIVATE_KEY.
  DRAIN_AMOUNT         Defaults to 10ether.

Example:
  export MONAD_RPC_URL="https://..."
  export PRIVATE_KEY="0x..."
  export DELEGATED_AUTHORITY_PRIVATE_KEY="0x..."
  export DELEGATED_IMPL="0x..."
  export REFUND_SINK="0x..."

  bash scripts/run-7702-drain-restore.sh
USAGE
}

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    echo >&2
    usage >&2
    exit 1
  fi
}

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "Missing required command: $name" >&2
    exit 1
  fi
}

lowercase() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

require_command cast
require_var MONAD_RPC_URL
require_var DELEGATED_AUTHORITY_PRIVATE_KEY
require_var DELEGATED_IMPL
require_var REFUND_SINK

if [[ -z "${SPONSOR_PRIVATE_KEY:-}" ]]; then
  require_var PRIVATE_KEY
  SPONSOR_PRIVATE_KEY="$PRIVATE_KEY"
fi

DRAIN_AMOUNT="${DRAIN_AMOUNT:-10ether}"
DERIVED_AUTHORITY=$(cast wallet address --private-key "$DELEGATED_AUTHORITY_PRIVATE_KEY")

if [[ -n "${DELEGATED_AUTHORITY:-}" ]]; then
  if [[ "$(lowercase "$DELEGATED_AUTHORITY")" != "$(lowercase "$DERIVED_AUTHORITY")" ]]; then
    echo "DELEGATED_AUTHORITY does not match DELEGATED_AUTHORITY_PRIVATE_KEY." >&2
    echo "  DELEGATED_AUTHORITY: $DELEGATED_AUTHORITY" >&2
    echo "  Derived authority:   $DERIVED_AUTHORITY" >&2
    exit 1
  fi
else
  DELEGATED_AUTHORITY="$DERIVED_AUTHORITY"
fi

echo "ReserveGuard EIP-7702 drain/restore experiment"
echo
echo "RPC:                  $MONAD_RPC_URL"
echo "Delegated authority:  $DELEGATED_AUTHORITY"
echo "Delegated impl:       $DELEGATED_IMPL"
echo "Refund sink:          $REFUND_SINK"
echo "Drain amount:         $DRAIN_AMOUNT"
echo

echo "Checking delegated authority balance..."
cast balance "$DELEGATED_AUTHORITY" --ether --rpc-url "$MONAD_RPC_URL"
echo

echo "Checking code before authorization..."
cast code "$DELEGATED_AUTHORITY" --rpc-url "$MONAD_RPC_URL"
echo

echo "Signing EIP-7702 authorization..."
AUTH=$(cast wallet sign-auth "$DELEGATED_IMPL" \
  --rpc-url "$MONAD_RPC_URL" \
  --private-key "$DELEGATED_AUTHORITY_PRIVATE_KEY")
echo "Authorization signed."
echo

echo "Sending type-4 authorization-list transaction..."
cast send "$DELEGATED_AUTHORITY" "drainRestore(address,uint256)" \
  "$REFUND_SINK" "$DRAIN_AMOUNT" \
  --auth "$AUTH" \
  --rpc-url "$MONAD_RPC_URL" \
  --private-key "$SPONSOR_PRIVATE_KEY"
echo

echo "Checking code after authorization..."
cast code "$DELEGATED_AUTHORITY" --rpc-url "$MONAD_RPC_URL"
echo

echo "Recorded balances:"
echo "  before: $(cast call "$DELEGATED_AUTHORITY" "lastBeforeBalance()(uint256)" --rpc-url "$MONAD_RPC_URL")"
echo "  during: $(cast call "$DELEGATED_AUTHORITY" "lastDuringBalance()(uint256)" --rpc-url "$MONAD_RPC_URL")"
echo "  after:  $(cast call "$DELEGATED_AUTHORITY" "lastAfterBalance()(uint256)" --rpc-url "$MONAD_RPC_URL")"
echo

echo "Recorded reserve state:"
echo "  beforeDip: $(cast call "$DELEGATED_AUTHORITY" "lastBeforeDip()(bool)" --rpc-url "$MONAD_RPC_URL")"
echo "  duringDip: $(cast call "$DELEGATED_AUTHORITY" "lastDuringDip()(bool)" --rpc-url "$MONAD_RPC_URL")"
echo "  afterDip:  $(cast call "$DELEGATED_AUTHORITY" "lastAfterDip()(bool)" --rpc-url "$MONAD_RPC_URL")"
echo

echo "If DELEGATED_IMPL is Testnet7702TracedDrainRestore, inspect transaction logs for:"
echo "  ReserveObserved(reserveguard.7702.before-drain, authority, sponsor, balance, dipped)"
echo "  ReserveObserved(reserveguard.7702.during-drain, authority, sponsor, balance, dipped)"
echo "  ReserveObserved(reserveguard.7702.after-restore, authority, sponsor, balance, dipped)"
echo

echo "Expected successful shape:"
echo "  balances:   above reserve -> below reserve -> restored above reserve"
echo "  reserve:    false -> true -> false"
