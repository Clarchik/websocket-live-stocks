import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { StockService, ConnectionStatus } from '../interfaces/stock-service.token';
import { StockStore, INITIAL_STOCKS } from '../stores/stock-store';
import { WebSocketConnection, connectWithRetry } from '../utils/websocket-retry';

interface FinnhubTrade {
  s: string; // symbol
  p: number; // price
  v: number; // volume
  t: number; // timestamp (ms)
}

interface FinnhubMessage {
  type: 'trade' | 'ping' | 'error';
  data?: FinnhubTrade[];
}

const FINNHUB_API_TOKEN = 'd776lrhr01qp6afke27gd776lrhr01qp6afke280';
const FINNHUB_WS_URL = `wss://ws.finnhub.io?token=${FINNHUB_API_TOKEN}`;
const SYMBOLS = INITIAL_STOCKS.map((s) => s.quote.symbol);

@Injectable()
export class FinnhubStockService implements StockService, OnDestroy {
  private readonly store = inject(StockStore);
  private readonly connection: WebSocketConnection;

  readonly stocks = this.store.stocks;

  private readonly _connectionStatus = signal<ConnectionStatus>('connecting');
  readonly connectionStatus = this._connectionStatus.asReadonly();

  constructor() {
    this.connection = connectWithRetry(FINNHUB_WS_URL, {
      onOpen: () => {
        this._connectionStatus.set('connected');
        SYMBOLS.forEach((symbol) =>
          this.connection.send(JSON.stringify({ type: 'subscribe', symbol })),
        );
      },
      onMessage: (data) => {
        const msg = JSON.parse(data) as FinnhubMessage;
        if (msg.type !== 'trade' || !msg.data?.length) return;
        this.processTrades(msg.data);
      },
      onRetrying: () => this._connectionStatus.set('connecting'),
      onFailed: () => this._connectionStatus.set('error'),
    });
  }

  private processTrades(trades: FinnhubTrade[]): void {
    const latestBySymbol = new Map<string, FinnhubTrade>();
    for (const trade of trades) {
      latestBySymbol.set(trade.s, trade);
    }

    for (const [symbol, trade] of latestBySymbol) {
      const stock = this.store.stocks().find((s) => s.quote.symbol === symbol);
      if (!stock) continue;

      this.store.applyUpdate({
        symbol,
        currentPrice: trade.p,
        dailyHigh: parseFloat(Math.max(stock.quote.dailyHigh, trade.p).toFixed(2)),
        dailyLow: parseFloat(Math.min(stock.quote.dailyLow, trade.p).toFixed(2)),
        weekHigh52: stock.quote.weekHigh52,
        weekLow52: stock.quote.weekLow52,
      });
    }
  }

  toggleStock(symbol: string): void {
    this.store.toggleStock(symbol);
  }

  ngOnDestroy(): void {
    SYMBOLS.forEach((symbol) =>
      this.connection.send(JSON.stringify({ type: 'unsubscribe', symbol })),
    );
    this.connection.destroy();
  }
}
