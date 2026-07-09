import { useMemo, useState } from "react";
import { AddressPanel } from "./components/AddressPanel";
import { Header } from "./components/Header";
import { ReservePlayground } from "./components/ReservePlayground";
import { Tabs, type TabDefinition, type TabId } from "./components/Tabs";
import { getDefaultContractAddresses, type ContractAddressSet, type ContractKey } from "./config/contracts";
import { AgentWalletGuard } from "./experiments/AgentWalletGuard";
import { Delegated7702DrainRestore } from "./experiments/Delegated7702DrainRestore";
import { Findings } from "./experiments/Findings";
import { WriteLab } from "./experiments/WriteLab";
import { applyUrlAddressOverrides, normalizeAddressInput } from "./lib/addressOverrides";

const tabs: TabDefinition[] = [
  { id: "write-lab", label: "Write Lab" },
  { id: "eip-7702", label: "EIP-7702 Drain/Restore" },
  { id: "agent-wallet", label: "Agent Wallet" },
  { id: "findings", label: "Findings" },
];

function renderTab(activeTab: TabId, addresses: ContractAddressSet, setActiveTab: (tab: TabId) => void) {
  switch (activeTab) {
    case "write-lab":
      return <WriteLab onSelectTab={setActiveTab} />;
    case "smoke-probe":
      return null;
    case "normal-drain":
      return null;
    case "eip-7702":
      return <Delegated7702DrainRestore addresses={addresses} />;
    case "agent-wallet":
      return <AgentWalletGuard addresses={addresses} />;
    case "findings":
      return <Findings />;
  }
}

function App() {
  const initialAddressState = useMemo(
    () => applyUrlAddressOverrides(getDefaultContractAddresses(), new URLSearchParams(window.location.search)),
    [],
  );
  const [activeTab, setActiveTab] = useState<TabId>("write-lab");
  const [addresses, setAddresses] = useState<ContractAddressSet>(initialAddressState.addresses);
  const [invalidParams, setInvalidParams] = useState(initialAddressState.invalidParams);

  function handleAddressChange(key: ContractKey, value: string) {
    const normalized = normalizeAddressInput(value);

    setAddresses((current) => ({
      ...current,
      [key]: (normalized ?? value) as ContractAddressSet[typeof key],
    }));

    setInvalidParams((current) => ({
      ...current,
      [key]: normalized ? undefined : value,
    }));
  }

  return (
    <main className="appShell">
      <Header />
      <ReservePlayground />
      <AddressPanel addresses={addresses} invalidParams={invalidParams} onAddressChange={handleAddressChange} />
      <Tabs tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} />
      {renderTab(activeTab, addresses, setActiveTab)}
    </main>
  );
}

export default App;
