export class MockMessagePort {
  onmessage: ((e: MessageEvent) => void) | null = null;
  started = false;
  closed = false;

  readonly sentMessages: unknown[] = [];

  start(): void {
    this.started = true;
  }

  close(): void {
    this.closed = true;
  }

  postMessage(data: unknown): void {
    this.sentMessages.push(data);
  }

  triggerMessage(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
}

export class MockSharedWorker {
  static lastInstance: MockSharedWorker | null = null;
  readonly port = new MockMessagePort();

  constructor(_url: unknown, _options?: unknown) {
    MockSharedWorker.lastInstance = this;
  }
}
