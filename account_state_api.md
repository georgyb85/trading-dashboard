# Account State API

The Account State service exposes both HTTP and WebSocket interfaces for inspecting balances, positions, and orders tracked by the private Kraken WebSocket integration.

## Namespaces & Conventions

- Base host: `http://<host>:33931` (same Drogon instance as other controllers).
- Asset symbols are uppercase (e.g. `BTC`, `USDT`).
- Monetary fields are decimal strings to preserve precision when serialised.
- Timestamps use Unix epoch in nanoseconds unless stated otherwise.

## HTTP Endpoints

### `GET /api/account/snapshot`

Returns the most recent account snapshot.

```json
{
  "version": 1287,
  "asOf": "2024-05-22T17:46:05.812Z",
  "balances": [
    {
      "asset": "BTC",
      "total": "0.53210000",
      "available": "0.42100000",
      "hold": "0.11110000",
      "source": "Trading",
      "lastUpdateNs": 1716409565812345678
    },
    {
      "asset": "USD",
      "total": "125432.75",
      "available": "104321.10",
      "hold": "21111.65",
      "source": "Funding",
      "lastUpdateNs": 1716409562799999999
    }
  ],
  "positions": [
    {
      "id": "PN12345",
      "symbol": "XBT/USDT",
      "side": "Long",
      "size": "0.25",
      "entryPrice": "61540.00",
      "markPrice": "61890.50",
      "pnl": "87.63",
      "leverage": "3",
      "lastUpdateNs": 1716409565801000123
    }
  ],
  "orders": [
    {
      "id": "OABC123",
      "clientId": "desk-1",
      "symbol": "XBT/USDT",
      "side": "Buy",
      "type": "Limit",
      "quantity": "0.1",
      "price": "61000.00",
      "filledQuantity": "0.05",
      "avgFillPrice": "60980.00",
      "status": "PartiallyFilled",
      "lastUpdateNs": 1716409565802200456,
      "executions": [
        {
          "id": "fill-1",
          "price": "60980.00",
          "quantity": "0.05",
          "fee": "0.0005",
          "timestampNs": 1716409565801000123
        }
      ]
    }
  ]
}
```

### `GET /api/account/orders/{orderId}`

Fetches a single order by Kraken order id or client id (client id prefixed with `client:`).

Response mirrors the `orders[]` entry above. Returns `404` if no order found.

### `GET /api/account/balances/{asset}`

Returns the latest balance entry for a specific asset. Useful for dashboards that only care about a subset of assets.

```json
{
  "asset": "ETH",
  "total": "8.12000000",
  "available": "5.00000000",
  "hold": "3.12000000",
  "source": "Trading",
  "lastUpdateNs": 1716409565808822111,
  "version": 1287
}
```

### `GET /api/account/order-history`

Returns the last 100 orders with their complete state transition history and fills. This endpoint uses a lock-free SeqLock-protected circular buffer for efficient access without mutexes.

**Response:**

```json
[
  {
    "orderId": "OGGCYT-ENILC-G6MQSV",
    "clientId": "desk-1",
    "symbol": "USDT/USD",
    "side": "SELL",
    "type": "LIMIT",
    "quantity": "5.00000000",
    "price": "1.00020000",
    "createdNs": 0,
    "created": null,
    "firstSeenNs": 1729083661382175000,
    "firstSeen": "2025-10-16T11:01:01.382Z",
    "lastUpdateNs": 1729083661382175000,
    "lastUpdate": "2025-10-16T11:01:01.382Z",
    "finalStatus": "FILLED",
    "stateTransitions": [
      {
        "status": "PENDING_NEW",
        "quantity": "5.00000000",
        "price": "1.00020000",
        "filledQuantity": "0.00000000",
        "avgFillPrice": "0.00000000",
        "timestampNs": 1729083661382175000,
        "timestamp": "2025-10-16T11:01:01.382Z",
        "latencyNs": 0,
        "latencyMs": "0.000"
      },
      {
        "status": "NEW",
        "quantity": "5.00000000",
        "price": "1.00020000",
        "filledQuantity": "0.00000000",
        "avgFillPrice": "0.00000000",
        "timestampNs": 1729083661382175000,
        "timestamp": "2025-10-16T11:01:01.382Z"
      },
      {
        "status": "FILLED",
        "quantity": "5.00000000",
        "price": "1.00020000",
        "filledQuantity": "5.00000000",
        "avgFillPrice": "1.00015000",
        "timestampNs": 1729083662500000000,
        "timestamp": "2025-10-16T11:01:02.500Z"
      }
    ],
    "fills": [
      {
        "fillId": "TRD123-A",
        "fillPrice": "1.00015000",
        "fillQuantity": "2.50000000",
        "fillFee": "0.00250000",
        "cumulativeFilled": "2.50000000",
        "timestampNs": 1729083662200000000,
        "timestamp": "2025-10-16T11:01:02.200Z"
      },
      {
        "fillId": "TRD123-B",
        "fillPrice": "1.00015000",
        "fillQuantity": "2.50000000",
        "fillFee": "0.00250000",
        "cumulativeFilled": "5.00000000",
        "timestampNs": 1729083662500000000,
        "timestamp": "2025-10-16T11:01:02.500Z"
      }
    ]
  }
]
```

