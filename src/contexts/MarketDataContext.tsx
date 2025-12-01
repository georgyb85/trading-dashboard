import { createContext, useContext, ReactNode } from 'react';
import {
  useMarketDataStream,
  IndicatorSnapshot,
  OhlcvBar,
  AtrData,
  PositionData,
  PerformanceData,
  TradingRules,
  INDICATOR_NAMES,
} from '@/hooks/useMarketDataStream';

interface MarketDataContextType {
  connected: boolean;
  clientId: string | null;
  tradingRules: TradingRules | null;
  indicators: IndicatorSnapshot[];
  ohlcv: OhlcvBar[];
  atr: AtrData | null;
  position: PositionData | null;
  performance: PerformanceData | null;
  error: string | null;
  subscribedTopics: string[];
  latestIndicator: IndicatorSnapshot | null;
  latestOhlcv: OhlcvBar | null;
  connect: () => void;
  disconnect: () => void;
  subscribe: (topics: string[]) => void;
  unsubscribe: (topics: string[]) => void;
}

const MarketDataContext = createContext<MarketDataContextType | undefined>(undefined);

export const useMarketDataContext = () => {
  const context = useContext(MarketDataContext);
  if (!context) {
    throw new Error('useMarketDataContext must be used within MarketDataProvider');
  }
  return context;
};

interface MarketDataProviderProps {
  children: ReactNode;
}

export const MarketDataProvider = ({ children }: MarketDataProviderProps) => {
  const marketData = useMarketDataStream({
    autoConnect: true,
    reconnect: true,
    reconnectInterval: 5000,
    maxHistorySize: 1000,
  });

  return (
    <MarketDataContext.Provider value={marketData}>
      {children}
    </MarketDataContext.Provider>
  );
};

// Re-export types and constants for convenience
export { INDICATOR_NAMES };
export type {
  IndicatorSnapshot,
  OhlcvBar,
  AtrData,
  PositionData,
  PerformanceData,
  TradingRules,
};
