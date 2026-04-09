import type { ConnectionStatus } from '../interfaces/stock-service.token';
import type { StockUpdate } from '../models/stock.model';

export type WorkerOutMessage =
  | { type: 'status'; payload: ConnectionStatus }
  | { type: 'data'; payload: StockUpdate };
