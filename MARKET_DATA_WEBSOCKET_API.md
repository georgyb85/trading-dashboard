# Market Data WebSocket API

## Overview

The `/ws/market-data` WebSocket endpoint provides real-time access to trading indicators, OHLCV data, ATR values, position status, and performance metrics. This is designed for the live trading pipeline that computes indicators for a single trading pair (BTC by default).

**Endpoint:** `ws://<host>:51187/ws/market-data`
**External (via Caddy):** `wss://<host>:6006/ws/market-data`

## Connection Flow

```
┌─────────┐                          ┌─────────┐
│ Client  │                          │ Server  │
└────┬────┘                          └────┬────┘
     │                                    │
     │  1. WebSocket Connect              │
     │ ─────────────────────────────────> │
     │                                    │
     │  2. Welcome Message (initial_data) │
     │ <───────────────────────────────── │
     │                                    │
     │  3. Subscribe to topics            │
     │ ─────────────────────────────────> │
     │                                    │
     │  4. Subscription confirmation      │
     │ <───────────────────────────────── │
     │                                    │
     │  5. (Optional) Request snapshots   │
     │ ─────────────────────────────────> │
     │                                    │
     │  6. Historical data (if requested) │
     │ <───────────────────────────────── │
     │                                    │
     │  7. Hourly updates (broadcast)     │
     │ <───────────────────────────────── │
     │                                    │
```

**Important:** Subscriptions are now **lightweight** - they only enable receiving future updates. Historical snapshot data is **not sent automatically** on subscribe. To receive historical data, send a separate `snapshot` request. This design allows fast reconnections without large data transfers.

## Message Types

All messages are JSON objects with a `type` field.

| Type | Direction | Description |
|------|-----------|-------------|
| `initial_data` | Server → Client | Welcome message or snapshot data |
| `subscribe` | Client → Server | Subscribe to topics (lightweight, no data sent) |
| `subscribed` | Server → Client | Subscription confirmation |
| `unsubscribe` | Client → Server | Unsubscribe from topics |
| `unsubscribed` | Server → Client | Unsubscription confirmation |
| `snapshot` | Client → Server | Request historical snapshot data |
| `snapshot_complete` | Server → Client | Snapshot data transfer complete |
| `update` | Server → Client | Real-time data update |
| `ping` | Client → Server | Heartbeat request |
| `pong` | Server → Client | Heartbeat response |
| `error` | Server → Client | Error message |

## Available Topics

| Topic | Description | Update Frequency |
|-------|-------------|------------------|
| `ohlcv` | Hourly OHLCV bars | Every hour |
| `indicators` | Computed indicator values (7 indicators) | Every hour |
| `atr` | ATR with stop-loss/take-profit levels | Every hour |
| `position` | Current trading position | On position change |
| `performance` | Trading performance metrics | On trade completion |
| `all` | Subscribe to all topics | - |

## Detailed Protocol

### 1. Welcome Message (on connect)

Immediately after connection, server sends:

```json
{
  "type": "initial_data",
  "clientId": "f937fb16-9584-4ca9-9040-666e95fd17a0",
  "timestamp": 1764569912737227801,
  "availableTopics": ["ohlcv", "indicators", "atr", "position", "performance", "all"],
  "tradingRules": {
    "positionSize": 1000.0,
    "exitStrengthPct": 0.8,
    "honorSignalReversal": true,
    "useSignalExit": true,
    "stopLoss": {
      "enabled": true,
      "useATR": true,
      "fixedPct": 3.0,
      "atrMultiplier": 2.0,
      "atrPeriod": 14,
      "cooldownBars": 3
    },
    "takeProfit": {
      "enabled": true,
      "useATR": true,
      "fixedPct": 3.0,
      "atrMultiplier": 3.0,
      "atrPeriod": 14
    },
    "timeExit": {
      "enabled": false,
      "maxHoldingBars": 10
    }
  }
}
```

### 2. Subscribe Request

Subscribing enables receiving real-time updates for topics. **No historical data is sent** on subscribe - this makes reconnections fast and lightweight.

