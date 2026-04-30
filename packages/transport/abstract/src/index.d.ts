/**
 * @ecu/transport-abstract
 * Core transport interface — all physical/virtual transports implement this.
 * Supports hybrid: TCP for dev/CI, Serial for real K-Line hardware.
 */
export type TransportMode = "tcp" | "serial" | "websocket";
export interface TransportConfig {
    mode: TransportMode;
    host?: string;
    port?: number;
    path?: string;
    baudRate?: number;
    connectTimeoutMs?: number;
    readTimeoutMs?: number;
}
export interface TransportStats {
    bytesReceived: number;
    bytesSent: number;
    errors: number;
    connectedAt: Date;
}
export type TransportEvent = {
    type: "connected";
} | {
    type: "disconnected";
    reason?: string;
} | {
    type: "data";
    payload: Buffer;
} | {
    type: "error";
    error: Error;
};
export type TransportListener = (event: TransportEvent) => void;
/**
 * Abstract transport interface.
 * Implement this for each physical medium.
 */
export declare abstract class AbstractTransport {
    protected listeners: Set<TransportListener>;
    protected _stats: TransportStats;
    abstract get mode(): TransportMode;
    abstract get isConnected(): boolean;
    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract send(data: Buffer): Promise<void>;
    /** Read with configurable timeout — throws TransportTimeoutError on expiry */
    abstract read(expectedBytes: number, timeoutMs?: number): Promise<Buffer>;
    on(listener: TransportListener): () => void;
    get stats(): Readonly<TransportStats>;
    protected emit(event: TransportEvent): void;
    protected trackSend(bytes: number): void;
    protected trackReceive(bytes: number): void;
}
export declare class TransportError extends Error {
    readonly mode: TransportMode;
    readonly cause?: unknown | undefined;
    constructor(message: string, mode: TransportMode, cause?: unknown | undefined);
}
export declare class TransportTimeoutError extends TransportError {
    constructor(mode: TransportMode, timeoutMs: number);
}
export declare class TransportNotConnectedError extends TransportError {
    constructor(mode: TransportMode);
}
/**
 * Factory to instantiate the correct transport from config or env.
 * Priority: explicit config > ECU_TRANSPORT env var > default (tcp)
 */
export declare function createTransport(config?: Partial<TransportConfig>): Promise<AbstractTransport>;
//# sourceMappingURL=index.d.ts.map