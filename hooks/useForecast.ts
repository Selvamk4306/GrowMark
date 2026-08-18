import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

// Automatically detect host IP for physical devices running Expo Go
const getMLHost = () => {
  let envUrl = process.env.EXPO_PUBLIC_ML_API_URL;
  
  if (Platform.OS === 'android') {
    // Check if running on emulator (Constants.isDevice is false)
    const isPhysical = Constants.isDevice ?? true;
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
    const resolvedIp = (isPhysical && hostUri) ? hostUri.split(':')[0] : '10.0.2.2';
    
    if (envUrl) {
      return envUrl.replace('localhost', resolvedIp).replace('127.0.0.1', resolvedIp);
    }
    return `http://${resolvedIp}:8000`;
  }
  
  return envUrl || 'http://localhost:8000';
};

export const ML_API_URL = getMLHost();

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

export interface AccuracyStatsResponse {
  owner_id: string;
  items_count: number;
  accuracy_stats: TrainingModelSummary[];
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

/**
 * Fetch 7-day sales predictions for all items of an owner
 */
export const getForecast = async (ownerId: string): Promise<ItemForecast[]> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${ML_API_URL}/forecast/${ownerId}/all`, {
    headers,
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.detail?.detail || errJson.detail?.error || `Failed to fetch forecasts (${response.status})`);
  }

  const data: ItemForecast[] = await response.json();
  return data;
};

/**
 * Fetch 7-day sales predictions for a specific item
 */
export const getItemForecast = async (ownerId: string, itemId: string): Promise<ItemForecast> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${ML_API_URL}/forecast/${ownerId}/${itemId}`, {
    headers,
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.detail?.detail || errJson.detail?.error || `Failed to fetch item forecast (${response.status})`);
  }

  const data: ItemForecast = await response.json();
  return data;
};

/**
 * Trigger initial or manual model training
 */
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

/**
 * Retrain all models with the latest historical data
 */
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

/**
 * Get accuracy and confidence metrics per item
 */
export const getAccuracyStats = async (ownerId: string): Promise<AccuracyStatsResponse> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${ML_API_URL}/forecast/accuracy/${ownerId}`, {
    headers,
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.detail?.detail || errJson.detail?.error || `Failed to fetch accuracy stats (${response.status})`);
  }

  return response.json();
};

/**
 * React Native Hook with Auto-Fetch, Caching, and Retrain handling
 */
export const useForecast = (ownerId?: string) => {
  const [forecasts, setForecasts] = useState<ItemForecast[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [retraining, setRetraining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const CACHE_KEY = ownerId ? `cached_forecasts_${ownerId}` : 'cached_forecasts';

  const loadFromCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setForecasts(parsed.forecasts || []);
        if (parsed.timestamp) setLastUpdated(new Date(parsed.timestamp));
      }
    } catch (e) {
      console.warn('Error reading forecast cache:', e);
    }
  }, [CACHE_KEY]);

  const fetchForecasts = useCallback(async (isRefresh = false) => {
    if (!ownerId) {
      setLoading(false);
      return;
    }

    if (!isRefresh) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getForecast(ownerId);
      setForecasts(data);
      const now = new Date();
      setLastUpdated(now);

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        forecasts: data,
        timestamp: now.toISOString(),
      }));
    } catch (err: any) {
      console.error('Forecast fetch failed:', err);
      setError(err.message || 'Unable to fetch sales predictions.');
      // If network fails, attempt cache fallback
      await loadFromCache();
    } finally {
      setLoading(false);
    }
  }, [ownerId, CACHE_KEY, loadFromCache]);

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
    loadFromCache().then(() => {
      fetchForecasts();
    });
  }, [ownerId]);

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
