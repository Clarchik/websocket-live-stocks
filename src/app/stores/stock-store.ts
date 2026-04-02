import { Injectable, signal } from '@angular/core';
import { StockState, StockUpdate } from '../models/stock.model';

export const INITIAL_STOCKS: StockState[] = [
  {
    quote: { symbol: 'AAPL', name: 'Apple Inc.', currentPrice: 175.5, dailyHigh: 177.2, dailyLow: 173.8, weekHigh52: 199.62, weekLow52: 143.9 },
    active: true, trend: 'neutral', openPrice: 175.5, lastTradeTime: null,
  },
  {
    quote: { symbol: 'GOOGL', name: 'Alphabet Inc.', currentPrice: 165.3, dailyHigh: 167.8, dailyLow: 163.5, weekHigh52: 193.31, weekLow52: 130.67 },
    active: true, trend: 'neutral', openPrice: 165.3, lastTradeTime: null,
  },
  {
    quote: { symbol: 'MSFT', name: 'Microsoft Corp.', currentPrice: 420.15, dailyHigh: 424.5, dailyLow: 417.3, weekHigh52: 468.35, weekLow52: 344.79 },
    active: true, trend: 'neutral', openPrice: 420.15, lastTradeTime: null,
  },
  {
    quote: { symbol: 'TSLA', name: 'Tesla Inc.', currentPrice: 248.75, dailyHigh: 255.0, dailyLow: 244.1, weekHigh52: 358.64, weekLow52: 138.8 },
    active: true, trend: 'neutral', openPrice: 248.75, lastTradeTime: null,
  },
];

@Injectable()
export class StockStore {
  private readonly _stocks = signal<StockState[]>(
    INITIAL_STOCKS.map(s => ({ ...s, quote: { ...s.quote } })),
  );
  readonly stocks = this._stocks.asReadonly();

  applyUpdate(update: StockUpdate): void {
    this._stocks.update(stocks =>
      stocks.map(s => {
        if (s.quote.symbol !== update.symbol || !s.active) return s;
        const trend: StockState['trend'] =
          update.currentPrice > s.quote.currentPrice ? 'up' :
          update.currentPrice < s.quote.currentPrice ? 'down' :
          'neutral';
        return { ...s, trend, quote: { ...s.quote, ...update }, lastTradeTime: new Date() };
      }),
    );
  }

  toggleStock(symbol: string): void {
    this._stocks.update(stocks =>
      stocks.map(s =>
        s.quote.symbol === symbol
          ? { ...s, active: !s.active, trend: 'neutral' as const }
          : s,
      ),
    );
  }
}
