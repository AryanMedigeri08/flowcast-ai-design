import { useEffect, useState } from "react";

const HeroAnimation = () => {
  const [points, setPoints] = useState<number[]>([]);
  const [predictedPoints, setPredictedPoints] = useState<number[]>([]);

  useEffect(() => {
    const base = [40, 35, 45, 38, 52, 48, 55, 50, 62, 58, 65, 60, 72, 68];
    const predicted = [68, 75, 70, 82, 78, 85, 80, 90];
    setPoints(base);
    setPredictedPoints(predicted);
  }, []);

  const allPoints = [...points, ...predictedPoints];
  const maxVal = Math.max(...allPoints, 100);
  const width = 600;
  const height = 300;
  const padding = 20;

  const toX = (i: number, total: number) => padding + (i / (total - 1)) * (width - padding * 2);
  const toY = (v: number) => height - padding - (v / maxVal) * (height - padding * 2);

  const actualPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i, allPoints.length)} ${toY(p)}`)
    .join(" ");

  const predPath = [points[points.length - 1], ...predictedPoints]
    .map((p, i) => {
      const idx = points.length - 1 + i;
      return `${i === 0 ? "M" : "L"} ${toX(idx, allPoints.length)} ${toY(p)}`;
    })
    .join(" ");

  const gradientAreaPath = `${actualPath} L ${toX(points.length - 1, allPoints.length)} ${height - padding} L ${toX(0, allPoints.length)} ${height - padding} Z`;

  return (
    <div className="relative w-full max-w-[600px] mx-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(215 90% 60%)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(215 90% 60%)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="predGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(215 90% 60%)" />
            <stop offset="100%" stopColor="hsl(260 60% 65%)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={padding}
            x2={width - padding}
            y1={padding + ratio * (height - padding * 2)}
            y2={padding + ratio * (height - padding * 2)}
            stroke="hsl(222 20% 16%)"
            strokeWidth="1"
          />
        ))}

        {/* Area fill */}
        <path d={gradientAreaPath} fill="url(#areaGrad)" className="animate-fade-in" />

        {/* Actual line */}
        <path
          d={actualPath}
          fill="none"
          stroke="hsl(215 90% 60%)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-fade-in"
        />

        {/* Predicted line */}
        <path
          d={predPath}
          fill="none"
          stroke="url(#predGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="8 4"
          filter="url(#glow)"
          className="animate-fade-in"
        />

        {/* Divider line */}
        <line
          x1={toX(points.length - 1, allPoints.length)}
          x2={toX(points.length - 1, allPoints.length)}
          y1={padding}
          y2={height - padding}
          stroke="hsl(222 20% 25%)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Labels */}
        <text x={toX(points.length / 2, allPoints.length)} y={height - 4} textAnchor="middle" fill="hsl(220 15% 55%)" fontSize="11" fontFamily="Inter">
          Historical
        </text>
        <text x={toX(points.length + predictedPoints.length / 2, allPoints.length)} y={height - 4} textAnchor="middle" fill="hsl(260 60% 65%)" fontSize="11" fontFamily="Inter">
          Predicted
        </text>

        {/* Dots on predicted */}
        {predictedPoints.map((p, i) => {
          const idx = points.length + i;
          return (
            <circle
              key={i}
              cx={toX(idx, allPoints.length)}
              cy={toY(p)}
              r="3"
              fill="hsl(260 60% 65%)"
              className="animate-pulse-glow"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          );
        })}
      </svg>

      {/* Floating insight card */}
      <div className="absolute top-4 right-4 glass rounded-xl p-3 animate-float" style={{ animationDelay: '1s' }}>
        <p className="text-xs text-muted-foreground">AI Prediction</p>
        <p className="text-sm font-semibold text-foreground">+23% <span className="text-success text-xs">next week</span></p>
      </div>
    </div>
  );
};

export default HeroAnimation;
