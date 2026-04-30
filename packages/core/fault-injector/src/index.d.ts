/**
 * @ecu/fault-injector
 * Fault injection engine for ECU testing and simulation.
 * Enables controlled introduction of faults for diagnostic testing.
 */
export interface FaultCondition {
    id: string;
    name: string;
    description: string;
    category: "communication" | "sensor" | "actuator" | "memory" | "timing";
    severity: "low" | "medium" | "high" | "critical";
    probability: number;
    active: boolean;
    triggerCount: number;
    lastTriggered?: Date;
}
export interface FaultInjectionConfig {
    enabled: boolean;
    globalProbability: number;
    maxConcurrentFaults: number;
    autoRecovery: boolean;
    recoveryDelayMs: number;
}
export type FaultTrigger = "random" | "manual" | "conditional";
export declare class FaultInjector {
    private config;
    private faults;
    private activeFaults;
    private recoveryTimers;
    constructor(config?: Partial<FaultInjectionConfig>);
    /** Enable fault injection */
    enable(): void;
    /** Disable fault injection */
    disable(): void;
    /** Check if fault injection is enabled */
    isEnabled(): boolean;
    /** Update configuration */
    updateConfig(config: Partial<FaultInjectionConfig>): void;
    /** Get current configuration */
    getConfig(): FaultInjectionConfig;
    /** Register custom fault condition */
    registerFault(fault: FaultCondition): void;
    /** Get fault condition by ID */
    getFault(id: string): FaultCondition | undefined;
    /** Get all fault conditions */
    getAllFaults(): FaultCondition[];
    /** Get faults by category */
    getFaultsByCategory(category: FaultCondition["category"]): FaultCondition[];
    /** Get active faults */
    getActiveFaults(): FaultCondition[];
    /** Manually trigger fault */
    triggerFault(id: string): boolean;
    /** Clear specific fault */
    clearFault(id: string): void;
    /** Clear all active faults */
    clearAllActiveFaults(): void;
    /** Check if random fault should be triggered */
    shouldTriggerRandomFault(): boolean;
    /** Trigger random fault */
    triggerRandomFault(): FaultCondition | null;
    /** Get fault injection statistics */
    getStats(): {
        enabled: boolean;
        totalFaults: number;
        activeFaults: number;
        triggeredCount: number;
        config: FaultInjectionConfig;
    };
    private activateFault;
    private deactivateFault;
}
export declare const faultInjector: FaultInjector;
//# sourceMappingURL=index.d.ts.map