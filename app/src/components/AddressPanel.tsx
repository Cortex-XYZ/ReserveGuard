import type { ChangeEvent } from "react";
import { contractConfigs, type ContractAddressSet, type ContractKey } from "../config/contracts";

type AddressPanelProps = {
  addresses: ContractAddressSet;
  invalidParams: Partial<Record<ContractKey, string>>;
  onAddressChange: (key: ContractKey, value: string) => void;
};

export function AddressPanel({ addresses, invalidParams, onAddressChange }: AddressPanelProps) {
  return (
    <section className="addressPanel" aria-labelledby="address-panel-heading">
      <div className="sectionHeading">
        <p className="eyebrow">Active address set</p>
        <h2 id="address-panel-heading">Experiment Contracts</h2>
      </div>
      <div className="addressGrid">
        {contractConfigs.map((contract) => (
          <label className="addressField" key={contract.key}>
            <span>
              {contract.label}
              <small>{contract.envName}</small>
            </span>
            <input
              value={addresses[contract.key]}
              spellCheck={false}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onAddressChange(contract.key, event.target.value)
              }
              aria-invalid={Boolean(invalidParams[contract.key])}
            />
            <small className={invalidParams[contract.key] ? "fieldError" : "fieldHint"}>
              URL param: {contract.queryParam}
              {invalidParams[contract.key] ? ` rejected ${invalidParams[contract.key]}` : ""}
            </small>
          </label>
        ))}
      </div>
    </section>
  );
}
