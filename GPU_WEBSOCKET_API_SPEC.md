# GPU Monitoring WebSocket API Specification

## Overview

This document specifies the WebSocket API protocol for the GPU monitoring service running on remote servers. The API provides real-time system information and usage metrics (CPU, RAM, GPU) to connected clients.

**Server Endpoint:** `ws://[SERVER_IP]:33931/usage`
**Example:** `ws://220.82.52.202:33931/usage`

**Nginx Proxy Configuration:**
```nginx
location /gpu-ws {
    proxy_pass         http://220.82.52.202:33931/usage;
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

---

## Connection Flow

### 1. WebSocket Connection Establishment

**Client Side:**
```javascript
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}/gpu-ws`;
const ws = new WebSocket(wsUrl);
```

**Direct Connection (without proxy):**
```javascript
const ws = new WebSocket('ws://220.82.52.202:33931/usage');
```

### 2. Connection Events

#### `onopen` Event
Triggered when the WebSocket connection is successfully established.

**Client Action:** Immediately send subscription message
```javascript
ws.onopen = () => {
    console.log('GPU WebSocket connected');
    ws.send('subscribe:usage');
};
```

#### `onmessage` Event
Receives JSON messages from the server.

```javascript
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'system_info') {
        // Handle system information
    } else if (data.type === 'usage_update') {
        // Handle usage metrics update
    } else if (data.status === 'subscribed') {
        // Handle subscription confirmation
    }
};
```

#### `onerror` Event
Triggered when an error occurs.

```javascript
ws.onerror = (error) => {
    console.error('GPU WebSocket error:', error);
};
```

#### `onclose` Event
Triggered when the connection is closed.

```javascript
ws.onclose = () => {
    console.log('GPU WebSocket disconnected');
};
```

### 3. Disconnection

**Clean Disconnection:**
```javascript
ws.close();
```

---

## Message Protocol

All messages are exchanged as JSON strings (except the initial subscription message).

### Client → Server Messages

#### Subscribe to Usage Updates
**Format:** Plain text string (not JSON)

```
subscribe:usage
```

**When to Send:** Immediately after WebSocket connection opens (in `onopen` handler)

**Expected Response:** Server sends subscription confirmation followed by periodic updates

---

### Server → Client Messages

All server messages are JSON objects with a `type` or `status` field to identify the message type.

---

## Message Types

### 1. Subscription Confirmation

Sent by the server after receiving the subscription request.

**Message Type Identifier:** `status === 'subscribed'`

**Format:**
```json
{
    "status": "subscribed"
}
```

**Client Handling:**
```javascript
if (data.status === 'subscribed') {
    console.log('Subscribed to usage updates');
}
```

---

### 2. System Information Message

Sent once after subscription to provide static system details.

**Message Type Identifier:** `type === 'system_info'`

