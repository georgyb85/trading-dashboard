# Account State Architecture

## Objectives

- Track balances, positions, and order lifecycles from Kraken private WebSocket feeds with minimal latency.
- Support dynamic asset discovery (any currency appearing in balances/orders becomes addressable immediately).
- Provide consistent, lock-free snapshots for read-heavy consumers (controllers, analytics, diagnostics).
- Broadcast incremental updates to WebSocket clients without blocking ingestion threads.

## Domain Model

```text
AccountSnapshot
├─ balances: map<AssetKey, BalanceEntry>
│   • asset: canonical upper-case symbol (e.g. "BTC", "ETH", "LTC", "USD")
│   • total: double
│   • available: double
│   • hold: double (derived)
│   • lastUpdateNs: int64_t
│   • source: enum { Trading, Funding }
├─ positions: map<PositionKey, PositionEntry>
│   • id: exchange position id (string)
│   • symbol: e.g. "XBT/USDT"
│   • size: double
│   • side: enum { Long, Short }
│   • entryPrice: double
│   • markPrice: double
│   • pnl: double
│   • leverage: optional double
│   • lastUpdateNs: int64_t
├─ orders: map<OrderId, OrderEntry>
│   • id: exchange order id
│   • clientId: optional client order id
│   • symbol, side, type, quantity, price
│   • status: enum { Created, PendingSend, Acknowledged, PartiallyFilled, Filled, CancelPending, Cancelled, Failed }
│   • filledQuantity, avgFillPrice, lastUpdateNs
│   • executions: ring buffer of fills (price, qty, fee, timestamp)
│   • lastEventSeq: monotonically increasing sequence for ordering updates
└─ version: uint64_t (monotonic snapshot id)
```

- **AssetKey**: uppercase asset code, optionally namespaced (e.g. `BTC.SPOT`).
- **PositionKey**: `${symbol}:${subaccount}` to avoid collisions.
- **OrderEntry** stores executions in a fixed-size circular buffer (e.g. 32 items) to avoid allocations during burst fills.

## Core Components

### 1. `AccountStateStore`

Responsible for holding the latest `AccountSnapshot` and exposing lock-free read APIs.

```cpp
class AccountStateStore {
public:
    using SnapshotPtr = std::shared_ptr<const AccountSnapshot>;

    SnapshotPtr getSnapshot() const;         // lock-free load
    void apply(AccountDelta&& delta);        // invoked by event processor
    uint64_t nextVersion();                  // monotonic counter

private:
    SeqLock<SnapshotPtr> snapshot_{std::make_shared<AccountSnapshot>()};
    std::atomic<uint64_t> version_{0};
};
```

- Snapshots are immutable shared pointers. Writers copy-on-write only the structures they modify (balances/orders/maps) before storing.
- Reads (`getSnapshot`) perform a single `SeqLock` load and reuse the shared ptr without copying large maps.
- Dynamic asset/position/order insertion is a matter of cloning the relevant `std::unordered_map` and inserting/updating the key.

### 2. `AccountDeltaProcessor`

Single-threaded processor that consumes normalized events and updates the store.

```cpp
struct AccountEvent {
    enum class Type { BalanceUpdate, PositionUpdate, OrderLifecycle, OrderExecution, Heartbeat };
    Type type;
    AccountBalanceUpdate balance;
    AccountPositionUpdate position;
    AccountOrderUpdate order;
};

class AccountDeltaProcessor {
public:
    explicit AccountDeltaProcessor(AccountStateStore& store,
                                   AccountBroadcaster& broadcaster);
    void enqueue(AccountEvent&& event);  // SPSC TypedRingBuffer
    void run();                          // dedicated thread
};
```

- Kraken private WebSocket handlers translate raw payloads into normalized `AccountEvent` objects and push them into a `TypedRingBuffer<AccountEvent>` (SPSC).
- The processor thread drains the ring buffer, applies mutations to `AccountStateStore`, and publishes update notifications to the broadcaster.
- By isolating mutations in one thread we avoid write-write contention while keeping ingestion threads fully lock-free (they just publish events).

### 3. `AccountBroadcaster`

Distributes incremental updates and snapshot hashes to interested consumers (WebSocket controllers, potential monitoring tasks).

