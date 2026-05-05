"use strict";
/**
 * @ecu/fault-injector
 * Fault injection engine for ECU testing and simulation.
 * Enables controlled introduction of faults for diagnostic testing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.faultInjector = exports.FaultInjector = void 0;
// ─── Fault Definitions ───────────────────────────────────────────────────────
const DEFAULT_FAULTS = {
    // Communication Faults
    comm_timeout: {
        id: "comm_timeout",
        name: "Communication Timeout",
        description: "ECU fails to respond within expected time",
        category: "communication",
        severity: "high",
        probability: 0.05,
        active: false,
        triggerCount: 0,
    },
    comm_noise: {
        id: "comm_noise",
        name: "Communication Noise",
        description: "Random bits flipped in communication",
        category: "communication",
        severity: "medium",
        probability: 0.1,
        active: false,
        triggerCount: 0,
    },
    comm_disconnect: {
        id: "comm_disconnect",
        name: "Connection Loss",
        description: "Transport connection unexpectedly drops",
        category: "communication",
        severity: "critical",
        probability: 0.01,
        active: false,
        triggerCount: 0,
    },
    // Sensor Faults
    sensor_short_circuit: {
        id: "sensor_short_circuit",
        name: "Sensor Short Circuit",
        description: "Sensor reports maximum value due to short",
        category: "sensor",
        severity: "medium",
        probability: 0.03,
        active: false,
        triggerCount: 0,
    },
    sensor_open_circuit: {
        id: "sensor_open_circuit",
        name: "Sensor Open Circuit",
        description: "Sensor reports minimum value due to open circuit",
        category: "sensor",
        severity: "medium",
        probability: 0.03,
        active: false,
        triggerCount: 0,
    },
    sensor_drift: {
        id: "sensor_drift",
        name: "Sensor Drift",
        description: "Sensor value slowly drifts from actual value",
        category: "sensor",
        severity: "low",
        probability: 0.2,
        active: false,
        triggerCount: 0,
    },
    // Actuator Faults
    actuator_stuck: {
        id: "actuator_stuck",
        name: "Actuator Stuck",
        description: "Actuator fails to respond to commands",
        category: "actuator",
        severity: "high",
        probability: 0.02,
        active: false,
        triggerCount: 0,
    },
    actuator_overcurrent: {
        id: "actuator_overcurrent",
        name: "Actuator Overcurrent",
        description: "Actuator draws excessive current",
        category: "actuator",
        severity: "high",
        probability: 0.01,
        active: false,
        triggerCount: 0,
    },
    // Memory Faults
    memory_corruption: {
        id: "memory_corruption",
        name: "Memory Corruption",
        description: "Random memory locations become corrupted",
        category: "memory",
        severity: "critical",
        probability: 0.005,
        active: false,
        triggerCount: 0,
    },
    eeprom_failure: {
        id: "eeprom_failure",
        name: "EEPROM Failure",
        description: "EEPROM read/write operations fail",
        category: "memory",
        severity: "high",
        probability: 0.01,
        active: false,
        triggerCount: 0,
    },
    // Timing Faults
    timing_violation: {
        id: "timing_violation",
        name: "Timing Violation",
        description: "ECU violates protocol timing requirements",
        category: "timing",
        severity: "medium",
        probability: 0.1,
        active: false,
        triggerCount: 0,
    },
};
// ─── Fault Injector ──────────────────────────────────────────────────────────
class FaultInjector {
    constructor(config = {}) {
        this.faults = new Map();
        this.activeFaults = new Set();
        this.recoveryTimers = new Map();
        this.config = {
            enabled: false,
            globalProbability: 0.05,
            maxConcurrentFaults: 3,
            autoRecovery: true,
            recoveryDelayMs: 30000, // 30 seconds
            ...config,
        };
        // Load default faults
        Object.values(DEFAULT_FAULTS).forEach((fault) => {
            this.faults.set(fault.id, { ...fault });
        });
    }
    /** Enable fault injection */
    enable() {
        this.config.enabled = true;
    }
    /** Disable fault injection */
    disable() {
        this.config.enabled = false;
        this.clearAllActiveFaults();
    }
    /** Check if fault injection is enabled */
    isEnabled() {
        return this.config.enabled;
    }
    /** Update configuration */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /** Get current configuration */
    getConfig() {
        return { ...this.config };
    }
    /** Register custom fault condition */
    registerFault(fault) {
        this.faults.set(fault.id, { ...fault });
    }
    /** Get fault condition by ID */
    getFault(id) {
        return this.faults.get(id);
    }
    /** Get all fault conditions */
    getAllFaults() {
        return Array.from(this.faults.values());
    }
    /** Get faults by category */
    getFaultsByCategory(category) {
        return this.getAllFaults().filter((fault) => fault.category === category);
    }
    /** Get active faults */
    getActiveFaults() {
        return Array.from(this.activeFaults)
            .map((id) => this.faults.get(id))
            .filter(Boolean);
    }
    /** Manually trigger fault */
    triggerFault(id) {
        if (!this.config.enabled)
            return false;
        if (this.activeFaults.size >= this.config.maxConcurrentFaults)
            return false;
        const fault = this.faults.get(id);
        if (!fault)
            return false;
        return this.activateFault(fault);
    }
    /** Clear specific fault */
    clearFault(id) {
        const fault = this.faults.get(id);
        if (!fault)
            return;
        this.deactivateFault(fault);
    }
    /** Clear all active faults */
    clearAllActiveFaults() {
        Array.from(this.activeFaults).forEach((id) => {
            const fault = this.faults.get(id);
            if (fault) {
                this.deactivateFault(fault);
            }
        });
    }
    /** Check if random fault should be triggered */
    shouldTriggerRandomFault() {
        if (!this.config.enabled)
            return false;
        if (this.activeFaults.size >= this.config.maxConcurrentFaults)
            return false;
        return Math.random() < this.config.globalProbability;
    }
    /** Trigger random fault */
    triggerRandomFault() {
        if (!this.shouldTriggerRandomFault())
            return null;
        const availableFaults = this.getAllFaults().filter((fault) => !this.activeFaults.has(fault.id) && Math.random() < fault.probability);
        if (availableFaults.length === 0)
            return null;
        const randomFault = availableFaults[Math.floor(Math.random() * availableFaults.length)];
        if (!randomFault)
            return null;
        this.activateFault(randomFault);
        return randomFault;
    }
    /** Get fault injection statistics */
    getStats() {
        const totalTriggered = Array.from(this.faults.values()).reduce((sum, fault) => sum + fault.triggerCount, 0);
        return {
            enabled: this.config.enabled,
            totalFaults: this.faults.size,
            activeFaults: this.activeFaults.size,
            triggeredCount: totalTriggered,
            config: { ...this.config },
        };
    }
    activateFault(fault) {
        if (this.activeFaults.has(fault.id))
            return false;
        this.activeFaults.add(fault.id);
        fault.active = true;
        fault.triggerCount++;
        fault.lastTriggered = new Date();
        // Schedule auto-recovery if enabled
        if (this.config.autoRecovery) {
            const timer = setTimeout(() => {
                this.deactivateFault(fault);
            }, this.config.recoveryDelayMs);
            this.recoveryTimers.set(fault.id, timer);
        }
        return true;
    }
    deactivateFault(fault) {
        this.activeFaults.delete(fault.id);
        fault.active = false;
        // Clear recovery timer
        const timer = this.recoveryTimers.get(fault.id);
        if (timer) {
            clearTimeout(timer);
            this.recoveryTimers.delete(fault.id);
        }
    }
}
exports.FaultInjector = FaultInjector;
// ─── Singleton Instance ──────────────────────────────────────────────────────
exports.faultInjector = new FaultInjector();
//# sourceMappingURL=index.js.map