import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { StockService, ConnectionStatus } from '../interfaces/stock-service.token';
import { StockStore } from '../stores/stock-store';
import { StockUpdate } from '../models/stock.model';
import { WebSocketConnection, connectWithRetry } from '../utils/websocket-retry';

@Injectable()
export class MockStockService implements StockService, OnDestroy {
  private readonly store = inject(StockStore);
  private readonly connection: WebSocketConnection;

  readonly stocks = this.store.stocks;

  private readonly _connectionStatus = signal<ConnectionStatus>('connecting');
  readonly connectionStatus = this._connectionStatus.asReadonly();

  private readonly WS_URL = 'ws://localhost:8080';

  constructor() {
    this.connection = connectWithRetry(this.WS_URL, {
      onOpen: () => this._connectionStatus.set('connected'),
      onMessage: (data) => this.store.applyUpdate(JSON.parse(data) as StockUpdate),
      onRetrying: () => this._connectionStatus.set('connecting'),
      onFailed: () => this._connectionStatus.set('error'),
    });
  }

  toggleStock(symbol: string): void {
    this.store.toggleStock(symbol);
  }

  ngOnDestroy(): void {
    this.connection.destroy();
  }
}
