# QuestDB Retention Policy for Stage 1 Trading Platform

## Overview
This document defines the data retention policies for QuestDB measurements used in the Stage 1 Trading Platform.

## Measurements and Retention Periods

### 1. indicator_bars
- **Purpose**: Stores normalized indicator datasets exported from ChronosFlow
- **Retention Period**: 2 years (730 days)
- **Rationale**: Historical indicator data is needed for backtesting and model training

### 2. walkforward_predictions
- **Purpose**: Stores per-bar model outputs from walkforward runs
- **Retention Period**: 6 months (180 days)
- **Rationale**: Recent predictions are valuable for analysis, older predictions are superseded by newer runs

### 3. trading_sim_traces
- **Purpose**: Captures executed trades from simulations
- **Retention Period**: 1 year (365 days)
- **Rationale**: Trade history is important for performance analysis and comparison

### 4. trading_sim_equity (optional)
- **Purpose**: Bar-by-bar equity curves
- **Retention Period**: 6 months (180 days)
- **Rationale**: Equity curves can be regenerated from trade data if needed

## Implementation Strategy

### Manual Cleanup (Current Approach for Stage 1)
Since QuestDB Community Edition doesn't have built-in automatic retention policies, we use manual SQL-based cleanup:

```sql
-- Cleanup old indicator_bars (older than 2 years)
ALTER TABLE indicator_bars DROP PARTITION WHERE timestamp < dateadd('d', -730, now());

-- Cleanup old walkforward_predictions (older than 6 months)
ALTER TABLE walkforward_predictions DROP PARTITION WHERE timestamp < dateadd('d', -180, now());

-- Cleanup old trading_sim_traces (older than 1 year)
ALTER TABLE trading_sim_traces DROP PARTITION WHERE timestamp < dateadd('d', -365, now());
```

### Scheduled Cleanup (Recommended)
Create a cron job to run cleanup script monthly:

```bash
# Run on the 1st of each month at 2 AM
0 2 1 * * /var/www/agenticresearch.info/algorhythm-view-main/docs/infra/scripts/questdb_cleanup.sh >> /var/log/questdb_cleanup.log 2>&1
```

## Monitoring

### Disk Usage Monitoring
Monitor QuestDB disk usage regularly:

```bash
# Check QuestDB data directory size
du -sh /root/.questdb/db/

# Check individual table sizes
ls -lh /root/.questdb/db/
```

### Data Volume Queries
Check row counts for each measurement:

```sql
SELECT 'indicator_bars' as table_name, count() FROM indicator_bars
UNION ALL
SELECT 'walkforward_predictions', count() FROM walkforward_predictions
UNION ALL
SELECT 'trading_sim_traces', count() FROM trading_sim_traces;
```

## Backup Before Cleanup
Always backup data before running cleanup operations:

```bash
# Backup QuestDB data directory
tar -czf /backup/questdb_backup_$(date +%Y%m%d).tar.gz /root/.questdb/db/
```

## Current Configuration
- **QuestDB Version**: 8.3.2
- **Default Partition**: DAY (can be overridden per table)
- **Commit Mode**: nosync (for performance)
- **Data Directory**: /root/.questdb/db/

## Notes
- Partitioning by day is recommended for time-series data to make cleanup efficient
- When creating new tables via ILP, QuestDB will auto-infer schema
- Consider upgrading to QuestDB Enterprise for automated retention policies
- Monitor disk I/O and adjust commit mode if needed for consistency requirements
