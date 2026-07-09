export type TabId = "write-lab" | "smoke-probe" | "normal-drain" | "eip-7702" | "agent-wallet" | "findings";

export type TabDefinition = {
  id: TabId;
  label: string;
};

type TabsProps = {
  tabs: TabDefinition[];
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
};

export function Tabs({ tabs, activeTab, onSelect }: TabsProps) {
  return (
    <div className="tabs" role="tablist" aria-label="Experiment tabs">
      {tabs.map((tab) => (
        <button
          className="tabButton"
          type="button"
          role="tab"
          aria-selected={tab.id === activeTab}
          key={tab.id}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
