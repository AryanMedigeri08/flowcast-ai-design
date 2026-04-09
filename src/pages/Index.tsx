import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroAnimation from "@/components/HeroAnimation";
import { ArrowRight, BarChart3, Box, Zap, TrendingUp } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="landing" />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground mb-6 animate-slide-up">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Now with real-time demand signals
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6 animate-slide-up-delay-1">
              Predict Demand{" "}
              <span className="text-gradient">Before It Happens</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 animate-slide-up-delay-2">
              AI-driven retail intelligence that prevents stockouts, reduces waste,
              and optimizes your entire supply chain — automatically.
            </p>

            <div className="flex items-center justify-center gap-4 animate-slide-up-delay-3">
              <Link
                to="/dashboard"
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5"
              >
                Start Forecasting
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <button className="px-6 py-3 rounded-xl text-muted-foreground hover:text-foreground border border-border hover:border-border/80 transition-all">
                Watch Demo
              </button>
            </div>
          </div>

          {/* Animated chart */}
          <div className="relative max-w-3xl mx-auto">
            <div className="glass rounded-2xl p-6 glow-primary">
              <HeroAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: BarChart3,
                title: "Demand Forecasting",
                desc: "ML models trained on your data predict demand with 94% accuracy",
              },
              {
                icon: Box,
                title: "Inventory Intelligence",
                desc: "Real-time alerts for low stock, overstock, and reorder points",
              },
              {
                icon: Zap,
                title: "Supply Chain Flow",
                desc: "Visualize and optimize supplier → warehouse → store logistics",
              },
              {
                icon: TrendingUp,
                title: "What-If Simulator",
                desc: "Model demand scenarios and see inventory impact instantly",
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="group glass rounded-2xl p-6 hover:bg-card/80 transition-all duration-300 hover:-translate-y-1 cursor-default"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-sm text-muted-foreground">© 2026 FlowCast AI</span>
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "Contact"].map((item) => (
              <button key={item} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {item}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
