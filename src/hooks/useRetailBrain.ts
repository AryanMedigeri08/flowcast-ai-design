import { useState, useMemo, useCallback, useEffect } from "react";
import type { 
  DashboardView, SimulationParams, DynamicNotification, SKUTab,
  ForecastPoint, ReturnAnalysis, AnomalyEvent
} from "@/data/types";
import { skuCatalog, brands } from "@/data/brands";
import { fetchForecast, fetchReturnRisk, fetchAnomalies } from "@/lib/backendService";
import {
  generateDemandForecast,
  generateDemandDecomposition,
  generateAnomalies,
  generateSignalFusion,
  generateIntentAcceleration,
  generateReturnAnalysis,
  generateInventoryDecision,
  simulateWhatIf,
  generateExplanation,
  generateAlerts,
  generateSKUPriorities,
  generateKPIs,
  generateDynamicNotifications,
  getNotificationSummary,
  generateMigrationGraph,
  generateElasticity,
  generateRegistryDemand,
} from "@/data/generators";

const defaultSimParams: SimulationParams = {
  demandMultiplier: 1.0,
  returnRateAdj: 0,
  festivalActive: false,
  promotionIntensity: 0,
  demandFluctuation: 15,
  seasonalityMode: "none",
  externalTrendFactor: 0,
};