**Notes:**
- `createdNs` is `0` for externally created orders (placed outside this system). Will be populated when orders are created internally.
- `latencyMs` shows time from order creation to each state transition (only when `createdNs` is set).
- History is kept in a circular buffer - oldest orders are evicted when the buffer is full (default: 100 orders).
- QuestDB-compatible schema: designed for future persistence to `order_state_log` and `order_fills` tables.

### `GET /api/account/order-history/{orderId}`

Returns the complete history for a single order by its order ID.

**Response:** Single order history object (same structure as array element above).

**Error:** Returns `404` if order history not found.

## WebSocket Interface

### Endpoint

`ws://<host>:33931/account`

### Connection Lifecycle

1. Client connects; server immediately responds with:
   - `snapshot` message containing the full state (`balances`, `positions`, `orders`, `version`).
   - Optional `heartbeat` every 5 seconds to detect stale connections.
2. Client may send optional subscription message to reduce traffic.

### Client → Server Messages

| Type | Description |
| ---- | ----------- |
| `{"type":"subscribe","topics":["balances","orders"],"filters":{"symbols":["XBT/USDT"]}}` | Limit updates to specific topics/symbols. Omit to receive all. |
| `{"type":"ping","id":"abc"}` | Keep-alive ping. Server replies with `pong`. |

### Server → Client Messages

All messages share envelope:

```json
{
  "topic": "balance" | "position" | "order" | "snapshot" | "heartbeat",
  "type": "update" | "delete" | "fill" | "state" | "final" | "pong",
  "version": 1288,
  "payload": { ... }
}
```

#### Snapshot

```json
{
  "topic": "snapshot",
  "type": "state",
  "version": 1287,
  "payload": {
    "asOf": "2024-05-22T17:46:05.812Z",
    "balances": [...],
    "positions": [...],
    "orders": [...]
  }
}
```

#### Balance Update

Emitted when Kraken reports new balance information.

```json
{
  "topic": "balance",
  "type": "update",
  "version": 1290,
  "payload": {
    "asset": "LTC",
    "total": "12.5",
    "available": "10.0",
    "hold": "2.5",
    "source": "Trading",
    "delta": {
      "total": "1.5",
      "available": "1.5"
    },
    "lastUpdateNs": 1716409568840000000
  }
}
```

#### Position Update / Close

```json
{
  "topic": "position",
  "type": "update",
  "version": 1291,
  "payload": {
    "id": "PN12345",
    "symbol": "XBT/USDT",
    "side": "Long",
    "size": "0.18",
    "entryPrice": "61540.00",
    "markPrice": "62001.00",
    "pnl": "83.12",
    "lastUpdateNs": 1716409569000000000
  }
}
```

Closed positions emit `type: "delete"` with the final payload and `closedReason`.

#### Order Lifecycle

- `type: "state"` for non-terminal order state transitions (`PENDING_NEW`, `NEW`, `PARTIALLY_FILLED`, etc.).
- `type: "fill"` for partial fills (includes incremental execution in `payload.fill`).
- `type: "final"` for terminal states (`FILLED`, `CANCELED`, `EXPIRED`, `REJECTED`) - indicates the order has been removed from active orders.

**Important**: When `type: "final"` is received, the frontend should:
1. Remove the order from the "open orders" list
2. Add it to the "filled/closed orders" history
3. The payload will contain `"isFinal": true` flag for additional clarity

Example partial fill:

