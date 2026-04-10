import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler


# Mirrors the actual Williams-Sonoma Inc. category return rates from the frontend
CATEGORY_RETURN_RATES = {
    "Appliances": 0.06,
    "Cookware": 0.04,
    "Cutlery": 0.03,
    "Living Room": 0.14,
    "Bedding": 0.12,
    "Decor": 0.05,
    "Bedroom": 0.09,
    "Outdoor": 0.07,
    "Beds": 0.10,
    "Seating": 0.08,
    "Lighting": 0.05,
    "Hardware": 0.02,
    "Travel": 0.06,
    "Accessories": 0.04,
    "Dining": 0.08,
    "Home": 0.06,
}

ALL_CATEGORIES = list(CATEGORY_RETURN_RATES.keys())

# Mirrors the actual 56-SKU catalog for realistic training distribution
SKU_TRAINING_PROFILES = [
    # Williams Sonoma
    {"price": 449.95, "category": "Appliances", "return_rate": 0.04},
    {"price": 749.95, "category": "Appliances", "return_rate": 0.06},
    {"price": 649.95, "category": "Appliances", "return_rate": 0.03},
    {"price": 199.95, "category": "Appliances", "return_rate": 0.05},
    {"price": 419.95, "category": "Cookware",   "return_rate": 0.03},
    {"price": 899.95, "category": "Cookware",   "return_rate": 0.04},
    {"price": 199.95, "category": "Cookware",   "return_rate": 0.02},
    {"price": 1299.95,"category": "Cookware",   "return_rate": 0.03},
    {"price": 599.95, "category": "Cutlery",    "return_rate": 0.02},
    {"price": 179.95, "category": "Cutlery",    "return_rate": 0.01},
    {"price": 229.95, "category": "Cutlery",    "return_rate": 0.02},
    # Pottery Barn
    {"price": 2199.00,"category": "Living Room", "return_rate": 0.12},
    {"price": 3499.00,"category": "Living Room", "return_rate": 0.18},
    {"price": 1599.00,"category": "Living Room", "return_rate": 0.14},
    {"price": 2499.00,"category": "Living Room", "return_rate": 0.15},
    {"price": 279.00, "category": "Bedding",     "return_rate": 0.15},
    {"price": 189.00, "category": "Bedding",     "return_rate": 0.08},
    {"price": 229.00, "category": "Bedding",     "return_rate": 0.09},
    {"price": 149.00, "category": "Decor",       "return_rate": 0.05},
    {"price": 199.00, "category": "Decor",       "return_rate": 0.08},
    {"price": 89.00,  "category": "Decor",       "return_rate": 0.04},
    # West Elm
    {"price": 449.00, "category": "Bedroom",     "return_rate": 0.08},
    {"price": 299.00, "category": "Bedroom",     "return_rate": 0.06},
    {"price": 499.00, "category": "Bedroom",     "return_rate": 0.05},
    {"price": 1799.00,"category": "Living Room", "return_rate": 0.14},
    {"price": 799.00, "category": "Living Room", "return_rate": 0.10},
    {"price": 1999.00,"category": "Living Room", "return_rate": 0.16},
    {"price": 899.00, "category": "Outdoor",     "return_rate": 0.07},
    {"price": 699.00, "category": "Outdoor",     "return_rate": 0.08},
    {"price": 1299.00,"category": "Outdoor",     "return_rate": 0.09},
    # PBK, PBT, Rejuvenation, MG, GreenRow…
    {"price": 1299.00,"category": "Beds",        "return_rate": 0.09},
    {"price": 999.00, "category": "Beds",        "return_rate": 0.11},
    {"price": 1199.00,"category": "Beds",        "return_rate": 0.07},
    {"price": 89.00,  "category": "Bedding",     "return_rate": 0.06},
    {"price": 199.00, "category": "Bedding",     "return_rate": 0.05},
    {"price": 199.00, "category": "Seating",     "return_rate": 0.04},
    {"price": 149.00, "category": "Seating",     "return_rate": 0.06},
    {"price": 1599.00,"category": "Seating",     "return_rate": 0.11},
    {"price": 2199.00,"category": "Beds",        "return_rate": 0.13},
    {"price": 149.00, "category": "Seating",     "return_rate": 0.08},
    {"price": 1299.00,"category": "Beds",        "return_rate": 0.12},
    {"price": 349.00, "category": "Lighting",    "return_rate": 0.05},
    {"price": 189.00, "category": "Lighting",    "return_rate": 0.03},
    {"price": 549.00, "category": "Lighting",    "return_rate": 0.06},
    {"price": 24.00,  "category": "Hardware",    "return_rate": 0.02},
    {"price": 32.00,  "category": "Hardware",    "return_rate": 0.01},
    {"price": 399.00, "category": "Travel",      "return_rate": 0.06},
    {"price": 249.00, "category": "Travel",      "return_rate": 0.07},
    {"price": 199.00, "category": "Travel",      "return_rate": 0.05},
    {"price": 149.00, "category": "Accessories", "return_rate": 0.04},
    {"price": 129.00, "category": "Accessories", "return_rate": 0.03},
    {"price": 2499.00,"category": "Living Room", "return_rate": 0.10},
    {"price": 1899.00,"category": "Dining",      "return_rate": 0.08},
    {"price": 279.00, "category": "Bedding",     "return_rate": 0.04},
    {"price": 599.00, "category": "Home",        "return_rate": 0.06},
    {"price": 129.00, "category": "Decor",       "return_rate": 0.03},
]


