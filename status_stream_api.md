# Status Stream WebSocket API

The StatusStream controller in the Kraken trader broadcasts live execution telemetry over WebSocket. It is a broadcast-only stream: clients do not send messages. A snapshot is sent on connect, followed by periodic updates (about once per second).

## Endpoints

Direct (Kraken trader):
- ws://<kraken-host>:<port>/ws/status
- ws://<kraken-host>:<port>/status (legacy alias)

Proxied through Stage1 nginx:
- wss://agenticresearch.info/api/status-ws

## Client Behavior

No subscription message is required. Any client payloads are ignored.

## Message Types

All messages include:
- `topic: "status"`
- `type: "snapshot"` or `type: "update"`

### Snapshot

Sent immediately after connection.

```json
{
  "topic": "status",
  "type": "snapshot",
  "stats": { ... },
  "trades": [ ... ]
}
```

### Update

Broadcast periodically.

```json
{
  "topic": "status",
  "type": "update",
  "stats": { ... },
  "trades": [ ... ]
}
```

`stats` fields:
- `timestamp`: ISO-8601 UTC string
- `text`: console-formatted line
- `lastPrices`: array of `{ "symbol": "BTCUSD", "price": 12345.67 }`
- `counts`: `{ "tradeMessages": 123, "orderbookMessages": 456 }`
- `rates`: `{ "totalPerSec": 100, "tradesPerSec": 40, "orderbooksPerSec": 60 }`
- `threads`: array of `{ "name": "...", "state": "running", "processed": 123, "errors": 0, "avgLatencyUs": 900 }`
- `ringBuffers`: object keyed by buffer name with `{ "unconsumed": 0, "utilization": 0.12, "max12h": 120 }`

`trades` fields:
- `exchange`, `symbol`, `base`, `side`, `price`, `volume`
- `timestamp` (epoch milliseconds)
- `timestampIso` (ISO-8601 UTC string)

## Example

```bash
websocat wss://agenticresearch.info/api/status-ws
```

The server will start streaming immediately.
