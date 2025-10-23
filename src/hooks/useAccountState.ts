import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AccountSnapshot,
  AccountWSMessage,
  AccountSnapshotMessage,
  BalanceUpdateMessage,
  PositionUpdateMessage,
  OrderUpdateMessage,
  BalanceEntry,
  PositionEntry,
  OrderEntry,
  OrderHistory
} from '@/types/account';
import { saveToCache, loadFromCache, CACHE_KEYS } from '@/utils/cache';

interface UseAccountStateOptions {
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  onOrderFinal?: (orderId: string, status: string) => void;
}

export function useAccountState(options: UseAccountStateOptions = {}) {
  const {
    autoConnect = true,
    reconnect = true,
    reconnectInterval = 5000,
    onOrderFinal
  } = options;

  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [balances, setBalances] = useState<Map<string, BalanceEntry>>(() => {
    const cached = loadFromCache<BalanceEntry[]>(CACHE_KEYS.ACCOUNT_BALANCES);
    return cached ? new Map(cached.map(b => [b.asset, b])) : new Map();
  });
  const [positions, setPositions] = useState<Map<string, PositionEntry>>(() => {
    const cached = loadFromCache<PositionEntry[]>(CACHE_KEYS.ACCOUNT_POSITIONS);
    return cached ? new Map(cached.map(p => [p.id, p])) : new Map();
  });
  const [orders, setOrders] = useState<Map<string, OrderEntry>>(new Map());
  const [recentFinalOrders, setRecentFinalOrders] = useState<OrderEntry[]>(() => {
    const cached = loadFromCache<OrderEntry[]>(CACHE_KEYS.COMPLETED_ORDERS);
    console.log('📂 Loaded', cached?.length || 0, 'completed orders from cache');
    return cached || [];
  });
  const [error, setError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const shouldConnectRef = useRef(autoConnect);
  const historyLoadedRef = useRef(false);

  // Fetch order history from API and populate completed orders
  const fetchOrderHistory = useCallback(async () => {
    if (historyLoadedRef.current) return; // Only load once

    setLoadingHistory(true);
    try {
      console.log('📜 Fetching order history from API...');
      const response = await fetch('/api/account/order-history');

      if (!response.ok) {
        throw new Error(`Failed to fetch order history: ${response.statusText}`);
      }

      const history: OrderHistory[] = await response.json();
      console.log('📜 Received', history.length, 'orders from API');

      // Log first order for debugging
      if (history.length > 0) {
        console.log('📜 Sample order:', history[0]);
      }

      // Convert OrderHistory to OrderEntry format for completed orders
      const completedOrders: OrderEntry[] = history.map(h => {
        // Calculate total filled quantity from fills
        const totalFilled = h.fills.reduce((sum, f) => {
          const qty = parseFloat(f.fillQuantity);
          return sum + (isNaN(qty) ? 0 : qty);
        }, 0);

        return {
          id: h.orderId,
          clientId: h.clientId,
          symbol: h.symbol,
          side: h.side as any,
          type: h.type as any,
          quantity: h.quantity || '0',
          price: h.price || '0',
          filledQuantity: totalFilled > 0 ? totalFilled.toString() : h.quantity || '0',
          avgFillPrice: h.stateTransitions[h.stateTransitions.length - 1]?.avgFillPrice || '0',
          status: h.finalStatus as any,
          lastUpdateNs: h.lastUpdateNs,
          lastUpdate: h.lastUpdate,
          isFinal: true,
          stateHistory: h.stateTransitions.map(t => ({
            status: t.status,
            timestamp: new Date(t.timestamp).getTime(),
            timestampNs: t.timestampNs,
            filledQuantity: t.filledQuantity,
            avgFillPrice: t.avgFillPrice,
            messageType: 'state' as const
          }))
        };
      }).filter(order => {
        // Filter out any orders with missing critical fields
        if (!order.id || !order.status) {
          console.warn('⚠️ Skipping invalid order:', order);
          return false;
        }
        return true;
      });

      console.log('📋 Converted', completedOrders.length, 'valid completed orders');

      // Merge with cached orders (keep newer ones on top, deduplicate by ID)
      setRecentFinalOrders(prev => {
        const orderMap = new Map<string, OrderEntry>();

        // Add cached orders first
        prev.forEach(order => orderMap.set(order.id, order));

        // Add API orders (won't overwrite if already in cache)
        completedOrders.forEach(order => {
          if (!orderMap.has(order.id)) {
            orderMap.set(order.id, order);
          }
        });

        const merged = Array.from(orderMap.values())
          .sort((a, b) => b.lastUpdateNs - a.lastUpdateNs) // Newest first
          .slice(0, 100); // Keep last 100

        console.log('📋 Total completed orders:', merged.length);
        saveToCache(CACHE_KEYS.COMPLETED_ORDERS, merged);
        return merged;
      });

      historyLoadedRef.current = true;
    } catch (err) {
      console.error('❌ Error fetching order history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/account-ws`;

    console.log('Connecting to Account State WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Account State WebSocket connected');
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const message: AccountWSMessage = JSON.parse(event.data);
        console.log('📨 Received message:', message.topic, message.type, message);

        switch (message.topic) {
          case 'snapshot':
            console.log('📸 Processing snapshot with', message.payload.orders?.length || 0, 'orders');
            handleSnapshot(message as AccountSnapshotMessage);
            break;
          case 'balance':
            handleBalanceUpdate(message as BalanceUpdateMessage);
            break;
          case 'position':
            handlePositionUpdate(message as PositionUpdateMessage);
            break;
          case 'order':
            console.log('📋 Processing order update:', message.type, 'orderId:', message.payload.id, 'status:', message.payload.status);
            handleOrderUpdate(message as OrderUpdateMessage);
            break;
          case 'heartbeat':
            // Handle heartbeat if needed
            if (message.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong', id: message.payload.id }));
            }
            break;
          default:
            console.warn('⚠️ Unknown message topic:', message.topic);
        }
      } catch (err) {
        console.error('❌ Error parsing Account State message:', err, event.data);
        setError('Failed to parse message');
      }
    };

    ws.onerror = (event) => {
      console.error('Account State WebSocket error:', event);
      setError('WebSocket connection error');
    };

    ws.onclose = () => {
      console.log('Account State WebSocket disconnected');
      setConnected(false);
      wsRef.current = null;

      if (reconnect && shouldConnectRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Reconnecting to Account State...');
          connect();
        }, reconnectInterval);
      }
    };
  }, [reconnect, reconnectInterval]);

  const handleSnapshot = useCallback((message: AccountSnapshotMessage) => {
    const { payload } = message;

    setSnapshot({
      version: message.version,
      asOf: payload.asOf,
      balances: payload.balances,
      positions: payload.positions,
      orders: payload.orders
    });

    // Update maps
    const newBalances = new Map<string, BalanceEntry>();
    payload.balances.forEach(balance => {
      newBalances.set(balance.asset, balance);
    });
    setBalances(newBalances);
    saveToCache(CACHE_KEYS.ACCOUNT_BALANCES, payload.balances);

    const newPositions = new Map<string, PositionEntry>();
    payload.positions.forEach(position => {
      newPositions.set(position.id, position);
    });
    setPositions(newPositions);
    saveToCache(CACHE_KEYS.ACCOUNT_POSITIONS, payload.positions);

    const newOrders = new Map<string, OrderEntry>();
    payload.orders.forEach(order => {
      newOrders.set(order.id, order);
    });
    setOrders(newOrders);
  }, []);

  const handleBalanceUpdate = useCallback((message: BalanceUpdateMessage) => {
    setBalances(prev => {
      const newMap = new Map(prev);
      newMap.set(message.payload.asset, message.payload);

      // Save to cache
      saveToCache(CACHE_KEYS.ACCOUNT_BALANCES, Array.from(newMap.values()));
      return newMap;
    });
  }, []);

  const handlePositionUpdate = useCallback((message: PositionUpdateMessage) => {
    setPositions(prev => {
      const newMap = new Map(prev);
      if (message.type === 'delete') {
        newMap.delete(message.payload.id);
      } else {
        newMap.set(message.payload.id, message.payload);
      }

      // Save to cache
      saveToCache(CACHE_KEYS.ACCOUNT_POSITIONS, Array.from(newMap.values()));
      return newMap;
    });
  }, []);

  const handleOrderUpdate = useCallback((message: OrderUpdateMessage) => {
    setOrders(prev => {
      const newMap = new Map(prev);
      const existingOrder = newMap.get(message.payload.id);

      // Create state history entry for this update
      const stateEvent = {
        status: message.payload.status,
        timestamp: Date.now(),
        timestampNs: message.payload.lastUpdateNs,
        filledQuantity: message.payload.filledQuantity,
        avgFillPrice: message.payload.avgFillPrice,
        messageType: message.type
      };

      // Build state history
      const stateHistory = existingOrder?.stateHistory || [];
      const updatedStateHistory = [...stateHistory, stateEvent];

      // Remove order from active orders when it reaches a terminal state
      // 'final' type indicates terminal states: FILLED, CANCELED, EXPIRED, REJECTED
      if (message.type === 'final') {
        console.log('🔚 Removing order from active orders (final state):', message.payload.id, message.payload.status);
        newMap.delete(message.payload.id);

        // Store the final order with full state history for display (keep last 100)
        const finalOrder = {
          ...message.payload,
          stateHistory: updatedStateHistory
        };

        setRecentFinalOrders(prev => {
          const updated = [finalOrder, ...prev];
          const trimmed = updated.slice(0, 100); // Keep last 100 final orders

          // Save to cache
          saveToCache(CACHE_KEYS.COMPLETED_ORDERS, trimmed);
          return trimmed;
        });

        // Notify parent component about the final order
        if (onOrderFinal) {
          console.log('📞 Calling onOrderFinal callback');
          onOrderFinal(message.payload.id, message.payload.status);
        }
      } else {
        // 'state' and 'fill' types update the order in place
        console.log('✏️ Updating order:', message.payload.id, 'status:', message.payload.status, 'type:', message.type);
        const updatedOrder = {
          ...message.payload,
          stateHistory: updatedStateHistory
        };
        newMap.set(message.payload.id, updatedOrder);
      }
      console.log('📊 Current active orders count:', newMap.size);
      return newMap;
    });
  }, [onOrderFinal]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
      // Fetch order history from API to populate completed orders
      fetchOrderHistory();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect, fetchOrderHistory]);

  return {
    connected,
    error,
    snapshot,
    balances: Array.from(balances.values()),
    positions: Array.from(positions.values()),
    orders: Array.from(orders.values()),
    recentFinalOrders,
    loadingHistory,
    connect,
    disconnect
  };
}