```json
{
  "type": "subscribe",
  "topics": ["indicators", "ohlcv", "atr"]
}
```

Or subscribe to everything:

```json
{
  "type": "subscribe",
  "topics": ["all"]
}
```

### 3. Subscription Confirmation

```json
{
  "type": "subscribed",
  "topics": ["indicators", "ohlcv", "atr"]
}
```

### 4. Snapshot Request (Optional)

To receive historical data, explicitly request a snapshot. Only do this on initial connection, not on reconnects (your frontend should cache the data).

```json
{
  "type": "snapshot",
  "topics": ["indicators", "ohlcv", "atr"]
}
```

Or request all snapshots:

```json
{
  "type": "snapshot",
  "topics": ["all"]
}
```

Server responds with `initial_data` messages for each topic, followed by:

```json
{
  "type": "snapshot_complete",
  "topics": ["indicators", "ohlcv", "atr"]
}
```

### 5. Initial Data (per topic, only when snapshot requested)

Snapshot data is sent for each requested topic.

#### Indicators Initial Data

Contains last 1000 hourly indicator snapshots:

```json
{
  "type": "initial_data",
  "topic": "indicators",
  "timestamp": 1764569912737227801,
  "data": {
    "snapshots": [
      {
        "timestamp": 1764568800000,
        "values": [45.23, 0.15, 0.023, -0.0012, 0.78, 0.034, 0.56],
        "valid": true
      },
      {
        "timestamp": 1764565200000,
        "values": [44.89, 0.18, 0.025, -0.0008, 0.75, 0.031, 0.54],
        "valid": true
      }
      // ... up to 1000 snapshots
    ],
    "latest": {
      "timestamp": 1764568800000,
      "values": [45.23, 0.15, 0.023, -0.0012, 0.78, 0.034, 0.56],
      "valid": true
    }
  }
}
```

**Indicator Values Order** (matches var.txt):
| Index | Name | Description |
|-------|------|-------------|
| 0 | ADX_L | ADX with period 120 |
| 1 | AROON_DIFF_S | Aroon Difference with period 14 |
| 2 | BOL_WIDTH_M | Bollinger Width with period 60 |
| 3 | CMMA_S | Close Minus Moving Average (10, 250) |
| 4 | DTR_RSI_M | Detrended RSI (5, 20, 100) |
| 5 | PCO_10_20 | Abs Price Change Oscillator (10, 20) |
| 6 | PV_FIT_M | Price Volume Fit with period 60 |

#### OHLCV Initial Data

Contains last 1000 hourly bars:

```json
{
  "type": "initial_data",
  "topic": "ohlcv",
  "timestamp": 1764569912737227801,
  "data": {
    "bars": [
      {
        "timestamp": 1764568800000,
        "open": 85800.0,
        "high": 86200.0,
        "low": 85600.0,
        "close": 86100.0,
        "volume": 1234.56
      }
      // ... up to 1000 bars
    ],
    "currentHour": {
      "timestamp": 1764572400000,
      "open": 86100.0,
      "high": 86150.0,
      "low": 86050.0,
      "close": 86120.0,
      "volume": 45.67
    }
  }
}
```

#### ATR Initial Data

```json
{
  "type": "initial_data",
  "topic": "atr",
  "timestamp": 1764569912737227801,
  "data": {
    "current": {
      "timestamp": 1764568800000,
      "value": 597.77,
      "stopLossLevel": 1195.54,
      "takeProfitLevel": 1793.31
    }
  }
}
```

#### Position Initial Data

```json
{
  "type": "initial_data",
  "topic": "position",
  "timestamp": 1764569912737227801,
  "data": {
    "hasPosition": true,
    "side": "long",
    "entryPrice": 85500.0,
    "entryTimestamp": 1764561600000,
    "size": 1000.0,
    "unrealizedPnl": 620.0,
    "stopLoss": 84304.46,
    "takeProfit": 87293.31
  }
}
```

Or when no position:

