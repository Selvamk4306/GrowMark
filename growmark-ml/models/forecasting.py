import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
import joblib
import numpy as np
import pandas as pd

from utils.date_utils import get_next_7_days
from utils.supabase_client import (
    fetch_daily_sales,
    fetch_item_details,
    fetch_owner_items,
    fetch_shop_leaves,
)
from models.training import (
    FEATURE_COLUMNS,
    get_model_path,
    train_model_for_item,
    SAVED_MODELS_DIR,
)


def forecast_next_week(
    owner_id: str,
    item_id: str,
    token: Optional[str] = None,
    item: Optional[Dict[str, Any]] = None,
    sales_data: Optional[List[Dict[str, Any]]] = None,
    leave_dates: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Predict next 7 days for a single item:
    - Auto-triggers retraining if model file is not found
    - Generates date features for next 7 days
    - Applies business constraints (no negative predictions, round to int, leave days = 0)
    - Computes revenue and target metrics
    """
    if item is None:
        item = fetch_item_details(owner_id, item_id, token=token)
    if not item:
        raise ValueError(f"Item {item_id} not found for owner {owner_id}")

    item_name = item.get("item_name", "Unknown Item")
    selling_price = float(item.get("selling_price") or 0.0)
    min_daily_target = int(item.get("min_daily_target") or 0)
    min_weekly_target = int(item.get("min_weekly_target") or 0)

    model_file, meta_file = get_model_path(owner_id, item_id)

    # Auto-retrain if model does not exist
    if not os.path.exists(meta_file):
        train_model_for_item(owner_id, item_id, item_details=item, token=token)

    # Load metadata
    if os.path.exists(meta_file):
        with open(meta_file, "r", encoding="utf-8") as f:
            meta = json.load(f)
    else:
        meta = {
            "model_type": "MovingAverageFallback",
            "confidence": "Low — insufficient training data",
            "mae": 2.0,
            "last_trained": datetime.utcnow().isoformat()
        }

    model = None
    if meta.get("model_type") in ("RandomForest", "LinearRegression") and os.path.exists(model_file):
        try:
            model = joblib.load(model_file)
        except Exception:
            model = None

    # Fetch recent sales history and leave dates for recursive forecasting if not preloaded
    if sales_data is None:
        sales_data = fetch_daily_sales(owner_id=owner_id, item_id=item_id, limit_days=45, token=token)
    if leave_dates is None:
        leave_dates = fetch_shop_leaves(owner_id=owner_id, token=token)
    leave_set = set(leave_dates)

    # Build initial sales history dataframe
    history_dict = {}
    for s in sales_data:
        d = s.get("sale_date")
        q = float(s.get("quantity_sold", 0))
        if d:
            history_dict[d] = history_dict.get(d, 0) + q

    # Moving average fallback calculation
    recent_vals = list(history_dict.values())
    rolling_7_baseline = float(np.mean(recent_vals[-7:])) if recent_vals else float(meta.get("fallback_moving_avg", 0.0))

    next_7_days = get_next_7_days()
    predictions = []

    # Rolling simulation of future 7 days
    simulated_history = {k: v for k, v in history_dict.items()}

    for day_info in next_7_days:
        date_str = day_info["date"]
        day_name = day_info["day"]
        day_of_week = day_info["day_of_week"]
        week_number = day_info["week_number"]
        month = day_info["month"]
        is_weekend = day_info["is_weekend"]
        is_leave = 1 if date_str in leave_set else 0

        # Business Logic: If leave day, predicted quantity is 0
        if is_leave == 1:
            predicted_quantity = 0
        elif model is not None:
            # Construct lag and rolling features from simulated history
            past_quantities = list(simulated_history.values())
            lag_7 = past_quantities[-7] if len(past_quantities) >= 7 else rolling_7_baseline
            lag_14 = past_quantities[-14] if len(past_quantities) >= 14 else lag_7
            rolling_7_avg = float(np.mean(past_quantities[-7:])) if past_quantities else rolling_7_baseline
            rolling_14_avg = float(np.mean(past_quantities[-14:])) if len(past_quantities) >= 14 else rolling_7_avg

            feature_dict = {
                "day_of_week": day_of_week,
                "week_number": week_number,
                "month": month,
                "is_weekend": is_weekend,
                "lag_7": lag_7,
                "lag_14": lag_14,
                "rolling_7_avg": rolling_7_avg,
                "rolling_14_avg": rolling_14_avg,
                "is_leave": is_leave,
            }
            feature_df = pd.DataFrame([feature_dict])[FEATURE_COLUMNS]

            raw_pred = model.predict(feature_df)[0]
            # Business logic: non-negative, round to integer
            predicted_quantity = max(0, int(round(raw_pred)))
        else:
            # Fallback Strategy: predicted = rolling_7day_average * 1.05
            fallback_pred = rolling_7_baseline * 1.05
            predicted_quantity = max(0, int(round(fallback_pred)))

        predicted_revenue = round(float(predicted_quantity * selling_price), 2)
        meets_target = bool(predicted_quantity >= min_daily_target)

        predictions.append({
            "date": date_str,
            "day": day_name,
            "predicted_quantity": predicted_quantity,
            "predicted_revenue": predicted_revenue,
            "meets_target": meets_target,
            "min_daily_target": min_daily_target,
            "is_leave": bool(is_leave)
        })

        simulated_history[date_str] = predicted_quantity

    # Weekly Summary
    total_predicted_quantity = sum(p["predicted_quantity"] for p in predictions)
    total_predicted_revenue = round(sum(p["predicted_revenue"] for p in predictions), 2)
    days_meeting_target = sum(1 for p in predictions if p["meets_target"])
    days_below_target = 7 - days_meeting_target
    meets_weekly_target = bool(total_predicted_quantity >= min_weekly_target)

    return {
        "item_id": item_id,
        "item_name": item_name,
        "confidence": meta.get("confidence", "Medium"),
        "mae": meta.get("mae", 2.0),
        "model_type": meta.get("model_type", "RandomForest"),
        "last_trained": meta.get("last_trained", datetime.utcnow().isoformat()),
        "selling_price": selling_price,
        "predictions": predictions,
        "weekly_summary": {
            "total_predicted_quantity": total_predicted_quantity,
            "total_predicted_revenue": total_predicted_revenue,
            "days_meeting_target": days_meeting_target,
            "days_below_target": days_below_target,
            "min_weekly_target": min_weekly_target,
            "meets_weekly_target": meets_weekly_target
        }
    }


def forecast_all_items(owner_id: str, token: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Generate predictions for all items belonging to an owner.
    """
    items = fetch_owner_items(owner_id, token=token)
    if not items:
        return []

    # Preload shop leaves once
    leave_dates = fetch_shop_leaves(owner_id, token=token)

    # Preload all daily sales once for the last 45 days
    all_sales_data = fetch_daily_sales(owner_id=owner_id, limit_days=45, token=token)

    # Group sales data by item_id
    sales_by_item = {}
    for s in all_sales_data:
        it_id = s.get("item_id")
        if it_id:
            if it_id not in sales_by_item:
                sales_by_item[it_id] = []
            sales_by_item[it_id].append(s)

    forecasts = []
    for item in items:
        try:
            item_id = item["id"]
            item_sales = sales_by_item.get(item_id, [])
            fc = forecast_next_week(
                owner_id,
                item_id,
                token=token,
                item=item,
                sales_data=item_sales,
                leave_dates=leave_dates,
            )
            forecasts.append(fc)
        except Exception as e:
            forecasts.append({
                "item_id": item["id"],
                "item_name": item.get("item_name", "Unknown"),
                "error": str(e),
                "confidence": "Low",
                "predictions": [],
                "weekly_summary": {}
            })
    return forecasts


def get_accuracy_stats(owner_id: str, token: Optional[str] = None) -> Dict[str, Any]:
    """
    Return model accuracy stats per item for displaying confidence in the app.
    """
    items = fetch_owner_items(owner_id, token=token)
    stats = []

    for item in items:
        item_id = item["id"]
        _, meta_file = get_model_path(owner_id, item_id)
        if os.path.exists(meta_file):
            with open(meta_file, "r", encoding="utf-8") as f:
                meta = json.load(f)
            stats.append({
                "item_id": item_id,
                "item_name": item.get("item_name", "Unknown"),
                "model_type": meta.get("model_type"),
                "mae": meta.get("mae"),
                "confidence": meta.get("confidence"),
                "training_samples": meta.get("training_samples", 0),
                "last_trained": meta.get("last_trained"),
                "status": meta.get("status", "trained")
            })
        else:
            stats.append({
                "item_id": item_id,
                "item_name": item.get("item_name", "Unknown"),
                "model_type": "Untrained",
                "mae": None,
                "confidence": "Low — Not yet trained",
                "training_samples": 0,
                "last_trained": None,
                "status": "pending"
            })

    return {
        "owner_id": owner_id,
        "items_count": len(stats),
        "accuracy_stats": stats
    }
