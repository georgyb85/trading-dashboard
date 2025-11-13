import type { XGBoostThresholdSummary } from '@/lib/types/xgboost';

interface TradingStats {
  signals: number;
  wins: number;
  hitRate: number;
  cumulativeReturn: number;
}

export interface TradingSignalSummary {
  long: TradingStats;
  short: TradingStats;
  total: TradingStats;
}

export const computeTradingSignals = (
  predictions: number[],
  actuals: number[],
  thresholds: XGBoostThresholdSummary,
): TradingSignalSummary => {
  const longThreshold = thresholds.long_optimal ?? thresholds.long_percentile_95 ?? Infinity;
  const shortThreshold = thresholds.short_optimal ?? thresholds.short_percentile_05 ?? -Infinity;

  const long: TradingStats = { signals: 0, wins: 0, hitRate: 0, cumulativeReturn: 0 };
  const short: TradingStats = { signals: 0, wins: 0, hitRate: 0, cumulativeReturn: 0 };

  predictions.forEach((prediction, idx) => {
    const actual = actuals[idx] ?? 0;
    if (prediction >= longThreshold) {
      long.signals += 1;
      if (actual > 0) {
        long.wins += 1;
      }
      long.cumulativeReturn += actual;
    }
    if (prediction <= shortThreshold) {
      short.signals += 1;
      if (actual < 0) {
        short.wins += 1;
      }
      short.cumulativeReturn += -actual; // Short profits when returns are negative
    }
  });

  long.hitRate = long.signals > 0 ? long.wins / long.signals : 0;
  short.hitRate = short.signals > 0 ? short.wins / short.signals : 0;

  const totalSignals = long.signals + short.signals;
  const totalWins = long.wins + short.wins;
  const totalReturn = long.cumulativeReturn + short.cumulativeReturn;

  const total: TradingStats = {
    signals: totalSignals,
    wins: totalWins,
    hitRate: totalSignals > 0 ? totalWins / totalSignals : 0,
    cumulativeReturn: totalReturn,
  };

  return { long, short, total };
};

export const computeRocCurve = (predictions: number[], actuals: number[]) => {
  const pairs = predictions.map((prediction, idx) => ({
    prediction,
    label: actuals[idx] > 0 ? 1 : 0,
  }));

  const positives = pairs.filter((pair) => pair.label === 1).length;
  const negatives = pairs.length - positives;

  if (positives === 0 || negatives === 0) {
    return { auc: 0.5, points: [] as { fpr: number; tpr: number; threshold: number }[] };
  }

  pairs.sort((a, b) => b.prediction - a.prediction);

  let tp = 0;
  let fp = 0;
  let prevPrediction = Number.POSITIVE_INFINITY;

  const rocPoints: { fpr: number; tpr: number; threshold: number }[] = [];

  for (const { prediction, label } of pairs) {
    if (prediction !== prevPrediction) {
      rocPoints.push({
        threshold: prediction,
        tpr: tp / positives,
        fpr: fp / negatives,
      });
      prevPrediction = prediction;
    }

    if (label === 1) {
      tp += 1;
    } else {
      fp += 1;
    }
  }

  rocPoints.push({ threshold: -Infinity, tpr: tp / positives, fpr: fp / negatives });

  // Compute area using trapezoidal rule
  let auc = 0;
  for (let i = 1; i < rocPoints.length; i++) {
    const prev = rocPoints[i - 1];
    const curr = rocPoints[i];
    auc += (curr.fpr - prev.fpr) * (curr.tpr + prev.tpr) * 0.5;
  }

  return { auc: Math.max(0, Math.min(1, auc)), points: rocPoints };
};

export const buildHistogram = (values: number[], bins = 20) => {
  if (!values.length) {
    return [];
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binSize = (max - min) / bins || 1;

  const counts = Array.from({ length: bins }, (_, idx) => ({
    bin: min + idx * binSize,
    count: 0,
  }));

  values.forEach((value) => {
    const index = Math.min(
      counts.length - 1,
      Math.max(0, Math.floor((value - min) / binSize)),
    );
    counts[index].count += 1;
  });

  return counts;
};

export const buildScatterData = (predictions: number[], actuals: number[]) => {
  return predictions.map((prediction, idx) => ({
    predicted: prediction,
    actual: actuals[idx] ?? 0,
  }));
};

