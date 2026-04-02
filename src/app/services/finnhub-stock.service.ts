import { Injectable, OnDestroy } from '@angular/core';
import { BaseStockService, INITIAL_STOCKS } from './stock.service';

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
export class FinnhubStockService extends BaseStockService implements OnDestroy {
  private ws: WebSocket | null = null;

  constructor() {
    super();
    this.connect();
  }

  private connect(): void {
    this.ws = new WebSocket(FINNHUB_WS_URL);

    this.ws.onopen = () => {
      this._connectionStatus.set('connected');
      SYMBOLS.forEach((symbol) => this.ws!.send(JSON.stringify({ type: 'subscribe', symbol })));
    };

    this.ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data) as FinnhubMessage;
      if (msg.type !== 'trade' || !msg.data?.length) return;
      this.processTrades(msg.data);
    };

    this.ws.onerror = () => this._connectionStatus.set('error');

    this.ws.onclose = () => this._connectionStatus.set('disconnected');
  }

  private processTrades(trades: FinnhubTrade[]): void {
    // Multiple trades can arrive per message — keep only the latest per symbol
    const latestBySymbol = new Map<string, FinnhubTrade>();
    for (const trade of trades) {
      latestBySymbol.set(trade.s, trade);
    }

    for (const [symbol, trade] of latestBySymbol) {
      const stock = this._stocks().find((s) => s.quote.symbol === symbol);
      if (!stock) continue;

      this.applyUpdate({
        symbol,
        currentPrice: trade.p,
        dailyHigh: parseFloat(Math.max(stock.quote.dailyHigh, trade.p).toFixed(2)),
        dailyLow: parseFloat(Math.min(stock.quote.dailyLow, trade.p).toFixed(2)),
        weekHigh52: stock.quote.weekHigh52,
        weekLow52: stock.quote.weekLow52,
      });
    }
  }

  ngOnDestroy(): void {
    SYMBOLS.forEach((symbol) => this.ws?.send(JSON.stringify({ type: 'unsubscribe', symbol })));
    this.ws?.close();
  }
}
