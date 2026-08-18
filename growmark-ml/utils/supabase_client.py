import os
from dotenv import load_dotenv
from supabase import create_client, Client
from typing import List, Dict, Any, Optional

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://sklmxtvmpmudofuqtsxq.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable__6sdUhbPyp__VzpxJP14HQ_Id2n-DRo")

def get_supabase_client(token: Optional[str] = None) -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be provided")
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    if token:
        clean_token = token.replace("Bearer ", "").strip()
        client.postgrest.auth(clean_token)
    return client

def fetch_owner_items(owner_id: str, token: Optional[str] = None) -> List[Dict[str, Any]]:
    client = get_supabase_client(token)
    response = client.from_("items").select("*").eq("owner_id", owner_id).execute()
    return response.data or []

def fetch_item_details(owner_id: str, item_id: str, token: Optional[str] = None) -> Optional[Dict[str, Any]]:
    client = get_supabase_client(token)
    response = client.from_("items").select("*").eq("id", item_id).eq("owner_id", owner_id).maybe_single().execute()
    return response.data

def fetch_daily_sales(owner_id: str, item_id: Optional[str] = None, limit_days: int = 90, token: Optional[str] = None) -> List[Dict[str, Any]]:
    client = get_supabase_client(token)
    query = client.from_("daily_sales").select("*").eq("owner_id", owner_id)
    if item_id:
        query = query.eq("item_id", item_id)
    
    response = query.order("sale_date", desc=False).limit(limit_days * 10).execute()
    return response.data or []

def fetch_shop_leaves(owner_id: str, token: Optional[str] = None) -> List[str]:
    client = get_supabase_client(token)
    response = client.from_("shop_leaves").select("leave_date").eq("owner_id", owner_id).execute()
    leaves = [row["leave_date"] for row in (response.data or []) if "leave_date" in row]
    return leaves
