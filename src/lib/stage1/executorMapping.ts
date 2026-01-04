import type {
  ExecutorThresholdChoice,
  Stage1ExecutorConfig,
  Stage1ExecutorConfigUpsertRequest,
  TradeConfig,
} from "@/lib/stage1/types";

export const toExecutorThresholdChoice = (
  choice: TradeConfig["threshold_choice"]
): ExecutorThresholdChoice => {
  if (choice === "Percentile95_5") return "Percentile";
  return choice;
};

export const toTradeSimulatorThresholdChoice = (
  choice: ExecutorThresholdChoice
): TradeConfig["threshold_choice"] => {
  if (choice === "Percentile") return "Percentile95_5";
  return choice;
};

export const buildExecutorConfigUpsertRequest = (
  tradeConfig: TradeConfig,
  params: {
    name: string;
    description?: string;
    createdBy?: string;
    changedBy?: string;
    changeReason?: string;
    extraConfig?: Record<string, unknown>;
  }
): Stage1ExecutorConfigUpsertRequest => {
  return {
    name: params.name,
    description: params.description,
    threshold_choice: toExecutorThresholdChoice(tradeConfig.threshold_choice),
    position_size: tradeConfig.position_size,
    use_limit_orders: tradeConfig.use_limit_orders,
    limit_order_window: tradeConfig.limit_order_window,
    limit_order_offset: tradeConfig.limit_order_offset,
    use_signal_exit: tradeConfig.use_signal_exit,
    exit_strength_pct: tradeConfig.exit_strength_pct,
    honor_signal_reversal: tradeConfig.honor_signal_reversal,
    use_stop_loss: tradeConfig.use_stop_loss,
    use_atr_stop_loss: tradeConfig.use_atr_stop_loss,
    stop_loss_pct: tradeConfig.stop_loss_pct,
    atr_multiplier: tradeConfig.atr_multiplier,
    atr_period: tradeConfig.atr_period,
    stop_loss_cooldown_bars: tradeConfig.stop_loss_cooldown_bars,
    use_take_profit: tradeConfig.use_take_profit,
    use_atr_take_profit: tradeConfig.use_atr_take_profit,
    take_profit_pct: tradeConfig.take_profit_pct,
    atr_tp_multiplier: tradeConfig.atr_tp_multiplier,
    atr_tp_period: tradeConfig.atr_tp_period,
    use_time_exit: tradeConfig.use_time_exit,
    max_holding_bars: tradeConfig.max_holding_bars,
    extra_config: params.extraConfig,
    created_by: params.createdBy,
    changed_by: params.changedBy,
    change_reason: params.changeReason,
  };
};

export const tradeConfigFromExecutorConfig = (config: Stage1ExecutorConfig): TradeConfig => {
  return {
    position_size: config.position_size,
    threshold_choice: toTradeSimulatorThresholdChoice(config.threshold_choice),
    use_signal_exit: config.use_signal_exit,
    exit_strength_pct: config.exit_strength_pct,
    honor_signal_reversal: config.honor_signal_reversal,
    use_stop_loss: config.use_stop_loss,
    use_atr_stop_loss: config.use_atr_stop_loss,
    stop_loss_pct: config.stop_loss_pct,
    atr_multiplier: config.atr_multiplier,
    atr_period: config.atr_period,
    stop_loss_cooldown_bars: config.stop_loss_cooldown_bars,
    use_take_profit: config.use_take_profit,
    use_atr_take_profit: config.use_atr_take_profit,
    take_profit_pct: config.take_profit_pct,
    atr_tp_multiplier: config.atr_tp_multiplier,
    atr_tp_period: config.atr_tp_period,
    use_time_exit: config.use_time_exit,
    max_holding_bars: config.max_holding_bars,
    use_limit_orders: config.use_limit_orders,
    limit_order_window: config.limit_order_window,
    limit_order_offset: config.limit_order_offset,
  };
};

