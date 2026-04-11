import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import type { RetailBrainState } from "@/hooks/useRetailBrain";
import type { SKUTab } from "@/data/types";
import { getBrand } from "@/data/brands";
import { skuCatalog } from "@/data/brands";
import { generateDemandForecast } from "@/data/generators";
import {
  Package, AlertTriangle, MapPin, Tag, ArrowRight,
  TrendingUp, TrendingDown, Award, LayoutDashboard, BarChart3, FlaskConical, Radio, Heart, Undo2
} from "lucide-react";

import DemandView from "@/components/demand/DemandView";
import AnomalyPanel from "@/components/demand/AnomalyPanel";
import SignalsView from "@/components/signals/SignalsView";
import InventoryView from "@/components/inventory/InventoryView";
import SimulationView from "@/components/simulation/SimulationView";
import RegistryDemandView from "@/components/skuDeepDive/RegistryDemandView";
import ReturnsView from "@/components/returns/ReturnsView";

/* ── Inject CSS keyframes for health-badge pulse + crossfade ── */
const ANIM_STYLE_ID = "sku-tab-anims";
function ensureTabAnimStyles() {
  if (document.getElementById(ANIM_STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = ANIM_STYLE_ID;
  s.textContent = `
    @keyframes healthPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
      50%      { box-shadow: 0 0 6px 2px rgba(239,68,68,0.3); }
    }
    .tab-panel-leaving {
      opacity: 0;
      transform: translateY(-6px);
      transition: opacity 150ms ease, transform 150ms ease;
    }
    .tab-panel-entering {
      opacity: 1 !important;
      transform: translateY(0) !important;
      transition: opacity 250ms cubic-bezier(0.16,1,0.3,1), transform 250ms cubic-bezier(0.16,1,0.3,1);
    }
    .tab-panel-pre-enter {
      opacity: 0;
      transform: translateY(8px);
    }
  `;
  document.head.appendChild(s);
}

// ─── SKU Health Score computation ──────────────────────────
function computeHealthScore(brain: RetailBrainState): number {
  const inv = brain.inventoryDecision;

  // 1. Stockout risk (0–1, higher = worse → invert)
  const stockoutContrib = (1 - inv.stockoutRisk) * 35;

  // 2. Signal confidence (0–1, higher = better)
  const signalContrib = brain.signalFusion.combinedConfidence * 35;

  // 3. Anomaly penalty
  let anomalyContrib = 30;
  const hasCritical = brain.anomalies.some((a) => a.severity === "critical");
  const hasWarning = brain.anomalies.some((a) => a.severity === "warning");
  if (hasCritical) anomalyContrib -= 15;
  else if (hasWarning) anomalyContrib -= 7;

  const raw = stockoutContrib + signalContrib + anomalyContrib;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

function getHealthColor(score: number): string {
  if (score <= 40) return "hsl(0 72% 51%)";   // red
  if (score <= 69) return "hsl(38 92% 50%)";   // amber
  return "hsl(142 71% 45%)";                    // emerald
}

function getHealthLabel(score: number): string {
  if (score <= 40) return "Critical";
  if (score <= 69) return "Moderate";
  return "Healthy";
}

// ─── Radial Arc Gauge (SVG) ────────────────────────────────
const HealthGauge = ({ score }: { score: number }) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 1200;
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedScore(Math.round(eased * score));
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  const totalAngle = 270;
  const startAngle = 135;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (totalAngle / 360) * circumference;
  const filledLength = (animatedScore / 100) * arcLength;
  const dashOffset = arcLength - filledLength;

  const color = getHealthColor(animatedScore);

  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(startAngle + totalAngle);
  const largeArc = totalAngle > 180 ? 1 : 0;

  const pathD = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path d={pathD} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path d={pathD} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={`${arcLength}`} strokeDashoffset={dashOffset} style={{ transition: "stroke 0.6s ease" }} />
        <text x={center} y={center - 4} textAnchor="middle" dominantBaseline="central" className="font-mono-data" style={{ fontSize: "36px", fontWeight: 300, fill: color, letterSpacing: "-0.04em" }}>{animatedScore}</text>
        <text x={center} y={center + 22} textAnchor="middle" dominantBaseline="central" style={{ fontSize: "8px", fontWeight: 600, fill: "hsl(var(--muted-foreground))", letterSpacing: "0.15em", textTransform: "uppercase" }}>SKU HEALTH</text>
        <text x={center} y={size - 12} textAnchor="middle" dominantBaseline="central" style={{ fontSize: "10px", fontWeight: 600, fill: color }}>{getHealthLabel(animatedScore)}</text>
      </svg>
    </div>
  );
};

/* ── Health Badge ────────────────────────────────────────── */
function HealthBadge({ score }: { score: number }) {
  if (score >= 100) return null;
  const isCritical = score < 40;
  const isAmber = score >= 40 && score <= 69;
  const bg = isCritical ? "bg-red-500" : isAmber ? "bg-amber-400" : "bg-teal-400";
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${bg} ml-1.5 shrink-0`}
      style={isCritical ? { animation: "healthPulse 2s ease-in-out infinite" } : undefined}
    />
  );
}

/* ── Waterfall Chart ─────────────────────────────────────── */
import type { DemandDecomposition } from "@/data/types";

const WATERFALL_COLORS = {
  base: "#378ADD",
  festival: "#EF9F27",
  promo: "#1D9E75",
  weatherPos: "#0EA5E9",
  weatherNeg: "#D85A30",
};

function WaterfallChart({ decomposition: d, skuId }: { decomposition: DemandDecomposition; skuId: string }) {
  const segments = useMemo(() => [
    { label: "BASE",     raw: d.base,            color: WATERFALL_COLORS.base },
    { label: "FESTIVAL", raw: d.festivalBoost,   color: WATERFALL_COLORS.festival },
    { label: "PROMO",    raw: d.promotionBoost,   color: WATERFALL_COLORS.promo },
    { label: "WEATHER",  raw: d.weatherImpact,    color: d.weatherImpact >= 0 ? WATERFALL_COLORS.weatherPos : WATERFALL_COLORS.weatherNeg },
  ], [d]);

  const total = d.total;

  // Animation: one progress value per segment (0→1)
  const [progress, setProgress] = useState<number[]>([0, 0, 0, 0]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    setProgress([0, 0, 0, 0]);
    const STAGGER = 120;
    const DURATION = 500;
    const t0 = performance.now();
    const tick = (now: number) => {
      const elapsed = now - t0;
      const next = segments.map((_, i) => {
        const segElapsed = elapsed - i * STAGGER;
        if (segElapsed <= 0) return 0;
        const t = Math.min(segElapsed / DURATION, 1);
        return 1 - Math.pow(1 - t, 3);
      });
      setProgress(next);
      if (elapsed < (segments.length - 1) * STAGGER + DURATION) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setProgress(segments.map(() => 1));
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [skuId, segments]);

  // Animated running totals
  const animatedRunning = useMemo(() => {
    let acc = 0;
    return segments.map((s, i) => {
      acc += s.raw * progress[i];
      return Math.round(acc);
    });
  }, [segments, progress]);

  // Scale: largest absolute value → 85% of track width
  const maxAbs = Math.max(...segments.map(s => Math.abs(s.raw)), 1);
  const barScale = 85 / maxAbs;

  return (
    <div>
      {segments.map((seg, i) => {
        const absVal = Math.abs(seg.raw);
        const barW = absVal * barScale * progress[i];
        const animVal = Math.round(absVal * progress[i]);
        const isNeg = seg.raw < 0;
        const prefix = i === 0 ? "" : isNeg ? "−" : "+";

        return (
          <div
            key={seg.label}
            className="grid items-center"
            style={{ gridTemplateColumns: "56px 1fr 44px", height: 28 }}
          >
            <span className="label-micro text-[8px]">{seg.label}</span>

            <div className="relative h-3 rounded-sm overflow-visible">
              {/* Bar — always starts at left:0 */}
              <div
                className="absolute left-0 top-0 h-full rounded-sm"
                style={{
                  width: `${barW}%`,
                  backgroundColor: seg.color,
                  opacity: progress[i] > 0 ? 0.4 + progress[i] * 0.6 : 0,
                }}
              />
              {/* Value label — right of bar */}
              <span
                className="absolute top-0 h-full flex items-center text-[10px] font-mono-data font-semibold"
                style={{
                  left: `calc(${barW}% + 6px)`,
                  color: seg.color,
                  opacity: progress[i] > 0.15 ? 1 : 0,
                  whiteSpace: "nowrap",
                }}
              >
                {prefix}{animVal}
              </span>
            </div>

            <span className="text-[10px] font-mono-data text-muted-foreground/50 text-right tabular-nums">
              {animatedRunning[i]}
            </span>
          </div>
        );
      })}

      {/* Total */}
      <div
        className="grid items-center border-t border-border/15 pt-1 mt-1"
        style={{ gridTemplateColumns: "56px 1fr 44px", height: 28 }}
      >
        <span className="label-micro text-[8px]">TOTAL</span>
        <div className="relative h-3 rounded-sm">
          <div
            className="absolute left-0 top-0 h-full rounded-sm"
            style={{
              width: `${85 * (progress[progress.length - 1] || 0)}%`,
              background: `linear-gradient(90deg, ${WATERFALL_COLORS.base}30, ${WATERFALL_COLORS.festival}30, ${WATERFALL_COLORS.promo}30)`,
              border: "1px solid hsl(var(--border) / 0.2)",
            }}
          />
        </div>
        <span className="text-sm font-semibold font-mono-data text-foreground tracking-tighter text-right tabular-nums">
          {animatedRunning[animatedRunning.length - 1] || 0}
        </span>
      </div>
    </div>
  );
}


// ─── Main Component ────────────────────────────────────────
const SKUDeepDive = ({ brain }: { brain: RetailBrainState }) => {
  const sku = brain.currentSKU;
  const brand = getBrand(sku.brand);
  const inv = brain.inventoryDecision;

  const healthScore = useMemo(() => computeHealthScore(brain), [brain]);

  // Product Performance metrics
  const totalPredicted = useMemo(() => brain.forecast.reduce((s, f) => s + f.predicted, 0), [brain.forecast]);
  const avgDailyPredicted = totalPredicted / brain.forecast.length;
  const revenueVelocity = sku.price * avgDailyPredicted;
  const sellThroughRate = (totalPredicted / (inv.currentStock + totalPredicted)) * 100;

  const velocityRank = useMemo(() => {
    const allTotals = skuCatalog.map((s) => {
      const fc = generateDemandForecast(s.id, 14);
      return { id: s.id, total: fc.reduce((sum, f) => sum + f.predicted, 0) };
    });
    allTotals.sort((a, b) => b.total - a.total);
    const rank = allTotals.findIndex((x) => x.id === sku.id) + 1;
    return { rank, total: allTotals.length };
  }, [sku.id]);

  const revTrend = useMemo(() => {
    if (brain.forecast.length < 14) return 0;
    const first7 = brain.forecast.slice(0, 7).reduce((s, f) => s + f.predicted, 0);
    const last7 = brain.forecast.slice(7, 14).reduce((s, f) => s + f.predicted, 0);
    return first7 > 0 ? ((last7 - first7) / first7) * 100 : 0;
  }, [brain.forecast]);

  const showRegistryTab = sku.seasonalPeak.some(p => ["wedding", "holiday", "baby"].includes(p)) || brain.registryDemand.activeRegistries > 3;

  const tabs: { id: SKUTab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "predictive-demand", label: "Predictive Demand", icon: BarChart3 },
    { id: "orchestration", label: "Inventory Orchestration", icon: FlaskConical },
    { id: "returns" as SKUTab, label: "Returns & Phantom", icon: Undo2 },
    ...(showRegistryTab ? [{ id: "registry" as SKUTab, label: "Registry Demand", icon: Heart }] : []),
  ];

  /* ═══ 1. Sliding indicator pill ═══════════════════════════ */
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const recalcPill = useCallback(() => {
    const btn = tabRefs.current.get(brain.activeTab);
    const container = tabsContainerRef.current;
    if (!btn || !container) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    setPillStyle({
      left: bRect.left - cRect.left,
      width: bRect.width,
    });
  }, [brain.activeTab]);

  useLayoutEffect(() => { recalcPill(); }, [recalcPill]);

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => recalcPill());
    ro.observe(container);
    return () => ro.disconnect();
  }, [recalcPill]);

  /* ═══ 2. Content panel crossfade ══════════════════════════ */
  const [displayedTab, setDisplayedTab] = useState(brain.activeTab);
  const [panelClass, setPanelClass] = useState("tab-panel-entering");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureTabAnimStyles();
  }, []);

  useEffect(() => {
    if (brain.activeTab === displayedTab) return;

    // Phase 1: leaving
    setPanelClass("tab-panel-leaving");
    const t1 = setTimeout(() => {
      // Phase 2: swap content + pre-enter
      setDisplayedTab(brain.activeTab);
      setPanelClass("tab-panel-pre-enter");

      // Phase 3: entering (rAF to let pre-enter paint first)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPanelClass("tab-panel-entering");
        });
      });
    }, 150);

    return () => clearTimeout(t1);
  }, [brain.activeTab, displayedTab]);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* ─── SKU Health Score + Quick Stats ─── */}
      <div className="p-5 rounded-2xl bg-card border border-border/15">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="shrink-0"><HealthGauge score={healthScore} /></div>
          
          {/* Quick Stats Grid without returns */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-secondary/10 border border-border/10">
              <p className="text-3xl font-light font-mono-data text-foreground tracking-tight">{inv.currentStock}</p>
              <p className="label-micro text-[8px] mt-1">UNITS IN STOCK</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/10 border border-border/10">
              <p className={`text-3xl font-light font-mono-data tracking-tight ${inv.stockoutRisk > 0.5 ? "text-destructive" : "text-emerald-400"}`}>{(inv.stockoutRisk * 100).toFixed(0)}%</p>
              <p className="label-micro text-[8px] mt-1">STOCKOUT RISK</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/10 border border-border/10">
              <p className="text-3xl font-light font-mono-data text-foreground tracking-tight">{sku.stores.length}</p>
              <p className="label-micro text-[8px] mt-1">ACTIVE STORES</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-2xl bg-card border border-border/15">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-semibold text-foreground">Product Performance</p>
            <span className="text-[10px] text-muted-foreground/40">14-day forecast window</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-secondary/10 border border-border/10">
              <div className="flex items-center justify-between mb-2">
                <span className="label-micro text-[8px]">REVENUE VELOCITY</span>
                <div className={`flex items-center gap-0.5 text-[10px] font-mono-data font-semibold ${revTrend >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                  {revTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(revTrend).toFixed(1)}%
                </div>
              </div>
              <p className="text-2xl font-light font-mono-data text-foreground tracking-tight">${revenueVelocity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-[10px] text-muted-foreground/40 mt-1">est. daily revenue</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/10 border border-border/10">
              <span className="label-micro text-[8px]">SELL-THROUGH RATE</span>
              <div className="mt-2 mb-1"><p className="text-2xl font-light font-mono-data text-foreground tracking-tight">{sellThroughRate.toFixed(1)}%</p></div>
              <div className="w-full h-2 bg-secondary/20 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, sellThroughRate)}%`, background: sellThroughRate > 70 ? "hsl(142 71% 45%)" : sellThroughRate > 40 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)" }} />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-secondary/10 border border-border/10">
              <span className="label-micro text-[8px]">MARGIN CONTRIBUTION</span>
              <p className="text-2xl font-light font-mono-data text-emerald-400 tracking-tight mt-2">34.2%</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/10 border border-border/10">
              <span className="label-micro text-[8px]">VELOCITY RANK</span>
              <div className="flex items-center gap-2 mt-2"><Award className="w-5 h-5 text-amber-400" /><p className="text-2xl font-light font-mono-data text-foreground tracking-tight">#{velocityRank.rank}</p></div>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/15">
          <p className="text-sm font-semibold text-foreground mb-4">Decomposition</p>
          <WaterfallChart decomposition={brain.decomposition[brain.decomposition.length - 1]} skuId={sku.id} />
        </div>
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (displayedTab) {
      case "predictive-demand":
        return (
          <div className="space-y-6 bg-background">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DemandView forecast={brain.forecast} decomposition={brain.decomposition} skuName={brain.currentSKU.name} />
              </div>
              <div className="space-y-6">
                <AnomalyPanel anomalies={brain.anomalies} intent={brain.intentAcceleration} />
              </div>
            </div>
            {/* Bring Signals into Predictive Demand */}
            <div className="mt-6 border-t border-border/20 pt-6">
              <h3 className="text-lg font-light tracking-tight text-foreground mb-4 flex items-center gap-2">
                <Radio className="w-5 h-5 text-primary" /> Multi-Agent Signal Fusion
              </h3>
              <p className="text-xs text-muted-foreground mb-6">Why is this forecasting happening? Analyzing external data streams.</p>
              <SignalsView fusion={brain.signalFusion} intent={brain.intentAcceleration} />
            </div>
          </div>
        );
      case "orchestration":
        return (
          <div className="space-y-6 bg-background">
            <InventoryView data={brain.inventoryDecision} skuName={brain.currentSKU.name} />
            {/* Bring Simulation into Orchestration */}
            <div className="mt-8 border-t border-border/20 pt-6">
              <SimulationView params={brain.simParams} onParamsChange={brain.setSimParams} result={brain.simulation} skuName={brain.currentSKU.name} />
            </div>
          </div>
        );
      case "registry":
        return <RegistryDemandView brain={brain} />;
      case "returns":
        return (
          <div className="space-y-6 bg-background">
            <ReturnsView data={brain.returnAnalysis} skuName={brain.currentSKU.name} returnExplanation={brain.explanation} />
          </div>
        );
      case "overview":
      default:
        return renderOverview();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border/15 pt-6 px-6 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: `hsl(${brand.color} / 0.12)`, color: `hsl(${brand.color})` }}>{brand.name}</span>
          <span className="text-[10px] text-muted-foreground/30 font-mono-data">{sku.id}</span>
        </div>
        <h1 className="text-3xl font-light tracking-tight text-foreground">{sku.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{sku.category} · <span className="font-mono-data">${sku.price.toLocaleString()}</span></p>
        
        {/* ═══ Tab strip with sliding pill ══════════════════ */}
        <div className="mt-8 relative" ref={tabsContainerRef}>
          <div className="flex items-center overflow-x-auto no-scrollbar gap-2">
            {tabs.map((tab) => {
              const isActive = brain.activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => { if (el) tabRefs.current.set(tab.id, el); }}
                  onClick={() => brain.setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 transition-all relative whitespace-nowrap
                    ${isActive ? "text-foreground font-medium" : "text-muted-foreground/70 hover:text-foreground hover:bg-secondary/20"}`}
                >
                  <tab.icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground/50"}`} />
                  <span className="text-[13px]">{tab.label}</span>
                  {/* Health badge on Predictive Demand tab */}
                  {tab.id === "predictive-demand" && <HealthBadge score={healthScore} />}
                </button>
              );
            })}
          </div>

          {/* Sliding pill indicator */}
          <div
            className="absolute bottom-0 h-[2px] bg-primary"
            style={{
              left: pillStyle.left,
              width: pillStyle.width,
              borderRadius: "2px 2px 0 0",
              transition: "left 0.25s cubic-bezier(0.16,1,0.3,1), width 0.25s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </div>
      </div>

      {/* ═══ Animated content panel ═════════════════════════ */}
      <div ref={panelRef} className={panelClass}>
        {renderActiveTab()}
      </div>
    </div>
  );
};

export default SKUDeepDive;

