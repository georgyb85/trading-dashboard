import type { StressTestConfig, TradeConfig } from "@/lib/stage1/types";

const HEADER = "# Stage1 RunConfig v1";

const boolToString = (value: boolean | undefined) => (value ? "true" : "false");
const formatNumber = (value: number, decimals = 6) =>
  Number.isInteger(value) ? `${Math.trunc(value)}` : value.toFixed(decimals);

const THRESHOLD_CHOICES = ["OptimalROC", "Percentile95_5", "ZeroCrossover"] as const;
type ThresholdLiteral = (typeof THRESHOLD_CHOICES)[number];

export const serializeTradeClipboard = (
  trade: TradeConfig,
  stress: StressTestConfig & { enable?: boolean }
) => {
  let text = `${HEADER}\n`;
  text += "[TRADE]\n";
  text += `position_size=${formatNumber(trade.position_size)}\n`;
  text += `use_signal_exit=${boolToString(trade.use_signal_exit)}\n`;
  text += `exit_strength_pct=${formatNumber(trade.exit_strength_pct)}\n`;
  text += `honor_signal_reversal=${boolToString(trade.honor_signal_reversal)}\n`;
  text += `use_stop_loss=${boolToString(trade.use_stop_loss)}\n`;
  text += `use_atr_stop_loss=${boolToString(trade.use_atr_stop_loss)}\n`;
  text += `stop_loss_pct=${formatNumber(trade.stop_loss_pct)}\n`;
  text += `atr_multiplier=${formatNumber(trade.atr_multiplier)}\n`;
  text += `atr_period=${formatNumber(trade.atr_period, 0)}\n`;
  text += `stop_loss_cooldown_bars=${formatNumber(trade.stop_loss_cooldown_bars, 0)}\n`;
  text += `use_take_profit=${boolToString(trade.use_take_profit)}\n`;
  text += `use_atr_take_profit=${boolToString(trade.use_atr_take_profit)}\n`;
  text += `take_profit_pct=${formatNumber(trade.take_profit_pct)}\n`;
  text += `atr_tp_multiplier=${formatNumber(trade.atr_tp_multiplier)}\n`;
  text += `atr_tp_period=${formatNumber(trade.atr_tp_period, 0)}\n`;
  text += `use_time_exit=${boolToString(trade.use_time_exit)}\n`;
  text += `max_holding_bars=${formatNumber(trade.max_holding_bars, 0)}\n`;
  text += `use_limit_orders=${boolToString(trade.use_limit_orders)}\n`;
  text += `limit_order_window=${formatNumber(trade.limit_order_window, 0)}\n`;
  text += `limit_order_offset=${formatNumber(trade.limit_order_offset)}\n`;
  text += `threshold_choice=${trade.threshold_choice}\n\n`;

  text += "[STRESS_TEST]\n";
  text += `enable=${boolToString(stress.enable ?? true)}\n`;
  text += `bootstrap_iterations=${formatNumber(stress.bootstrap_iterations, 0)}\n`;
  text += `mcpt_iterations=${formatNumber(stress.mcpt_iterations, 0)}\n`;
  text += `seed=${formatNumber(stress.seed, 0)}\n\n`;

  return text;
};

const toNumber = (value?: string | null, fallback?: number) => {
  if (value === undefined || value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value?: string | null, fallback = false) => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return fallback;
};

const toThresholdChoice = (value?: string): ThresholdLiteral => {
  if (!value) return "OptimalROC";
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("zero")) return "ZeroCrossover";
  if (normalized.includes("percent")) return "Percentile95_5";
  return "OptimalROC";
};

export interface ClipboardParseResult {
  trade?: Partial<TradeConfig>;
  stress?: Partial<StressTestConfig> & { enable?: boolean };
}

