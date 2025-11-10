# Frontend Server Infrastructure Documentation
## Stage 1 Trading Platform

**Server**: 45.85.147.236
**Role**: Frontend server hosting QuestDB, PostgreSQL, and trading-dashboard
**Last Updated**: 2025-10-30

---

## Table of Contents
1. [Server Overview](#server-overview)
2. [QuestDB Configuration](#questdb-configuration)
3. [PostgreSQL Configuration](#postgresql-configuration)
4. [Network & Firewall](#network--firewall)
5. [Credentials & Security](#credentials--security)
6. [Data Retention](#data-retention)
7. [Operational Procedures](#operational-procedures)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Server Overview

### System Information
- **Hostname**: vmi2607786
- **External IP**: 45.85.147.236
- **OS**: Linux 6.8.0-60-generic (Ubuntu)
- **Architecture**: x86_64

### Installed Services
- **QuestDB 8.3.2**: Time-series database for OHLCV, indicators, predictions, and trade traces
- **PostgreSQL 16**: Relational database for metadata, run configurations, and aggregated metrics
- **Nginx**: Web server for trading-dashboard (port 80/443)
- **Trading Dashboard**: React-based web interface

### Directory Structure
```
/var/www/agenticresearch.info/
└── algorhythm-view-main/           # Trading dashboard codebase
    ├── docs/
    │   ├── fixtures/
    │   │   └── stage1_3/
    │   │       └── postgres_schema.sql
    │   └── infra/
    │       ├── frontend.md          # This document
    │       ├── stage1_credentials.env
    │       ├── questdb_retention_policy.md
    │       └── scripts/
    │           └── questdb_cleanup.sh
    └── [React application files]

/root/.questdb/                      # QuestDB data directory
└── db/                              # Database tables and partitions
```

---

## QuestDB Configuration

### Service Status
- **Status**: Running
- **Process ID**: Check with `ps aux | grep questdb`
- **Version**: 8.3.2-rt-linux-x86-64

### Network Ports
- **REST API**: 9000 (HTTP)
  - Web Console: http://45.85.147.236:9000
  - SQL Endpoint: http://45.85.147.236:9000/exec
- **ILP (InfluxDB Line Protocol)**: 9009 (TCP)
  - Telnet: 45.85.147.236:9009

### Listening Configuration
```
tcp   LISTEN 0      256          0.0.0.0:9000       0.0.0.0:*
tcp   LISTEN 0      256          0.0.0.0:9009       0.0.0.0:*
```

Both ports are accessible from external networks.

### Configuration File
- **Location**: `/root/.questdb/conf/server.conf`
- **Key Settings**:
  - `query.timeout=1m`
  - `cairo.commit.mode=nosync` (performance mode)
  - `line.tcp.enabled=true` (ILP ingestion enabled)

### Expected Measurements (Stage 1)
| Measurement Name | Purpose | Timestamp Column |
|-----------------|---------|------------------|
| `indicator_bars` | Normalized indicator datasets from ChronosFlow | `timestamp` (designated) |
| `walkforward_predictions` | Per-bar model outputs with fold context | `timestamp` |
| `trading_sim_traces` | Executed trades from simulations | `timestamp` (entry time) |
| `trading_sim_equity` | Bar-by-bar equity curves (optional) | `timestamp` |

### Management Commands
```bash
# Check QuestDB process
ps aux | grep questdb

# Check listening ports
ss -tuln | grep -E ':(9000|9009)'

# View QuestDB logs
tail -f /root/.questdb/log/questdb.log

# Access QuestDB via HTTP
curl "http://localhost:9000/exec?query=SELECT+*+FROM+tables()"

# Check disk usage
du -sh /root/.questdb/db/
```

---

## PostgreSQL Configuration

### Service Status
- **Status**: Running
- **Version**: PostgreSQL 16
- **Cluster**: main

### Network Ports
- **Port**: 5432 (TCP)
- **Listening**: 0.0.0.0 (all interfaces)

```
tcp   LISTEN 0      200          0.0.0.0:5432       0.0.0.0:*
tcp   LISTEN 0      200             [::]:5432          [::]:*
```

### Stage 1 Database
- **Database Name**: `stage1_trading`
- **Owner**: `stage1_app`
- **Encoding**: UTF8
- **Collation**: C.UTF-8

### Stage 1 User/Role
- **Username**: `stage1_app`
- **Privileges**: LOGIN, CREATEDB
- **Password**: See `docs/infra/stage1_credentials.env`

### Schema Tables
All tables created successfully:

| Table Name | Purpose | Key Columns |
|-----------|---------|-------------|
| `indicator_datasets` | Registry for exported datasets | `dataset_id` (PK), `symbol`, `questdb_measurement` |
| `walkforward_runs` | Walkforward run metadata | `run_id` (PK), `dataset_id` (FK), `prediction_measurement` |
| `walkforward_folds` | Fold-level metrics | `(run_id, fold_number)` (PK) |
| `simulation_runs` | Trading simulation metadata | `simulation_id` (PK), `run_id` (FK) |
| `simulation_trades` | Per-trade outcomes | `trade_id` (PK), `simulation_id` (FK) |
| `simulation_trade_buckets` | Aggregated trade statistics | `(simulation_id, side)` (PK) |

### Access Control (pg_hba.conf)
**File**: `/etc/postgresql/16/main/pg_hba.conf`

Stage 1 entries:
```
# Stage 1 Trading Platform - Backend GPU node access
host    stage1_trading    stage1_app    220.82.52.202/32        scram-sha-256
# Stage 1 Trading Platform - Allow local connections for testing
host    stage1_trading    stage1_app    127.0.0.1/32           scram-sha-256
```

### Management Commands
```bash
# Check PostgreSQL status
systemctl status postgresql

# Reload configuration (after pg_hba.conf changes)
sudo systemctl reload postgresql

# Connect as postgres superuser
sudo -u postgres psql

# Connect as stage1_app user
PGPASSWORD='St4g3!Tr4d1ng#2025' psql -U stage1_app -d stage1_trading -h localhost

# List databases
sudo -u postgres psql -c "\l"

# List tables in stage1_trading
PGPASSWORD='St4g3!Tr4d1ng#2025' psql -U stage1_app -d stage1_trading -h localhost -c "\dt"

# View table row counts
PGPASSWORD='St4g3!Tr4d1ng#2025' psql -U stage1_app -d stage1_trading -h localhost -c "
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

## Network & Firewall

### Firewall Status
- **UFW**: Active but not enforcing restrictions
- **iptables**: Policy ACCEPT for INPUT chain

### Accessible Ports
- **80/443**: HTTP/HTTPS (Nginx)
- **5432**: PostgreSQL
- **9000**: QuestDB REST API
- **9009**: QuestDB ILP

### Backend Node Access
The backend GPU node (220.82.52.202) can access:
- PostgreSQL: Yes (configured in pg_hba.conf)
- QuestDB REST: Yes (open on 0.0.0.0)
- QuestDB ILP: Yes (open on 0.0.0.0)

### Testing Connectivity
From the backend node (220.82.52.202):
```bash
# Test PostgreSQL connection
PGPASSWORD='St4g3!Tr4d1ng#2025' psql -U stage1_app -d stage1_trading -h 45.85.147.236 -c "SELECT 'Connected' as status;"

# Test QuestDB REST API
curl "http://45.85.147.236:9000/exec?query=SELECT+*+FROM+tables()"

# Test QuestDB ILP port
telnet 45.85.147.236 9009
```

---

## Credentials & Security

### Credentials File
**Location**: `/var/www/agenticresearch.info/algorhythm-view-main/docs/infra/stage1_credentials.env`
**Permissions**: 600 (read/write owner only)
**Git Status**: Added to .gitignore

### Connection Strings
```bash
# PostgreSQL
DATABASE_URL=postgresql://stage1_app:St4g3!Tr4d1ng#2025@45.85.147.236:5432/stage1_trading?sslmode=prefer

# QuestDB REST
QUESTDB_REST_URL=http://45.85.147.236:9000

# QuestDB ILP
QUESTDB_ILP_ENDPOINT=45.85.147.236:9009
```

### Security Notes
- Root password for this server: `yC(9+r2?#ALu%RWC`
- Credentials file should be transferred to backend node securely (scp, secrets manager)
- Consider rotating passwords periodically
- Monitor PostgreSQL logs for unauthorized access attempts
- Implement connection pooling in backend applications

---

## Data Retention

### Retention Policy
See detailed documentation: `docs/infra/questdb_retention_policy.md`

**Summary**:
- `indicator_bars`: 2 years (730 days)
- `walkforward_predictions`: 6 months (180 days)
- `trading_sim_traces`: 1 year (365 days)

### Cleanup Script
**Location**: `/var/www/agenticresearch.info/algorhythm-view-main/docs/infra/scripts/questdb_cleanup.sh`
**Execution**: Manual or scheduled via cron

**Recommended cron schedule** (1st of each month at 2 AM):
```bash
0 2 1 * * /var/www/agenticresearch.info/algorhythm-view-main/docs/infra/scripts/questdb_cleanup.sh >> /var/log/questdb_cleanup.log 2>&1
```

To install cron job:
```bash
crontab -e
# Add the line above
```

---

## Operational Procedures

### Starting Services

#### QuestDB
```bash
# QuestDB is typically started at boot
# Check if running
ps aux | grep questdb

# If not running, start manually (adjust path as needed)
cd /root/questdb-8.3.2-rt-linux-x86-64
./bin/questdb.sh start
```

#### PostgreSQL
```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Enable on boot
sudo systemctl enable postgresql
```

#### Nginx (Trading Dashboard)
```bash
# Start Nginx
sudo systemctl start nginx

# Restart Nginx
sudo systemctl restart nginx

# Reload configuration
sudo systemctl reload nginx
```

### Stopping Services
```bash
# Stop QuestDB
pkill -f questdb

# Stop PostgreSQL
sudo systemctl stop postgresql

# Stop Nginx
sudo systemctl stop nginx
```

### Backup Procedures

#### PostgreSQL Backup
```bash
# Backup stage1_trading database
PGPASSWORD='St4g3!Tr4d1ng#2025' pg_dump -U stage1_app -h localhost stage1_trading > /backup/stage1_trading_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
PGPASSWORD='St4g3!Tr4d1ng#2025' psql -U stage1_app -h localhost stage1_trading < /backup/stage1_trading_YYYYMMDD_HHMMSS.sql
```

#### QuestDB Backup
```bash
# Stop QuestDB first
pkill -f questdb

# Backup data directory
tar -czf /backup/questdb_backup_$(date +%Y%m%d).tar.gz /root/.questdb/db/

# Restore (stop QuestDB first)
tar -xzf /backup/questdb_backup_YYYYMMDD.tar.gz -C /root/.questdb/db/
```

---

## Monitoring & Maintenance

### Health Checks

#### QuestDB Health
```bash
# Check if service is responding
curl -s "http://localhost:9000/" && echo "QuestDB is healthy"

# Check table count
curl -s "http://localhost:9000/exec?query=SELECT+COUNT(*)+FROM+tables()"
```

#### PostgreSQL Health
```bash
# Check service status
systemctl status postgresql

# Check connection
PGPASSWORD='St4g3!Tr4d1ng#2025' psql -U stage1_app -d stage1_trading -h localhost -c "SELECT 'PostgreSQL is healthy' as status;"

# Check for active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='stage1_trading';"
```

### Disk Space Monitoring
```bash
# Overall disk usage
df -h

# QuestDB data directory
du -sh /root/.questdb/db/

# PostgreSQL data directory
du -sh /var/lib/postgresql/16/main/
```

### Log Files
- **QuestDB**: `/root/.questdb/log/questdb.log`
- **PostgreSQL**: `/var/log/postgresql/postgresql-16-main.log`
- **Nginx**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- **Cleanup Script**: `/var/log/questdb_cleanup.log`

---

## Troubleshooting

### QuestDB Not Responding
```bash
# Check if process is running
ps aux | grep questdb

# Check port availability
ss -tuln | grep 9000

# View recent logs
tail -n 100 /root/.questdb/log/questdb.log

# Restart QuestDB
pkill -f questdb
cd /root/questdb-8.3.2-rt-linux-x86-64
./bin/questdb.sh start
```

### PostgreSQL Connection Refused
```bash
# Check if PostgreSQL is running
systemctl status postgresql

# Check if listening on correct port
ss -tuln | grep 5432

# View recent logs
tail -n 100 /var/log/postgresql/postgresql-16-main.log

# Check pg_hba.conf configuration
cat /etc/postgresql/16/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Backend Node Cannot Connect
```bash
# Verify backend IP in pg_hba.conf
grep "220.82.52.202" /etc/postgresql/16/main/pg_hba.conf

# Test from this server to backend
ping 220.82.52.202

# Check firewall rules
iptables -L -n -v

# Reload PostgreSQL configuration
sudo systemctl reload postgresql
```

### Disk Space Full
```bash
# Check disk usage
df -h

# Find largest directories
du -sh /root/.questdb/db/* | sort -h

# Run manual cleanup
/var/www/agenticresearch.info/algorhythm-view-main/docs/infra/scripts/questdb_cleanup.sh

# Drop old QuestDB partitions manually
curl "http://localhost:9000/exec?query=ALTER+TABLE+indicator_bars+DROP+PARTITION+LIST+'2023-01-01'"
```

---

## Contacts & Support

- **System Administrator**: [Contact Info]
- **Trading Platform Team**: [Contact Info]
- **QuestDB Documentation**: https://questdb.io/docs/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/16/

---

## Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-30 | Claude Code | Initial Stage 1 infrastructure setup: PostgreSQL database/schema, QuestDB verification, firewall configuration, credentials management, retention policy documentation |

---

**End of Document**