```json
{
  "type": "initial_data",
  "topic": "position",
  "timestamp": 1764569912737227801,
  "data": {
    "hasPosition": false
  }
}
```

#### Performance Initial Data

```json
{
  "type": "initial_data",
  "topic": "performance",
  "timestamp": 1764569912737227801,
  "data": {
    "totalTrades": 42,
    "winningTrades": 28,
    "losingTrades": 14,
    "winRate": 0.667,
    "totalPnl": 12450.50,
    "averagePnl": 296.44,
    "maxDrawdown": -2150.00,
    "sharpeRatio": 1.85
  }
}
```

### 5. Hourly Updates

Sent every hour when new bar closes:

#### Indicators Update

```json
{
  "type": "update",
  "topic": "indicators",
  "timestamp": 1764572400000,
  "data": {
    "timestamp": 1764572400000,
    "values": [46.12, 0.22, 0.019, 0.0015, 0.82, 0.028, 0.61],
    "valid": true
  }
}
```

#### OHLCV Update

```json
{
  "type": "update",
  "topic": "ohlcv",
  "timestamp": 1764572400000,
  "data": {
    "timestamp": 1764568800000,
    "open": 86100.0,
    "high": 86450.0,
    "low": 85950.0,
    "close": 86300.0,
    "volume": 567.89
  }
}
```

#### ATR Update

```json
{
  "type": "update",
  "topic": "atr",
  "timestamp": 1764572400000,
  "data": {
    "timestamp": 1764572400000,
    "value": 601.23,
    "stopLossLevel": 1202.46,
    "takeProfitLevel": 1803.69
  }
}
```

### 6. Unsubscribe

```json
{
  "type": "unsubscribe",
  "topics": ["performance"]
}
```

Response:

```json
{
  "type": "unsubscribed",
  "topics": ["performance"],
  "timestamp": 1764569912737227801
}
```

### 7. Heartbeat

Client sends:
```json
{
  "type": "ping"
}
```

Server responds:
```json
{
  "type": "pong",
  "timestamp": 1764569912737227801
}
```

### 8. Error Messages

```json
{
  "type": "error",
  "message": "Missing or invalid 'topics' field",
  "timestamp": 1764569912737227801
}
```

## JavaScript Client Example