export const parseTradeClipboard = (text: string): ClipboardParseResult => {
  const result: ClipboardParseResult = {};
  if (!text) return result;

  enum Section {
    None,
    Trade,
    Stress,
  }

  let section = Section.None;
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("[") && line.endsWith("]")) {
      const tag = line.slice(1, -1).toLowerCase();
      if (tag === "trade") {
        section = Section.Trade;
      } else if (tag === "stress_test" || tag === "stresstest") {
        section = Section.Stress;
      } else {
        section = Section.None;
      }
      continue;
    }

    const [keyRaw, ...rest] = line.split("=");
    if (!keyRaw || rest.length === 0) continue;
    const key = keyRaw.trim().toLowerCase();
    const value = rest.join("=").trim();

    if (section === Section.Trade) {
      if (!result.trade) result.trade = {};
      const trade = result.trade;
      switch (key) {
        case "position_size": trade.position_size = toNumber(value, trade.position_size ?? 1000); break;
        case "use_signal_exit": trade.use_signal_exit = toBool(value, trade.use_signal_exit ?? true); break;
        case "exit_strength_pct": trade.exit_strength_pct = toNumber(value, trade.exit_strength_pct ?? 0.8); break;
        case "honor_signal_reversal": trade.honor_signal_reversal = toBool(value, trade.honor_signal_reversal ?? true); break;
        case "use_stop_loss": trade.use_stop_loss = toBool(value, trade.use_stop_loss ?? true); break;
        case "use_atr_stop_loss": trade.use_atr_stop_loss = toBool(value, trade.use_atr_stop_loss ?? false); break;
        case "stop_loss_pct": trade.stop_loss_pct = toNumber(value, trade.stop_loss_pct ?? 3); break;
        case "atr_multiplier": trade.atr_multiplier = toNumber(value, trade.atr_multiplier ?? 2); break;
        case "atr_period": trade.atr_period = toNumber(value, trade.atr_period ?? 14)!; break;
        case "stop_loss_cooldown_bars": trade.stop_loss_cooldown_bars = toNumber(value, trade.stop_loss_cooldown_bars ?? 3)!; break;
        case "use_take_profit": trade.use_take_profit = toBool(value, trade.use_take_profit ?? true); break;
        case "use_atr_take_profit": trade.use_atr_take_profit = toBool(value, trade.use_atr_take_profit ?? false); break;
        case "take_profit_pct": trade.take_profit_pct = toNumber(value, trade.take_profit_pct ?? 3); break;
        case "atr_tp_multiplier": trade.atr_tp_multiplier = toNumber(value, trade.atr_tp_multiplier ?? 3); break;
        case "atr_tp_period": trade.atr_tp_period = toNumber(value, trade.atr_tp_period ?? 14)!; break;
        case "use_time_exit": trade.use_time_exit = toBool(value, trade.use_time_exit ?? false); break;
        case "max_holding_bars": trade.max_holding_bars = toNumber(value, trade.max_holding_bars ?? 10)!; break;
        case "use_limit_orders": trade.use_limit_orders = toBool(value, trade.use_limit_orders ?? false); break;
        case "limit_order_window": trade.limit_order_window = toNumber(value, trade.limit_order_window ?? 5)!; break;
        case "limit_order_offset": trade.limit_order_offset = toNumber(value, trade.limit_order_offset ?? 0.001)!; break;
        case "threshold_choice": trade.threshold_choice = toThresholdChoice(value); break;
      }
    } else if (section === Section.Stress) {
      if (!result.stress) result.stress = {};
      const stress = result.stress;
      switch (key) {
        case "enable": stress.enable = toBool(value, stress.enable ?? true); break;
        case "bootstrap_iterations": stress.bootstrap_iterations = toNumber(value, stress.bootstrap_iterations ?? 1000)!; break;
        case "mcpt_iterations": stress.mcpt_iterations = toNumber(value, stress.mcpt_iterations ?? 1000)!; break;
        case "seed": stress.seed = toNumber(value, stress.seed ?? 42)!; break;
      }
    }
  }

  return result;
};
