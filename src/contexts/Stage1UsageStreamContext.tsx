import { createContext, useContext, ReactNode } from 'react';
import { useStage1UsageStream } from '@/hooks/useStage1UsageStream';
import type { UsageUpdate, SystemInfo } from '@/lib/kraken/types';

interface Stage1UsageStreamContextType {
  usage: UsageUpdate | null;
  systemInfo: SystemInfo | null;
  connected: boolean;
  error: string | null;
  retryCount: number;
}

const Stage1UsageStreamContext = createContext<Stage1UsageStreamContextType | undefined>(undefined);

export const useStage1UsageStreamContext = () => {
  const context = useContext(Stage1UsageStreamContext);
  if (!context) {
    throw new Error('useStage1UsageStreamContext must be used within Stage1UsageStreamProvider');
  }
  return context;
};

interface Stage1UsageStreamProviderProps {
  children: ReactNode;
}

export const Stage1UsageStreamProvider = ({ children }: Stage1UsageStreamProviderProps) => {
  const usageStream = useStage1UsageStream();

  return (
    <Stage1UsageStreamContext.Provider value={usageStream}>
      {children}
    </Stage1UsageStreamContext.Provider>
  );
};
