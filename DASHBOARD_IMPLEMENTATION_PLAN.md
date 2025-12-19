# Trading Dashboard Implementation Plan

Implementation plan based on **verified existing backend endpoints only**.

## Verified Backend Inventory

### REST Endpoints (Live Trading)
| Endpoint | Verified | Data Returned |
|----------|----------|---------------|
| `GET /api/live/models` | ✅ | Model list with executor status |
| `GET /api/live/active_model` | ✅ | Active model details |
| `GET /api/live/models/{id}/metrics` | ✅ | MSE, MAE, R², directional accuracy, sample count |
| `GET /api/live/predictions?model_id=&limit=` | ✅ | Recent predictions array |
| `GET /api/live/health` | ✅ | See exact schema below |
| `GET /api/live/available-features` | ✅ | features[], count, feature_hash, stream_id |
| `GET /api/live/export/ohlcv` | ✅ | TSSB format text |
| `GET /api/live/export/indicators` | ✅ | CSV format text |
| Model lifecycle (deploy/executor/undeploy) | ✅ | Already implemented in dashboard |

### REST Endpoints (Account) - **SEPARATE SYSTEM**
| Endpoint | Verified | Limitation |
|----------|----------|------------|
| `GET /api/account/snapshot` | ✅ | Balances + orders, but orders lack model/stream attribution |
| `GET /api/account/order-history` | ✅ | **NOT** connected to live trading orders |

**CRITICAL**: The `account::*` namespace is a separate system from live trading. Orders placed by StrategyWorker via ExchangeGateway are **NOT** tracked in AccountState. The account API shows exchange-level account state, not trading-system orders.

### WebSockets
| Endpoint | Verified | Data |
|----------|----------|------|
| `/ws/predictions` | ✅ | Real-time predictions with subscribe/unsubscribe |
| `/ws/status` | ✅ | Thread health, message rates, ring buffers, last trades |
| `/usage` | ✅ | See exact schema below |
| `/account` | ✅ | Account balances (not trading orders) |

### Existing Dashboard Pages
| Page | File | Status |
|------|------|--------|
| Index (landing) | `Index.tsx` | EXISTS |
| LiveModel | `LiveModel.tsx` | EXISTS |
| Indicators | `Indicators.tsx` | EXISTS |
| NotFound | `NotFound.tsx` | EXISTS |

---

## Verified Schemas (from source code)

### GET /api/live/health (live_model_api.cpp:1027-1098)

```json
{
  "streams": [
    {
      "stream_id": "btcusdt_1h",
      "last_bar_ts": 1702200000000,
      "last_indicator_ts": 1702200000000,
      "ohlcv_buffer_size": 1000,
      "indicator_buffer_size": 1000,
      "feature_count": 45,
      "target_count": 3,
      "max_target_horizon": 12,
      "feature_hash": 12345678,
      "stale": false
    }
  ],
  "queues": {
    "indicator_bar": { "capacity": 1024, "pending": 3 },
    "inference_indicator": { "capacity": 512, "pending": 0 },
    "trader_bar": { "capacity": 256, "pending": 1 },
    "trader_prediction": { "capacity": 256, "pending": 0 }
  },
  "uptime_ms": 15380000,
  "pipeline": "StreamManager",
  "models": [
    {
      "model_id": "abc123",
      "status": "active",
      "sample_count": 1234,
      "mae": 0.0123,
      "last_update_ts": 1702200000000,
      "stale": false
    }
  ],
  "active_model_id": "abc123"
}
```

**Notes:**
- `streams[].stale` is computed server-side
- If StreamManager not initialized: `{ "pipeline": "None", "error": "StreamManager not initialized", "models": [], "active_model_id": null }`

### /usage WebSocket (usage_stream.cpp)

**Message type: `usage_update`**
```json
{
  "type": "usage_update",
  "cpu_percent": 45.5,
  "ram_percent": 62.3,
  "ram_used_mb": 8192,
  "ram_total_mb": 16384,
  "gpu_percent": 30,           // optional, only if GPU detected
  "gpu_mem_used_mb": 2048,     // optional
  "gpu_mem_total_mb": 8192,    // optional
  "timestamp": 1702200000000,
  "message_rates": {           // optional, only if available
    "total_per_sec": 10000,
    "trades_per_sec": 5000,
    "orderbooks_per_sec": 5000
  }
}
```

