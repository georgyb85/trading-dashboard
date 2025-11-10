// Generate mock trading indicator data
export const generateMockData = (rows: number = 8143) => {
  const startDate = new Date('2024-01-01');
  const data = [];

  for (let i = 0; i < rows; i++) {
    const timestamp = new Date(startDate.getTime() + i * 3600000); // Hourly data
    
    data.push({
      timestamp: timestamp.toISOString(),
      PVI: Math.random() * 20 - 10,
      PROD_PV_S: Math.random() * 10 - 5,
      PROD_PV_M: Math.random() * 15 - 7,
      SUM_PV_S: Math.random() * 12 - 6,
      DELTA_PROD_PV: Math.random() * 8 - 4,
      REACTIVITY_S: Math.random() * 20 - 10,
      REACTIVITY_M: Math.random() * 18 - 9,
      REACTIVITY_L: Math.random() * 16 - 8,
      DELTA_REACT: Math.random() * 10 - 5,
      MAX_REACT: Math.random() * 80 - 40, // Main indicator with wider range
      DELTA_CSV_S: Math.random() * 6 - 3,
      DELTA_PV_FIT: Math.random() * 7 - 3.5,
      AROON_UP_S: Math.random() * 50,
      AROON_DOWN_S: Math.random() * 50,
      AROON_DIFF_S: Math.random() * 100 - 50,
      AROON_UP_M: Math.random() * 50,
      AROON_DOWN_M: Math.random() * 50,
      AROON_UP_L: Math.random() * 50,
      AROON_DOWN_L: Math.random() * 50,
    });
  }

  return data;
};

export const mockTables = [
  'btc25_3',
  'eth_indicators',
  'btc_daily',
  'crypto_analysis',
  'market_data',
];

export const getIndicatorColumns = () => [
  'timestamp',
  'PVI',
  'PROD_PV_S',
  'PROD_PV_M',
  'SUM_PV_S',
  'DELTA_PROD_PV',
  'REACTIVITY_S',
  'REACTIVITY_M',
  'REACTIVITY_L',
  'DELTA_REACT',
  'MAX_REACT',
  'DELTA_CSV_S',
  'DELTA_PV_FIT',
  'AROON_UP_S',
  'AROON_DOWN_S',
  'AROON_DIFF_S',
  'AROON_UP_M',
  'AROON_DOWN_M',
  'AROON_UP_L',
  'AROON_DOWN_L',
];
