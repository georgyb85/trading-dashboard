import { useState, useEffect, useCallback } from 'react';
import { config } from '@/lib/config';
import { joinUrl } from '@/lib/url';
import { OrderHistory } from '@/types/account';

interface UseOrderHistoryOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

export function useOrderHistory(options: UseOrderHistoryOptions = {}) {
  const { autoFetch = true, refreshInterval } = options;

  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = joinUrl(config.krakenRestBaseUrl, '/api/account/order-history');
      console.log('📜 Fetching order history from', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch order history: ${response.statusText}`);
      }

      const data: OrderHistory[] = await response.json();
      console.log('📜 Received order history:', data.length, 'orders');
      setOrderHistory(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('❌ Error fetching order history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrderById = useCallback(async (orderId: string): Promise<OrderHistory | null> => {
    try {
      const url = joinUrl(config.krakenRestBaseUrl, `/api/account/order-history/${orderId}`);
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch order: ${response.statusText}`);
      }

      const data: OrderHistory = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error(`Error fetching order ${orderId}:`, err);
      return null;
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchOrderHistory();
    }
  }, [autoFetch, fetchOrderHistory]);

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchOrderHistory();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchOrderHistory]);

  return {
    orderHistory,
    loading,
    error,
    refetch: fetchOrderHistory,
    fetchOrderById
  };
}
