// Status Stream API Types
// Based on status_stream_api.md

export type StatusMessageType = 'snapshot' | 'stats' | 'trade' | 'ohlcv';

export interface StatusMessage {
  topic: 'status';
  type: StatusMessageType;
}

export interface ThreadStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  queueSize?: number;
  processingRate?: number;
}

export interface MessageCounts {
  trade_messages?: number;
  total?: number;
  [key: string]: number | undefined;
}

export interface MessageRates {
  [key: string]: number;
}

export interface StatsData {
  timestamp: string;
  text?: string;
  last_prices?: Record<string, number>;
  message_counts?: MessageCounts;
  message_rates?: MessageRates;
  thread_statuses?: ThreadStatus[];
}

export interface StatusSnapshotMessage extends StatusMessage {
  type: 'snapshot';
  stats?: StatsData;
  trades?: TradeData[];
  ohlcv?: OHLCVData[];
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

export interface OHLCVData {
  exchange: string;
  symbol: string;
  timeframe: string;
  timestamp: number;
  timestamp_iso: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
  vwap: number;
  text?: string;
}

export interface StatusOHLCVMessage extends StatusMessage {
  type: 'ohlcv';
  exchange: string;
  symbol: string;
  timeframe: string;
  timestamp: number;
  timestamp_iso: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
  vwap: number;
  text?: string;
}

// Client -> Server Messages
export interface StatusSubscribeMessage {
  action: 'subscribe';
  topic: 'status';
}
