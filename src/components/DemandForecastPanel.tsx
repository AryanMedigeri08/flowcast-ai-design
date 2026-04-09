import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const timeRanges = ["Daily", "Weekly", "Monthly"] as const;

const generateData = (range: string) => {
  const labels =
    range === "Daily"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"]
      : range === "Weekly"
      ? ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];

  return labels.map((name, i) => {
    const actual = i < labels.length - 3 ? Math.floor(60 + Math.random() * 40 + i * 3) : undefined;
    const predicted = Math.floor(65 + Math.random() * 35 + i * 4);
    return { name, actual, predicted };
  });
};

const DemandForecastPanel = () => {
  const [activeRange, setActiveRange] = useState<(typeof timeRanges)[number]>("Weekly");
  const data = useMemo(() => generateData(activeRange), [activeRange]);

  return (
    <div className="glass rounded-2xl p-6 flex-1">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Demand Forecast</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Predicted vs actual demand</p>
        </div>
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                activeRange === range
                  ? "bg-primary/20 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(215 90% 60%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(215 90% 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 20% 16%)" />
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(220 15% 55%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(222 20% 16%)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(220 15% 55%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222 25% 10%)",
                border: "1px solid hsl(222 20% 16%)",
                borderRadius: "12px",
                fontSize: "12px",
                color: "hsl(220 20% 93%)",
              }}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="hsl(215 90% 60%)"
              strokeWidth={2}
              fill="url(#actualGrad)"
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="hsl(260 60% 65%)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-primary rounded-full" />
          <span className="text-xs text-muted-foreground">Actual</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-accent rounded-full" style={{ borderBottom: '1px dashed' }} />
          <span className="text-xs text-muted-foreground">Predicted</span>
        </div>
      </div>
    </div>
  );
};

export default DemandForecastPanel;
