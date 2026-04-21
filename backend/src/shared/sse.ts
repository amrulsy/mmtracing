import { Response } from 'express';

/** SSE event types */
export type SSEEvent = 
  | 'spk:updated' 
  | 'spk:selesai' 
  | 'spk:kendala' 
  | 'pembayaran:lunas' 
  | 'pembayaran:bayar';

interface SSEClient {
  id: number;
  res: Response;
}

class SSEManager {
  private clients: SSEClient[] = [];
  private nextId = 1;

  /** Add a new SSE client connection */
  addClient(res: Response): number {
    const id = this.nextId++;
    
    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', clientId: id })}\n\n`);

    this.clients.push({ id, res });

    // Remove client on disconnect
    res.on('close', () => {
      this.clients = this.clients.filter(c => c.id !== id);
    });

    return id;
  }

  /** Broadcast event to all connected clients */
  broadcast(event: SSEEvent, data: Record<string, unknown> = {}) {
    const payload = JSON.stringify({ type: event, ...data, timestamp: new Date().toISOString() });
    
    this.clients.forEach(client => {
      try {
        client.res.write(`event: ${event}\ndata: ${payload}\n\n`);
      } catch {
        // Client disconnected, will be cleaned up
      }
    });
  }

  /** Get count of connected clients */
  get clientCount(): number {
    return this.clients.length;
  }
}

// Singleton
export const sseManager = new SSEManager();
