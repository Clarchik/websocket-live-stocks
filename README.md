# Stocks Live — Real-Time Stock Dashboard

An Angular 21 app that streams live stock prices over WebSocket and displays them on an interactive dashboard.

---

## Getting started

### Prerequisites

- Node.js 20+
- pnpm (`npm i -g pnpm`)

### Install dependencies

```bash
pnpm install
```

### Run (two terminals)

**Terminal 1 — mock WebSocket server:**
```bash
pnpm start:server
```

**Terminal 2 — Angular dev server:**
```bash
pnpm start
```

Then open `http://localhost:4200` in the browser.

### Finnhub (live market data)

Navigate to `http://localhost:4200/finnhub`. No extra server needed — the app connects directly to the Finnhub WebSocket API.

> Requires a valid Finnhub API token set in `src/app/services/finnhub-stock.service.ts`.

### Tests

```bash
pnpm test
```

---

## Architecture

```
src/app/
├── models/           # Domain interfaces (StockState, StockUpdate, StockQuote)
├── stores/           # StockStore — single source of truth for stock signal state
├── services/         # MockStockService, FinnhubStockService
├── interfaces/       # STOCK_SERVICE InjectionToken + StockService interface
├── utils/            # connectWithRetry — WebSocket retry utility
├── components/
│   ├── dashboard/    # Dashboard page, reads from STOCK_SERVICE token
│   └── stock-card/   # Single stock card component
└── testing/          # Shared MockWebSocket used in unit tests
```

### Data flow

```
WebSocket server / Finnhub API
        │  raw JSON messages
        ▼
MockStockService / FinnhubStockService
        │  StockUpdate
        ▼
    StockStore  ──── signal<StockState[]>
        │
        ▼
 DashboardComponent ──► StockCardComponent (×4)
```

### Key design decisions

**InjectionToken instead of abstract class**  
`STOCK_SERVICE` is an `InjectionToken<StockService>`. The dashboard depends only on the token, not on any concrete class. Switching data sources is done at the route level:

```typescript
// app.routes.ts
{ path: '',        providers: [{ provide: STOCK_SERVICE, useClass: MockStockService  }, StockStore] },
{ path: 'finnhub', providers: [{ provide: STOCK_SERVICE, useClass: FinnhubStockService }, StockStore] },
```

**Composition over inheritance**  
Both services compose `StockStore` via `inject()` instead of extending a base class. `StockStore` owns all signal state and mutation logic; services are responsible only for transport (WebSocket lifecycle, message parsing).

**`connectWithRetry` utility** (`src/app/utils/websocket-retry.ts`)  
A pure function wrapping the native `WebSocket` API with exponential-backoff reconnection. Returns `{ send, destroy }` — no retry boilerplate inside services.

- Default: 3 attempts, delays of 1 s → 2 s → 4 s
- A `destroyed` flag prevents retries after `ngOnDestroy`
- `onerror` is a no-op; all retry logic lives in `onclose`

**Signal-based state**  
`StockStore` exposes a single `signal<StockState[]>`. Components read it directly — no `Observable` subscriptions, no manual `unsubscribe`. Angular's reactivity propagates changes automatically.

---

## Features

### Two data sources

| Route | Source | Notes |
|---|---|---|
| `/` | Local mock server (`server/server.js`) | Random price walk, one update every 1.5 s |
| `/finnhub` | Finnhub WebSocket API | Real market data during trading hours |

### Stock cards

Each card shows:
- **Symbol** and company name
- **Current price** (large, centered)
- **Price change** from session open — absolute and percentage
- **Daily high / low**
- **52-week high / low** — desktop only (≥ 768 px)
- **Last trade time** — desktop only

Card colour reflects the last price movement:
| Colour | Meaning |
|---|---|
| Green | Price went up since last update |
| Red | Price went down |
| Blue/neutral | No change yet |
| Grey | Card manually deactivated |
