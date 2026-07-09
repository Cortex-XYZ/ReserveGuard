import { getAddress, isAddress, type Address } from "viem";
import { contractConfigs, type ContractAddressSet, type ContractKey } from "../config/contracts";

type AddressOverrideState = {
  addresses: ContractAddressSet;
  invalidParams: Partial<Record<ContractKey, string>>;
};

export function normalizeAddressInput(value: string): Address | null {
  const trimmed = value.trim();
  return isAddress(trimmed) ? getAddress(trimmed) : null;
}

export function applyUrlAddressOverrides(
  defaults: ContractAddressSet,
  params: URLSearchParams,
): AddressOverrideState {
  const addresses = { ...defaults };
  const invalidParams: Partial<Record<ContractKey, string>> = {};

  for (const contract of contractConfigs) {
    const value = params.get(contract.queryParam);

    if (!value) {
      continue;
    }

    const normalized = normalizeAddressInput(value);
    if (normalized) {
      addresses[contract.key] = normalized;
      continue;
    }

    invalidParams[contract.key] = value;
  }

  return { addresses, invalidParams };
}
