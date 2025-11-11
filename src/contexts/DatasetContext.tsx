import { createContext, useContext, useState, ReactNode } from 'react';

interface DatasetContextType {
  selectedDataset: string | null;
  setSelectedDataset: (datasetId: string | null) => void;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);

  return (
    <DatasetContext.Provider value={{ selectedDataset, setSelectedDataset }}>
      {children}
    </DatasetContext.Provider>
  );
}

export function useDatasetContext() {
  const context = useContext(DatasetContext);
  if (context === undefined) {
    throw new Error('useDatasetContext must be used within a DatasetProvider');
  }
  return context;
}