**Message type: `system_info` (sent on connection)**
```json
{
  "type": "system_info",
  "cpu_count": 8,
  "cpu_model": "Intel Core i7-9700K",
  "ram_total_mb": 16384,
  "gpu_count": 1,
  "hostname": "trading-server",
  "timestamp": 1702200000000,
  "gpus": [
    { "index": 0, "name": "NVIDIA RTX 3080", "memory_mb": 10240 }
  ]
}
```

**Notes:**
- Broadcast-only endpoint (no client messages expected)
- GPU fields only present if GPU detected (gpu_percent >= 0)
- message_rates only present if UsageStream::updateMessageRates() called

---

## What CAN Be Implemented

### Phase 1: Live Overview Page (New)

**Components that have data:**

#### 1.1 System Health Cards
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Uptime    │ │   Streams   │ │   Models    │
│   4h 23m    │ │   2 active  │ │   3 live    │
└─────────────┘ └─────────────┘ └─────────────┘
```

**Data Source:** `GET /api/live/health`
```json
{
  "uptime_ms": 15380000,
  "streams": [...],
  "models": [...],
  "queues": {...}
}
```

#### 1.2 Queue Depths (from health)
| Queue | Capacity | Pending |
|-------|----------|---------|
| indicator_bar | 1024 | 3 |
| inference_indicator | 512 | 0 |
| trader_bar | 256 | 1 |
| trader_prediction | 256 | 0 |

**Data Source:** `GET /api/live/health` → `queues`

#### 1.3 Resource Gauges (Real-time)
CPU / RAM / GPU circular progress bars.

**Data Source:** `/usage` WebSocket
```json
{
  "type": "usage_update",
  "cpu_percent": 45.5,
  "ram_percent": 62.3,
  "ram_used_mb": 8192,
  "ram_total_mb": 16384,
  "gpu_percent": 30,
  "gpu_mem_used_mb": 2048,
  "gpu_mem_total_mb": 8192
}
```

#### 1.4 Stream Status Table
| Stream ID | Last Bar | Status |
|-----------|----------|--------|
| btcusdt_1h | 14:00 | active |

**Data Source:** `GET /api/live/health` → `streams[]`
- Note: Streams array structure may be minimal (check actual response)

#### 1.5 Message Rates (Real-time)
- Trades/sec
- Orderbooks/sec
- Total messages/sec

**Data Source:** `/ws/status` → `stats.rates` OR `/usage` → `message_rates`

#### 1.6 Quick Actions
- "Deactivate All" button → loops `POST /api/live/models/{id}/deactivate`
- Links to LiveModel page

**Files to create:**
- `src/pages/LiveOverview.tsx`
- `src/hooks/useHealthData.ts` - wraps /api/live/health
- `src/hooks/useUsageStream.ts` - wraps /usage WS
- `src/components/HealthCard.tsx`
- `src/components/QueueDepthsTable.tsx`
- `src/components/ResourceGauges.tsx`

---

### Phase 2: Models Page Enhancements

**Upgrades to existing `LiveModel.tsx`:**

#### 2.1 Model Comparison View (New Tab)
Side-by-side comparison of 2 selected models:

| Metric | Model A | Model B |
|--------|---------|---------|
| MSE | 0.0234 | 0.0256 |
| MAE | 0.0123 | 0.0145 |
| R² | 0.87 | 0.82 |
| Dir Accuracy | 68.5% | 65.2% |
| Samples | 1,234 | 1,100 |

**Data Source:** `GET /api/live/models/{id}/metrics` for each selected model

#### 2.2 Prediction Distribution Histogram
Histogram showing distribution of last N predictions for selected model.

**Data Source:** `GET /api/live/predictions?model_id={id}&limit=256`

**Implementation:**
```typescript
// Add to LiveModel.tsx
const [compareMode, setCompareMode] = useState(false);
const [selectedModels, setSelectedModels] = useState<[string, string] | null>(null);
```

**Files to modify:**
- `src/pages/LiveModel.tsx` - add comparison tab
- `src/components/ModelComparisonView.tsx` (NEW)
- `src/components/PredictionHistogram.tsx` (NEW)

**Columns to REMOVE from plan:**
- ~~PnL~~ - No endpoint exists

---

### Phase 3: Execution Health Page (New)

**Components with verified data:**

#### 3.1 Thread Health Table (from /ws/status)
| Thread | State | Processed | Errors | Avg Latency |
|--------|-------|-----------|--------|-------------|
| ... | ... | ... | ... | ... |

**Data Source:** `/ws/status` → `stats.threads[]`

#### 3.2 Message Rate Chart (time series)
Line chart of message rates over last N minutes.

**Data Source:** `/ws/status` accumulated in frontend

#### 3.3 Recent Trades Table
| Exchange | Symbol | Side | Price | Volume | Time |
|----------|--------|------|-------|--------|------|
| ... | ... | ... | ... | ... | ... |

**Data Source:** `/ws/status` → `trades[]`

**Files to create:**
- `src/pages/ExecutionHealth.tsx`
- `src/hooks/useStatusStream.ts`
- `src/components/ThreadHealthTable.tsx`
- `src/components/MessageRateChart.tsx`
- `src/components/RecentTradesTable.tsx`

---

### Phase 4: Market Data Page (Upgrade Indicators)

**Rename and enhance existing `Indicators.tsx`:**

#### 4.1 Feature Registry
| Feature Hash | Column Count | Stream ID |
|--------------|--------------|-----------|
| a3f2b1... | 45 | btcusdt_1h |

**Data Source:** `GET /api/live/available-features`

#### 4.2 Data Export Links
- Download OHLCV: `GET /api/live/export/ohlcv?stream_id={id}&limit=1000`
- Download Indicators: `GET /api/live/export/indicators?stream_id={id}&limit=1000`

**Files to modify:**
- `src/pages/Indicators.tsx` → rename to `MarketData.tsx`
- Add export download buttons

---

## What CANNOT Be Implemented

| Feature | Reason |
|---------|--------|
| **Orders page with model attribution** | `account/order-history` is separate from live trading; no clOrdId/model linkage exposed |
| **Positions page** | No positions API exists |
| **Risk/Exposure page** | No risk API exists |
| **PnL column in models** | No PnL endpoint exists |
| **Audit/Logs panel** | No logs API exists |
| **Per-stream staleness with exchange** | Health endpoint streams[] may not have detailed staleness per exchange |

---

## Route Structure (Corrected)

Only routes with actual pages:

```typescript
// App.tsx - CORRECTED routes
<Route path="/" element={<TradingLayout />}>
  <Route index element={<LiveOverview />} />         // NEW
  <Route path="models" element={<LiveModel />} />    // EXISTS (upgraded)
  <Route path="health" element={<ExecutionHealth />} /> // NEW
  <Route path="market-data" element={<MarketData />} /> // RENAMED from Indicators
