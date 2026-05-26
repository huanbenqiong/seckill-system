export class WebSocketClient {
  private ws: WebSocket | null = null;
  private onMessageCallback: (data: string) => void;

  constructor(onMessage: (data: string) => void) {
    this.onMessageCallback = onMessage;
  }

  public connect(userId: string) {
    if (this.ws) {
      this.ws.close();
    }
    
    // Construct ws url, assuming backend is on port 8080 or proxied via vite
    // If using vite proxy, ws://localhost:5173/ws/seckill will be proxied
    const wsUrl = `ws://localhost:8080/ws/seckill?userId=${userId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      this.onMessageCallback(event.data);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
