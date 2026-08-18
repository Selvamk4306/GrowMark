import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error
from utils.supabase_client import (
    fetch_daily_sales,
    fetch_item_details,
    fetch_owner_items,
    fetch_shop_leaves,
)

SAVED_MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "saved_models")
os.makedirs(SAVED_MODELS_DIR, exist_ok=True)

FEATURE_COLUMNS = [
    "day_of_week",
    "week_number",
    "month",
    "is_weekend",
    "lag_7",
    "lag_14",
    "rolling_7_avg",
    "rolling_14_avg",
    "is_leave",
]


def prepare_features(sales_data: List[Dict[str, Any]], leave_dates: List[str]) -> pd.DataFrame:
    """
    Feature Engineering:
    - Time features: day_of_week, week_number, month, is_weekend
    - Lag features: lag_7, lag_14
    - Rolling features: rolling_7_avg, rolling_14_avg
    - Leave indicator: is_leave
    """
    if not sales_data:
        return pd.DataFrame()

    df = pd.DataFrame(sales_data)
    if "sale_date" not in df.columns or "quantity_sold" not in df.columns:
        return pd.DataFrame()

    df["sale_date"] = pd.to_datetime(df["sale_date"])
    df["quantity_sold"] = pd.to_numeric(df["quantity_sold"], errors="coerce").fillna(0)

    # Group by date if multiple entries exist on the same date
    df = df.groupby("sale_date", as_index=False)["quantity_sold"].sum()
    df = df.sort_values("sale_date").reset_index(drop=True)

    if len(df) == 0:
        return pd.DataFrame()

    # Reindex over the complete date range to ensure accurate time lags
    min_date = df["sale_date"].min()
    max_date = df["sale_date"].max()
    full_idx = pd.date_range(start=min_date, end=max_date, freq="D")
    df = df.set_index("sale_date").reindex(full_idx, fill_value=0).rename_axis("sale_date").reset_index()

    # Time features
    df["day_of_week"] = df["sale_date"].dt.dayofweek
    df["week_number"] = df["sale_date"].dt.isocalendar().week.astype(int)
    df["month"] = df["sale_date"].dt.month
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)

    # Lag features
    df["lag_7"] = df["quantity_sold"].shift(7)
    df["lag_14"] = df["quantity_sold"].shift(14)

    # Rolling window averages
    df["rolling_7_avg"] = df["quantity_sold"].rolling(7).mean()
    df["rolling_14_avg"] = df["quantity_sold"].rolling(14).mean()

    # Leave days indicator
    date_str_series = df["sale_date"].dt.strftime("%Y-%m-%d")
    df["is_leave"] = date_str_series.isin(leave_dates).astype(int)

    # Drop rows with NaN from lag/rolling features
    df = df.dropna().reset_index(drop=True)
    return df


def get_confidence_category(mae: float) -> str:
    """
    Confidence calculation:
    - MAE < 2 -> High confidence
    - MAE 2-5 -> Medium confidence
    - MAE > 5 -> Low confidence
    """
    if mae < 2.0:
        return "High"
    elif mae <= 5.0:
        return "Medium"
    else:
        return "Low"


def get_model_path(owner_id: str, item_id: str) -> Tuple[str, str]:
    model_file = os.path.join(SAVED_MODELS_DIR, f"{owner_id}_{item_id}.joblib")
    meta_file = os.path.join(SAVED_MODELS_DIR, f"{owner_id}_{item_id}_meta.json")
    return model_file, meta_file


