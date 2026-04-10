import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error


class DemandForecaster:
    """
    SKU-aware Random Forest demand forecaster.
    Trains a separate model per SKU call using SKU-specific parameters
    (base_demand derived from price, category-influenced trend).
    """

    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=120, max_depth=8, random_state=42
        )
        self.r2 = 0.0
        self.mae = 0.0

    def _build_features(self, day_index: int):
        """Build feature vector for a single day."""
        dow = day_index % 7
        is_weekend = 1 if dow >= 5 else 0
        sin_weekly = np.sin(2 * np.pi * day_index / 7)
        cos_weekly = np.cos(2 * np.pi * day_index / 7)
        sin_monthly = np.sin(2 * np.pi * day_index / 30)
        return [day_index, dow, is_weekend, sin_weekly, cos_weekly, sin_monthly]

    def train_for_sku(self, base_demand: float, trend: float, noise_std: float = 5.0):
        """Train on 90 days of synthetic history tailored to a specific SKU."""
        np.random.seed(42)  # reproducible per call

        X, y = [], []
        for d in range(-90, 0):
            feats = self._build_features(d)
            X.append(feats)

            seasonality = np.sin(2 * np.pi * d / 7) * base_demand * 0.08
            weekend_boost = (base_demand * 0.25) if feats[2] == 1 else 0
            noise = np.random.normal(0, noise_std)
            demand = base_demand + trend * d + weekend_boost + seasonality + noise
            y.append(max(2, demand))

        X = np.array(X)
        y = np.array(y)

        self.model.fit(X, y)

        # Score on training data for transparency
        y_pred = self.model.predict(X)
        self.r2 = round(float(r2_score(y, y_pred)), 4)
        self.mae = round(float(mean_absolute_error(y, y_pred)), 2)

    def predict(self, base_demand: float, trend: float, future_days: int = 14):
        """
        Train on-the-fly for this SKU's parameters, then predict.
        Returns predictions WITH synthetic actuals for days except the last 3.
        """
        self.train_for_sku(base_demand, trend)

        np.random.seed(123)  # reproducible actuals
        predictions = []

        for i in range(1, future_days + 1):
            feats = self._build_features(i)
            pred = float(self.model.predict([feats])[0])
            pred = max(2, round(pred, 2))

            lower = round(pred * 0.85, 2)
            upper = round(pred * 1.15, 2)

            # Generate realistic "actual" for all but the last 3 future days
            actual = None
            if i < future_days - 2:
                noise = np.random.normal(0, base_demand * 0.08)
                actual = max(1, round(pred + noise))

            predictions.append({
                "day_offset": i,
                "predicted": pred,
                "lower": lower,
                "upper": upper,
                "actual": actual,
            })

        return predictions


if __name__ == "__main__":
    f = DemandForecaster()
    results = f.predict(base_demand=150, trend=0.3, future_days=7)
    for r in results:
        print(r)
    print(f"R² = {f.r2}, MAE = {f.mae}")
