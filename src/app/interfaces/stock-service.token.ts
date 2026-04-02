import { InjectionToken, Signal } from '@angular/core';
import { StockState } from '../models/stock.model';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface StockService {
  readonly stocks: Signal<readonly StockState[]>;
  readonly connectionStatus: Signal<ConnectionStatus>;
  toggleStock(symbol: string): void;
}

export const STOCK_SERVICE = new InjectionToken<StockService>('STOCK_SERVICE');
