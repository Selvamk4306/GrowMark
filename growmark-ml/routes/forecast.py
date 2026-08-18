from fastapi import APIRouter, HTTPException, Header, status
from typing import Dict, Any, List, Optional

from models.training import train_all_for_owner, train_model_for_item
from models.forecasting import forecast_all_items, forecast_next_week, get_accuracy_stats
from utils.supabase_client import fetch_owner_items, fetch_item_details

router = APIRouter()


@router.post("/train/{owner_id}", status_code=status.HTTP_200_OK)
def train_owner_models(owner_id: str, authorization: Optional[str] = Header(None)):
    """
    POST /forecast/train/{owner_id}
    - Fetch all items for owner from Supabase
    - For each item fetch last 90 days of sales
    - Train model per item
    - Save models to disk
    - Return training summary
    """
    if not owner_id or owner_id.strip() == "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad Request", "detail": "owner_id parameter is required"}
        )

    try:
        summary = train_all_for_owner(owner_id, token=authorization)
        if summary.get("items_trained", 0) == 0:
            items = fetch_owner_items(owner_id, token=authorization)
            if not items:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"error": "Owner not found", "detail": f"No items found for owner {owner_id}"}
                )
        return summary
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Training Error", "detail": str(e)}
        )


@router.post("/retrain/{owner_id}", status_code=status.HTTP_200_OK)
def retrain_owner_models(owner_id: str, authorization: Optional[str] = Header(None)):
    """
    POST /forecast/retrain/{owner_id}
    - Retrain all models with latest data
    - Called after every 7 days automatically
    - Returns updated accuracy scores
    """
    if not owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad Request", "detail": "owner_id is required"}
        )

    try:
        summary = train_all_for_owner(owner_id, token=authorization)
        return {
            "status": "success",
            "message": "Models successfully retrained",
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Retraining Error", "detail": str(e)}
        )


@router.get("/{owner_id}/all", status_code=status.HTTP_200_OK)
def get_all_forecasts(owner_id: str, authorization: Optional[str] = Header(None)):
    """
    GET /forecast/{owner_id}/all
    - Return predictions for all items of owner
    - Used by GrowMark dashboard
    """
    if not owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad Request", "detail": "owner_id is required"}
        )

    try:
        results = forecast_all_items(owner_id, token=authorization)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Forecast Error", "detail": str(e)}
        )


@router.get("/{owner_id}/{item_id}", status_code=status.HTTP_200_OK)
def get_item_forecast(owner_id: str, item_id: str, authorization: Optional[str] = Header(None)):
    """
    GET /forecast/{owner_id}/{item_id}
    - Load saved model for item
    - Predict next 7 days
    - Return predictions & weekly summary
    """
    if not owner_id or not item_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad Request", "detail": "Both owner_id and item_id are required"}
        )

    try:
        item = fetch_item_details(owner_id, item_id, token=authorization)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Item Not Found", "detail": f"Item {item_id} not found for owner {owner_id}", "item_id": item_id}
            )

        result = forecast_next_week(owner_id, item_id, token=authorization)
        return result
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Item Not Found", "detail": str(ve), "item_id": item_id}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal Server Error", "detail": str(e), "item_id": item_id}
        )


@router.get("/accuracy/{owner_id}", status_code=status.HTTP_200_OK)
def get_owner_accuracy_stats(owner_id: str, authorization: Optional[str] = Header(None)):
    """
    GET /forecast/accuracy/{owner_id}
    - Return model accuracy stats per item
    - Used for displaying confidence in app
    """
    if not owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad Request", "detail": "owner_id is required"}
        )

    try:
        stats = get_accuracy_stats(owner_id, token=authorization)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Accuracy Stats Error", "detail": str(e)}
        )