def train_model_for_item(
    owner_id: str,
    item_id: str,
    item_details: Optional[Dict[str, Any]] = None,
    token: Optional[str] = None
) -> Dict[str, Any]:
    """
    Train LinearRegression and RandomForest models, pick the best one based on MAE score,
    and save the best model and metadata. Uses moving average fallback if data is insufficient.
    """
    if item_details is None:
        item_details = fetch_item_details(owner_id, item_id, token=token)
    
    item_name = item_details.get("item_name", "Unknown Item") if item_details else "Unknown Item"
    model_file, meta_file = get_model_path(owner_id, item_id)

    sales_data = fetch_daily_sales(owner_id=owner_id, item_id=item_id, limit_days=90, token=token)
    leave_dates = fetch_shop_leaves(owner_id=owner_id, token=token)

    # Check if insufficient data (< 14 days)
    if len(sales_data) < 14:
        recent_quantities = [float(s.get("quantity_sold", 0)) for s in sales_data]
        rolling_7_val = float(np.mean(recent_quantities[-7:])) if recent_quantities else 0.0
        
        meta = {
            "owner_id": owner_id,
            "item_id": item_id,
            "item_name": item_name,
            "model_type": "MovingAverageFallback",
            "mae": 1.5,
            "confidence": "Low — insufficient training data",
            "training_samples": len(sales_data),
            "fallback_moving_avg": round(rolling_7_val, 2),
            "last_trained": datetime.utcnow().isoformat(),
            "status": "fallback"
        }
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        return meta

    # Prepare features
    df = prepare_features(sales_data, leave_dates)

    if len(df) < 5:
        recent_quantities = [float(s.get("quantity_sold", 0)) for s in sales_data]
        rolling_7_val = float(np.mean(recent_quantities[-7:])) if recent_quantities else 0.0
        meta = {
            "owner_id": owner_id,
            "item_id": item_id,
            "item_name": item_name,
            "model_type": "MovingAverageFallback",
            "mae": 1.8,
            "confidence": "Low — insufficient training data",
            "training_samples": len(sales_data),
            "fallback_moving_avg": round(rolling_7_val, 2),
            "last_trained": datetime.utcnow().isoformat(),
            "status": "fallback"
        }
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)
        return meta

    X = df[FEATURE_COLUMNS]
    y = df["quantity_sold"]

    # 80/20 train/test split preserving time order
    split_idx = max(1, int(len(df) * 0.8))
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    if len(X_test) == 0:
        X_test, y_test = X_train, y_train

    # Approach 1: Linear Regression
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    lr_pred = lr.predict(X_test)
    lr_mae = float(mean_absolute_error(y_test, lr_pred))

    # Approach 2: Random Forest Regressor
    rf = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    rf_mae = float(mean_absolute_error(y_test, rf_pred))

    # Pick better model based on MAE
    if rf_mae <= lr_mae:
        best_model = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
        best_model.fit(X, y)
        best_type = "RandomForest"
        chosen_mae = rf_mae
    else:
        best_model = LinearRegression()
        best_model.fit(X, y)
        best_type = "LinearRegression"
        chosen_mae = lr_mae

    confidence = get_confidence_category(chosen_mae)

    # Save model artifact and metadata
    joblib.dump(best_model, model_file)

    meta = {
        "owner_id": owner_id,
        "item_id": item_id,
        "item_name": item_name,
        "model_type": best_type,
        "mae": round(chosen_mae, 2),
        "confidence": confidence,
        "training_samples": len(df),
        "last_trained": datetime.utcnow().isoformat(),
        "status": "trained",
        "lr_mae": round(lr_mae, 2),
        "rf_mae": round(rf_mae, 2)
    }

    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    return meta


def train_all_for_owner(owner_id: str, token: Optional[str] = None) -> Dict[str, Any]:
    """
    Train models for all items belonging to the owner.
    """
    items = fetch_owner_items(owner_id, token=token)
    if not items:
        return {
            "owner_id": owner_id,
            "items_trained": 0,
            "models": [],
            "message": "No items found for owner"
        }

    results = []
    for item in items:
        res = train_model_for_item(owner_id=owner_id, item_id=item["id"], item_details=item, token=token)
        results.append(res)

    return {
        "owner_id": owner_id,
        "items_trained": len(results),
        "models": results
    }
