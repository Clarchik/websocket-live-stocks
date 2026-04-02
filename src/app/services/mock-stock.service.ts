import { Injectable, OnDestroy } from '@angular/core';
import { BaseStockService } from './stock.service';
import { StockUpdate } from '../models/stock.model';

@Injectable()
export class MockStockService extends BaseStockService implements OnDestroy {
  private readonly WS_URL = 'ws://localhost:8080';
  private ws: WebSocket | null = null;

  constructor() {
    super();
    this.connect();
  }

  private connect(): void {
    this.ws = new WebSocket(this.WS_URL);

    this.ws.onopen = () => this._connectionStatus.set('connected');

    this.ws.onmessage = ({ data }) => this.applyUpdate(JSON.parse(data) as StockUpdate);

    this.ws.onerror = () => this._connectionStatus.set('error');

    this.ws.onclose = () => this._connectionStatus.set('disconnected');
  }

  ngOnDestroy(): void {
    this.ws?.close();
  }
}
