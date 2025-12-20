// Account State API Types
// Based on account_state_api.md

export interface BalanceEntry {
  asset: string;
  total: string;
  available: string;
  hold: string;
  source: 'Trading' | 'Funding';
  lastUpdateNs: number;
  version?: number;
  delta?: {
    total: string;
    available: string;
  };
}

export interface PositionEntry {
  id: string;
  symbol: string;
  side: 'Long' | 'Short';
  size: string;
  entryPrice: string;
  markPrice: string;
  pnl: string;
  leverage?: string;
  lastUpdateNs: number;
}

export interface ExecutionFill {
  id: string;
  price: string;
  quantity: string;
  fee: string;
  timestampNs: number;
}

export interface OrderEntry {
  id: string;
  clientId?: string;
  symbol: string;
  side: 'Buy' | 'Sell' | 'BUY' | 'SELL';
  type: 'Limit' | 'Market' | 'StopLimit' | 'StopMarket' | 'LIMIT' | 'MARKET';
  quantity: string;
  price?: string;
  filledQuantity: string;
  avgFillPrice?: string;
  status: 'Created' | 'PendingSend' | 'Acknowledged' | 'PartiallyFilled' | 'Filled' | 'CancelPending' | 'Cancelled' | 'Failed' | 'PENDING_NEW' | 'NEW' | 'FILLED' | 'CANCELED' | 'PARTIALLY_FILLED' | 'EXPIRED' | 'REJECTED';
  lastUpdateNs: number;
  lastUpdate?: string;
  remainingQuantity?: string;
  executions?: ExecutionFill[];
  isFinal?: boolean; // Present in final order messages
  stateHistory?: OrderStateEvent[]; // Tracked state transitions (client-side)
}

export interface OrderStateEvent {
  status: string;
  timestamp: number; // milliseconds
  timestampNs: number;
  filledQuantity?: string;
  avgFillPrice?: string;
  messageType: 'state' | 'fill' | 'final';
}

// Order History Types (from /traders/<id>/api/account/order-history)

export interface OrderStateTransition {
  status: string;
  quantity: string;
  price: string;
  filledQuantity: string;
  avgFillPrice: string;
  timestampNs: number;
  timestamp: string;
  latencyNs?: number;
  latencyMs?: string;
}

export interface OrderFill {
  fillId: string;
  fillPrice: string;
  fillQuantity: string;
  fillFee: string;
  cumulativeFilled: string;
  timestampNs: number;
  timestamp: string;
}

export interface OrderHistory {
  orderId: string;
  clientId?: string;
  symbol: string;
  side: string;
  type: string;
  quantity: string;
  price: string;
  createdNs: number;
  created: string | null;
  firstSeenNs: number;
  firstSeen: string;
  lastUpdateNs: number;
  lastUpdate: string;
  finalStatus: string;
  stateTransitions: OrderStateTransition[];
  fills: OrderFill[];
}

export interface AccountSnapshot {
  version: number;
  asOf: string;
  balances: BalanceEntry[];
  positions: PositionEntry[];
  orders: OrderEntry[];
}

// WebSocket Message Types

export type AccountMessageTopic = 'snapshot' | 'balance' | 'position' | 'order' | 'heartbeat';
export type AccountMessageType = 'update' | 'delete' | 'fill' | 'state' | 'final' | 'pong' | 'ping' | 'error' | 'warning';

export interface AccountWSMessage {
  topic: AccountMessageTopic;
  type: AccountMessageType;
  version: number;
  payload: any;
}

export interface AccountSnapshotMessage extends AccountWSMessage {
  topic: 'snapshot';
  type: 'state';
  payload: {
    asOf: string;
    balances: BalanceEntry[];
    positions: PositionEntry[];
    orders: OrderEntry[];
  };
}

export interface BalanceUpdateMessage extends AccountWSMessage {
  topic: 'balance';
  type: 'update';
  payload: BalanceEntry;
}

export interface PositionUpdateMessage extends AccountWSMessage {
  topic: 'position';
  type: 'update' | 'delete';
  payload: PositionEntry & {
    closedReason?: string;
  };
}

export interface OrderUpdateMessage extends AccountWSMessage {
  topic: 'order';
  type: 'state' | 'fill' | 'final';
  payload: OrderEntry & {
    fill?: ExecutionFill;
    cancelReason?: string;
  };
}

export interface HeartbeatMessage extends AccountWSMessage {
  topic: 'heartbeat';
  type: 'ping' | 'pong';
  payload: {
    ts: number;
    id?: string;
  };
}

// Client -> Server Messages
export interface AccountSubscribeMessage {
  type: 'subscribe';
  topics?: Array<'balances' | 'positions' | 'orders'>;
  filters?: {
    symbols?: string[];
  };
}

export interface AccountPingMessage {
  type: 'ping';
  id: string;
}
