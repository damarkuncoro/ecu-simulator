// Ambient type declarations for dynamic imports
// This avoids circular dependency in project references

declare module '@ecu/transport-tcp' {
  import { AbstractTransport } from '@ecu/transport-abstract';
  export class TcpTransport extends AbstractTransport {
    constructor(config: { host?: string; port?: number; connectTimeoutMs?: number; readTimeoutMs?: number; path?: string; baudRate?: number; mode: "tcp" });
  }
}

declare module '@ecu/transport-serial' {
  import { AbstractTransport } from '@ecu/transport-abstract';
  export class SerialTransport extends AbstractTransport {
    constructor(config: { path?: string; baudRate?: number; connectTimeoutMs?: number; readTimeoutMs?: number; host?: string; port?: number; mode: "serial" });
  }
}

declare module '@ecu/transport-ws' {
  import { AbstractTransport } from '@ecu/transport-abstract';
  export class WebSocketTransport extends AbstractTransport {
    constructor(config: { host?: string; port?: number; path?: string; baudRate?: number; mode: "websocket" });
  }
}
