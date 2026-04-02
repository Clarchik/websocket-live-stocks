import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { StockUpdate } from '../models/stock.model';
import { StockStore } from '../stores/stock-store';

const AAPL_UPDATE: StockUpdate = {
  symbol: 'AAPL',
  currentPrice: 180,
  dailyHigh: 181,
  dailyLow: 174,
  weekHigh52: 199.62,
  weekLow52: 143.9,
};

describe('StockStore', () => {
  let store: StockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [StockStore] });
    store = TestBed.inject(StockStore);
  });

  describe('initial state', () => {
    it('initializes with 4 stocks', () => {
      expect(store.stocks()).toHaveLength(4);
    });

    it('initializes all stocks as active', () => {
      expect(store.stocks().every((s) => s.active)).toBe(true);
    });

    it('initializes all stocks with neutral trend', () => {
      expect(store.stocks().every((s) => s.trend === 'neutral')).toBe(true);
    });

    it('initializes all stocks with null lastTradeTime', () => {
      expect(store.stocks().every((s) => s.lastTradeTime === null)).toBe(true);
    });
  });

  describe('applyUpdate', () => {
    it('updates the price of the matching stock', () => {
      store.applyUpdate(AAPL_UPDATE);
      const aapl = store.stocks().find((s) => s.quote.symbol === 'AAPL')!;
      expect(aapl.quote.currentPrice).toBe(180);
    });

    it('sets trend to up when price increases', () => {
      store.applyUpdate(AAPL_UPDATE);
      const aapl = store.stocks().find((s) => s.quote.symbol === 'AAPL')!;
      expect(aapl.trend).toBe('up');
    });

    it('sets trend to down when price decreases', () => {
      const initial = store.stocks().find((s) => s.quote.symbol === 'AAPL')!.quote.currentPrice;
      store.applyUpdate({ ...AAPL_UPDATE, currentPrice: initial - 5 });
      expect(store.stocks().find((s) => s.quote.symbol === 'AAPL')!.trend).toBe('down');
    });

    it('sets trend to neutral when price is unchanged', () => {
      const initial = store.stocks().find((s) => s.quote.symbol === 'AAPL')!.quote.currentPrice;
      store.applyUpdate({ ...AAPL_UPDATE, currentPrice: initial });
      expect(store.stocks().find((s) => s.quote.symbol === 'AAPL')!.trend).toBe('neutral');
    });

    it('sets lastTradeTime to current date on update', () => {
      store.applyUpdate(AAPL_UPDATE);
      expect(store.stocks().find((s) => s.quote.symbol === 'AAPL')!.lastTradeTime).toBeInstanceOf(
        Date,
      );
    });

    it('does not update inactive stock', () => {
      store.toggleStock('AAPL');
      const priceBefore = store.stocks().find((s) => s.quote.symbol === 'AAPL')!.quote.currentPrice;
      store.applyUpdate(AAPL_UPDATE);
      expect(store.stocks().find((s) => s.quote.symbol === 'AAPL')!.quote.currentPrice).toBe(
        priceBefore,
      );
    });

    it('does not affect other stocks', () => {
      const before = store
        .stocks()
        .filter((s) => s.quote.symbol !== 'AAPL')
        .map((s) => s.quote.currentPrice);
      store.applyUpdate(AAPL_UPDATE);
      const after = store
        .stocks()
        .filter((s) => s.quote.symbol !== 'AAPL')
        .map((s) => s.quote.currentPrice);
      expect(after).toEqual(before);
    });

    it('ignores updates for unknown symbols', () => {
      const before = store.stocks().map((s) => s.quote.currentPrice);
      store.applyUpdate({ ...AAPL_UPDATE, symbol: 'UNKNOWN' });
      expect(store.stocks().map((s) => s.quote.currentPrice)).toEqual(before);
    });
  });

  describe('toggleStock', () => {
    it('sets active to false for an active stock', () => {
      store.toggleStock('AAPL');
      expect(store.stocks().find((s) => s.quote.symbol === 'AAPL')!.active).toBe(false);
    });

    it('sets active to true for an inactive stock', () => {
      store.toggleStock('AAPL');
      store.toggleStock('AAPL');
      expect(store.stocks().find((s) => s.quote.symbol === 'AAPL')!.active).toBe(true);
    });

    it('resets trend to neutral on toggle', () => {
      store.applyUpdate(AAPL_UPDATE);
      store.toggleStock('AAPL');
      expect(store.stocks().find((s) => s.quote.symbol === 'AAPL')!.trend).toBe('neutral');
    });

    it('does not affect other stocks', () => {
      store.toggleStock('AAPL');
      const others = store.stocks().filter((s) => s.quote.symbol !== 'AAPL');
      expect(others.every((s) => s.active)).toBe(true);
    });
  });
});
