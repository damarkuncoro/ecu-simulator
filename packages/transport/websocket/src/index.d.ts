/** @ecu/transport-ws — stub implementation */
import { AbstractTransport, TransportListener } from "@ecu/transport-abstract";
export declare const PKG = "@ecu/transport-ws";
export interface WebSocketConfig {
    host?: string;
    port?: number;
    connectTimeoutMs?: number;
    readTimeoutMs?: number;
}
export declare class WebSocketTransport extends AbstractTransport {
    private config;
    constructor(config?: WebSocketConfig);
    get mode(): "websocket";
    get isConnected(): boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    send(data: Buffer): Promise<void>;
    read(expectedBytes: number, timeoutMs?: number): Promise<Buffer>;
    on(listener: TransportListener): () => void;
}
//# sourceMappingURL=index.d.ts.map