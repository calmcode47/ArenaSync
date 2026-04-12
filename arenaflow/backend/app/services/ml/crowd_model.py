"""
scikit-learn based crowd density and congestion prediction model.
Uses RandomForestClassifier to predict congestion_level from features.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from typing import Optional, Dict, Any, List
import pickle
import logging
from datetime import timedelta

class CrowdDensityModel:
    """
    Predicts crowd congestion level and density score from features.
    The model is trained on historical crowd_snapshots data pulled from the DB.
    """

    CONGESTION_CLASSES = ["low", "moderate", "high", "critical"]

    def __init__(self):
        self.classifier = RandomForestClassifier(
            n_estimators=100, max_depth=8, random_state=42, n_jobs=-1
        )
        self.density_regressor = GradientBoostingRegressor(
            n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42
        )
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        
        # Pre-fit label encoder to ensure consistent mapping
        self.label_encoder.fit(self.CONGESTION_CLASSES)
        
        self.is_fitted = False
        self.logger = logging.getLogger(__name__)

    def _extract_features(self, df: pd.DataFrame) -> pd.DataFrame:
        features = pd.DataFrame(index=df.index)
        
        # Engineer features
        features['hour_of_day'] = df['recorded_at'].dt.hour
        features['day_of_week'] = df['recorded_at'].dt.dayofweek
        features['is_weekend'] = (features['day_of_week'] >= 5).astype(int)
        features['current_count'] = df['current_count']
        features['capacity'] = df['capacity']
        
        # Safe division for occupancy ratio
        features['occupancy_ratio'] = np.where(
            df['capacity'] > 0, 
            df['current_count'] / df['capacity'], 
            1.0
        )
        features['prev_density_score'] = df['prev_density_score']
        
        return features

    def train(self, df: pd.DataFrame) -> Dict[str, Any]:
        if "recorded_at" not in df.columns or len(df) < 50:
            raise ValueError("Insufficient data or missing 'recorded_at' to train the CrowdDensityModel.")
            
        features_df = self._extract_features(df)
        X = features_df.values
        
        # Target Variables
        y_class = self.label_encoder.transform(df['congestion_level'])
        y_reg = df['density_score'].values
        
        # Split data
        X_train, X_test, yc_train, yc_test, yr_train, yr_test = train_test_split(
            X, y_class, y_reg, test_size=0.2, random_state=42
        )
        
        # Scale
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Fit Classifier
        self.classifier.fit(X_train_scaled, yc_train)
        yc_pred = self.classifier.predict(X_test_scaled)
        
        # Fit Regressor
        self.density_regressor.fit(X_train_scaled, yr_train)
        
        report = classification_report(yc_test, yc_pred, target_names=self.label_encoder.classes_, zero_division=0)
        
        self.is_fitted = True
        self.logger.info("Successfully trained CrowdDensityModel.")
        
        return {
            "classification_report": report,
            "training_samples": len(df),
            "test_samples": len(X_test)
        }

    def predict_congestion(self, features: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_fitted:
            raise RuntimeError("Model is not fitted. Call train() or load_model() first.")
            
        # Build feature vector
        occupancy_ratio = features['current_count'] / features['capacity'] if features['capacity'] > 0 else 1.0
        is_weekend = 1 if features['day_of_week'] >= 5 else 0
        
        feature_vector = np.array([
            features['hour_of_day'],
            features['day_of_week'],
            is_weekend,
            features['current_count'],
            features['capacity'],
            occupancy_ratio,
            features['prev_density_score']
        ]).reshape(1, -1)
        
        # Scale
        feature_vector_scaled = self.scaler.transform(feature_vector)
        
        # Predict Classification
        pred_class_encoded = self.classifier.predict(feature_vector_scaled)[0]
        congestion_level = self.label_encoder.inverse_transform([pred_class_encoded])[0]
        
        prob_dist = self.classifier.predict_proba(feature_vector_scaled)[0]
        probabilities = {
            self.label_encoder.classes_[i]: float(prob) 
            for i, prob in enumerate(prob_dist)
        }
        
        # Predict Regression (Density Score)
        density_pred = float(self.density_regressor.predict(feature_vector_scaled)[0])
        density_pred = max(0.0, min(1.0, density_pred)) # clamp 0-1
        
        return {
            "congestion_level": str(congestion_level),
            "probabilities": probabilities,
            "density_score_predicted": density_pred
        }

    def predict_next_hour(self, zone_id: str, current_features: Dict[str, Any]) -> List[Dict[str, Any]]:
        if not self.is_fitted:
            raise RuntimeError("Model is not fitted. Cannot simulate next hour.")
            
        import datetime
        current_time = datetime.datetime.now(datetime.timezone.utc)
        
        # Maintain a dynamic copy of features
        running_features = current_features.copy()
        
        forecast = []
        for step in range(12): # 12 steps of 5 mins = 60 mins
            future_time = current_time + timedelta(minutes=5 * (step + 1))
            
            # Update temporal features
            running_features['hour_of_day'] = future_time.hour
            running_features['day_of_week'] = future_time.weekday()
            
            # Predict
            pred = self.predict_congestion(running_features)
            
            forecast.append({
                "timestamp": future_time.isoformat(),
                "predicted_density": pred['density_score_predicted'],
                "predicted_congestion": pred['congestion_level']
            })
            
            # Update features for next step (autoregressive)
            running_features['prev_density_score'] = pred['density_score_predicted']
            # We assume current_count scales proportionally with density score for the simulation
            running_features['current_count'] = int(pred['density_score_predicted'] * running_features['capacity'])
            
        return forecast

    def save_model(self, path: str) -> None:
        if not self.is_fitted:
            raise RuntimeError("Cannot save an unfitted model.")
            
        payload = {
            "classifier": self.classifier,
            "regressor": self.density_regressor,
            "scaler": self.scaler,
            "label_encoder": self.label_encoder
        }
        with open(path, "wb") as f:
            pickle.dump(payload, f)
        self.logger.info(f"Model saved to {path}")

    def load_model(self, path: str) -> None:
        with open(path, "rb") as f:
            payload = pickle.load(f)
            
        self.classifier = payload["classifier"]
        self.density_regressor = payload["regressor"]
        self.scaler = payload["scaler"]
        self.label_encoder = payload["label_encoder"]
        self.is_fitted = True
        self.logger.info(f"Model loaded from {path}")
