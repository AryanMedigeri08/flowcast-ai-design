import { Factory, Warehouse, Store, AlertTriangle, CheckCircle } from "lucide-react";

const nodes = [
  {
    icon: Factory,
    label: "Suppliers",
    sublabel: "3 active",
    status: "ok" as const,
    detail: "All shipments on schedule",
  },
  {
    icon: Warehouse,
    label: "Warehouse",
    sublabel: "Metro DC",
    status: "warning" as const,
    detail: "Capacity at 87% — near limit",
  },
  {
    icon: Store,
    label: "Stores",
    sublabel: "12 locations",
    status: "ok" as const,
    detail: "Avg restock: 1.8 days",
  },
];

const SupplyChainFlow = () => {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-6">Supply Chain Overview</h3>

      <div className="flex items-center justify-between gap-2">
        {nodes.map((node, i) => {
          const Icon = node.icon;
          const isWarning = node.status === "warning";
          return (
            <div key={node.label} className="flex items-center gap-2 flex-1">
              <div className="flex-1">
                <div
                  className={`rounded-xl p-4 border transition-all hover:scale-[1.03] cursor-default ${
                    isWarning
                      ? "border-warning/30 bg-warning/5"
                      : "border-border bg-secondary/30"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isWarning ? "bg-warning/15" : "bg-primary/10"}`}>
                      <Icon className={`w-4 h-4 ${isWarning ? "text-warning" : "text-primary"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{node.label}</p>
                      <p className="text-xs text-muted-foreground">{node.sublabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    {isWarning ? (
                      <AlertTriangle className="w-3 h-3 text-warning" />
                    ) : (
                      <CheckCircle className="w-3 h-3 text-success" />
                    )}
                    <span className={`text-xs ${isWarning ? "text-warning" : "text-success"}`}>
                      {node.detail}
                    </span>
                  </div>
                </div>
              </div>
              {i < nodes.length - 1 && (
                <div className="flex items-center px-1">
                  <svg width="40" height="20" viewBox="0 0 40 20" className="shrink-0">
                    <line
                      x1="0" y1="10" x2="30" y2="10"
                      stroke="hsl(215 90% 60%)"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      className="animate-flow"
                    />
                    <polygon points="30,5 40,10 30,15" fill="hsl(215 90% 60%)" opacity="0.7" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SupplyChainFlow;
