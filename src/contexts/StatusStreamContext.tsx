import { createContext, useContext, ReactNode } from 'react';
import { useStatusStream } from '@/hooks/useStatusStream';
import { StatsData, TradeData } from '@/types/status';

interface StatusStreamContextType {
  connected: boolean;
  error: string | null;
  stats: StatsData | null;
  trades: TradeData[];
  lastPrices: Record<string, number>;
  connect: () => void;
  disconnect: () => void;
}

const StatusStreamContext = createContext<StatusStreamContextType | undefined>(undefined);

export const useStatusStreamContext = () => {
  const context = useContext(StatusStreamContext);
  if (!context) {
    throw new Error('useStatusStreamContext must be used within StatusStreamProvider');
  }
  return context;
};

interface StatusStreamProviderProps {
  children: ReactNode;
}

export const StatusStreamProvider = ({ children }: StatusStreamProviderProps) => {
  const statusStream = useStatusStream({
    autoConnect: true,
    reconnect: true,
    reconnectInterval: 500,
    maxTradeHistory: 100,
  });

  return (
    <StatusStreamContext.Provider value={statusStream}>
      {children}
    </StatusStreamContext.Provider>
  );
};
