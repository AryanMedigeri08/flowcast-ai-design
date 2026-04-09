import { Sparkles, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";

const insights = [
  {
    icon: TrendingUp,
    text: "Demand for Organic Oat Milk will increase by 23% next week due to seasonal trends.",
    type: "prediction" as const,
    confidence: 94,
  },
  {
    icon: AlertTriangle,
    text: "Sparkling Water 12pk will run out in 2 days at current sell-through rate. Reorder now.",
    type: "alert" as const,
    confidence: 97,
  },
  {
    icon: Sparkles,
    text: "Protein Bars are overstocked by 140 units. Consider a 15% markdown to clear excess.",
    type: "suggestion" as const,
    confidence: 88,
  },
];

const typeStyles = {
  prediction: "border-primary/20 bg-primary/5",
  alert: "border-destructive/20 bg-destructive/5",
  suggestion: "border-accent/20 bg-accent/5",
};

const iconStyles = {
  prediction: "text-primary",
  alert: "text-destructive",
  suggestion: "text-accent",
};

const AIInsightsPanel = () => {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">AI Insights</h3>
        <span className="ml-auto text-xs text-muted-foreground">Updated 2m ago</span>
      </div>

      <div className="space-y-3">
        {insights.map((insight, i) => {
          const Icon = insight.icon;
          return (
            <div
              key={i}
              className={`rounded-xl p-4 border ${typeStyles[insight.type]} hover:scale-[1.01] transition-transform cursor-default group`}
            >
              <div className="flex gap-3">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconStyles[insight.type]}`} />
                <div className="flex-1">
                  <p className="text-sm text-foreground leading-relaxed">{insight.text}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">{insight.confidence}% confidence</span>
                    <button className="text-xs text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Take action <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AIInsightsPanel;
