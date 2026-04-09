import type { StockUpdate } from '../models/stock.model';
import type { WorkerOutMessage } from './web-socket-worker.types';
import { connectWithRetry, WebSocketConnection } from '../utils/websocket-retry';

// Shadow the ambient DOM `self` type with the SharedWorker context type
const sw = self as unknown as SharedWorkerGlobalScope;

const WS_URL = 'ws://localhost:8080';

const ports: MessagePort[] = [];
let connection: WebSocketConnection | null = null;
let currentStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'connecting';

function broadcast(msg: WorkerOutMessage): void {
  for (let i = ports.length - 1; i >= 0; i--) {
    try {
      ports[i].postMessage(msg);
    } catch {
      // Port is dead (tab closed) — prune it
      ports.splice(i, 1);
    }
  }
}

sw.onconnect = (e: MessageEvent) => {
  const port: MessagePort = e.ports[0];
  ports.push(port);
  port.start();

  port.onmessage = ({ data }: MessageEvent<{ type: string }>) => {
    if (data.type === 'disconnect') {
      const i = ports.indexOf(port);
      if (i !== -1) ports.splice(i, 1);
      if (!ports.length && connection) {
        connection.destroy();
      }
    }
  };

  if (connection) {
    port.postMessage({ type: 'status', payload: currentStatus } satisfies WorkerOutMessage);
    return;
  }

  // First connection OR reconnect after terminal error
  if (currentStatus === 'error') {
    currentStatus = 'connecting';
    broadcast({ type: 'status', payload: 'connecting' });
  }
  connection = connectWithRetry(WS_URL, {
    onOpen: () => {
      currentStatus = 'connected';
      broadcast({ type: 'status', payload: 'connected' });
    },
    onMessage: (data) => {
      broadcast({ type: 'data', payload: JSON.parse(data) as StockUpdate });
    },
    onRetrying: () => {
      currentStatus = 'connecting';
      broadcast({ type: 'status', payload: 'connecting' });
    },
    onFailed: () => {
      connection = null; // allow reconnect on new port arrival
      currentStatus = 'error';
      broadcast({ type: 'status', payload: 'error' });
    },
  });
};
