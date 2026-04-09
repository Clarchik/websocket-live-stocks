import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MockStockService } from './mock-stock.service';
import { MockSharedWorker, MockMessagePort } from '../testing/shared-worker.mock';
import { StockStore } from '../stores/stock-store';

const mockStoreFactory = () => ({
  stocks: signal([] as any[]),
  applyUpdate: vi.fn(),
  toggleStock: vi.fn(),
});

describe('MockStockService', () => {
  let service: MockStockService;
  let mockStore: ReturnType<typeof mockStoreFactory>;
  let workerPort: MockMessagePort;

  beforeEach(() => {
    MockSharedWorker.lastInstance = null;
    vi.stubGlobal('SharedWorker', MockSharedWorker);

    mockStore = mockStoreFactory();

    TestBed.configureTestingModule({
      providers: [MockStockService, { provide: StockStore, useValue: mockStore }],
    });
    service = TestBed.inject(MockStockService);
    workerPort = MockSharedWorker.lastInstance!.port;
  });

  afterEach(() => {
    service.ngOnDestroy();
    vi.unstubAllGlobals();
  });

  it('starts with connecting status', () => {
    expect(service.connectionStatus()).toBe('connecting');
  });

  it('exposes the store stocks signal', () => {
    expect(service.stocks).toBe(mockStore.stocks);
  });

  it('starts the port in constructor', () => {
    expect(workerPort.started).toBe(true);
  });

  it('sets status to connected when worker sends connected status', () => {
    workerPort.triggerMessage({ type: 'status', payload: 'connected' });
    expect(service.connectionStatus()).toBe('connected');
  });

  it('sets status to connecting when worker sends connecting status', () => {
    workerPort.triggerMessage({ type: 'status', payload: 'connecting' });
    expect(service.connectionStatus()).toBe('connecting');
  });

  it('sets status to error when worker sends error status', () => {
    workerPort.triggerMessage({ type: 'status', payload: 'error' });
    expect(service.connectionStatus()).toBe('error');
  });

  it('calls store.applyUpdate when worker sends data', () => {
    const update = {
      symbol: 'AAPL',
      currentPrice: 180,
      dailyHigh: 181,
      dailyLow: 174,
      weekHigh52: 199,
      weekLow52: 143,
    };
    workerPort.triggerMessage({ type: 'data', payload: update });
    expect(mockStore.applyUpdate).toHaveBeenCalledWith(update);
  });

  it('delegates toggleStock to store', () => {
    service.toggleStock('AAPL');
    expect(mockStore.toggleStock).toHaveBeenCalledWith('AAPL');
  });

  it('closes the port on destroy', () => {
    service.ngOnDestroy();
    expect(workerPort.closed).toBe(true);
  });
});