```javascript
class MarketDataClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.clientId = null;
    this.hasSnapshot = false;  // Track if we've received snapshot data
    this.reconnectDelay = 1000;
    this.pingInterval = null;
    this.callbacks = {
      onConnect: null,
      onIndicators: null,
      onOhlcv: null,
      onAtr: null,
      onPosition: null,
      onPerformance: null,
      onSnapshotComplete: null,
      onError: null
    };
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected to market data stream');
      this.reconnectDelay = 1000; // Reset on successful connect

      // Start heartbeat every 15 seconds (required for vast.ai proxy)
      this.pingInterval = setInterval(() => this.ping(), 15000);
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.handleMessage(msg);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
    };

    this.ws.onclose = () => {
      console.log('Disconnected from market data stream');
      clearInterval(this.pingInterval);

      // Auto-reconnect with exponential backoff
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    };
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'initial_data':
        if (msg.clientId) {
          // Welcome message
          this.clientId = msg.clientId;
          console.log('Received client ID:', this.clientId);
          if (this.callbacks.onConnect) {
            this.callbacks.onConnect(msg);
          }
        } else if (msg.topic) {
          // Snapshot data for a topic
          this.handleTopicData(msg.topic, msg.data, true);
        }
        break;

      case 'update':
        this.handleTopicData(msg.topic, msg.data, false);
        break;

      case 'subscribed':
        console.log('Subscribed to:', msg.topics);
        break;

      case 'snapshot_complete':
        console.log('Snapshot complete for:', msg.topics);
        this.hasSnapshot = true;
        if (this.callbacks.onSnapshotComplete) {
          this.callbacks.onSnapshotComplete(msg.topics);
        }
        break;

      case 'error':
        console.error('Server error:', msg.message);
        if (this.callbacks.onError) {
          this.callbacks.onError(msg.message);
        }
        break;

      case 'pong':
        // Heartbeat acknowledged
        break;
    }
  }

  handleTopicData(topic, data, isSnapshot) {
    const callbackMap = {
      'indicators': this.callbacks.onIndicators,
      'ohlcv': this.callbacks.onOhlcv,
      'atr': this.callbacks.onAtr,
      'position': this.callbacks.onPosition,
      'performance': this.callbacks.onPerformance
    };

    const callback = callbackMap[topic];
    if (callback) {
      callback(data, isSnapshot);
    }
  }

  // Subscribe to topics (lightweight - no data sent)
  subscribe(topics) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        topics: topics
      }));
    }
  }

  // Request historical snapshot data (only call on initial connection)
  requestSnapshot(topics) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'snapshot',
        topics: topics
      }));
    }
  }

  subscribeAll() {
    this.subscribe(['all']);
  }

  unsubscribe(topics) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        topics: topics
      }));
    }
  }

  ping() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }

  disconnect() {
    clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Usage example
const client = new MarketDataClient('wss://your-host:6006/ws/market-data');

// Set up callbacks before connecting
client.callbacks.onConnect = (welcomeMsg) => {
  console.log('Connected! Trading rules:', welcomeMsg.tradingRules);

  // Subscribe to topics (lightweight, enables updates)
  client.subscribe(['indicators', 'ohlcv', 'atr']);

  // Request snapshot only on first connection (not reconnects)
  if (!client.hasSnapshot) {
    client.requestSnapshot(['indicators', 'ohlcv', 'atr']);
  }
};

client.callbacks.onIndicators = (data, isSnapshot) => {
  if (isSnapshot) {
    console.log(`Received ${data.snapshots.length} historical indicator snapshots`);
    // Process historical data for charting
    data.snapshots.forEach(snapshot => {
      // snapshot.timestamp, snapshot.values[0..6], snapshot.valid
    });
  } else {
    console.log('New indicator update:', data.values);
    // Update chart with new data point
  }
};

client.callbacks.onOhlcv = (data, isInitial) => {
  if (isInitial) {
    console.log(`Received ${data.bars.length} historical OHLCV bars`);
    console.log('Current hour:', data.currentHour);
  } else {
    console.log('New OHLCV bar:', data);
  }
};

client.callbacks.onAtr = (data, isInitial) => {
  console.log('ATR:', data.value || data.current?.value);
  console.log('Stop Loss Level:', data.stopLossLevel || data.current?.stopLossLevel);
  console.log('Take Profit Level:', data.takeProfitLevel || data.current?.takeProfitLevel);
};

// Connect
client.connect();

// Set up heartbeat every 30 seconds
setInterval(() => client.ping(), 30000);
```

## React Hook Example

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';

interface IndicatorSnapshot {
  timestamp: number;
  values: number[];
  valid: boolean;
}

interface OhlcvBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface AtrData {
  timestamp: number;
  value: number;
  stopLossLevel: number;
  takeProfitLevel: number;
}

interface TradingRules {
  positionSize: number;
  stopLoss: { enabled: boolean; atrMultiplier: number };
  takeProfit: { enabled: boolean; atrMultiplier: number };
}

