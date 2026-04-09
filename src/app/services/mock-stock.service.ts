import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { StockService, ConnectionStatus } from '../interfaces/stock-service.token';
import { StockStore } from '../stores/stock-store';
import { WorkerOutMessage } from '../workers/web-socket-worker.types';

@Injectable()
export class MockStockService implements StockService, OnDestroy {
  private readonly store = inject(StockStore);
  private readonly worker: SharedWorker;
  private readonly port: MessagePort;

  readonly stocks = this.store.stocks;

  private readonly _connectionStatus = signal<ConnectionStatus>('connecting');
  readonly connectionStatus = this._connectionStatus.asReadonly();

  private readonly onBeforeUnload = () => {
    this.port.postMessage({ type: 'disconnect' });
  };

  constructor() {
    this.worker = new SharedWorker(new URL('../workers/web-sockets.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.port = this.worker.port;
    this.worker.onerror = () => this._connectionStatus.set('error');
    this.port.onmessage = ({ data }: MessageEvent<WorkerOutMessage>) => {
      if (data.type === 'status') {
        this._connectionStatus.set(data.payload);
      } else if (data.type === 'data') {
        this.store.applyUpdate(data.payload);
      }
    };
    this.port.start();
    window.addEventListener('beforeunload', this.onBeforeUnload);
  }

  toggleStock(symbol: string): void {
    this.store.toggleStock(symbol);
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.onBeforeUnload);
    this.port.postMessage({ type: 'disconnect' });
    this.port.close();
  }
}
