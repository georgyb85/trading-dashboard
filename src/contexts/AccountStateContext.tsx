import { createContext, useContext, ReactNode } from 'react';
import { useAccountState } from '@/hooks/useAccountState';

type AccountStateContextType = ReturnType<typeof useAccountState>;

const AccountStateContext = createContext<AccountStateContextType | undefined>(undefined);

export const useAccountStateContext = () => {
  const context = useContext(AccountStateContext);
  if (!context) {
    throw new Error('useAccountStateContext must be used within AccountStateProvider');
  }
  return context;
};

interface AccountStateProviderProps {
  children: ReactNode;
}

export const AccountStateProvider = ({ children }: AccountStateProviderProps) => {
  const accountState = useAccountState();

  return (
    <AccountStateContext.Provider value={accountState}>
      {children}
    </AccountStateContext.Provider>
  );
};
