# GrowMark ML Backend

Machine Learning Sales Forecasting API built with FastAPI, scikit-learn, pandas, and Supabase.

## Features
- **Adaptive Multi-Model Selection**: Evaluates Linear Regression baseline vs Random Forest per item, picking the model with the lowest Mean Absolute Error (MAE).
- **Time-Series Feature Engineering**: Lags (7, 14 days), Rolling Averages (7, 14 days), Day-of-week, Week number, Month, Weekend flag, and Shop Leave detection.
- **Graceful Fallbacks**: 7-day optimistic moving average fallback for new items (<14 days historical sales) and automatic model training upon first inference.
- **RESTful Endpoints**:
  - `POST /forecast/train/{owner_id}`: Train/retrain all models for an owner.
  - `GET /forecast/{owner_id}/all`: Predict next 7 days for all owner items.
  - `GET /forecast/{owner_id}/{item_id}`: Predict next 7 days for a single item.
  - `POST /forecast/retrain/{owner_id}`: Automated recurring retraining.
  - `GET /forecast/accuracy/{owner_id}`: Fetch accuracy metrics and confidence levels per item.

## How to Run

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Start the server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

3. Explore Swagger UI:
Open `http://localhost:8000/docs` in your browser.
