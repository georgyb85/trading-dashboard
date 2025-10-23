// Mock data for the walk-forward simulation

export const generateMockChartData = (numFolds: number, numRuns: number) => {
  const data = [];
  for (let i = 0; i <= numFolds; i++) {
    const point: any = { fold: i };
    for (let r = 1; r <= numRuns; r++) {
      // Generate random walk with some trend
      const prevValue = i > 0 ? data[i - 1][`Run ${r}`] : 0;
      const change = (Math.random() - 0.4) * 5; // Slight upward bias
      point[`Run ${r}`] = prevValue + change;
    }
    data.push(point);
  }
  return data;
};

export const generateMockSummary = (numRuns: number) => {
  return Array.from({ length: numRuns }, (_, i) => ({
    run: i + 1,
    folds: 140,
    return: Math.random() * 150 - 50,
    pfLong: 1 + Math.random() * 2,
    pfShort: 1 + Math.random() * 2,
    pfDual: Math.floor(Math.random() * 100),
    sigLong: Math.floor(Math.random() * 200),
    sigShort: Math.floor(Math.random() * 200),
    sigDual: Math.floor(Math.random() * 300),
    totalTrades: Math.floor(Math.random() * 500 + 100),
    hitRateLong: 40 + Math.random() * 20,
    hitRateShort: 40 + Math.random() * 20,
    hitRateTotal: 45 + Math.random() * 15,
    runtime: Math.floor(Math.random() * 5000 + 1000),
  }));
};

export const generateMockFolds = (numFolds: number) => {
  const folds = [];
  let running = 0;

  for (let i = 0; i < numFolds; i++) {
    const hasSignals = Math.random() > 0.3;
    const signalsLong = hasSignals ? Math.floor(Math.random() * 6) : 0;
    const signalsShort = hasSignals ? Math.floor(Math.random() * 6) : 0;
    const signalsTotal = signalsLong + signalsShort;
    
    const sum = hasSignals ? (Math.random() - 0.5) * 2 : 0;
    running += sum;

    folds.push({
      fold: i + 82,
      iter: 200 + Math.floor(Math.random() * 200),
      signalsLong,
      signalsShort,
      signalsTotal,
      hitRateLong: signalsLong > 0 ? 40 + Math.random() * 40 : 0,
      hitRateShort: signalsShort > 0 ? 40 + Math.random() * 40 : 0,
      hitRateTotal: signalsTotal > 0 ? 40 + Math.random() * 40 : 0,
      sum,
      running,
      pfTrain: hasSignals ? 1 + Math.random() * 900 : 0,
      pfLong: signalsLong > 0 ? 1 + Math.random() * 3 : 0,
      pfShort: signalsShort > 0 ? 1 + Math.random() * 3 : 0,
      pfDual: signalsTotal > 0 ? 1 + Math.random() * 3 : 0,
      trainStart: String(1968 + i * 44),
      trainEnd: String(2617 + i * 44),
      testStart: String(2622 + i * 44),
      testEnd: String(2645 + i * 44),
    });
  }

  return folds;
};