```json
{
  "topic": "order",
  "type": "fill",
  "version": 1293,
  "payload": {
    "id": "OABC123",
    "status": "PartiallyFilled",
    "filledQuantity": "0.08",
    "avgFillPrice": "60990.25",
    "remainingQuantity": "0.02",
    "fill": {
      "id": "fill-2",
      "price": "61005.00",
      "quantity": "0.03",
      "fee": "0.0003",
      "timestampNs": 1716409569123456789
    },
    "lastUpdateNs": 1716409569123456789
  }
}
```

Example final order (filled):

```json
{
  "topic": "order",
  "type": "final",
  "version": 1294,
  "payload": {
    "id": "OABC123",
    "clientId": "desk-1",
    "symbol": "XBT/USDT",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": "0.10000000",
    "price": "61000.00000000",
    "filledQuantity": "0.10000000",
    "avgFillPrice": "60995.00000000",
    "status": "FILLED",
    "isFinal": true,
    "lastUpdateNs": 1716409570000000000,
    "lastUpdate": "2024-05-22T17:46:10.000Z"
  }
}
```

#### Heartbeat / Pong

```json
{"topic":"heartbeat","type":"ping","version":1290,"payload":{"ts":1716409570000000000}}
{"topic":"heartbeat","type":"pong","version":1290,"payload":{"ts":1716409570000000000,"id":"abc"}}
```

### Backpressure & Disconnects

- If a client cannot keep up and its queue usage exceeds 80%, the server sends a warning message and, if necessary, drops the connection after sending `type: "warning"` with reason `slow_client`.
- Clients should resubscribe to recover after reconnect.

## Error Handling

- HTTP errors use standard status codes with `{"error":"..."}` payloads.
- WebSocket errors are sent as `{"topic":"account","type":"error","payload":{"reason":"..."}}` before closing the socket.

## Versioning Strategy

- `version` increments with each applied event; consumers can detect missed updates.
- The HTTP `snapshot` includes `Cache-Control: no-store` headers because state changes rapidly.
- Future backward-incompatible schema changes must bump `apiVersion` (to be added in the snapshot payload).

## QuestDB Schema for Order History Persistence

The order history data structures are designed to be directly compatible with QuestDB for future persistence:

### `order_state_log` table (partitioned by day on `timestampNs`)

```sql
CREATE TABLE IF NOT EXISTS order_state_log (
    orderId SYMBOL CAPACITY 100000 CACHE INDEX,
    clientId SYMBOL,
    symbol SYMBOL CAPACITY 1000 CACHE INDEX,
    side SYMBOL,
    type SYMBOL,
    status SYMBOL,
    quantity DOUBLE,
    price DOUBLE,
    filledQuantity DOUBLE,
    avgFillPrice DOUBLE,
    timestampNs TIMESTAMP,
    createdNs TIMESTAMP,
    latencyNs LONG
) TIMESTAMP(timestampNs) PARTITION BY DAY;
```

### `order_fills` table (partitioned by day on `timestampNs`)

```sql
CREATE TABLE IF NOT EXISTS order_fills (
    orderId SYMBOL CAPACITY 100000 CACHE INDEX,
    clientId SYMBOL,
    symbol SYMBOL CAPACITY 1000 CACHE INDEX,
    side SYMBOL,
    fillId SYMBOL,
    fillPrice DOUBLE,
    fillQuantity DOUBLE,
    fillFee DOUBLE,
    cumulativeFilled DOUBLE,
    timestampNs TIMESTAMP,
    createdNs TIMESTAMP,
    latencyNs LONG
) TIMESTAMP(timestampNs) PARTITION BY DAY;
```

**Benefits:**
- Fast time-series queries for order latency analysis
- Indexed by `orderId` and `symbol` for quick lookups
- Partitioned by day for efficient data retention management
- Lock-free in-memory buffer provides microsecond read latency
- Async write to QuestDB for durability without blocking trading path

## Testing Checklist

- Unit tests for:
  - Balance/order/position JSON serialization (round-trip).
  - Version monotonicity for concurrent readers.
  - Subscription filters (only receive requested topics).
  - Order history circular buffer eviction and SeqLock correctness.
  - State transition and fill logging with timestamps.
- Integration test: mock Kraken events -> ensure WebSocket client receives matching sequence of updates and final snapshot.
- Load test: simulate 10k updates/minute with 10 subscribers to verify queues remain under capacity.
- Performance test: verify order history reads complete in <1μs (lock-free).