class ReturnRiskClassifier:
    """
    Return risk classifier calibrated against the actual WSI SKU catalog.
    Uses Logistic Regression with StandardScaler for normalized features.
    Features: [price, category_index, historical_return_rate, category_avg_rate, price_risk_factor]
    """

    def __init__(self):
        self.model = LogisticRegression(max_iter=500, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False

    def _category_index(self, category: str) -> int:
        try:
            return ALL_CATEGORIES.index(category)
        except ValueError:
            return 0

    def _build_features(self, price, category, hist_rate):
        cat_idx = self._category_index(category)
        cat_avg = CATEGORY_RETURN_RATES.get(category, 0.08)
        price_risk = 1 if price > 1000 else (0.5 if price > 500 else 0)
        rate_vs_avg = hist_rate / max(0.01, cat_avg)  # ratio of hist rate to category avg
        return [price, cat_idx, hist_rate, cat_avg, price_risk, rate_vs_avg]

    def train_synthetic(self):
        """Train on the actual WSI catalog profiles + augmented noise samples."""
        X, y = [], []

        # 1. Use the real catalog profiles
        for profile in SKU_TRAINING_PROFILES:
            feats = self._build_features(
                profile["price"], profile["category"], profile["return_rate"]
            )
            # Ground truth: high risk if return rate > category avg * 1.3
            cat_avg = CATEGORY_RETURN_RATES.get(profile["category"], 0.08)
            is_high_risk = 1 if profile["return_rate"] > cat_avg * 1.3 else 0
            X.append(feats)
            y.append(is_high_risk)

        # 2. Augment with 300 noisy variations for better generalization
        np.random.seed(42)
        for _ in range(300):
            profile = SKU_TRAINING_PROFILES[np.random.randint(0, len(SKU_TRAINING_PROFILES))]
            price = profile["price"] * np.random.uniform(0.7, 1.3)
            rate = np.clip(profile["return_rate"] + np.random.normal(0, 0.03), 0.005, 0.35)
            feats = self._build_features(price, profile["category"], rate)
            cat_avg = CATEGORY_RETURN_RATES.get(profile["category"], 0.08)
            is_high_risk = 1 if rate > cat_avg * 1.3 else 0
            X.append(feats)
            y.append(is_high_risk)

        X = np.array(X)
        y = np.array(y)

        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        self.is_trained = True

    def predict_risk(self, price: float, category: str, hist_rate: float):
        if not self.is_trained:
            self.train_synthetic()

        feats = self._build_features(price, category, hist_rate)
        X = self.scaler.transform([feats])
        prob = self.model.predict_proba(X)[0][1]  # P(high risk)

        risk_score = round(float(prob * 100), 2)
        cat_avg = CATEGORY_RETURN_RATES.get(category, 0.08)

        return {
            "risk_score": risk_score,
            "risk_label": "High" if risk_score > 60 else "Medium" if risk_score > 35 else "Low",
            "confidence": round(float(max(prob, 1 - prob)), 3),
            "category_avg_return": cat_avg,
            "rate_vs_category": round(hist_rate / max(0.01, cat_avg), 2),
        }


if __name__ == "__main__":
    clf = ReturnRiskClassifier()
    clf.train_synthetic()
    # Test high-risk product (Pottery Barn sectional, 18% return rate)
    print("PB Sectional:", clf.predict_risk(3499.00, "Living Room", 0.18))
    # Test low-risk product (Wüsthof knife, 2% return rate)
    print("Wüsthof Knife:", clf.predict_risk(599.95, "Cutlery", 0.02))
    # Test medium (KitchenAid mixer, 4% but expensive)
    print("KitchenAid:", clf.predict_risk(449.95, "Appliances", 0.04))
