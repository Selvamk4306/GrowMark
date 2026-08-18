import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

export interface DailyPrediction {
  date: string;
  day: string;
  predicted_quantity: number;
  predicted_revenue: number;
  meets_target: boolean;
  min_daily_target: number;
  is_leave?: boolean;
}

export interface WeeklySummary {
  total_predicted_quantity: number;
  total_predicted_revenue: number;
  days_meeting_target: number;
  days_below_target: number;
  min_weekly_target: number;
  meets_weekly_target: boolean;
}

export interface ItemForecast {
  item_id: string;
  item_name: string;
  confidence: 'High' | 'Medium' | 'Low' | string;
  mae: number;
  model_type: string;
  last_trained?: string;
  selling_price?: number;
  predictions: DailyPrediction[];
  weekly_summary: WeeklySummary;
  error?: string;
}

export interface TrainingModelSummary {
  item_id: string;
  item_name: string;
  model_type: string;
  mae: number;
  confidence: string;
  training_samples: number;
  last_trained?: string;
  status?: string;
}

export interface TrainingResponse {
  owner_id: string;
  items_trained: number;
  models: TrainingModelSummary[];
  message?: string;
}

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };
    }
  } catch (e) {
    console.warn('Failed to retrieve session for ML API:', e);
  }
  return { 'Content-Type': 'application/json' };
};

export const getForecast = async (ownerId: string): Promise<ItemForecast[]> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${ML_API_URL}/forecast/${ownerId}/all`, {
    headers,
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.detail?.detail || errJson.detail?.error || `Failed to fetch forecasts (${response.status})`);
  }

  return response.json();
};

export const trainModels = async (ownerId: string): Promise<TrainingResponse> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${ML_API_URL}/forecast/train/${ownerId}`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.detail?.detail || errJson.detail?.error || `Failed to train models (${response.status})`);
  }

  return response.json();
};

export const retrainModels = async (ownerId: string): Promise<{ status: string; message: string; summary: TrainingResponse }> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${ML_API_URL}/forecast/retrain/${ownerId}`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.detail?.detail || errJson.detail?.error || `Failed to retrain models (${response.status})`);
  }

  return response.json();
};

export const useForecast = (ownerId?: string) => {
  const [forecasts, setForecasts] = useState<ItemForecast[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [retraining, setRetraining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchForecasts = useCallback(async (isRefresh = false) => {
    if (!ownerId) {
      setLoading(false);
      return;
    }

    if (!isRefresh) setLoading(true);
    setError(null);

    try {
      const data = await getForecast(ownerId);
      setForecasts(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Forecast fetch failed:', err);
      setError(err.message || 'Unable to fetch sales predictions.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  const handleRetrain = async () => {
    if (!ownerId) return;
    setRetraining(true);
    setError(null);
    try {
      await retrainModels(ownerId);
      await fetchForecasts(true);
    } catch (err: any) {
      console.error('Retraining failed:', err);
      setError(err.message || 'Retraining failed. Please try again.');
    } finally {
      setRetraining(false);
    }
  };

  useEffect(() => {
    fetchForecasts();
  }, [fetchForecasts]);

  return {
    forecasts,
    loading,
    retraining,
    error,
    lastUpdated,
    refresh: () => fetchForecasts(true),
    retrain: handleRetrain,
  };
};
