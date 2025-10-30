#!/bin/bash
# QuestDB Retention Policy Cleanup Script
# Stage 1 Trading Platform
# Run monthly to cleanup old partitions

set -e

QUESTDB_HOST="localhost"
QUESTDB_PORT="9000"
LOG_FILE="/var/log/questdb_cleanup.log"

echo "========================================" | tee -a "$LOG_FILE"
echo "QuestDB Cleanup - $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# Function to execute QuestDB SQL
execute_sql() {
    local sql="$1"
    local encoded_sql=$(printf '%s' "$sql" | jq -sRr @uri)
    curl -s -G "http://${QUESTDB_HOST}:${QUESTDB_PORT}/exec" \
        --data-urlencode "query=${sql}" \
        -w "\nHTTP Status: %{http_code}\n"
}

# Cleanup indicator_bars older than 2 years
echo "Cleaning indicator_bars (older than 730 days)..." | tee -a "$LOG_FILE"
if execute_sql "ALTER TABLE indicator_bars DROP PARTITION LIST '$(date -d '730 days ago' +%Y-%m-%d)'" 2>&1 | tee -a "$LOG_FILE"; then
    echo "indicator_bars cleanup completed" | tee -a "$LOG_FILE"
else
    echo "indicator_bars cleanup skipped (table may not exist yet)" | tee -a "$LOG_FILE"
fi

# Cleanup walkforward_predictions older than 6 months
echo "Cleaning walkforward_predictions (older than 180 days)..." | tee -a "$LOG_FILE"
if execute_sql "ALTER TABLE walkforward_predictions DROP PARTITION LIST '$(date -d '180 days ago' +%Y-%m-%d)'" 2>&1 | tee -a "$LOG_FILE"; then
    echo "walkforward_predictions cleanup completed" | tee -a "$LOG_FILE"
else
    echo "walkforward_predictions cleanup skipped (table may not exist yet)" | tee -a "$LOG_FILE"
fi

# Cleanup trading_sim_traces older than 1 year
echo "Cleaning trading_sim_traces (older than 365 days)..." | tee -a "$LOG_FILE"
if execute_sql "ALTER TABLE trading_sim_traces DROP PARTITION LIST '$(date -d '365 days ago' +%Y-%m-%d)'" 2>&1 | tee -a "$LOG_FILE"; then
    echo "trading_sim_traces cleanup completed" | tee -a "$LOG_FILE"
else
    echo "trading_sim_traces cleanup skipped (table may not exist yet)" | tee -a "$LOG_FILE"
fi

# Report disk usage
echo "QuestDB disk usage:" | tee -a "$LOG_FILE"
du -sh /root/.questdb/db/ | tee -a "$LOG_FILE"

echo "Cleanup completed at $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
