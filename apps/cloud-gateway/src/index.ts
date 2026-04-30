/**
 * @ecu/cloud-gateway
 * WebSocket bridge — proxies ECU TCP connection to remote browser/UI clients.
 *
 * Usage:
 *   GATEWAY_PORT=8080 ECU_HOST=localhost ECU_PORT=20000 node dist/index.js
 */

import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createTransport } from '@ecu/transport-abstract';
import { Logger } from '@ecu/logger';

const log = new Logger('cloud-gateway');
const GATEWAY_PORT = Number(process.env['GATEWAY_PORT'] ?? 8080);

async function main() {
  const server = http.createServer();
  const wss = new WebSocketServer({ server });

  log.info('Cloud gateway starting', { port: GATEWAY_PORT });

  wss.on('connection', async (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress;
    log.info('Client connected', { ip: clientIp });

    const transport = await createTransport({ mode: 'tcp' });

    try {
      await transport.connect();
      log.info('ECU transport connected');

      // ECU → WebSocket client
      transport.on((event) => {
        if (event.type === 'data') {
          ws.send(event.payload);
        }
        if (event.type === 'disconnected') {
          ws.close(1001, 'ECU disconnected');
        }
      });

      // WebSocket client → ECU
      ws.on('message', async (data: Buffer) => {
        await transport.send(Buffer.isBuffer(data) ? data : Buffer.from(data));
      });

      ws.on('close', async () => {
        log.info('Client disconnected', { ip: clientIp });
        await transport.disconnect();
      });

    } catch (err) {
      log.error('ECU connection failed', { error: String(err) });
      ws.close(1011, 'ECU unavailable');
    }
  });

  server.listen(GATEWAY_PORT, () => {
    log.info(`Gateway listening on ws://0.0.0.0:${GATEWAY_PORT}`);
  });
}

main();
