#!/usr/bin/env python3
"""Test WebSocket endpoints on Stage1 and Kraken Trader servers."""

import asyncio
import websockets
import json
import ssl

# Endpoints to test
ENDPOINTS = [
    # Stage1 server endpoints
    ("wss://agenticresearch.info/usage", "Stage1 /usage"),
    ("wss://agenticresearch.info/api/usage", "Stage1 /api/usage"),
    ("wss://agenticresearch.info/ws/usage", "Stage1 /ws/usage"),

    # Kraken trader proxied endpoints (through Stage1's nginx/caddy)
    ("wss://agenticresearch.info/traders/<id>/ws/status", "Kraken /traders/<id>/ws/status"),
    ("wss://agenticresearch.info/traders/<id>/xgboost", "Kraken /traders/<id>/xgboost"),
    ("wss://agenticresearch.info/status", "Kraken /status"),
    ("wss://agenticresearch.info/ws/status", "Kraken /ws/status"),
]

async def test_endpoint(url: str, name: str, timeout: float = 5.0):
    """Test a single WebSocket endpoint."""
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    try:
        async with websockets.connect(url, ssl=ssl_context, close_timeout=2) as ws:
            print(f"✅ {name}: Connected to {url}")

            # Wait for first message
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=timeout)
                data = json.loads(msg)
                msg_type = data.get('type', data.get('topic', 'unknown'))
                print(f"   📨 Received: type={msg_type}, keys={list(data.keys())[:5]}")

                # Try to get a second message to confirm streaming
                try:
                    msg2 = await asyncio.wait_for(ws.recv(), timeout=2)
                    data2 = json.loads(msg2)
                    print(f"   📨 Second msg: type={data2.get('type', 'unknown')}")
                except asyncio.TimeoutError:
                    print(f"   ⏱️  No second message within 2s")

            except asyncio.TimeoutError:
                print(f"   ⚠️  Connected but no message received within {timeout}s")

    except websockets.exceptions.InvalidStatusCode as e:
        print(f"❌ {name}: HTTP {e.status_code} - {url}")
    except ConnectionRefusedError:
        print(f"❌ {name}: Connection refused - {url}")
    except Exception as e:
        print(f"❌ {name}: {type(e).__name__}: {e} - {url}")

async def main():
    print("=" * 60)
    print("WebSocket Endpoint Test")
    print("=" * 60)
    print()

    for url, name in ENDPOINTS:
        await test_endpoint(url, name)
        print()

    print("=" * 60)
    print("Summary: Check which endpoints returned ✅")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
