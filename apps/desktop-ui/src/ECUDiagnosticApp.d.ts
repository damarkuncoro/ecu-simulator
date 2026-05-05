/**
 * ECU Diagnostic Dashboard Application
 * Electron + React-based diagnostic interface for ECU Simulator
 */
interface DiagnosticSession {
    id: string;
    connected: boolean;
    protocol: string;
    lastActivity: Date;
    stats: {
        requestsSent: number;
        responsesReceived: number;
        errors: number;
    };
}
export declare class ECUDiagnosticApp {
    private isInitialized;
    private logger;
    private transport;
    private session;
    private ipcHandlers;
    initialize(): Promise<void>;
    start(): void;
    stop(): void;
    private initializeTransport;
    private initializeServices;
    private handleTransportEvent;
    private handleIncomingData;
    private setupIPCHandlers;
    getIPCHandler(name: string): Function | undefined;
    getSession(): DiagnosticSession | null;
    isConnected(): boolean;
    private generateSessionId;
}
export {};
//# sourceMappingURL=ECUDiagnosticApp.d.ts.map