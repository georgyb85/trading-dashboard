# Status Stream WebSocket API

The `StatusStream` controller exposes a WebSocket endpoint that broadcasts live telemetry coming from the Bybit standalone harness and the main application. Clients subscribe to the `status` topic to receive:

- Periodic statistics snapshots (message rates, thread status, latest prices).
- Trade tick summaries for every Bybit trade message.
- OHLCV candle updates for 1m bars aggregated by the realtime OHLCV provider.

## Endpoint

```
ws://<host>:<port>/ws/status
```

Use the same host and port as the Drogon HTTP server.

## Client Commands

All client commands are UTF-8 JSON objects. At present only subscription is supported.

### Subscribe to Status Topic

```
{"action":"subscribe","topic":"status"}
```

Successful subscription causes the server to send an immediate snapshot response (see below), followed by streaming updates as they occur.

## Server Messages

Every outbound message includes `topic:"status"` and `type` to differentiate payload shapes.

### Snapshot (`type":"snapshot"`)

Sent once after a client subscribes. Contains the most recent stats, trades, and candles known to the server.

```json
{
  "topic": "status",
  "type": "snapshot",
  "stats": { ... },
  "trades": [ { ... } ],
  "ohlcv": [ { ... } ]
}
```

Any section may be omitted when no cached data exists.

### Stats Update (`type":"stats"`)

Broadcast every second with the latest counters and thread information. Important fields:

- `timestamp`: ISO-8601 UTC string.
- `text`: Console-formatted version of the update (matches stdout).
- `last_prices`: Map of symbol to last known Bybit price.
- `message_counts`: Totals processed so far.
- `message_rates`: Rates per second computed over the last interval.
- `thread_statuses`: Array of per-thread metrics from `ThreadRegistry`.

### Trade Update (`type":"trade"`)

Sent for each individual Bybit trade message.

- `symbol`: Bybit symbol (e.g. `BTCUSDT`).
- `side`: `Buy` or `Sell`.
- `price`, `volume`: Parsed numeric values from the trade tick.
- `timestamp`: Milliseconds since epoch.
- `timestamp_iso`: ISO-8601 UTC string.
- `message_counts.trade_messages`: Number of trades processed up to that point.

### OHLCV Update (`type":"ohlcv"`)

Emitted whenever the realtime OHLCV provider publishes a 1m candle.

- `exchange`: Always `bybit` in the standalone harness.
- `symbol`: Upper-case symbol plus `USDT`.
- `timeframe`: Currently `1m`.
- `timestamp`: Candle close time in milliseconds since epoch.
- `open`, `high`, `low`, `close`, `volume`, `trades`, `vwap`: Candle metrics.
- `timestamp_iso`: ISO-8601 UTC string.
- `text`: Console-formatted string matching stdout.

## Example Session

Using `wscat` (npm package):

```bash
wscat -c ws://127.0.0.1:8848/ws/status
> {"action":"subscribe","topic":"status"}
```

Alternatively, with `websocat`:

```bash
websocat ws://127.0.0.1:8848/ws/status
{"action":"subscribe","topic":"status"}
```

Both tools will print the incoming JSON stream once the subscription message is sent.

