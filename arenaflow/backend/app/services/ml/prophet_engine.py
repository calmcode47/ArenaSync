"""
Prophet-based queue wait time forecasting engine.
Input: Historical queue_length time-series DataFrame with columns [ds, y]
  where ds = datetime, y = queue_length
Output: Forecast dict with estimated_wait_minutes and 30-min future predictions.
"""

import pandas as pd
from prophet import Prophet
from typing import Optional, Dict, Any
import logging
from datetime import datetime

class ProphetEngine:
    """Manages Prophet model lifecycle per zone."""

    def __init__(self):
        self._models: Dict[str, Prophet] = {}  # zone_id → fitted model
        self.logger = logging.getLogger(__name__)

    def _build_model(self) -> Prophet:
        # Prophet config
        model = Prophet(
            seasonality_mode="multiplicative",
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=False,
            changepoint_prior_scale=0.05
        )
        # Add custom "event_day" seasonality (assumes periods of ~1 day length variations)
        model.add_seasonality(name="event_day", period=1, fourier_order=5)
        return model

    def fit(self, zone_id: str, df: pd.DataFrame) -> None:
        if "ds" not in df.columns or "y" not in df.columns:
            raise ValueError("DataFrame must contain 'ds' and 'y' columns.")
        
        if len(df) < 10:
            self.logger.warning(f"Insufficient data (n={len(df)}) to fit Prophet for zone {zone_id}. Using fallback.")
            raise ValueError("Minimum 10 data points required to fit Prophet model.")
            
        model = self._build_model()
        model.fit(df)
        self._models[zone_id] = model
        self.logger.info(f"Successfully fitted Prophet model for zone {zone_id}")

    def predict(self, zone_id: str, periods: int = 6, freq: str = "5min") -> Dict[str, Any]:
        if zone_id not in self._models:
            raise ValueError(f"Model for zone {zone_id} is not fitted yet.")
            
        model = self._models[zone_id]
        future = model.make_future_dataframe(periods=periods, freq=freq, include_history=False)
        forecast_df = model.predict(future)
        
        # Ensure 'yhat' is non-negative
        forecast_df['yhat'] = forecast_df['yhat'].clip(lower=0)
        forecast_df['yhat_lower'] = forecast_df['yhat_lower'].clip(lower=0)
        forecast_df['yhat_upper'] = forecast_df['yhat_upper'].clip(lower=0)
        
        next_pred = forecast_df.iloc[0]
        estimated_wait = float(next_pred['yhat'])
        lower_bound = float(next_pred['yhat_lower'])
        upper_bound = float(next_pred['yhat_upper'])
        
        # Simple confidence pseudo-heuristic derived from interval relative to mean
        interval_width = upper_bound - lower_bound
        confidence = 1.0 - min((interval_width / (estimated_wait + 1e-5)), 1.0)
        
        forecast_list = []
        for _, row in forecast_df.iterrows():
            forecast_list.append({
                "ds": row['ds'].isoformat(),
                "yhat": float(row['yhat']),
                "yhat_lower": float(row['yhat_lower']),
                "yhat_upper": float(row['yhat_upper'])
            })
            
        return {
            "estimated_wait_minutes": estimated_wait,
            "lower_bound": lower_bound,
            "upper_bound": upper_bound,
            "confidence": max(0.1, confidence),
            "forecast": forecast_list
        }

    def fit_and_predict(self, zone_id: str, df: pd.DataFrame, periods: int = 6) -> Dict[str, Any]:
        self.fit(zone_id, df)
        return self.predict(zone_id, periods=periods)

    def estimate_wait_from_queue(self, queue_length: int, service_rate: float) -> float:
        # Fallback formula using Little's Law variation
        if service_rate <= 0:
            return float(queue_length) * 5.0 # default penalty assumption
        wait_time = queue_length / service_rate
        return max(0.0, float(wait_time))