export function useMarketData(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [tradingRules, setTradingRules] = useState<TradingRules | null>(null);
  const [indicators, setIndicators] = useState<IndicatorSnapshot[]>([]);
  const [ohlcv, setOhlcv] = useState<OhlcvBar[]>([]);
  const [atr, setAtr] = useState<AtrData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'initial_data') {
        if (msg.clientId) {
          setTradingRules(msg.tradingRules);
          // Auto-subscribe to all topics
          ws.send(JSON.stringify({ type: 'subscribe', topics: ['all'] }));
        } else if (msg.topic === 'indicators') {
          setIndicators(msg.data.snapshots || []);
        } else if (msg.topic === 'ohlcv') {
          setOhlcv(msg.data.bars || []);
        } else if (msg.topic === 'atr') {
          setAtr(msg.data.current || msg.data);
        }
      } else if (msg.type === 'update') {
        if (msg.topic === 'indicators') {
          setIndicators(prev => [...prev.slice(-999), msg.data]);
        } else if (msg.topic === 'ohlcv') {
          setOhlcv(prev => [...prev.slice(-999), msg.data]);
        } else if (msg.topic === 'atr') {
          setAtr(msg.data);
        }
      } else if (msg.type === 'error') {
        setError(msg.message);
      }
    };

    ws.onerror = () => setError('WebSocket connection error');
    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 5 seconds
      setTimeout(connect, 5000);
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  // Heartbeat
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      wsRef.current?.send(JSON.stringify({ type: 'ping' }));
    }, 30000);
    return () => clearInterval(interval);
  }, [connected]);

  return {
    connected,
    tradingRules,
    indicators,
    ohlcv,
    atr,
    error,
    latestIndicator: indicators[indicators.length - 1] || null,
    latestOhlcv: ohlcv[ohlcv.length - 1] || null
  };
}

// Usage in component
function TradingDashboard() {
  const {
    connected,
    tradingRules,
    indicators,
    ohlcv,
    atr,
    latestIndicator
  } = useMarketData('wss://your-host:6006/ws/market-data');

  if (!connected) {
    return <div>Connecting...</div>;
  }

  return (
    <div>
      <h2>Trading Dashboard</h2>
      <p>Position Size: {tradingRules?.positionSize}</p>
      <p>ATR: {atr?.value?.toFixed(2)}</p>
      <p>Stop Loss Level: {atr?.stopLossLevel?.toFixed(2)}</p>
      <p>Historical Bars: {ohlcv.length}</p>
      <p>Historical Indicators: {indicators.length}</p>

      {latestIndicator && (
        <div>
          <h3>Latest Indicators</h3>
          <ul>
            <li>ADX_L: {latestIndicator.values[0]?.toFixed(4)}</li>
            <li>AROON_DIFF_S: {latestIndicator.values[1]?.toFixed(4)}</li>
            <li>BOL_WIDTH_M: {latestIndicator.values[2]?.toFixed(4)}</li>
            <li>CMMA_S: {latestIndicator.values[3]?.toFixed(4)}</li>
            <li>DTR_RSI_M: {latestIndicator.values[4]?.toFixed(4)}</li>
            <li>PCO_10_20: {latestIndicator.values[5]?.toFixed(4)}</li>
            <li>PV_FIT_M: {latestIndicator.values[6]?.toFixed(4)}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
```

## Important Notes

1. **Single Symbol System**: This API serves data for a single trading pair (BTC/USD by default). All indicators and OHLCV data are for this symbol only.

2. **Timestamps**: All timestamps are in milliseconds since Unix epoch.

3. **Indicator Order**: The `values` array in indicator snapshots follows the exact order defined in `var.txt`. The order is fixed and must be mapped by index.

4. **Hourly Updates**: Updates are broadcast at the top of each hour when a new bar closes. The exact timing depends on exchange data availability.

5. **Lightweight Subscriptions**: Subscribe messages only enable receiving updates - no data is sent. Request snapshots explicitly with the `snapshot` command only on initial connection.

6. **Reconnection Strategy**:
   - The connection may drop due to proxy timeouts (~30-40s on vast.ai)
   - Always implement auto-reconnect with exponential backoff
   - Send `ping` messages every 15 seconds to keep connection alive
   - On reconnect: re-subscribe to topics but DO NOT request snapshot again (use cached data)
   - Only request fresh snapshot if your cached data is stale (e.g., app was closed for hours)

7. **Heartbeat Required**: Send `{"type": "ping"}` every 15 seconds. The server responds with `{"type": "pong"}`. This is essential to prevent proxy timeout disconnections.

8. **Historical Data**: Snapshot data contains up to 1000 historical snapshots. For longer history, use the REST API endpoints.

9. **Authentication**: When accessing via Caddy (port 6006), authentication may be required depending on configuration.
