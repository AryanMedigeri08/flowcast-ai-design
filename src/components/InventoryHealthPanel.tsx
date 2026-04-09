import { AlertTriangle, ArrowDown, ArrowUp, Package } from "lucide-react";

const items = [
  {
    name: "Organic Oat Milk",
    sku: "OAT-2847",
    status: "low" as const,
    stock: 12,
    reorder: 50,
    trend: -18,
  },
  {
    name: "Protein Bars (Variety)",
    sku: "PRO-1923",
    status: "overstock" as const,
    stock: 340,
    reorder: 100,
    trend: 8,
  },
  {
    name: "Greek Yogurt 500g",
    sku: "GRK-0412",
    status: "optimal" as const,
    stock: 85,
    reorder: 60,
    trend: 3,
  },
  {
    name: "Sparkling Water 12pk",
    sku: "SPK-7891",
    status: "low" as const,
    stock: 8,
    reorder: 40,
    trend: -32,
  },
];

const statusConfig = {
  low: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/20",
    label: "Low Stock",
    icon: AlertTriangle,
  },
  overstock: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/20",
    label: "Overstock",
    icon: ArrowUp,
  },
  optimal: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/20",
    label: "Optimal",
    icon: Package,
  },
};

const InventoryHealthPanel = () => {
  return (
    <div className="glass rounded-2xl p-6 w-full lg:w-80 shrink-0">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-foreground">Inventory Health</h3>
        <span className="text-xs text-muted-foreground">4 alerts</span>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const config = statusConfig[item.status];
          const Icon = config.icon;
          return (
            <div
              key={item.sku}
              className={`rounded-xl p-3 border ${config.border} ${config.bg} hover:scale-[1.02] transition-transform cursor-default`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.bg} ${config.text}`}>
                  <Icon className="w-3 h-3" />
                  {config.label}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {item.stock} units
                </span>
                <span className={`text-xs flex items-center gap-0.5 ${item.trend < 0 ? "text-destructive" : "text-success"}`}>
                  {item.trend < 0 ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                  {Math.abs(item.trend)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryHealthPanel;
