# Ring Buffer Metrics - Backend Issue

## Problem

The frontend is ready to display ring buffer metrics, but **the backend is NOT sending them** in the expected format.

## Current Backend Response

WebSocket endpoint: `wss://agenticresearch.info/system-status`

**What the backend sends:**
```json
{
  "type": "update",
  "topic": "status",
  "stats": {
    "timestamp": "2025-11-10T17:30:00.000Z",
    "counts": {
      "tradeMessages": 2029,
      "orderbookMessages": 462139
    },
    "lastPrices": [
      {"symbol": "BTCUSDT", "price": 105340.5},
      {"symbol": "ETHUSDT", "price": 3525.66}
    ],
    "rates": {
      "totalPerSec": 340,
      "tradesPerSec": 0,
      "orderbooksPerSec": 340
    },
    "threads": [
      {
        "name": "DBConsumer",
        "state": "running",
        "processed": 4536,
        "errors": 0,
        "avgLatencyUs": 283484
      }
    ],
    "text": "...\nRing Buffer Statistics:\n  dbBuffer: unconsumed=88 utilization=0.9% max_12h=299\n  logBuffer: unconsumed=0 utilization=0.0% max_12h=3\n..."
  },
  "trades": [],
  "ohlcv": [...]
}
```

**Notice:** Ring buffer data is in the `text` field as a string, NOT as structured data!

## What the Frontend Expects

According to the API documentation you provided, the backend should send:

```json
{
  "type": "update",
  "topic": "status",
  "stats": {
    "ringBuffers": {
      "dbBuffer": {
        "unconsumed": 88,
        "utilization": 0.9,
        "max12h": 299
      },
      "logBuffer": {
        "unconsumed": 0,
        "utilization": 0.0,
        "max12h": 3
      }
    }
  }
}
```

## Frontend Code is Ready

The frontend already has:
- TypeScript types for `RingBufferStats`
- State management for ring buffers
- WebSocket handler to receive and update ring buffer data
- UI component to display ring buffers with progress bars and color coding
- Checks for alternative field names: `ringBuffers`, `ring_buffers`, `ringbuffers`

**File:** `src/components/SystemHealthDashboard.tsx`

```typescript
// State
const [ringBuffers, setRingBuffers] = useState<Record<string, RingBufferStats>>({});

// WebSocket handler
if (data.stats.ringBuffers) {
  setRingBuffers(data.stats.ringBuffers);
}

// UI Component (lines 833-869)
{Object.keys(ringBuffers).length > 0 && (
  <Card className="trading-card">
    <CardHeader>
      <CardTitle>Ring Buffer Status</CardTitle>
    </CardHeader>
    <CardContent>
      {Object.entries(ringBuffers).map(([name, stats]) => (
        <div key={name}>
          <span>{name}</span>
          <Progress value={stats.utilization} />
          <span>Unconsumed: {stats.unconsumed}</span>
          <span>Max 12h: {stats.max12h}</span>
        </div>
      ))}
    </CardContent>
  </Card>
)}
```

## Backend Fix Required

**Location:** Backend code that handles `/status` WebSocket endpoint

**Current behavior:** Ring buffer data is only included in the `text` field as formatted string

**Required change:** Add `ringBuffers` field to the `stats` object

### Example Fix (C++/Drogon)

```cpp
// In your status update handler
Json::Value stats;

// ... existing code for counts, rates, threads ...

// Add ring buffers
Json::Value ringBuffers(Json::objectValue);

// For each ring buffer
Json::Value dbBuffer;
dbBuffer["unconsumed"] = dbBufferStats.unconsumed;
dbBuffer["utilization"] = dbBufferStats.utilization;
dbBuffer["max12h"] = dbBufferStats.max12h;
ringBuffers["dbBuffer"] = dbBuffer;

Json::Value logBuffer;
logBuffer["unconsumed"] = logBufferStats.unconsumed;
logBuffer["utilization"] = logBufferStats.utilization;
logBuffer["max12h"] = logBufferStats.max12h;
ringBuffers["logBuffer"] = logBuffer;

// Add to stats object
stats["ringBuffers"] = ringBuffers;
```

## Verification

After backend fix, the console should show:

```
[SystemHealth] Status WebSocket connected
[SystemHealth] Stats object keys: ['timestamp', 'counts', 'lastPrices', 'rates', 'threads', 'ringBuffers']
```

And the Ring Buffer Status card will appear on the dashboard with live metrics.

## Alternative Field Names Checked

The frontend already checks for:
- `ringBuffers` (camelCase - preferred)
- `ring_buffers` (snake_case)
- `ringbuffers` (lowercase)

So if you use any of these field names, it will work.

## Summary

**Frontend:** ✅ Ready and waiting for data
**Backend:** ❌ Not sending `ringBuffers` field in stats object

**Action Required:** Backend developer needs to add structured ring buffer data to the stats response.

---

**Last Updated:** 2025-11-10
**Reporter:** Frontend Developer
**Status:** Blocked on Backend
