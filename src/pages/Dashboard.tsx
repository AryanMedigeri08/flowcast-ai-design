import { useState } from "react";
import Navbar from "@/components/Navbar";
import ProductSelector from "@/components/ProductSelector";
import DemandForecastPanel from "@/components/DemandForecastPanel";
import InventoryHealthPanel from "@/components/InventoryHealthPanel";
import AIInsightsPanel from "@/components/AIInsightsPanel";
import SupplyChainFlow from "@/components/SupplyChainFlow";
import ForecastSimulator from "@/components/ForecastSimulator";

const Dashboard = () => {
  const [selectedProduct, setSelectedProduct] = useState("1");

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="app" />

      <main className="pt-20 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Real-time demand intelligence
              </p>
            </div>
            <ProductSelector selected={selectedProduct} onSelect={setSelectedProduct} />
          </div>

          {/* Main content — asymmetric layout */}
          <div className="flex flex-col lg:flex-row gap-5 mb-5">
            <DemandForecastPanel />
            <InventoryHealthPanel />
          </div>

          {/* Supply chain + Simulator */}
          <div className="grid lg:grid-cols-2 gap-5 mb-5">
            <SupplyChainFlow />
            <ForecastSimulator />
          </div>

          {/* AI Insights */}
          <AIInsightsPanel />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
