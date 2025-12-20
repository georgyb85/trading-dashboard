# System Health Dashboard Update Plan

## Current vs New API

### Current Implementation
- WebSocket: `/gpu-ws` endpoint
- Data: CPU/RAM/GPU metrics, message rates
- Display: GPU instances, basic thread status (hardcoded)

### New Extended API
- WebSocket: `/status` and `/usage` endpoints
- Data: Prices, ring buffers, thread details, enhanced metrics
- Display: Ring buffer stats, real thread monitoring, price tickers

---

## New Data Structures Needed

### Status Stream Response
```typescript
interface StatusUpdate {
  topic: "status";
  type: "update";
  stats: {
    timestamp: string;
    lastPrices: Array<{symbol: string; price: number}>;
    counts: {
      tradeMessages: number;
      orderbookMessages: number;
    };
    rates: {
      totalPerSec: number;
      tradesPerSec: number;
      orderbooksPerSec: number;
    };
    threads: Array<{
      name: string;
      state: "running" | "starting" | "stopped" | "error";
      processed: number;
      errors: number;
      avgLatencyUs: number;
    }>;
    ringBuffers: {
      [key: string]: {
        unconsumed: number;
        utilization: number;
        max12h: number;
      };
    };
  };
  trades: any[];
  ohlcv: any[];
}
```

### Usage Stream Response
```typescript
interface UsageUpdate {
  type: "usage_update";
  cpu: number;
  ram: number;
  gpu: number;
  messagesPerSec: number;
  tradesPerSec: number;
  orderbooksPerSec: number;
}
```

---

## UI Components to Add/Update

### 1. Price Ticker Bar (New)
- Display last prices for monitored symbols
- Update in real-time from `/status` WebSocket
- Show symbol + price + trend indicator

### 2. Ring Buffer Monitor (New)
- Card showing all ring buffers
- Display: Buffer name, unconsumed, utilization %, max 12h
- Color coding: <50% green, <80% yellow, >80% red
- Progress bars for utilization

### 3. Thread Monitor (Update)
- Replace hardcoded threads with real data from `/status`
- Display: Thread name, state, processed count, errors, avg latency
- State badges: running=green, error=red, stopped=gray
- Latency display in ms

### 4. Message Rate Monitor (Update)
- Keep existing Kraken Exchange card
- Use data from `/usage` stream
- Add breakdown: total/trades/orderbooks

### 5. System Resource Monitor (Keep/Update)
- Keep existing CPU/RAM/GPU charts
- Use data from `/usage` stream
- Update to match new field names

---

## WebSocket Connection Changes

### Remove
- `/gpu-ws` custom endpoint

### Add
```typescript
// Status WebSocket
const statusWs = new WebSocket('ws://localhost:51187/status');
statusWs.onmessage = (event) => {
  const data: StatusUpdate = JSON.parse(event.data);
  // Update prices, threads, ring buffers, rates
};

// Usage WebSocket
const usageWs = new WebSocket('ws://localhost:51187/usage');
usageWs.onmessage = (event) => {
  const data: UsageUpdate = JSON.parse(event.data);
  // Update CPU/RAM/GPU metrics
};
```

### REST API Polling (Optional)
```typescript
// If WebSocket not available, fallback to polling
fetch('/debug/ringbuffers')
fetch('/debug/threads')
```

---

## Layout Structure

```
┌─────────────────────────────────────────────────┐
│ System Health Dashboard                          │
├─────────────────────────────────────────────────┤
│ [BTC: $105K] [ETH: $3.5K] ... (Price Ticker)   │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐             │
│  │  Message    │  │  System      │             │
│  │  Rates      │  │  Resources   │             │
│  │ Total: 500/s│  │ CPU: 15.5%   │             │
│  │ Trades: 10/s│  │ RAM: 25.3%   │             │
│  │ Books: 490/s│  │ GPU: 0.0%    │             │
│  └─────────────┘  └──────────────┘             │
├─────────────────────────────────────────────────┤
│  Ring Buffer Status                             │
│  ┌────────────────────────────────────────────┐│
│  │ dbBuffer      │■■■░░░ 1.5%   │ Max: 5000  ││
│  │ logBuffer     │■░░░░░ 0.1%   │ Max: 100   ││
│  │ signalBuffer  │░░░░░░ 0.0%   │ Max: 0     ││
│  └────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│  Thread Health Status                           │
│  ┌────────────────────────────────────────────┐│
│  │ DBConsumer    │ Running │ 1000 │ 0   │250ms││
│  │ LogWriter     │ Running │ 500  │ 0   │100ms││
│  │ SignalHandler │ Running │ 0    │ 0   │0ms  ││
│  └────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

---

## Implementation Steps

1. ✅ **Document current state** - Analyze existing code
2. ⏳ **Add new TypeScript types** - StatusUpdate, UsageUpdate, etc.
3. ⏳ **Update WebSocket connections** - Switch to /status and /usage
4. ⏳ **Add Price Ticker component** - New card at top
5. ⏳ **Add Ring Buffer Monitor** - New card with progress bars
6. ⏳ **Update Thread Monitor** - Use real data instead of mock
7. ⏳ **Update Message Rate display** - Match new format
8. ⏳ **Keep System Resource charts** - Update field names
9. ⏳ **Test with live data** - Connect to running system
10. ⏳ **Add error handling** - WebSocket reconnect, fallback to REST

---

## Configuration

Default WebSocket URLs:
```typescript
const STATUS_WS_URL = 'ws://localhost:51187/status';
const USAGE_WS_URL = 'ws://localhost:51187/usage';

// For proxied connections through frontend:
const STATUS_WS_URL = `ws://${window.location.host}/traders/<id>/ws/status`;
const USAGE_WS_URL = `ws://${window.location.host}/traders/<id>/ws/usage`;
```

---

## Color Coding Standards

### Ring Buffer Utilization
- **< 50%**: Green (status-good)
- **50-80%**: Yellow (status-warning)
- **> 80%**: Red (status-error)

### Thread States
- **running**: Green badge
- **starting**: Blue badge
- **stopped**: Gray badge
- **error**: Red badge

### Latency
- **< 100ms**: Green text
- **100-500ms**: Yellow text
- **> 500ms**: Red text

---

## Next Steps

1. Create updated SystemHealthDashboard.tsx
2. Add proxy configuration for WebSocket endpoints in nginx
3. Test with live backend
4. Document new features for users

