import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from app.services.ml.crowd_model import CrowdDensityModel

def test_ml_features_extraction():
    model = CrowdDensityModel()
    
    # Create dummy data
    data = {
        'recorded_at': [datetime(2026, 4, 19, 12, 0), datetime(2026, 4, 19, 23, 0)],
        'current_count': [100, 500],
        'capacity': [1000, 1000],
        'prev_density_score': [0.1, 0.4],
        'congestion_level': ['low', 'moderate'],
        'density_score': [0.1, 0.5]
    }
    df = pd.DataFrame(data)
    
    features = model._extract_features(df)
    
    # Check cyclic features exist
    assert 'hour_sin' in features.columns
    assert 'hour_cos' in features.columns
    assert 'dow_sin' in features.columns
    assert 'dow_cos' in features.columns
    assert 'occ_time_interaction' in features.columns
    
    # Verify cyclic logic (12:00 vs 00:00)
    # Sin(12:00) should be close to 0 as it's halfway through 24h cycle
    assert abs(features.iloc[0]['hour_sin']) < 1e-10

def test_ml_training_and_prediction():
    model = CrowdDensityModel()
    
    # Generate 100 samples for training
    base_time = datetime(2026, 4, 1, 10, 0)
    data = []
    for i in range(100):
        t = base_time + timedelta(hours=i)
        count = 100 + (i % 50) * 10
        cap = 1000
        ratio = count / cap
        
        if ratio < 0.3:
            level = "low"
        elif ratio < 0.6:
            level = "moderate"
        elif ratio < 0.85:
            level = "high"
        else:
            level = "critical"
            
        data.append({
            'recorded_at': t,
            'current_count': count,
            'capacity': cap,
            'prev_density_score': ratio * 0.9,
            'congestion_level': level,
            'density_score': ratio
        })
        
    df = pd.DataFrame(data)
    results = model.train(df)
    
    assert results['training_samples'] == 100
    assert model.is_fitted is True
    
    # Test Prediction
    test_feat = {
        'hour_of_day': 14,
        'day_of_week': 2,
        'current_count': 900,
        'capacity': 1000,
        'prev_density_score': 0.8
    }
    
    pred = model.predict_congestion(test_feat)
    assert 'congestion_level' in pred
    assert pred['congestion_level'] in model.CONGESTION_CLASSES
    assert 0.0 <= pred['density_score_predicted'] <= 1.0

def test_ml_forecast_loop():
    model = CrowdDensityModel()
    # Mock fitting
    model.is_fitted = True
    
    # Mocking classifier and regressor internal objects to avoid real training overhead for this unit test
    # (In real scenario we'd use a saved model)
    from unittest.mock import MagicMock
    model.classifier = MagicMock()
    model.classifier.predict.return_value = [2] # 'low' (alphabetically: critical=0, high=1, low=2, moderate=3)
    model.classifier.predict_proba.return_value = [[0.8, 0.1, 0.05, 0.05]]
    model.density_regressor = MagicMock()
    model.density_regressor.predict.return_value = [0.2]
    model.scaler = MagicMock()
    model.scaler.transform.side_effect = lambda x: x # pass through
    
    current_feat = {
        'hour_of_day': 10,
        'day_of_week': 0,
        'current_count': 200,
        'capacity': 1000,
        'prev_density_score': 0.2
    }
    
    forecast = model.predict_next_hour("zone-1", current_feat)
    assert len(forecast) == 12 # 12 steps
    assert forecast[0]['predicted_congestion'] == 'low'