**Format:**
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
        },
        {
            "index": 1,
            "name": "NVIDIA GeForce RTX 3080",
            "memory_mb": 10240
        }
    ],
    "hostname": "gpu-server-01",
    "timestamp": 1678901234
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"system_info"` |
| `cpu_count` | integer | Number of CPU cores |
| `cpu_model` | string | CPU model name |
| `ram_total_mb` | integer | Total system RAM in megabytes |
| `gpu_count` | integer | Number of GPUs detected |
| `gpus` | array | Array of GPU information objects |
| `gpus[].index` | integer | GPU index (0-based) |
| `gpus[].name` | string | GPU model name |
| `gpus[].memory_mb` | integer | GPU memory in megabytes |
| `hostname` | string | Server hostname |
| `timestamp` | integer | Unix timestamp (seconds since epoch) |

**Client Handling:**
```javascript
if (data.type === 'system_info') {
    console.log('Received system info:', data);
    // Store system information
    systemInfo = data;
}
```

---

### 3. Usage Update Message

Sent periodically (recommended interval: every 5-10 seconds) to provide real-time usage metrics.

**Message Type Identifier:** `type === 'usage_update'`

**Format:**
```json
{
    "type": "usage_update",
    "cpu_percent": 45.3,
    "ram_percent": 62.8,
    "ram_used_mb": 20582,
    "ram_total_mb": 32768,
    "gpu_percent": 87,
    "gpu_mem_used_mb": 18432,
    "gpu_mem_total_mb": 24576,
    "timestamp": 1678901244
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Always `"usage_update"` |
| `cpu_percent` | float | Yes | CPU utilization percentage (0-100) |
| `ram_percent` | float | Yes | RAM utilization percentage (0-100) |
| `ram_used_mb` | integer | Yes | Used RAM in megabytes |
| `ram_total_mb` | integer | Yes | Total RAM in megabytes |
| `gpu_percent` | integer | Optional | Primary GPU utilization percentage (0-100) |
| `gpu_mem_used_mb` | integer | Optional | Primary GPU memory used in megabytes |
| `gpu_mem_total_mb` | integer | Optional | Primary GPU total memory in megabytes |
| `timestamp` | integer | Yes | Unix timestamp (seconds since epoch) |

**Notes:**
- GPU fields (`gpu_percent`, `gpu_mem_used_mb`, `gpu_mem_total_mb`) are **optional** and may be omitted if no GPU is present or GPU monitoring is unavailable
- If multiple GPUs are present, report the aggregate or primary GPU (typically GPU 0)
- CPU and RAM percentages should be floating-point numbers with 1 decimal precision
- GPU percent is typically an integer
- `timestamp` should be a Unix timestamp in **seconds** (not milliseconds)

**Client Handling:**
```javascript
if (data.type === 'usage_update') {
    // Update current metrics
    usageMetrics = data;

    // Add to historical data
    usageHistory.push({
        timestamp: data.timestamp,
        cpu: data.cpu_percent,
        ram: data.ram_percent,
        gpu: data.gpu_percent
    });

    // Keep only recent history (e.g., last 20 data points)
    if (usageHistory.length > 20) {
        usageHistory.shift();
    }
}
```

---

## Implementation Guidelines

### Server-Side Requirements

1. **WebSocket Server Setup**
   - Listen on port `33931`
   - Endpoint path: `/usage`
   - Support WebSocket protocol upgrade

2. **Connection Handling**
   - Accept WebSocket connections
   - Wait for `subscribe:usage` message from client
   - Send subscription confirmation: `{"status": "subscribed"}`

3. **System Information**
   - Gather system info once upon subscription
   - Send `system_info` message immediately after subscription
   - Include CPU, RAM, GPU details, and hostname

4. **Usage Monitoring Loop**
   - Start periodic monitoring after subscription
   - Recommended interval: **5-10 seconds**
   - Send `usage_update` messages with current metrics
   - Continue until client disconnects

5. **Cleanup**
   - Stop monitoring when client disconnects
   - Clean up resources and timers

### Client-Side Requirements

1. **Connection Management**
   - Establish WebSocket connection
   - Send `subscribe:usage` immediately on connection open
   - Handle connection errors and reconnection logic

2. **Message Parsing**
   - Parse all messages as JSON (except initial subscription)
   - Handle three message types: subscription confirmation, system info, usage updates

3. **Data Display**
   - Display system information from `system_info` message
   - Update UI with real-time metrics from `usage_update` messages
   - Maintain historical data for trend charts (recommended: 20 data points)

4. **Timestamp Handling**
   - Server sends timestamps in **seconds** (Unix timestamp)
   - Client converts to milliseconds for JavaScript Date: `new Date(timestamp * 1000)`

---

## Example Implementation (Python Server)

```python
import asyncio
import websockets
import json
import psutil
import platform
import socket
import time

# Try to import GPU libraries (optional)
try:
    import GPUtil
    GPU_AVAILABLE = True
except ImportError:
    GPU_AVAILABLE = False

class SystemMonitor:
    def __init__(self):
        self.subscribers = set()

    def get_system_info(self):
        """Get static system information"""
        info = {
            "type": "system_info",
            "cpu_count": psutil.cpu_count(),
            "cpu_model": platform.processor() or "Unknown",
            "ram_total_mb": int(psutil.virtual_memory().total / (1024 * 1024)),
            "gpu_count": 0,
            "gpus": [],
            "hostname": socket.gethostname(),
            "timestamp": int(time.time())
        }

        # Add GPU information if available
        if GPU_AVAILABLE:
            try:
                gpus = GPUtil.getGPUs()
                info["gpu_count"] = len(gpus)
                info["gpus"] = [
                    {
                        "index": i,
                        "name": gpu.name,
                        "memory_mb": int(gpu.memoryTotal)
                    }
                    for i, gpu in enumerate(gpus)
                ]
            except Exception as e:
                print(f"Error getting GPU info: {e}")

        return info

    def get_usage_metrics(self):
        """Get current usage metrics"""
        mem = psutil.virtual_memory()

        metrics = {
            "type": "usage_update",
            "cpu_percent": round(psutil.cpu_percent(interval=0.1), 1),
            "ram_percent": round(mem.percent, 1),
            "ram_used_mb": int(mem.used / (1024 * 1024)),
            "ram_total_mb": int(mem.total / (1024 * 1024)),
            "timestamp": int(time.time())
        }

        # Add GPU metrics if available
        if GPU_AVAILABLE:
            try:
                gpus = GPUtil.getGPUs()
                if gpus:
                    gpu = gpus[0]  # Primary GPU
                    metrics["gpu_percent"] = int(gpu.load * 100)
                    metrics["gpu_mem_used_mb"] = int(gpu.memoryUsed)
                    metrics["gpu_mem_total_mb"] = int(gpu.memoryTotal)
            except Exception as e:
                print(f"Error getting GPU metrics: {e}")

        return metrics

    async def handle_client(self, websocket, path):
        """Handle WebSocket client connection"""
        print(f"Client connected from {websocket.remote_address}")

        try:
            # Wait for subscription message
            message = await websocket.recv()

            if message == "subscribe:usage":
                # Add to subscribers
                self.subscribers.add(websocket)

                # Send subscription confirmation
                await websocket.send(json.dumps({"status": "subscribed"}))

                # Send system information
                system_info = self.get_system_info()
                await websocket.send(json.dumps(system_info))

                # Start sending periodic updates
                while True:
                    await asyncio.sleep(10)  # 10 second interval

                    metrics = self.get_usage_metrics()
                    await websocket.send(json.dumps(metrics))

        except websockets.exceptions.ConnectionClosed:
            print(f"Client disconnected from {websocket.remote_address}")
        except Exception as e:
            print(f"Error handling client: {e}")
        finally:
            # Remove from subscribers
            self.subscribers.discard(websocket)

async def main():
    monitor = SystemMonitor()

    # Start WebSocket server
    async with websockets.serve(monitor.handle_client, "0.0.0.0", 33931):
        print("GPU Monitoring WebSocket Server started on port 33931")
        print("Endpoint: ws://[SERVER_IP]:33931/usage")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())
```

### Required Python Packages

```bash
pip install websockets psutil GPUtil
```

**Note:** `GPUtil` requires NVIDIA GPUs and drivers. If not available, the server will still work but won't report GPU metrics.

---

## Example Client Code

```javascript
class GPUMonitor {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.systemInfo = null;
        this.usageMetrics = null;
        this.usageHistory = [];
        this.maxHistoryPoints = 20;
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/gpu-ws`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('Connected to GPU monitor');
            this.ws.send('subscribe:usage');
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.status === 'subscribed') {
                console.log('Subscribed to usage updates');
                this.onSubscribed();
            } else if (data.type === 'system_info') {
                console.log('Received system info:', data);
                this.systemInfo = data;
                this.onSystemInfo(data);
            } else if (data.type === 'usage_update') {
                this.usageMetrics = data;

                // Add to history
                this.usageHistory.push({
                    timestamp: data.timestamp,
                    cpu: data.cpu_percent,
                    ram: data.ram_percent,
                    gpu: data.gpu_percent
                });

                // Trim history
                if (this.usageHistory.length > this.maxHistoryPoints) {
                    this.usageHistory.shift();
                }

                this.onUsageUpdate(data);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.onError(error);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from GPU monitor');
            this.onDisconnect();
        };
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // Override these methods in your implementation
    onSubscribed() {}
    onSystemInfo(data) {}
    onUsageUpdate(data) {}
    onError(error) {}
    onDisconnect() {}
}

