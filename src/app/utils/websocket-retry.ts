export interface WebSocketRetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
}

export interface WebSocketRetryHandlers {
  onOpen: () => void;
  onMessage: (data: string) => void;
  onRetrying: (attempt: number, delayMs: number) => void;
  onFailed: () => void;
}

export interface WebSocketConnection {
  /** Send a message if the socket is currently open. */
  send: (data: string) => void;
  /** Tear down the connection and cancel any pending retry. */
  destroy: () => void;
}

export function connectWithRetry(
  url: string,
  handlers: WebSocketRetryHandlers,
  options: WebSocketRetryOptions = {},
): WebSocketConnection {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;

  let ws: WebSocket | null = null;
  let attempt = 0;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  function connect(): void {
    ws = new WebSocket(url);

    ws.onopen = () => {
      attempt = 0;
      handlers.onOpen();
    };

    ws.onmessage = ({ data }) => handlers.onMessage(data);

    // onerror always fires before onclose — retry is handled in onclose
    ws.onerror = () => {};

    ws.onclose = () => {
      if (destroyed) return;
      attempt++;
      if (attempt <= maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // 1s, 2s, 4s…
        handlers.onRetrying(attempt, delay);
        retryTimeout = setTimeout(connect, delay);
      } else {
        handlers.onFailed();
      }
    };
  }

  connect();

  return {
    send: (data: string) => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(data);
    },
    destroy: () => {
      destroyed = true;
      if (retryTimeout !== null) clearTimeout(retryTimeout);
      ws?.close();
    },
  };
}
