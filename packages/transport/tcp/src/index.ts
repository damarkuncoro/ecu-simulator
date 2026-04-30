/**
 * @ecu/transport-tcp
 * TCP socket transport — primary for dev, CI, and cloud gateway.
 */

import * as net from 'net';
import {
  AbstractTransport,
  TransportConfig,
  TransportTimeoutError,
  TransportNotConnectedError,
  TransportError,
} from '@ecu/transport-abstract';

interface TcpConfig extends Required<Pick<TransportConfig, 'host' | 'port' | 'connectTimeoutMs' | 'readTimeoutMs'>> {}

export class TcpTransport extends AbstractTransport {
  private socket: net.Socket | null = null;
  private receiveBuffer: Buffer = Buffer.alloc(0);
  private readonly config: TcpConfig;

  constructor(config: TcpConfig) {
    super();
    this.config = config;
  }

  get mode() { return 'tcp' as const; }

  get isConnected(): boolean {
    return this.socket !== null && !this.socket.destroyed;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new TransportTimeoutError('tcp', this.config.connectTimeoutMs));
      }, this.config.connectTimeoutMs);

      socket.connect(this.config.port, this.config.host, () => {
        clearTimeout(timeout);
        this.socket = socket;
        this._stats.connectedAt = new Date();
        this.emit({ type: 'connected' });
        resolve();
      });

      socket.on('data', (data: Buffer) => {
        this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
        this.trackReceive(data.length);
        this.emit({ type: 'data', payload: data });
      });

      socket.on('close', () => {
        this.socket = null;
        this.emit({ type: 'disconnected', reason: 'socket closed' });
      });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        this._stats.errors++;
        this.emit({ type: 'error', error: new TransportError(err.message, 'tcp', err) });
        reject(err);
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.socket || this.socket.destroyed) {
        resolve();
        return;
      }
      this.socket.end(() => {
        this.socket = null;
        resolve();
      });
    });
  }

  async send(data: Buffer): Promise<void> {
    if (!this.isConnected || !this.socket) {
      throw new TransportNotConnectedError('tcp');
    }
    return new Promise((resolve, reject) => {
      this.socket!.write(data, (err) => {
        if (err) {
          this._stats.errors++;
          reject(new TransportError(err.message, 'tcp', err));
        } else {
          this.trackSend(data.length);
          resolve();
        }
      });
    });
  }

  async read(expectedBytes: number, timeoutMs?: number): Promise<Buffer> {
    const timeout = timeoutMs ?? this.config.readTimeoutMs;

    if (this.receiveBuffer.length >= expectedBytes) {
      const result = this.receiveBuffer.subarray(0, expectedBytes);
      this.receiveBuffer = this.receiveBuffer.subarray(expectedBytes);
      return result;
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new TransportTimeoutError('tcp', timeout));
      }, timeout);

      const onData = () => {
        if (this.receiveBuffer.length >= expectedBytes) {
          cleanup();
          const result = this.receiveBuffer.subarray(0, expectedBytes);
          this.receiveBuffer = this.receiveBuffer.subarray(expectedBytes);
          resolve(result);
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.socket?.off('data', onData);
      };

      this.socket?.on('data', onData);
    });
  }
}
