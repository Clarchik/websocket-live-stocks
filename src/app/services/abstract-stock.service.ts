import { Injectable, OnDestroy, Signal, signal } from '@angular/core';
import { StockState } from '../models/stock.model';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

@Injectable()
export abstract class AbstractStockService {
  abstract readonly stocks: Signal<readonly StockState[]>;

  protected readonly _connectionStatus = signal<ConnectionStatus>('connecting');
  readonly connectionStatus = this._connectionStatus.asReadonly();

  abstract toggleStock(symbol: string): void;
}
