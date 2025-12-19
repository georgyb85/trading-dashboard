import { createContext, useContext, ReactNode } from 'react';
import { useUsageStream } from '@/hooks/useUsageStream';
import type { UsageUpdate, SystemInfo } from '@/lib/kraken/types';

interface UsageStreamContextType {
  usage: UsageUpdate | null;
  systemInfo: SystemInfo | null;
  connected: boolean;
  error: string | null;
  retryCount: number;
}

const UsageStreamContext = createContext<UsageStreamContextType | undefined>(undefined);

export const useUsageStreamContext = () => {
  const context = useContext(UsageStreamContext);
  if (!context) {
    throw new Error('useUsageStreamContext must be used within UsageStreamProvider');
  }
  return context;
};

interface UsageStreamProviderProps {
  children: ReactNode;
}

export const UsageStreamProvider = ({ children }: UsageStreamProviderProps) => {
  const usageStream = useUsageStream();

  return (
    <UsageStreamContext.Provider value={usageStream}>
      {children}
    </UsageStreamContext.Provider>
  );
};