</Route>
```

**Removed dead routes:**
- ~~`/config`~~ - No page exists
- ~~`/analytics`~~ - No page exists
- ~~`/orders`~~ - No trading-aware order API
- ~~`/positions`~~ - No positions API
- ~~`/risk`~~ - No risk API

---

## Navigation (Corrected)

```typescript
// TradingLayout.tsx sidebar - ONLY pages that exist
const navItems = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/models', label: 'Models', icon: Brain },
  { path: '/health', label: 'Health', icon: Activity },
  { path: '/market-data', label: 'Market Data', icon: BarChart3 },
];
```

---

## Implementation Order

| Phase | Effort | Deliverable |
|-------|--------|-------------|
| **1** | 2-3 days | Live Overview: health cards, queue depths, resource gauges, stream table |
| **2** | 1-2 days | Models: comparison view, prediction histogram |
| **3** | 2-3 days | Execution Health: thread table, message rates, recent trades |
| **4** | 1 day | Market Data: feature registry, export links |

**Total: 6-9 days**

---

## Files Summary

### New Files
```
src/pages/
  LiveOverview.tsx
  ExecutionHealth.tsx

src/hooks/
  useHealthData.ts      // GET /api/live/health
  useUsageStream.ts     // /usage WebSocket
  useStatusStream.ts    // /ws/status WebSocket

src/components/
  HealthCard.tsx
  QueueDepthsTable.tsx
  ResourceGauges.tsx
  ModelComparisonView.tsx
  PredictionHistogram.tsx
  ThreadHealthTable.tsx
  MessageRateChart.tsx
  RecentTradesTable.tsx
