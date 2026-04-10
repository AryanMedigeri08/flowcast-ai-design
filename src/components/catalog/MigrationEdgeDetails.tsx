import type { MigrationNode, DemandMigrationGraph } from "@/data/types";
import { getBrand } from "@/data/brands";
import { ArrowRight, Ban, Zap, Clock, ExternalLink, Package, TrendingUp, X } from "lucide-react";

interface Props {
  node: MigrationNode;
  graph: DemandMigrationGraph;
  onSKUClick: (id: string) => void;
  onClose: () => void;
}

export default function MigrationEdgeDetails({ node, graph, onSKUClick, onClose }: Props) {
  const brand = getBrand(node.brand);
  const isCritical = node.stockStatus === "critical" || node.stockStatus === "low";
  
  // Calculate outgoing edges
  const outgoing = graph.edges.filter(e => e.fromSkuId === node.skuId).sort((a,b) => b.probability - a.probability);

  const stockStatusConfig: Record<string, { label: string; cls: string }> = {
    critical: { label: "Critical Stock", cls: "bg-red-500/12 text-red-400 border-red-500/20" },
    low:      { label: "Low Stock",      cls: "bg-amber-500/12 text-amber-400 border-amber-500/20" },
    ok:       { label: "Healthy",        cls: "bg-emerald-500/12 text-emerald-400 border-emerald-500/20" },
    overstock:{ label: "Overstock",      cls: "bg-blue-500/12 text-blue-400 border-blue-500/20" },
  };

  const statusConfig = stockStatusConfig[node.stockStatus] || stockStatusConfig.ok;
  
  return (
    <div className="bg-card/80 backdrop-blur-xl border border-border/20 rounded-2xl shadow-lg h-full flex flex-col overflow-hidden">
       {/* Header Section */}
       <div className="p-6 pb-5 border-b border-border/10">
           <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2 flex-wrap">
                 <span 
                   className="px-3 py-1.5 rounded-md text-xs font-semibold border" 
                   style={{ 
                     background: `hsl(${brand.color} / 0.1)`, 
                     color: `hsl(${brand.color})`,
                     borderColor: `hsl(${brand.color} / 0.2)` 
                   }}
                 >
                    {brand.shortName}
                 </span>
                 <span className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${statusConfig.cls}`}>
                    {statusConfig.label}
                 </span>
                 <span className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary/40 text-muted-foreground border border-border/20">
                    {node.daysSupply}d supply
                 </span>
             </div>
             {/* Close button */}
             <button
               onClick={onClose}
               className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors shrink-0"
               title="Deselect"
             >
               <X className="w-5 h-5" />
             </button>
           </div>
           <h3 
             className="text-xl font-semibold text-foreground tracking-tight leading-tight cursor-pointer hover:text-primary transition-colors group flex items-center gap-1.5" 
             onClick={() => onSKUClick(node.skuId)}
           >
              {node.skuName}
              <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
           </h3>
           <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> {node.category}
           </p>
       </div>

       {/* Scrollable content area */}
       <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
         {/* Weekly Demand Card */}
         <div className="p-5 rounded-xl border border-border/15"
              style={{ background: 'linear-gradient(135deg, hsl(var(--secondary) / 0.5), hsl(var(--secondary) / 0.2))' }}>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Weekly Demand Value
            </p>
            <p className="text-3xl font-light font-mono-data text-foreground">${node.weeklyDemandValue.toLocaleString()}</p>
            {isCritical && (
                <p className="text-xs text-destructive tracking-wide mt-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  Currently at risk due to stock status
                </p>
            )}
         </div>

         {/* Outgoing Migration Breakdown */}
         {outgoing.length > 0 && (
             <div>
                 <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    Absorption Breakdown
                 </h4>
                 <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    When this SKU stocks out, demand migrates to these alternatives:
                 </p>

                 {/* Stacked bar */}
                 <div className="mb-4">
                   <div className="flex h-3.5 rounded-full overflow-hidden bg-secondary/30">
                       {outgoing.map((edge, i) => (
                           <div 
                             key={edge.toSkuId} 
                             className="h-full transition-all duration-500" 
                             style={{ 
                               width: `${edge.probability * 100}%`, 
                               background: `hsl(152 69% ${45 - i * 8}%)`,
                             }}
                             title={`${(edge.probability * 100).toFixed(0)}%`}
                           />
                       ))}
                       {node.lostProbability > 0 && (
                         <div className="h-full bg-red-500/70 transition-all duration-500" style={{ width: `${node.lostProbability * 100}%` }} />
                       )}
                       {node.deferredProbability > 0 && (
                         <div className="h-full bg-amber-500/60 transition-all duration-500" style={{ width: `${node.deferredProbability * 100}%` }} />
                       )}
                   </div>
                   <div className="flex justify-between mt-2">
                     <span className="text-[11px] text-emerald-400/80">Absorbed</span>
                     <span className="text-[11px] text-muted-foreground/50">{(outgoing.reduce((s, e) => s + e.probability, 0) * 100).toFixed(0)}% total</span>
                   </div>
                 </div>
                 
                 {/* Migration targets list */}
                 <div className="space-y-1.5">
                     {outgoing.map(edge => {
                         const target = graph.nodes.find(n => n.skuId === edge.toSkuId);
                         if (!target) return null;
                         const targetBrand = getBrand(target.brand);
                         return (
                             <div 
                               key={edge.toSkuId} 
                               className="flex items-center justify-between group cursor-pointer hover:bg-secondary/40 p-3 rounded-lg transition-all duration-200 border border-transparent hover:border-border/20" 
                               onClick={() => onSKUClick(target.skuId)}
                             >
                                 <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                                       <ArrowRight className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <div className="min-w-0">
                                       <p className="text-sm text-foreground font-medium truncate group-hover:text-primary transition-colors">{target.skuName}</p>
                                       <p className="text-xs truncate opacity-70" style={{ color: `hsl(${targetBrand.color})` }}>{targetBrand.name}</p>
                                    </div>
                                 </div>
                                 <div className="text-right shrink-0 ml-3">
                                     <p className="text-sm font-mono-data font-semibold text-emerald-400">{(edge.probability * 100).toFixed(0)}%</p>
                                     <p className="text-xs text-muted-foreground font-mono-data">${edge.weeklyDemandAtRisk.toLocaleString()}</p>
                                 </div>
                             </div>
                         )
                     })}
                     
                     {/* Divider */}
                     {(node.lostProbability > 0 || node.deferredProbability > 0) && (
                       <div className="border-t border-border/10 my-1.5" />
                     )}

                     {/* Lost Demand */}
                     {node.lostProbability > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                                   <Ban className="w-4 h-4 text-red-500" />
                                </div>
                               <p className="text-sm text-foreground font-medium">Lost Demand</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-mono-data font-semibold text-red-400">{(node.lostProbability * 100).toFixed(0)}%</p>
                                <p className="text-xs text-muted-foreground font-mono-data">${Math.round(node.weeklyDemandValue * node.lostProbability).toLocaleString()}</p>
                            </div>
                        </div>
                     )}

                     {/* Deferred Demand */}
                     {node.deferredProbability > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                                   <Clock className="w-4 h-4 text-amber-500" />
                                </div>
                               <p className="text-sm text-foreground font-medium">Deferred Demand</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-mono-data font-semibold text-amber-500">{(node.deferredProbability * 100).toFixed(0)}%</p>
                                <p className="text-xs text-muted-foreground font-mono-data">${Math.round(node.weeklyDemandValue * node.deferredProbability).toLocaleString()}</p>
                            </div>
                        </div>
                     )}
                 </div>
             </div>
         )}

         {/* Incoming Migration — "Absorbs From" */}
         {node.incomingEdges.length > 0 && (
            <div className="pt-5 border-t border-border/15">
               <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                 <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <ArrowRight className="w-3.5 h-3.5 text-primary rotate-180" />
                 </div>
                 Absorbs Demand From
               </h4>
               <div className="flex flex-wrap gap-2.5">
                  {node.incomingEdges.map((e, idx) => {
                     const src = graph.nodes.find(n => n.skuId === e.fromSkuId);
                     if(!src) return null;
                     const srcBrand = getBrand(src.brand);
                     return (
                        <div 
                          key={idx} 
                          className="px-3.5 py-2 rounded-lg text-xs text-foreground/80 flex items-center gap-2 border border-border/15 hover:border-border/30 transition-colors cursor-default"
                          style={{ background: `hsl(${srcBrand.color} / 0.06)` }}
                        >
                           <span className={`w-2.5 h-2.5 rounded-full ${src.stockStatus === 'critical' ? 'bg-red-500 animate-pulse' : src.stockStatus === 'low' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                           <span className="font-medium">{src.skuName.length > 22 ? src.skuName.slice(0, 20) + "…" : src.skuName}</span>
                        </div>
                     )
                  })}
               </div>
            </div>
         )}
       </div>
    </div>
  );
}
