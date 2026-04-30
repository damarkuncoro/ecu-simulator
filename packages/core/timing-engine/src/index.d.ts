/**
 * @ecu/timing-engine
 * ECU timing simulation engine for P1/P2/P3/P4 parameters.
 * Implements ISO 14230-2 (KWP2000) and ISO 15765-3 (UDS) timing requirements.
 */
export interface TimingParameters {
    /** P1: Inter-byte time for ECU responses (ms) */
    p1: number;
    /** P2: Time between ECU response and tester request (ms) */
    p2: number;
    /** P3: Time between tester request and next request (ms) */
    p3: number;
    /** P4: Inter-byte time for tester requests (ms) */
    p4: number;
}
export interface TimingConfig {
    protocol: "kwp2000" | "uds" | "iso9141";
    baudRate: number;
    adaptive: boolean;
    minP2: number;
    maxP2: number;
}
export type TimingEvent = "request_start" | "request_end" | "response_start" | "response_end";
export declare class TimingEngine {
    private config;
    private currentTiming;
    private timers;
    private listeners;
    constructor(config?: Partial<TimingConfig>);
    /** Get default timing for current configuration */
    private getDefaultTiming;
    /** Update timing configuration */
    updateConfig(config: Partial<TimingConfig>): void;
    /** Get current timing parameters */
    getCurrentTiming(): TimingParameters;
    /** Calculate adaptive P2 timing based on ECU load */
    private calculateAdaptiveP2;
    /** Start timing for incoming request */
    startRequestTiming(): void;
    /** Start timing for ECU response */
    startResponseTiming(): void;
    /** Wait for P3 timing before allowing next request */
    waitForNextRequest(): Promise<void>;
    /** Check if timing allows new request */
    canAcceptRequest(): boolean;
    /** Simulate timing violation for testing */
    injectTimingViolation(type: "p2_timeout" | "p3_timeout"): void;
    /** Add timing event listener */
    onTimingEvent(listener: (event: TimingEvent, data?: any) => void): () => void;
    /** Get timing statistics */
    getTimingStats(): {
        activeTimers: string[];
        currentConfig: TimingConfig;
        timingParams: TimingParameters;
    };
    /** Reset timing engine */
    reset(): void;
    private emit;
    private setTimer;
    private clearTimer;
    private clearAllTimers;
}
export declare const timingEngine: TimingEngine;
//# sourceMappingURL=index.d.ts.map