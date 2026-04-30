/**
 * @ecu/transport-tcp
 * TCP socket transport — primary for dev, CI, and cloud gateway.
 */
import { AbstractTransport, TransportConfig } from '@ecu/transport-abstract';
interface TcpConfig extends Required<Pick<TransportConfig, 'host' | 'port' | 'connectTimeoutMs' | 'readTimeoutMs'>> {
}
export declare class TcpTransport extends AbstractTransport {
    private socket;
    private receiveBuffer;
    private readonly config;
    constructor(config: TcpConfig);
    get mode(): "tcp";
    get isConnected(): boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    send(data: Buffer): Promise<void>;
    read(expectedBytes: number, timeoutMs?: number): Promise<Buffer>;
}
export {};
//# sourceMappingURL=index.d.ts.map