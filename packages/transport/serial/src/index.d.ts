/**
 * @ecu/transport-serial
 * Serial (K-Line) transport — for hardware-in-loop testing.
 * Wraps node-serialport with 5-baud init support.
 */
import { AbstractTransport, TransportConfig } from "@ecu/transport-abstract";
interface SerialConfig extends Required<Pick<TransportConfig, "path" | "baudRate" | "connectTimeoutMs" | "readTimeoutMs">> {
}
export declare class SerialTransport extends AbstractTransport {
    private port;
    private receiveBuffer;
    private readonly config;
    constructor(config: SerialConfig);
    get mode(): "serial";
    get isConnected(): boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    send(data: Buffer): Promise<void>;
    read(expectedBytes: number, timeoutMs?: number): Promise<Buffer>;
    /**
     * K-Line 5-baud initialization sequence.
     * Bit-bangs the address byte at 5 baud before switching to 10400.
     * Call this BEFORE connect() on real hardware.
     */
    fiveBaudInit(ecuAddress?: number): Promise<void>;
    private drainBuffer;
}
export {};
//# sourceMappingURL=index.d.ts.map