```

### Modified Files
```
src/pages/
  LiveModel.tsx         // Add comparison tab
  Indicators.tsx        // Rename to MarketData.tsx, add exports

src/App.tsx             // Update routes
src/components/TradingLayout.tsx  // Update nav
```

### Refactor Touchpoints for Indicators → MarketData Rename

When renaming `Indicators.tsx` to `MarketData.tsx`, update these files:

| File | Change Required |
|------|-----------------|
| `src/App.tsx:25` | Change `import Indicators from "./pages/Indicators"` → `import MarketData from "./pages/MarketData"` |
| `src/App.tsx:67` | Change `<Route path="/indicators" element={<Indicators />} />` → `<Route path="/market-data" element={<MarketData />} />` |
| `src/pages/Indicators.tsx` | Rename file to `MarketData.tsx` |
| `src/pages/Indicators.tsx:32` | Rename component `const Indicators = ()` → `const MarketData = ()` |
| `src/pages/Indicators.tsx` (end) | Change `export default Indicators` → `export default MarketData` |
| `src/components/TradingLayout.tsx` | Update nav item path from `/indicators` to `/market-data` |

**Note:** The following files use lowercase `indicators` (data/state) and do NOT need renaming:
- `src/hooks/useMarketDataStream.ts` - uses `indicators` as state variable for indicator data
- `src/lib/mockData.ts` - uses `'eth_indicators'` as dataset name

### Client Extensions
```typescript
// src/lib/kraken/client.ts additions
getHealth(): Promise<HealthResponse>

// src/lib/kraken/types.ts additions (matching verified schemas)

interface StreamHealth {
  stream_id: string;
  last_bar_ts: number;
  last_indicator_ts: number;
  ohlcv_buffer_size: number;
  indicator_buffer_size: number;
  feature_count: number;
  target_count: number;
  max_target_horizon: number;
  feature_hash: number;
  stale: boolean;
}

interface QueueHealth {
  capacity: number;
  pending: number;
}

interface ModelHealth {
  model_id: string;
  status: string;
  sample_count?: number;
  mae?: number;
  last_update_ts?: number;
  stale?: boolean;
}

interface HealthResponse {
  streams: StreamHealth[];
  queues: {
    indicator_bar: QueueHealth;
    inference_indicator: QueueHealth;
    trader_bar: QueueHealth;
    trader_prediction: QueueHealth;
  };
  uptime_ms: number;
  pipeline: string;
  models: ModelHealth[];
  active_model_id: string | null;
  error?: string;  // Present if StreamManager not initialized
}

// /usage WebSocket message types
interface UsageUpdate {
  type: 'usage_update';
  cpu_percent: number;
  ram_percent: number;
  ram_used_mb: number;
  ram_total_mb: number;
  gpu_percent?: number;       // Only if GPU detected
  gpu_mem_used_mb?: number;   // Only if GPU detected
  gpu_mem_total_mb?: number;  // Only if GPU detected
  timestamp: number;
  message_rates?: {           // Only if available
    total_per_sec: number;
    trades_per_sec: number;
    orderbooks_per_sec: number;
  };
}

interface SystemInfo {
  type: 'system_info';
  cpu_count: number;
  cpu_model: string;
  ram_total_mb: number;
  gpu_count: number;
  hostname: string;
  timestamp: number;
  gpus: Array<{
    index: number;
    name: string;
    memory_mb: number;
  }>;
}

type UsageMessage = UsageUpdate | SystemInfo;
```

---

## Backend Gaps for Future

These require backend implementation before dashboard can use them:

| Feature | Required Endpoint | Priority |
|---------|-------------------|----------|
| Orders with model attribution | `GET /api/live/orders` (trading-aware) | HIGH |
| Positions | `GET /api/live/positions` | HIGH |
| Force close | `POST /api/live/positions/{id}/close` | HIGH |
| Risk limits | `GET /api/live/risk/limits` | MEDIUM |
| Exposure | `GET /api/live/risk/exposure` | MEDIUM |
| Trading PnL | `GET /api/live/models/{id}/pnl` | MEDIUM |
| Logs | `GET /api/live/logs` | LOW |

See `controllers_proposal.md` for full API specifications.
