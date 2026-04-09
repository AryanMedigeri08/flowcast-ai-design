import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ChevronDown } from "lucide-react";

const Navbar = ({ variant = "landing" }: { variant?: "landing" | "app" }) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            FlowCast<span className="text-primary"> AI</span>
          </span>
        </Link>

        {variant === "landing" ? (
          <div className="hidden md:flex items-center gap-8">
            {["Features", "Pricing", "Docs"].map((item) => (
              <button
                key={item}
                onMouseEnter={() => setHoveredItem(item)}
                onMouseLeave={() => setHoveredItem(null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors relative"
              >
                {item}
                {hoveredItem === item && (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-primary animate-scale-in" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "Forecast", path: "/dashboard" },
              { label: "Supply Chain", path: "/dashboard?tab=supply" },
              { label: "Simulator", path: "/dashboard?tab=simulator" },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-all"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          {variant === "landing" ? (
            <>
              <Link
                to="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/dashboard"
                className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20"
              >
                Start Forecasting
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-xs font-medium text-accent">JD</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
