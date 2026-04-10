import { useState, useMemo } from "react";
import type { RetailBrainState } from "@/hooks/useRetailBrain";
import type { MigrationNode, DemandMigrationGraph } from "@/data/types";
import MigrationNetworkGraph from "./MigrationNetworkGraph";
import MigrationEdgeDetails from "./MigrationEdgeDetails";
import { Network, AlertTriangle, TrendingDown, ShieldAlert, ArrowRightLeft, DollarSign } from "lucide-react";

export default function CatalogIntelligenceView({ brain }: { brain: RetailBrainState }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedNode, setSelectedNode] = useState<MigrationNode | null>(null);

  const categories = useMemo(() => {
     const cats = new Set(brain.migrationGraph.nodes.map(n => n.category));
     return Array.from(cats).sort();
  }, [brain.migrationGraph]);

  const viewGraph = useMemo(() => {
    if (selectedCategory === "all") return brain.migrationGraph;
    
    const filteredNodes = brain.migrationGraph.nodes.filter(n => n.category === selectedCategory);
    const filteredEdges = brain.migrationGraph.edges.filter(e => {
        const fromNode = filteredNodes.find(n => n.skuId === e.fromSkuId);
        const toNode = filteredNodes.find(n => n.skuId === e.toSkuId);
        return fromNode && toNode;
    });
    
    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      totalWeeklyDemandAtRisk: filteredNodes.filter(n => n.stockStatus === 'critical' || n.stockStatus === 'low').reduce((s, n) => s + n.weeklyDemandValue, 0),
      criticalNodeCount: filteredNodes.filter(n => n.stockStatus === 'critical').length,
      lostDemandEstimate: 0, 
      absorbedDemandEstimate: 0,
    } as DemandMigrationGraph;
  }, [brain.migrationGraph, selectedCategory]);

  // Compute summary stats
  const totalNodes = viewGraph.nodes.length;
  const totalEdges = viewGraph.edges.length;
  const atRiskNodes = viewGraph.nodes.filter(n => n.stockStatus === 'critical' || n.stockStatus === 'low').length;
  const totalDemandAtRisk = viewGraph.totalWeeklyDemandAtRisk;

  const kpis = [
    { label: "Total SKUs", value: totalNodes.toString(), icon: Network, color: "var(--primary)" },
    { label: "Migration Paths", value: totalEdges.toString(), icon: ArrowRightLeft, color: "var(--accent)" },
    { label: "At-Risk SKUs", value: atRiskNodes.toString(), icon: ShieldAlert, color: atRiskNodes > 0 ? "var(--destructive)" : "var(--success)" },
    { label: "Demand at Risk", value: `$${(totalDemandAtRisk / 1000).toFixed(0)}K`, icon: DollarSign, color: "var(--warning)" },
  ];

  return (
    <div className="animate-slide-up h-[calc(100vh-80px)] flex flex-col">
      {/* Fixed top section: Header + KPIs + Filters + Alert */}
      <div className="shrink-0 space-y-4 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between">
           <div>
              <h1 className="text-3xl font-light tracking-tight text-foreground flex items-center gap-2.5">
                 <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Network className="w-5 h-5 text-primary" />
                 </div>
                 Catalog <span className="font-semibold">Intelligence</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 ml-[46px]">Visualize how demand migrates across substitute SKUs during stockouts.</p>
           </div>
        </div>

        {/* KPI Summary Strip */}
        <div className="grid grid-cols-4 gap-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="glass rounded-xl px-4 py-3 flex items-center gap-3 group hover:border-primary/20 transition-all duration-300">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `hsl(${kpi.color} / 0.1)` }}>
                <kpi.icon className="w-4.5 h-4.5" style={{ color: `hsl(${kpi.color})` }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium leading-none mb-1">{kpi.label}</p>
                <p className="text-lg font-semibold text-foreground font-mono-data leading-none">{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Category Filters */}
        <div className="-mx-1 px-1">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button 
              onClick={() => {setSelectedCategory("all"); setSelectedNode(null);}} 
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border whitespace-nowrap shrink-0 ${selectedCategory === "all" ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" : "bg-card/60 text-muted-foreground border-border/30 hover:bg-secondary/60 hover:text-foreground hover:border-border/50"}`}
            >
               All Categories
            </button>
            {categories.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => {setSelectedCategory(cat); setSelectedNode(null);}} 
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border whitespace-nowrap shrink-0 ${selectedCategory === cat ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" : "bg-card/60 text-muted-foreground border-border/30 hover:bg-secondary/60 hover:text-foreground hover:border-border/50"}`}
                >
                   {cat}
                </button>
            ))}
          </div>
        </div>
        
        {/* Alert Strip */}
        {viewGraph.criticalNodeCount > 0 && (
           <div className="flex items-center gap-3 px-4 py-3 bg-destructive/8 border border-destructive/15 rounded-xl backdrop-blur-sm">
               <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
               </div>
               <p className="text-sm text-foreground leading-snug">
                  <span className="font-semibold text-destructive">{viewGraph.criticalNodeCount} SKU{viewGraph.criticalNodeCount > 1 ? "s" : ""}</span>{" "}
                  at critical stock — migration risk:{" "}
                  <span className="font-semibold font-mono-data">${viewGraph.totalWeeklyDemandAtRisk.toLocaleString()}</span>{" "}
                  weekly demand at risk.
               </p>
           </div>
        )}
      </div>

      {/* Main Content — scrollable grid + sticky details panel */}
      <div className="flex-1 min-h-0 grid lg:grid-cols-3 gap-4">
          {/* Left: Scrollable SKU card grid */}
          <div className="lg:col-span-2 min-h-0 rounded-2xl border border-border/15 bg-card/30 overflow-hidden">
             <MigrationNetworkGraph graph={viewGraph} selectedNode={selectedNode} onNodeClick={setSelectedNode} showAll={selectedCategory === "all"} />
          </div>

          {/* Right: Details panel */}
          <div className="lg:col-span-1 min-h-0 overflow-y-auto custom-scrollbar">
            {selectedNode ? (
               <MigrationEdgeDetails 
                 node={selectedNode} 
                 graph={viewGraph} 
                 onSKUClick={brain.selectSKUAndNavigate}
                 onClose={() => setSelectedNode(null)}
               />
            ) : (
                <div className="h-full flex flex-col items-center justify-center border border-dashed border-border/30 rounded-2xl p-8 bg-card/20">
                   <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
                     <TrendingDown className="w-6 h-6 text-muted-foreground/40" />
                   </div>
                   <p className="text-sm text-muted-foreground text-center font-medium mb-1">No Node Selected</p>
                   <p className="text-xs text-muted-foreground/60 text-center leading-relaxed max-w-[200px]">Click on any SKU card to inspect migration paths and demand flow.</p>
                </div>
            )}
          </div>
      </div>
    </div>
  );
}
