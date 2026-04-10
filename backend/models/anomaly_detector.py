import numpy as np
from sklearn.ensemble import IsolationForest


class AnomalyDetector:
    """
    Isolation Forest anomaly detector for demand data.
    Trained on a distribution matching typical retail demand patterns.
    """

    def __init__(self):
        self.model = IsolationForest(
            contamination=0.08, n_estimators=150, random_state=42
        )
        self.is_trained = False
        self.baseline_mean = 100

    def train_for_baseline(self, baseline_demand: float = 100):
        """Train on normal demand centred around the given baseline."""
        np.random.seed(42)
        self.baseline_mean = baseline_demand

        # Normal demand: centred on baseline_demand with moderate variance
        normal = np.random.normal(baseline_demand, baseline_demand * 0.12, (200, 1))
        # Weekend bumps
        weekend_bumps = np.random.normal(
            baseline_demand * 1.25, baseline_demand * 0.10, (40, 1)
        )
        # A few natural outliers for calibration
        spikes = np.random.uniform(
            baseline_demand * 1.6, baseline_demand * 2.2, (8, 1)
        )
        drops = np.random.uniform(
            baseline_demand * 0.1, baseline_demand * 0.4, (8, 1)
        )

        X = np.concatenate([normal, weekend_bumps, spikes, drops])
        self.model.fit(X)
        self.is_trained = True

    def detect(self, demand_data: list, baseline_demand: float = None):
        """
        Detect anomalies in a list of demand values.
        Returns list of anomaly events with severity and z-score.
        """
        if baseline_demand:
            self.train_for_baseline(baseline_demand)
        elif not self.is_trained:
            self.train_for_baseline()

        X = np.array(demand_data).reshape(-1, 1)
        labels = self.model.predict(X)           # -1 = anomaly, 1 = normal
        scores = self.model.decision_function(X)  # lower = more anomalous

        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        results = []

        for i, (label, score, value) in enumerate(
            zip(labels, scores, demand_data)
        ):
            if label == -1:
                # Calculate a pseudo z-score for display
                z_score = round(abs(value - self.baseline_mean) / max(1, self.baseline_mean * 0.12), 2)
                is_spike = value > self.baseline_mean
                results.append({
                    "id": f"anom-{i}",
                    "day": day_names[i % 7],
                    "type": "spike" if is_spike else "drop",
                    "predicted": round(float(self.baseline_mean), 0),
                    "actual": round(float(value), 0),
                    "deviation": z_score,
                    "severity": (
                        "critical" if z_score > 3
                        else "warning" if z_score > 2
                        else "info"
                    ),
                    "anomaly_score": round(float(score), 4),
                })

        return results


if __name__ == "__main__":
    det = AnomalyDetector()
    det.train_for_baseline(100)
    data = [102, 98, 105, 95, 180, 20, 100, 110, 96, 250, 45, 103, 97, 88]
    anomalies = det.detect(data)
    for a in anomalies:
        print(a)
