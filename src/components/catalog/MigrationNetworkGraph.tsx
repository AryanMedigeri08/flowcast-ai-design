import { useEffect, useState, useMemo, useCallback } from "react";
import type { DemandMigrationGraph, MigrationNode, MigrationEdge } from "@/data/types";
import { getBrand } from "@/data/brands";
import { AlertTriangle } from "lucide-react";

interface Props {
  graph: DemandMigrationGraph;
  selectedNode: MigrationNode | null;
  onNodeClick: (node: MigrationNode) => void;
  showAll?: boolean;
}

/** A single category's mini force graph data */
interface CategoryBatch {
  category: string;
  nodes: MigrationNode[];
  edges: MigrationEdge[];
  hasRisk: boolean;
}

/** Run a simple force simulation on a small set of nodes */
function runForceLayout(
  nodes: MigrationNode[],
  edges: MigrationEdge[],
  width: number,
  height: number
): MigrationNode[] {
  if (nodes.length === 0) return [];
  const simNodes = nodes.map(n => ({ ...n }));

  const cx = width / 2;
  const cy = height / 2;

  // With only 2-6 nodes, we can space them generously — exploded view
  const K = 10000;
  const springLen = Math.min(width, height) * 0.4;
  const springK = 0.035;
  const centerForce = 0.035;
  const minDist = 100;
  const iterations = 120;
  const padding = 55;

  // Initialize in a circle
  const angleStep = (2 * Math.PI) / simNodes.length;
  const initRadius = Math.min(width, height) * 0.25;
  simNodes.forEach((n, i) => {
    n.x = cx + Math.cos(angleStep * i - Math.PI / 2) * initRadius;
    n.y = cy + Math.sin(angleStep * i - Math.PI / 2) * initRadius;
    n.vx = 0;
    n.vy = 0;
  });

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;

    // Repulsion
    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        const u = simNodes[i], v = simNodes[j];
        let dx = u.x - v.x, dy = u.y - v.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 1) { dx = (Math.random() - 0.5) * 4; dy = (Math.random() - 0.5) * 4; distSq = dx * dx + dy * dy; }
        const dist = Math.sqrt(distSq);
        if (dist < 300) {
          const force = (K / distSq) * alpha;
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          u.vx += fx; u.vy += fy;
          v.vx -= fx; v.vy -= fy;
        }
        if (dist < minDist) {
          const push = (minDist - dist) * 0.5;
          const pfx = (dx / dist) * push, pfy = (dy / dist) * push;
          u.vx += pfx; u.vy += pfy;
          v.vx -= pfx; v.vy -= pfy;
        }
      }
      // Center pull
      const u = simNodes[i];
      u.vx += (cx - u.x) * centerForce * alpha;
      u.vy += (cy - u.y) * centerForce * alpha;
    }

    // Springs
    edges.forEach(edge => {
      const u = simNodes.find(n => n.skuId === edge.fromSkuId);
      const v = simNodes.find(n => n.skuId === edge.toSkuId);
      if (!u || !v) return;
      const dx = v.x - u.x, dy = v.y - u.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const force = (dist - springLen) * springK * alpha;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        u.vx += fx; u.vy += fy;
        v.vx -= fx; v.vy -= fy;
      }
    });

    // Update
    simNodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      n.vx *= 0.5; n.vy *= 0.5;
      n.x = Math.max(padding, Math.min(width - padding, n.x));
      n.y = Math.max(padding, Math.min(height - padding, n.y));
    });
  }

  return simNodes;
}

