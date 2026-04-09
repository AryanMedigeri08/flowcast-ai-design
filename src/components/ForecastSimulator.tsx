import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, Package, AlertTriangle, DollarSign } from "lucide-react";

const ForecastSimulator = () => {
  const [demandChange, setDemandChange] = useState([0]);

  const impact = useMemo(() => {
    const change = demandChange[0];
    const baseStock = 200;
    const baseDays = 14;
    const baseRevenue = 48000;

    const adjustedStock = Math.max(0, Math.round(baseStock - (change / 100) * baseStock * 0.6));
    const daysOfSupply = Math.max(0, Math.round(baseDays * (1 - change / 200)));
    const revenue = Math.round(baseRevenue * (1 + change / 100));
    const riskLevel =
      change > 30 ? "high" : change > 15 ? "medium" : change < -15 ? "surplus" : "low";

    return { adjustedStock, daysOfSupply, revenue, riskLevel, change };
  }, [demandChange]);

  const riskConfig = {
    low: { color: "text-success", bg: "bg-success/10", label: "Low Risk" },
    medium: { color: "text-warning", bg: "bg-warning/10", label: "Medium Risk" },
    high: { color: "text-destructive", bg: "bg-destructive/10", label: "High Risk" },
    surplus: { color: "text-info", bg: "bg-info/10", label: "Surplus Expected" },
  };

  const risk = riskConfig[impact.riskLevel];

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Forecast Simulator</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Model demand changes and see inventory impact
          </p>
        </div>
        <div className={`px-2.5 py-1 rounded-lg text-xs font-medium ${risk.bg} ${risk.color}`}>
          {risk.label}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm text-muted-foreground">Demand Change</label>
          <span className="text-2xl font-bold text-foreground tabular-nums">
            {impact.change > 0 ? "+" : ""}
            {impact.change}%
          </span>
        </div>
        <Slider
          value={demandChange}
          onValueChange={setDemandChange}
          min={-50}
          max={50}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-muted-foreground">-50%</span>
          <span className="text-xs text-muted-foreground">+50%</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          {
            icon: Package,
            label: "Remaining Stock",
            value: `${impact.adjustedStock} units`,
            color: impact.adjustedStock < 50 ? "text-destructive" : "text-foreground",
          },
          {
            icon: TrendingUp,
            label: "Days of Supply",
            value: `${impact.daysOfSupply} days`,
            color: impact.daysOfSupply < 5 ? "text-destructive" : "text-foreground",
          },
          {
            icon: DollarSign,
            label: "Projected Revenue",
            value: `$${(impact.revenue / 1000).toFixed(1)}k`,
            color: "text-foreground",
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="rounded-xl bg-secondary/30 border border-border p-3 transition-all"
            >
              <Icon className="w-4 h-4 text-muted-foreground mb-2" />
              <p className={`text-lg font-semibold ${metric.color} tabular-nums transition-colors`}>
                {metric.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{metric.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ForecastSimulator;
