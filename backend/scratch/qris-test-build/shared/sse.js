"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseManager = void 0;
class SSEManager {
    constructor() {
        this.clients = [];
        this.nextId = 1;
    }
    /** Add a new SSE client connection */
    addClient(res) {
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
    broadcast(event, data = {}) {
        const payload = JSON.stringify({ type: event, ...data, timestamp: new Date().toISOString() });
        this.clients.forEach(client => {
            try {
                client.res.write(`event: ${event}\ndata: ${payload}\n\n`);
            }
            catch {
                // Client disconnected, will be cleaned up
            }
        });
    }
    /** Get count of connected clients */
    get clientCount() {
        return this.clients.length;
    }
}
// Singleton
exports.sseManager = new SSEManager();
//# sourceMappingURL=sse.js.map