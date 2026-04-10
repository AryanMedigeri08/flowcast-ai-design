const BASE_URL = "http://localhost:8000";

export async function fetchForecast(skuId: string, baseDemand: number, trend: number, days: number = 14) {
  try {
    const response = await fetch(`${BASE_URL}/predict/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku_id: skuId, base_demand: baseDemand, trend, days }),
    });
    if (!response.ok) throw new Error("Backend unavailable");
    return await response.json();
  } catch (error) {
    console.warn("ML Backend fetch failed, using local model:", error);
    return null;
  }
}

export async function fetchReturnRisk(skuId: string, price: number, category: string, histReturnRate: number) {
  try {
    const response = await fetch(`${BASE_URL}/predict/return-risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku_id: skuId, price, category, hist_return_rate: histReturnRate }),
    });
    if (!response.ok) throw new Error("Backend unavailable");
    return await response.json();
  } catch (error) {
    console.warn("ML Backend fetch failed, using local model:", error);
    return null;
  }
}

export async function fetchAnomalies(skuId: string, demandData: number[], baselineDemand: number = 100) {
  try {
    const response = await fetch(`${BASE_URL}/predict/anomalies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku_id: skuId, demand_data: demandData, baseline_demand: baselineDemand }),
    });
    if (!response.ok) throw new Error("Backend unavailable");
    return await response.json();
  } catch (error) {
    console.warn("ML Backend fetch failed, using local model:", error);
    return null;
  }
}
