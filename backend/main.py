from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

from models.forecaster import DemandForecaster
from models.return_classifier import ReturnRiskClassifier
from models.anomaly_detector import AnomalyDetector

# ─── Model Instances ──────────────────────────────────────
forecaster = DemandForecaster()
return_classifier = ReturnRiskClassifier()
anomaly_detector = AnomalyDetector()


# ─── Lifespan (replaces deprecated on_event) ─────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Train all models on startup."""
    return_classifier.train_synthetic()
    anomaly_detector.train_for_baseline()
    print("[OK] ML models initialised and ready.")
    yield
    print("[STOP] Shutting down ML backend.")


app = FastAPI(title="Flowcast ML Backend", lifespan=lifespan)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response Models ────────────────────────────
class ForecastRequest(BaseModel):
    sku_id: str
    base_demand: Optional[float] = 100.0
    trend: Optional[float] = 0.5
    days: Optional[int] = 14


class ReturnRiskRequest(BaseModel):
    sku_id: str
    price: float
    category: str
    hist_return_rate: float


class AnomalyRequest(BaseModel):
    sku_id: str
    demand_data: List[float]
    baseline_demand: Optional[float] = 100.0


# ─── Endpoints ────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "message": "Flowcast RetailBrain ML Backend is running",
        "status": "active",
        "models": [
            "RandomForestRegressor (Demand)",
            "LogisticRegression (Return Risk)",
            "IsolationForest (Anomalies)",
        ],
    }


@app.post("/predict/forecast")
async def predict_forecast(req: ForecastRequest):
    """
    SKU-aware demand forecasting.
    The frontend sends base_demand derived from the SKU's price/category.
    The model trains on-the-fly for that specific SKU profile.
    """
    try:
        predictions = forecaster.predict(
            base_demand=req.base_demand,
            trend=req.trend,
            future_days=req.days,
        )
        return {
            "sku_id": req.sku_id,
            "predictions": predictions,
            "model_type": "Random Forest Regressor",
            "model_metrics": {
                "r2": forecaster.r2,
                "mae": forecaster.mae,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/return-risk")
async def predict_return_risk(req: ReturnRiskRequest):
    """
    Catalog-calibrated return risk prediction.
    Model is pre-trained on all 56 WSI SKU profiles at startup.
    """
    try:
        risk = return_classifier.predict_risk(
            req.price, req.category, req.hist_return_rate
        )
        return {
            "sku_id": req.sku_id,
            "risk_analysis": risk,
            "model_type": "Logistic Regression Classifier",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/anomalies")
async def predict_anomalies(req: AnomalyRequest):
    """
    Baseline-aware anomaly detection.
    Trains an Isolation Forest centred on the SKU's expected demand.
    """
    try:
        anomalies = anomaly_detector.detect(
            req.demand_data,
            baseline_demand=req.baseline_demand,
        )
        return {
            "sku_id": req.sku_id,
            "anomalies": anomalies,
            "model_type": "Isolation Forest",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
