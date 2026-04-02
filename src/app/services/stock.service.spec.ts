import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { StockService } from './stock.service';

describe('StockService', () => {
  let service: StockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StockService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with 4 stocks', () => {
    expect(service.stocks().length).toBe(4);
  });

  it('should initialize all stocks as active', () => {
    expect(service.stocks().every(s => s.active)).toBe(true);
  });

  it('should initialize all stocks with neutral trend', () => {
    expect(service.stocks().every(s => s.trend === 'neutral')).toBe(true);
  });

  it('should toggle stock to inactive', () => {
    service.toggleStock('AAPL');
    const stock = service.stocks().find(s => s.quote.symbol === 'AAPL');
    expect(stock?.active).toBe(false);
  });

  it('should toggle stock back to active', () => {
    service.toggleStock('AAPL');
    service.toggleStock('AAPL');
    const stock = service.stocks().find(s => s.quote.symbol === 'AAPL');
    expect(stock?.active).toBe(true);
  });

  it('should reset trend to neutral on toggle', () => {
    service.applyUpdate({ symbol: 'AAPL', currentPrice: 999, dailyHigh: 999, dailyLow: 100, weekHigh52: 999, weekLow52: 100 });
    service.toggleStock('AAPL');
    const stock = service.stocks().find(s => s.quote.symbol === 'AAPL');
    expect(stock?.trend).toBe('neutral');
  });

  it('should set lastTradeTime when price updates', () => {
    service.applyUpdate({ symbol: 'AAPL', currentPrice: 180, dailyHigh: 180, dailyLow: 170, weekHigh52: 199, weekLow52: 143 });
    const stock = service.stocks().find(s => s.quote.symbol === 'AAPL');
    expect(stock?.lastTradeTime).toBeInstanceOf(Date);
  });

  it('should not update lastTradeTime for inactive stock', () => {
    service.toggleStock('AAPL');
    service.applyUpdate({ symbol: 'AAPL', currentPrice: 180, dailyHigh: 180, dailyLow: 170, weekHigh52: 199, weekLow52: 143 });
    const stock = service.stocks().find(s => s.quote.symbol === 'AAPL');
    expect(stock?.lastTradeTime).toBeNull();
  });

  it('should set trend to up when price increases', () => {
    const initial = service.stocks().find(s => s.quote.symbol === 'AAPL')!.quote.currentPrice;
    service.applyUpdate({ symbol: 'AAPL', currentPrice: initial + 5, dailyHigh: initial + 5, dailyLow: initial, weekHigh52: 199, weekLow52: 143 });
    const stock = service.stocks().find(s => s.quote.symbol === 'AAPL');
    expect(stock?.trend).toBe('up');
  });

  it('should set trend to down when price decreases', () => {
    const initial = service.stocks().find(s => s.quote.symbol === 'AAPL')!.quote.currentPrice;
    service.applyUpdate({ symbol: 'AAPL', currentPrice: initial - 5, dailyHigh: initial, dailyLow: initial - 5, weekHigh52: 199, weekLow52: 143 });
    const stock = service.stocks().find(s => s.quote.symbol === 'AAPL');
    expect(stock?.trend).toBe('down');
  });

  it('should not update an inactive stock', () => {
    service.toggleStock('AAPL');
    const priceBefore = service.stocks().find(s => s.quote.symbol === 'AAPL')!.quote.currentPrice;
    service.applyUpdate({ symbol: 'AAPL', currentPrice: 999, dailyHigh: 999, dailyLow: 100, weekHigh52: 999, weekLow52: 100 });
    const priceAfter = service.stocks().find(s => s.quote.symbol === 'AAPL')!.quote.currentPrice;
    expect(priceAfter).toBe(priceBefore);
  });

  it('should only toggle the specified stock', () => {
    service.toggleStock('AAPL');
    const others = service.stocks().filter(s => s.quote.symbol !== 'AAPL');
    expect(others.every(s => s.active)).toBe(true);
  });
});
