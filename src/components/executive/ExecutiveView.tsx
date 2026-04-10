import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import type { RetailBrainState } from "@/hooks/useRetailBrain";
import { getBrand } from "@/data/brands";
import {
  DollarSign, AlertTriangle, Undo2, Target,
  TrendingUp, TrendingDown, ArrowRight, Zap, Ban, Network,
  Package, Bell, BarChart3,
} from "lucide-react";

// Icon mapping for KPI cards
const iconMap: Record<string, typeof DollarSign> = {
  revenue: DollarSign,
  stockout: AlertTriangle,
  overstock: Package,
  returns: Undo2,
  accuracy: Target,
  alerts: Bell,
};

/* ── Sparkline colours per KPI icon ────────────────────── */
const sparklineColors: Record<string, string> = {
  revenue: "rgba(59,130,246,0.25)",   // blue
  stockout: "rgba(239,68,68,0.25)",   // red
  overstock: "rgba(245,158,11,0.25)", // amber
  returns: "rgba(239,68,68,0.25)",    // red
  accuracy: "rgba(20,184,166,0.25)",  // teal
  alerts: "rgba(245,158,11,0.25)",    // amber
};

/* ── Progress-bar fill logic per KPI icon ──────────────── */
function getProgressFill(kpi: { icon: string; value: string; change: number }): number {
  const raw = parseFloat(kpi.value.replace(/[^0-9.]/g, "")) || 0;
  switch (kpi.icon) {
    case "revenue":   return Math.min(100, (raw / 5) * 100);        // assume $5M monthly target
    case "stockout":  return Math.min(100, Math.max(5, 100 - raw * 8)); // inverse: fewer = fuller
    case "overstock": return Math.min(100, (raw / 3) * 100);        // assume $3M threshold
    case "returns":   return Math.min(100, raw * 8);                 // 12.5% = full
    case "accuracy":  return Math.min(100, raw);                     // direct %
    case "alerts":    return Math.min(100, raw * 7);                 // ~14 alerts = full
    default:          return 50;
  }
}

/* ── Parse the display string into a countable number ──── */
function parseKPIValue(v: string): { numeric: number; prefix: string; suffix: string; decimals: number } {
  const prefix = v.startsWith("$") ? "$" : "";
  const suffix = v.endsWith("%") ? "%" : v.endsWith("M") ? "M" : v.endsWith("K") ? "K" : "";
  const cleaned = v.replace(/[^0-9.]/g, "");
  const numeric = parseFloat(cleaned) || 0;
  const parts = cleaned.split(".");
  const decimals = parts.length > 1 ? parts[1].length : 0;
  return { numeric, prefix, suffix, decimals };
}

/* ── Generate 7-pt sparkline data seeded from KPI value ── */
function genSparkline(kpi: { value: string; change: number; icon: string }): number[] {
  const base = parseFloat(kpi.value.replace(/[^0-9.]/g, "")) || 50;
  const pts: number[] = [];
  let v = base * 0.85;
  const step = (base - v) / 5;
  for (let i = 0; i < 7; i++) {
    const jitter = (Math.sin(i * 2.3 + base) * 0.08 + 0.04) * base;
    v += step + jitter;
    pts.push(v);
  }
  return pts;
}

