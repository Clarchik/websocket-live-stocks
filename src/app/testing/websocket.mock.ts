export class MockWebSocket {
  static readonly OPEN = 1;
  static allInstances: MockWebSocket[] = [];

  readyState = 0;
  readonly sentMessages: string[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public readonly url: string) {
    MockWebSocket.allInstances.push(this);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }
  close(): void {
    this.readyState = 3;
    this.onclose?.();
  }

  triggerOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }
  triggerMessage(d: string): void {
    this.onmessage?.({ data: d });
  }
  triggerClose(): void {
    this.readyState = 3;
    this.onclose?.();
  }

  get parsedSentMessages(): unknown[] {
    return this.sentMessages.map((m) => JSON.parse(m));
  }

  static get last(): MockWebSocket {
    return MockWebSocket.allInstances.at(-1)!;
  }
}
