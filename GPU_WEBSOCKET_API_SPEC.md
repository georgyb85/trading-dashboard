# Usage WebSocket API Specification

This document specifies the Usage WebSocket API for system telemetry emitted by both the Kraken trader and the Stage1 backend. The stream provides CPU/RAM metrics and, on the Kraken trader, GPU metrics. It is broadcast-only: clients do not send messages.

## Endpoints

Direct connections:
- Kraken trader: `ws://<kraken-host>:<port>/usage`
- Stage1 backend: `ws://<stage1-host>/usage`

Proxied through Stage1 nginx (SSL termination):
- Kraken trader: `wss://agenticresearch.info/api/usage`
- Stage1 backend: `wss://agenticresearch.info/usage`

### Example nginx proxy

```nginx
location /api/usage {
    proxy_pass         http://<kraken-host>:<port>/usage;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade           $http_upgrade;
    proxy_set_header   Connection        "upgrade";
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_read_timeout 86400;
    proxy_connect_timeout 30s;
    proxy_buffering off;
}
```

## Connection Behavior

Clients connect and listen. The server sends:
1. `system_info` (once per connection, or periodically)
2. `usage_update` (periodic usage samples)

No subscription message is required.

## Message Types

### system_info

```json
{
  "type": "system_info",
  "cpu_count": 16,
  "cpu_model": "AMD Ryzen 9 5950X 16-Core Processor",
  "ram_total_mb": 32768,
  "gpu_count": 2,
  "gpus": [
    {
      "index": 0,
      "name": "NVIDIA GeForce RTX 3090",
      "memory_mb": 24576
    }
  ],
  "hostname": "kraken-gpu-01",
  "timestamp": 1731252000
}
```

Fields:
- `timestamp` is epoch seconds (from `time(nullptr)`)
- `gpu_count` and `gpus` are present only when GPU telemetry is available

### usage_update

```json
{
  "type": "usage_update",
  "cpu_percent": 45.3,
  "ram_percent": 62.8,
  "ram_used_mb": 20582,
  "ram_total_mb": 32768,
  "gpu_percent": 71.4,
  "gpu_mem_used_mb": 20480,
  "gpu_mem_total_mb": 24576,
  "timestamp": 1731252061,
  "message_rates": {
    "total_per_sec": 120,
    "trades_per_sec": 45,
    "orderbooks_per_sec": 75
  }
}
```

Notes:
- GPU fields are omitted when unavailable (Stage1 deployments typically have no GPU).
- `message_rates` appears only when producers call `UsageStream::updateMessageRates`.

## Example Client

```javascript
const ws = new WebSocket('wss://agenticresearch.info/api/usage');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'system_info') {
    console.log('System info', data);
  }
  if (data.type === 'usage_update') {
    console.log('Usage', data);
  }
};
```