/** Mini force graph SVG for a single category */
function CategoryForceGraph({
  batch,
  selectedNode,
  connectedIds,
  onNodeClick,
  overrideSize,
}: {
  batch: CategoryBatch;
  selectedNode: MigrationNode | null;
  connectedIds: Set<string>;
  onNodeClick: (node: MigrationNode) => void;
  overrideSize?: boolean;
}) {
  // Calculate graph dimensions — large coordinate space for "all" mode, scaled to fit
  const nodeCount = batch.nodes.length;
  // Simulation coordinate space
  const simWidth = overrideSize ? 1400 : Math.min(nodeCount * 220, 960);
  const simHeight = overrideSize ? 900 : Math.max(260, Math.min(nodeCount * 80, 380));

  const [layoutNodes, setLayoutNodes] = useState<MigrationNode[]>([]);

  useEffect(() => {
    const result = runForceLayout(batch.nodes, batch.edges, simWidth, simHeight);
    setLayoutNodes(result);
  }, [batch.nodes, batch.edges, simWidth, simHeight]);

  const maxRev = useMemo(() => Math.max(...batch.nodes.map(n => n.revenueVelocity), 1), [batch.nodes]);

  const activeNodeId = selectedNode?.skuId || null;

  return (
    <svg
      viewBox={`0 0 ${simWidth} ${simHeight}`}
      className={overrideSize ? "w-full h-full" : "shrink-0"}
      width={overrideSize ? undefined : simWidth}
      height={overrideSize ? undefined : simHeight}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Edge gradient defs */}
      <defs>
        <linearGradient id={`eg-${batch.category}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.15" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
        </linearGradient>
        {/* Arrowhead marker */}
        <marker id={`arrow-${batch.category}`} markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
          <path d="M0,0 L10,4 L0,8" fill="hsl(var(--muted-foreground))" opacity="0.3" />
        </marker>
        <marker id={`arrow-risk-${batch.category}`} markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
          <path d="M0,0 L10,4 L0,8" fill="hsl(0 72% 51%)" opacity="0.4" />
        </marker>
      </defs>

      {/* Edges */}
      <g strokeLinecap="round">
        {batch.edges.map((edge, i) => {
          const u = layoutNodes.find(n => n.skuId === edge.fromSkuId);
          const v = layoutNodes.find(n => n.skuId === edge.toSkuId);
          if (!u || !v) return null;

          const dx = v.x - u.x, dy = v.y - u.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist === 0) return null;

          // Slight curve
          const nx = -dy / dist, ny = dx / dist;
          const curveOffset = Math.min(20, dist * 0.15);
          const ctrlX = (u.x + v.x) / 2 + nx * curveOffset;
          const ctrlY = (u.y + v.y) / 2 + ny * curveOffset;
          const d = `M ${u.x} ${u.y} Q ${ctrlX} ${ctrlY} ${v.x} ${v.y}`;

          const isHighlighted = activeNodeId === u.skuId || activeNodeId === v.skuId;
          const isDimmed = activeNodeId && !isHighlighted;
          let opacity = Math.max(0.15, edge.probability * 0.7);
          if (isHighlighted) opacity = Math.max(0.5, edge.probability);
          if (isDimmed) opacity = 0.06;

          const isCriticalSource = u.stockStatus === "critical" || u.stockStatus === "low";

          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={isCriticalSource ? "hsl(0 72% 51%)" : `url(#eg-${batch.category})`}
              strokeWidth={Math.max(2, edge.probability * 6)}
              opacity={opacity}
              strokeDasharray={isCriticalSource ? "5 3" : "none"}
              markerEnd={`url(#${isCriticalSource ? `arrow-risk-${batch.category}` : `arrow-${batch.category}`})`}
              className="transition-opacity duration-300"
            />
          );
        })}
      </g>

      {/* Nodes */}
      {layoutNodes
        .sort((a, b) => {
          if (a.skuId === activeNodeId) return 1;
          if (b.skuId === activeNodeId) return -1;
          return 0;
        })
        .map(node => {
        const brand = getBrand(node.brand);
        const radius = overrideSize ? 10 + (node.revenueVelocity / maxRev) * 10 : 16 + (node.revenueVelocity / maxRev) * 18;
        const isCritical = node.stockStatus === "critical" || node.stockStatus === "low";
        const isSelected = selectedNode?.skuId === node.skuId;
        const isConnected = connectedIds.has(node.skuId);
        const isDimmed = activeNodeId && !isConnected && !isSelected;

        // Truncate label — shorter in all-mode
        const maxLen = overrideSize ? 14 : 22;
        const label = node.skuName.length > maxLen ? node.skuName.slice(0, maxLen - 2) + "…" : node.skuName;
        const labelFontSize = overrideSize ? 9 : 12;

        return (
          <g
            key={node.skuId}
            transform={`translate(${node.x},${node.y})`}
            className="cursor-pointer"
            onClick={() => onNodeClick(node)}
            opacity={isDimmed ? 0.2 : 1}
            style={{ transition: "opacity 0.3s" }}
          >
            {/* Critical pulse */}
            {isCritical && (
              <circle r={radius + 12} fill="none" stroke="hsl(0 72% 51%)" strokeWidth="2" opacity="0.2" className="animate-ping" />
            )}
            {/* Selection ring */}
            {isSelected && (
              <circle r={radius + 7} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" opacity="0.6" strokeDasharray="5 3" />
            )}
            {/* Glow */}
            {isSelected && (
              <circle r={radius + 4} fill={`hsl(${brand.color} / 0.15)`} />
            )}
            {/* Node circle */}
            <circle
              r={radius}
              fill={`hsl(${brand.color})`}
              stroke={isCritical ? "hsl(0 72% 51%)" : "hsl(var(--card))"}
              strokeWidth={isCritical ? "3" : "2.5"}
              style={{ filter: isSelected ? `drop-shadow(0 0 10px hsl(${brand.color} / 0.5))` : "none" }}
            />
            {/* Label with background */}
            <rect
              x={-label.length * (labelFontSize * 0.3) - 6}
              y={radius + 5}
              width={label.length * (labelFontSize * 0.6) + 12}
              height={labelFontSize + 8}
              rx={(labelFontSize + 8) / 2}
              fill="hsl(var(--card) / 0.92)"
              stroke="hsl(var(--border) / 0.2)"
              strokeWidth="0.5"
            />
            <text
              y={radius + 5 + labelFontSize}
              textAnchor="middle"
              fill="currentColor"
              fontSize={labelFontSize}
              className="text-foreground pointer-events-none font-medium"
              opacity={isSelected || isConnected || !activeNodeId ? 0.9 : 0.55}
            >
              {label}
            </text>
            {/* Stock status micro-badge */}
            {isCritical && (
              <g transform={`translate(${radius - 3}, ${-radius + 3})`}>
                <circle r="8" fill="hsl(var(--card))" />
                <circle r="6" fill={node.stockStatus === "critical" ? "hsl(0 72% 51%)" : "hsl(38 92% 50%)"} />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Main component */
export default function MigrationNetworkGraph({ graph, selectedNode, onNodeClick, showAll }: Props) {
  // Connected IDs for dimming
  const connectedIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const ids = new Set<string>();
    ids.add(selectedNode.skuId);
    graph.edges.forEach(e => {
      if (e.fromSkuId === selectedNode.skuId) ids.add(e.toSkuId);
      if (e.toSkuId === selectedNode.skuId) ids.add(e.fromSkuId);
    });
    return ids;
  }, [selectedNode, graph.edges]);

  // ─── "All Categories" mode: one big force graph ───
  if (showAll) {
    const allBatch: CategoryBatch = {
      category: "all",
      nodes: graph.nodes,
      edges: graph.edges,
      hasRisk: graph.nodes.some(n => n.stockStatus === "critical" || n.stockStatus === "low"),
    };

    return (
      <div className="w-full h-full overflow-auto custom-scrollbar">
        <div className="flex items-center justify-center min-h-full p-3">
          <CategoryForceGraph
            batch={allBatch}
            selectedNode={selectedNode}
            connectedIds={connectedIds}
            onNodeClick={onNodeClick}
            overrideSize
          />
        </div>
      </div>
    );
  }

  // ─── Single category mode: batched mini graphs ───
  const batches = (() => {
    const catMap = new Map<string, { nodes: MigrationNode[]; edges: MigrationEdge[] }>();

    graph.nodes.forEach(node => {
      if (!catMap.has(node.category)) catMap.set(node.category, { nodes: [], edges: [] });
      catMap.get(node.category)!.nodes.push(node);
    });

    graph.edges.forEach(edge => {
      const fromNode = graph.nodes.find(n => n.skuId === edge.fromSkuId);
      if (fromNode && catMap.has(fromNode.category)) {
        catMap.get(fromNode.category)!.edges.push(edge);
      }
    });

    return Array.from(catMap.entries())
      .map(([category, data]) => ({
        category,
        nodes: data.nodes,
        edges: data.edges,
        hasRisk: data.nodes.some(n => n.stockStatus === "critical" || n.stockStatus === "low"),
      }))
      .sort((a, b) => {
        if (a.hasRisk !== b.hasRisk) return a.hasRisk ? -1 : 1;
        return b.nodes.length - a.nodes.length;
      });
  })();

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar p-4 space-y-3">
      {batches.map(batch => (
        <div
          key={batch.category}
          className={`rounded-xl border transition-all duration-300 overflow-hidden ${
            batch.hasRisk
              ? "border-red-500/15 bg-red-500/[0.02]"
              : "border-border/10 bg-card/20"
          } ${
            selectedNode && batch.nodes.some(n => connectedIds.has(n.skuId))
              ? "ring-1 ring-primary/15"
              : ""
          }`}
        >
          {/* Category header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border/8 bg-card/30">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{batch.category}</h3>
            <span className="text-xs text-muted-foreground font-mono-data">
              {batch.nodes.length} SKU{batch.nodes.length > 1 ? "s" : ""}
            </span>
            {batch.edges.length > 0 && (
              <span className="text-xs text-muted-foreground/60">
                · {batch.edges.length} path{batch.edges.length > 1 ? "s" : ""}
              </span>
            )}
            {batch.hasRisk && (
              <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium ml-auto">
                <AlertTriangle className="w-3.5 h-3.5" />
                at risk
              </span>
            )}
          </div>

          {/* Mini force graph */}
          <div className="flex items-center justify-center py-3 px-3 overflow-x-auto scrollbar-hide">
            <CategoryForceGraph
              batch={batch}
              selectedNode={selectedNode}
              connectedIds={connectedIds}
              onNodeClick={onNodeClick}
            />
          </div>
        </div>
      ))}

      {graph.nodes.length === 0 && (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          No SKUs found for this category filter.
        </div>
      )}
    </div>
  );
}
