// Status Stream API Types
// Based on status_stream_api.md
// Note: OHLCV data now comes from /ws/live (MarketDataContext), not /ws/status

export type StatusMessageType = 'snapshot' | 'update' | 'stats' | 'trade';

export interface StatusMessage {
  topic: 'status';
  type: StatusMessageType;
}

export interface ThreadStatus {
  name: string;
  state?: string;
  processed?: number;
  errors?: number;
  avgLatencyUs?: number;
  status?: 'healthy' | 'warning' | 'error';
  queueSize?: number;
  processingRate?: number;
}

export interface MessageCounts {
  trade_messages?: number;
  orderbook_messages?: number;
  total?: number;
  tradeMessages?: number;
  orderbookMessages?: number;
  [key: string]: number | undefined;
}

export interface MessageRates {
  [key: string]: number;
}

export interface RingBufferStatus {
  unconsumed: number;
  utilization: number;
  max12h: number;
}

export interface StatsData {
  timestamp: string;
  text?: string;
  last_prices?: Record<string, number> | Array<{ symbol: string; price: number }>;
  message_counts?: MessageCounts;
  message_rates?: MessageRates;
  thread_statuses?: ThreadStatus[];
  ring_buffers?: Record<string, RingBufferStatus>;
}

export interface StatusSnapshotMessage extends StatusMessage {
  type: 'snapshot';
  stats?: StatsData;
  trades?: TradeData[];
}

export interface StatusStatsMessage extends StatusMessage {
  type: 'stats';
  timestamp: string;
  text?: string;
  last_prices?: Record<string, number>;
  message_counts?: MessageCounts;
  message_rates?: MessageRates;
  thread_statuses?: ThreadStatus[];
}

export interface TradeData {
  symbol: string;
  side: 'Buy' | 'Sell';
  price: number;
  volume: number;
  timestamp: number;
  timestamp_iso: string;
  message_counts?: MessageCounts;
}

export interface StatusTradeMessage extends StatusMessage {
  type: 'trade';
  symbol: string;
  side: 'Buy' | 'Sell';
  price: number;
  volume: number;
  timestamp: number;
  timestamp_iso: string;
  message_counts?: MessageCounts;
}

// Client -> Server Messages
export interface StatusSubscribeMessage {
  action: 'subscribe';
  topic: 'status';
}