// Usage
const monitor = new GPUMonitor();
monitor.onSystemInfo = (info) => {
    console.log(`Server: ${info.hostname}`);
    console.log(`CPU: ${info.cpu_model} (${info.cpu_count} cores)`);
    console.log(`RAM: ${(info.ram_total_mb / 1024).toFixed(1)} GB`);
    console.log(`GPUs: ${info.gpu_count}`);
};
monitor.onUsageUpdate = (metrics) => {
    console.log(`CPU: ${metrics.cpu_percent}% | RAM: ${metrics.ram_percent}% | GPU: ${metrics.gpu_percent}%`);
};
monitor.connect();
```

---

## Testing

### Test with `websocat`

```bash
# Install websocat
cargo install websocat

# Connect to server
websocat ws://220.82.52.202:33931/usage

# After connection, type:
subscribe:usage

# You should receive JSON messages
```

### Test with Node.js

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://220.82.52.202:33931/usage');

ws.on('open', () => {
    console.log('Connected');
    ws.send('subscribe:usage');
});

ws.on('message', (data) => {
    console.log('Received:', data.toString());
});
```

---

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if server is running on port 33931
   - Verify firewall rules allow incoming connections
   - Ensure nginx proxy configuration is correct

2. **No Data Received**
   - Verify subscription message was sent: `subscribe:usage`
   - Check server logs for errors
   - Ensure client is parsing JSON correctly

3. **Missing GPU Metrics**
   - GPU fields are optional
   - Server may not have GPU support libraries installed
   - Check if `GPUtil` or equivalent is installed on server

4. **Timestamp Issues**
   - Server sends Unix timestamp in **seconds**
   - Client must multiply by 1000 for JavaScript Date
   - Example: `new Date(timestamp * 1000)`

---

## Security Considerations

1. **Authentication**: Consider adding authentication mechanism for production
2. **Rate Limiting**: Implement connection rate limiting to prevent abuse
3. **SSL/TLS**: Use WSS (WebSocket Secure) in production environments
4. **Input Validation**: Validate subscription messages on server side
5. **Resource Limits**: Limit number of concurrent connections per IP

---

## Version History

- **v1.0** (Current): Initial specification based on existing implementation
  - Basic system info and usage metrics
  - Support for CPU, RAM, and optional GPU monitoring
  - Simple subscription model

---

## Summary

This WebSocket API provides a simple, efficient way to monitor remote GPU server resources in real-time. The protocol is lightweight, easy to implement, and suitable for monitoring dashboards and resource tracking applications.

**Key Points:**
- Server listens on port 33931 at `/usage` endpoint
- Client sends `subscribe:usage` text message to subscribe
- Server responds with three message types: subscription confirmation, system info, and periodic usage updates
- All messages (except subscription) are JSON formatted
- GPU metrics are optional but recommended when available
- Recommended update interval: 5-10 seconds