/* ── Tiny polyline renderer ────────────────────────────── */
function MicroSparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 48, H = 24, PAD = 2;
  const points = data
    .map((v, i) => {
      const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
      const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={W} height={H} className="absolute bottom-1.5 right-2 pointer-events-none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Animated KPI Card ─────────────────────────────────── */
function AnimatedKPICard({
  kpi,
  isPositiveChange,
  changeColor,
  delay,
}: {
  kpi: RetailBrainState["kpis"][number];
  isPositiveChange: boolean;
  changeColor: string;
  delay: number;
}) {
  const Icon = iconMap[kpi.icon] || DollarSign;
  const { numeric, prefix, suffix, decimals } = parseKPIValue(kpi.value);
  const progressFill = getProgressFill(kpi);
  const sparkData = useMemo(() => genSparkline(kpi), [kpi.value, kpi.icon]);
  const sparkColor = sparklineColors[kpi.icon] || "rgba(148,163,184,0.25)";

  // Animation state
  const [animValue, setAnimValue] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const rafRef = useRef<number>(0);

  const runAnimation = useCallback(() => {
    setAnimValue(0);
    setBarWidth(0);

    const startTime = performance.now();
    const DURATION = 800;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const rawT = Math.min(elapsed / DURATION, 1);
      // cubic-bezier(0.16, 1, 0.3, 1) approximation — overshoot ease-out
      const t = 1 - Math.pow(1 - rawT, 3);
      setAnimValue(t * numeric);

      if (rawT < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setAnimValue(numeric);
        // trigger bar sweep after 200ms
        setTimeout(() => setBarWidth(progressFill), 200);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [numeric, progressFill]);

  // Run on mount + when animKey changes (replay)
  useEffect(() => {
    const timer = setTimeout(runAnimation, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(rafRef.current); };
  }, [animKey, runAnimation, delay]);

  const handleReplay = () => setAnimKey((k) => k + 1);

  // Format the animated numeric value
  const displayValue = (() => {
    const n = animValue;
    if (suffix === "M") return `${prefix}${n.toFixed(1)}${suffix}`;
    if (suffix === "K") return `${prefix}${Math.round(n)}${suffix}`;
    if (suffix === "%") return `${n.toFixed(decimals)}${suffix}`;
    if (prefix === "$") return `${prefix}${Math.round(n).toLocaleString()}`;
    return `${prefix}${decimals > 0 ? n.toFixed(decimals) : Math.round(n)}${suffix}`;
  })();

  // Progress bar colour inherits from sparkline
  const barColor = sparkColor.replace(/[\d.]+\)$/, "0.5)");

  return (
    <div
      key={animKey}
      onClick={handleReplay}
      className="bg-card p-5 group hover:bg-secondary/30 transition-colors cursor-pointer relative overflow-hidden select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="label-micro text-[9px]">{kpi.label.toUpperCase()}</span>
        <Icon className="w-3.5 h-3.5 text-muted-foreground/40" />
      </div>

      {/* Count-up value */}
      <p className="text-3xl font-light tracking-tighter text-foreground font-mono-data leading-none mb-1.5">
        {displayValue}
      </p>

      {/* Change indicator */}
      <div className="flex items-center gap-1">
        {isPositiveChange ? (
          <TrendingUp className="w-3 h-3 text-emerald-400" />
        ) : (
          <TrendingDown className="w-3 h-3 text-destructive" />
        )}
        <span className={`text-xs font-medium ${changeColor} tabular-nums`}>
          {kpi.change > 0 ? "+" : ""}{kpi.change}%
        </span>
        <span className="text-[10px] text-muted-foreground/40 ml-1">vs last week</span>
      </div>

      {/* Progress bar sweep */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-transparent">
        <div
          className="h-full rounded-r-full"
          style={{
            width: `${barWidth}%`,
            backgroundColor: barColor,
            transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>

      {/* Micro-sparkline */}
      <MicroSparkline data={sparkData} color={sparkColor} />
    </div>
  );
}

const ExecutiveView = ({ brain }: { brain: RetailBrainState }) => {
  // Filter alerts and priorities by selected brand
  const filteredAlerts = useMemo(() => {
    if (brain.selectedBrand === "all") return brain.alerts;
    return brain.alerts.filter((a) => a.brand === brain.selectedBrand);
  }, [brain.alerts, brain.selectedBrand]);

  const filteredPriorities = useMemo(() => {
    if (brain.selectedBrand === "all") return brain.priorities;
    return brain.priorities.filter((p) => p.brand === brain.selectedBrand);
  }, [brain.priorities, brain.selectedBrand]);

  const critAlerts = filteredAlerts.filter((a) => a.severity === "critical");
  const warnAlerts = filteredAlerts.filter((a) => a.severity === "warning");

  // Determine positive/negative logic for KPI deltas
  const isNegativeIcon = (icon: string) => ["stockout", "overstock", "alerts"].includes(icon);

  // Selected brand label
  const brandLabel = brain.selectedBrand === "all"
    ? "All Brands"
    : getBrand(brain.selectedBrand).name;

  return (
    <div className="space-y-8 animate-slide-up">
      {/* ─── Hero KPI Strip ─── */}
      <div>
        <h1 className="text-3xl font-light tracking-tight text-foreground mb-1">
          Supply Chain <span className="font-semibold">Overview</span>
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
            {brandLabel}
          </span>
        </div>
      </div>

      {/* ─── Animated KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-px bg-border/20 rounded-2xl overflow-hidden">
        {brain.kpis.map((kpi, idx) => {
          const isNeg = isNegativeIcon(kpi.icon);
          const isPositiveChange = isNeg ? kpi.change < 0 : kpi.change > 0;
          const changeColor = isPositiveChange ? "text-emerald-400" : "text-destructive";

          return (
            <AnimatedKPICard
              key={kpi.label}
              kpi={kpi}
              isPositiveChange={isPositiveChange}
              changeColor={changeColor}
              delay={idx * 80}
            />
          );
        })}
      </div>

      {/* ─── Two-column: Alerts + Risk Table ─── */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Critical Alerts */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Live Alerts</h2>
            <span className="text-[10px] text-muted-foreground/60">{filteredAlerts.length} total</span>
          </div>

          {filteredAlerts.length === 0 && (
            <div className="rounded-xl p-4 bg-emerald-500/[0.04] border border-emerald-500/10 text-center">
              <p className="text-xs text-muted-foreground">No active alerts for {brandLabel}</p>
            </div>
          )}

          {/* Critical */}
          {critAlerts.slice(0, 3).map((alert) => (
            <div
              key={alert.id}
              onClick={() => brain.selectSKUAndNavigate(alert.skuId)}
              className="group cursor-pointer relative overflow-hidden rounded-xl p-3.5 bg-destructive/[0.04] border border-destructive/10
                hover:border-destructive/25 hover:bg-destructive/[0.06] transition-all"
            >
              {/* Ambient glow */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start gap-3 relative">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground font-medium leading-relaxed">{alert.message}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-muted-foreground">{alert.skuName}</span>
                    <span className="text-[9px] text-muted-foreground/40">{alert.timestamp}</span>
                  </div>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-foreground/50 transition-colors shrink-0 mt-0.5" />
              </div>
            </div>
          ))}

          {/* Warnings (condensed) */}
          {warnAlerts.slice(0, 4).map((alert) => (
            <div
              key={alert.id}
              onClick={() => brain.selectSKUAndNavigate(alert.skuId)}
              className="group cursor-pointer flex items-center gap-3 rounded-lg px-3 py-2.5
                hover:bg-secondary/40 transition-colors"
            >
              <Zap className="w-3 h-3 text-amber-400/60 shrink-0" />
              <p className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors flex-1 truncate">
                {alert.message}
              </p>
              <span className="text-[9px] text-muted-foreground/30 shrink-0">{alert.timestamp}</span>
            </div>
          ))}
        </div>

        {/* Priority SKU Table */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Priority SKUs</h2>
            <span className="text-[10px] text-muted-foreground/60">
              Ranked by composite risk score · {filteredPriorities.length} SKUs
            </span>
          </div>

          {filteredPriorities.length === 0 && (
            <div className="rounded-xl p-4 bg-secondary/20 border border-border/20 text-center">
              <p className="text-xs text-muted-foreground">No priority SKUs for {brandLabel}</p>
            </div>
          )}

          <div className="space-y-1">
            {/* Table header */}
            {filteredPriorities.length > 0 && (
              <div className="grid grid-cols-12 gap-2 px-3 py-2">
                <span className="col-span-1 label-micro text-[8px]">#</span>
                <span className="col-span-3 label-micro text-[8px]">SKU</span>
                <span className="col-span-2 label-micro text-[8px]">BRAND</span>
                <span className="col-span-2 label-micro text-[8px]">CONCERN</span>
                <span className="col-span-2 label-micro text-[8px]">MIGRATION RISK</span>
                <span className="col-span-2 label-micro text-[8px] text-right">SCORE</span>
              </div>
            )}

            {filteredPriorities.slice(0, 8).map((sku, i) => {
              const brand = getBrand(sku.brand);
              const scoreColor = sku.priorityScore > 70
                ? "text-destructive" : sku.priorityScore > 40
                ? "text-amber-400" : "text-emerald-400";
              
              const migBadge = sku.migrationRisk === "dual_risk"
                ? <span className="inline-flex items-center gap-1 text-[9px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded"><AlertTriangle className="w-2.5 h-2.5"/>Dual Risk</span>
                : sku.migrationRisk === "high_absorber"
                ? <span className="inline-flex items-center gap-1 text-[9px] font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded"><Network className="w-2.5 h-2.5"/>High Absorber</span>
                : sku.migrationRisk === "source_at_risk"
                ? <span className="inline-flex items-center gap-1 text-[9px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded"><ArrowRight className="w-2.5 h-2.5"/>Source Risk</span>
                : <span className="inline-flex items-center gap-1 text-[9px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">None</span>;

              return (
                <div
                  key={sku.skuId}
                  onClick={() => brain.selectSKUAndNavigate(sku.skuId)}
                  className="group grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg cursor-pointer
                    hover:bg-secondary/40 transition-all border border-transparent hover:border-border/30"
                >
                  <span className="col-span-1 text-[11px] text-muted-foreground/40 font-mono-data">{i + 1}</span>
                  <span className="col-span-3 text-[12px] text-foreground font-medium truncate group-hover:text-primary transition-colors pr-2">
                    {sku.skuName}
                  </span>
                  <span
                    className="col-span-2 text-[10px] font-medium truncate pr-2"
                    style={{ color: `hsl(${brand.color})` }}
                  >
                    {brand.shortName}
                  </span>
                  <span className="col-span-2 text-[10px] text-muted-foreground truncate pr-2">{sku.primaryConcern}</span>
                  <div className="col-span-2 flex items-center pr-2">
                     {migBadge}
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <div className="w-12 h-1 bg-secondary/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${sku.priorityScore}%`,
                          background: sku.priorityScore > 70
                            ? "hsl(0 72% 51%)" : sku.priorityScore > 40
                            ? "hsl(38 92% 50%)" : "hsl(152 69% 45%)",
                        }}
                      />
                    </div>
                    <span className={`text-xs font-mono-data font-semibold ${scoreColor} w-6 text-right`}>
                      {sku.priorityScore}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveView;