```cpp
struct AccountBroadcastMessage {
    enum class Topic { Snapshot, Balance, Position, Order, Heartbeat };
    Topic topic;
    uint64_t version;
    Json::Value payload;
};

class AccountBroadcaster {
public:
    using QueuePtr = std::shared_ptr<TypedRingBuffer<AccountBroadcastMessage>>;

    QueuePtr createQueue();     // per-subscriber SPSC queue
    void dropQueue(const QueuePtr&);

    void publish(AccountBroadcastMessage&& msg);
};
```

- Each WebSocket connection obtains its own `TypedRingBuffer<AccountBroadcastMessage>` so fan-out is implemented as multi-producer → multi SPSC queues. This keeps consumption lock-free per connection.
- `publish` pushes to all active queues; to keep cost predictable we employ a `LockFreeVector` of queues guarded by a `SeqLock` (updates rare).
- Messages contain fully materialized JSON payloads to decouple serialization from network threads.

### 4. Controllers

- **`AccountSnapshotController` (HTTP)**
  - `GET /api/account/snapshot`: returns latest snapshot (`balances`, `positions`, `orders`, `version`).
  - `GET /api/account/orders/{id}`: single-order detail (served from snapshot).
- **`AccountStream` (WebSocket)**
  - On connection: pushes full snapshot (`topic: "snapshot"`).
  - Clients may send filter messages to subscribe to subsets (e.g. only balances or a subset of symbols).
  - Subsequent broadcast events: `balance.update`, `position.update`, `order.update`, `order.fill`, `order.closed`.
  - Implements heartbeat to detect dropped clients.

### 5. Private WebSocket Integration

1. Kraken private feed handlers decode raw JSON.
2. Handler emits `AccountEvent` into `AccountDeltaProcessor::enqueue`.
3. Processor updates store and `version`.
4. Processor constructs `AccountBroadcastMessage` per event and calls `AccountBroadcaster::publish`.
5. Controllers consume from their per-connection queues, sending JSON to clients.

### 6. Persistence Hooks (Optional)

- The architecture leaves room for optional sinks (QuestDB, disk snapshots) by subscribing to the `AccountBroadcaster`.
- A `SnapshotWriter` can periodically call `getSnapshot()` and persist to disk without blocking other readers.

## Concurrency Characteristics

- **Writers**: single dedicated processor thread; avoids contention and ensures deterministic ordering of account events.
- **Readers**: lock-free via `SeqLock<shared_ptr>`; `SnapshotPtr` copies are atomic pointer loads.
- **Fan-out**: `AccountBroadcaster` keeps `std::vector<QueuePtr>` under `SeqLock`; publish iterates copy of pointers to avoid blocking register/unregister operations.
- **Dynamic assets**: because snapshots are immutable, adding a new asset is just map copy + insert. Readers see consistent view with the new key once the snapshot pointer flips.
- **Order execution history**: `OrderEntry` holds bounded circular buffer; processors push new fills while updating aggregate fields.

## Failure Handling

- If ingestion backlog grows (fan-out queues approaching capacity), `AccountBroadcaster` raises a backpressure metric so upstream can shed load or drop least important subscribers.
- Heartbeats from Kraken (`heartbeat`, `pong`) are converted into `AccountEvent::Heartbeat` to reset timers; lack of heartbeats triggers reconnection and a synthetic snapshot refresh.

## Implementation Roadmap

1. Implement domain structs (`BalanceEntry`, `PositionEntry`, `OrderEntry`, `ExecutionFill`).
2. Add `AccountStateStore` and unit tests for snapshot cloning and dynamic asset insertion.
3. Implement `AccountDeltaProcessor` with translation helpers from Kraken payloads.
4. Create `AccountBroadcaster` and integration tests ensuring multi-queue fan-out works.
5. Build `AccountSnapshotController` (HTTP) and `AccountStream` (WebSocket); document API (see `account_state_api.md`).
6. Wire Kraken private handlers to publish events.
7. Add metrics/monitoring hooks (queue utilization, lag, version age).

This layout keeps ingestion low-latency, makes state inspection trivial for controllers, and scales well as more subscribers or derived computations are added.