export function useRetailBrain() {
  const [activeView, setActiveView] = useState<DashboardView>("executive");
  const [activeTab, setActiveTab] = useState<SKUTab>("overview");
  const [selectedSKU, setSelectedSKU] = useState(skuCatalog[0].id);
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [simParams, setSimParams] = useState<SimulationParams>(defaultSimParams);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<DynamicNotification[]>(() => generateDynamicNotifications());
  const [showNotifications, setShowNotifications] = useState(false);

  // --- Backend ML State ---
  const [mlForecast, setMlForecast] = useState<ForecastPoint[] | null>(null);
  const [mlReturnRisk, setMlReturnRisk] = useState<ReturnAnalysis | null>(null);
  const [mlAnomalies, setMlAnomalies] = useState<AnomalyEvent[] | null>(null);
  const [isMlLoading, setIsMlLoading] = useState(false);

  useEffect(() => {
    const fetchMlData = async () => {
      setIsMlLoading(true);
      const currentSku = skuCatalog.find(s => s.id === selectedSKU);
      if (!currentSku) { setIsMlLoading(false); return; }

      // Derive SKU-specific model parameters from catalog attributes
      const baseDemand = Math.max(8, Math.round(200 - currentSku.price * 0.08));
      const trend = currentSku.seasonalPeak.length > 0 ? 0.6 : 0.3;

      // 1. Fetch Actual Forecast (SKU-aware)
      const forecastRes = await fetchForecast(selectedSKU, baseDemand, trend, 14);
      if (forecastRes) {
        const mapped: ForecastPoint[] = forecastRes.predictions.map((p: any, i: number) => {
          const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
          return {
            day: days[(i + 1) % 7],
            date: `Apr ${10 + i}`,
            predicted: Math.round(p.predicted),
            lower: Math.round(p.lower),
            upper: Math.round(p.upper),
            actual: p.actual != null ? Math.round(p.actual) : undefined,
            mlData: forecastRes.model_metrics
              ? { r2: forecastRes.model_metrics.r2, equation: `RF(n=120, depth=8)` }
              : undefined,
            mlMetadata: { model: forecastRes.model_type }
          };
        });
        setMlForecast(mapped);

        // 3. Fetch Anomalies using the forecast actuals as demand data
        const demandValues = mapped
          .filter(f => f.actual != null)
          .map(f => f.actual as number);
        if (demandValues.length > 0) {
          const anomalyRes = await fetchAnomalies(selectedSKU, demandValues, baseDemand);
          if (anomalyRes && anomalyRes.anomalies.length > 0) {
            const mappedAnomalies: AnomalyEvent[] = anomalyRes.anomalies.map((a: any) => ({
              id: `${selectedSKU}-ml-${a.id}`,
              day: a.day,
              type: a.type as "spike" | "drop",
              predicted: a.predicted,
              actual: a.actual,
              deviation: a.deviation,
              severity: a.severity as "critical" | "warning" | "info",
            }));
            setMlAnomalies(mappedAnomalies);
          } else {
            setMlAnomalies(null);
          }
        }
      } else {
        setMlForecast(null);
        setMlAnomalies(null);
      }

      // 2. Fetch Actual Return Risk (catalog-calibrated)
      const returnRes = await fetchReturnRisk(
        selectedSKU, 
        currentSku.price, 
        currentSku.category, 
        currentSku.returnRiskBase
      );
      if (returnRes) {
        setMlReturnRisk(() => ({
          ...generateReturnAnalysis(selectedSKU),
          riskScore: returnRes.risk_analysis.risk_score,
          riskLabel: returnRes.risk_analysis.risk_label,
          mlMetadata: { model: returnRes.model_type }
        }));
      } else {
        setMlReturnRisk(null);
      }

      setIsMlLoading(false);
    };

    fetchMlData();
  }, [selectedSKU]);


  // Filtered SKUs by brand
  const filteredSKUs = useMemo(() => {
    if (selectedBrand === "all") return skuCatalog;
    return skuCatalog.filter((s) => s.brand === selectedBrand);
  }, [selectedBrand]);

  // All module data for selected SKU
  const forecast = useMemo(() => mlForecast || generateDemandForecast(selectedSKU), [selectedSKU, mlForecast]);
  const decomposition = useMemo(() => generateDemandDecomposition(selectedSKU), [selectedSKU]);
  const anomalies = useMemo(() => mlAnomalies || generateAnomalies(selectedSKU), [selectedSKU, mlAnomalies]);
  const signalFusion = useMemo(() => generateSignalFusion(selectedSKU), [selectedSKU]);
  const intentAcceleration = useMemo(() => generateIntentAcceleration(selectedSKU), [selectedSKU]);
  const returnAnalysis = useMemo(() => mlReturnRisk || generateReturnAnalysis(selectedSKU), [selectedSKU, mlReturnRisk]);
  const inventoryDecision = useMemo(() => generateInventoryDecision(selectedSKU), [selectedSKU]);
  const simulation = useMemo(() => simulateWhatIf(selectedSKU, simParams), [selectedSKU, simParams]);
  const explanation = useMemo(() => generateExplanation(selectedSKU), [selectedSKU]);
  const returnExplanation = useMemo(() => generateExplanation(selectedSKU, "return_risk"), [selectedSKU]);
  const alerts = useMemo(() => generateAlerts(), []);
  const priorities = useMemo(() => generateSKUPriorities(), []);
  const kpis = useMemo(() => generateKPIs(selectedBrand), [selectedBrand]);
  const notificationSummary = useMemo(() => getNotificationSummary(notifications), [notifications]);
  const migrationGraph = useMemo(() => generateMigrationGraph(), []);
  const elasticity = useMemo(() => generateElasticity(selectedSKU), [selectedSKU]);
  const registryDemand = useMemo(() => generateRegistryDemand(selectedSKU), [selectedSKU]);

  const selectSKUAndNavigate = useCallback((skuId: string, tab?: SKUTab) => {
    setSelectedSKU(skuId);
    setActiveView("sku-deep-dive");
    if (tab) setActiveTab(tab);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const markNotificationRead = useCallback((notifId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notifId ? { ...n, isRead: true } : n
    ));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const dismissNotification = useCallback((notifId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  }, []);

  const navigateToNotification = useCallback((notif: DynamicNotification) => {
    markNotificationRead(notif.id);
    setSelectedSKU(notif.skuId);
    setActiveView(notif.relatedView);
    if (notif.relatedTab) setActiveTab(notif.relatedTab);
    setShowNotifications(false);
  }, [markNotificationRead]);

  return {
    // State
    activeView,
    setActiveView,
    activeTab,
    setActiveTab,
    selectedSKU,
    setSelectedSKU,
    selectedBrand,
    setSelectedBrand,
    simParams,
    setSimParams,
    sidebarCollapsed,
    toggleSidebar,
    showNotifications,
    setShowNotifications,
    isMlLoading,

    // Computed
    filteredSKUs,
    brands,
    currentSKU: skuCatalog.find((s) => s.id === selectedSKU) || skuCatalog[0],

    // Module data
    forecast,
    decomposition,
    anomalies,
    signalFusion,
    intentAcceleration,
    returnAnalysis,
    inventoryDecision,
    simulation,
    explanation,
    returnExplanation,
    alerts,
    priorities,
    kpis,
    notifications,
    notificationSummary,
    migrationGraph,
    elasticity,
    registryDemand,

    // Actions
    selectSKUAndNavigate,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    navigateToNotification,
  };
}

export type RetailBrainState = ReturnType<typeof useRetailBrain>;
