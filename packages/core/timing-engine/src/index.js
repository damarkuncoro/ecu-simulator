"use strict";
/**
 * @ecu/timing-engine
 * ECU timing simulation engine for P1/P2/P3/P4 parameters.
 * Implements ISO 14230-2 (KWP2000) and ISO 15765-3 (UDS) timing requirements.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.timingEngine = exports.TimingEngine = void 0;
// ─── Protocol-Specific Timing ────────────────────────────────────────────────
const DEFAULT_TIMINGS = {
    // KWP2000 default timings (ISO 14230-2)
    kwp2000_10400: {
        p1: 0, // No inter-byte timing at 10.4kbps
        p2: 50,
        p3: 5000,
        p4: 0,
    },
    kwp2000_19200: {
        p1: 0,
        p2: 50,
        p3: 5000,
        p4: 0,
    },
    // UDS default timings (ISO 15765-3)
    uds_500000: {
        p1: 0,
        p2: 50,
        p3: 5000,
        p4: 0,
    },
    // ISO9141-2 timings (5-baud init)
    iso9141_10400: {
        p1: 5, // 5ms inter-byte
        p2: 25,
        p3: 5000,
        p4: 5,
    },
};
// ─── Timing Engine ───────────────────────────────────────────────────────────
class TimingEngine {
    constructor(config = {}) {
        this.timers = new Map();
        this.listeners = new Set();
        this.config = {
            protocol: "kwp2000",
            baudRate: 10400,
            adaptive: true,
            minP2: 25,
            maxP2: 5000,
            ...config,
        };
        this.currentTiming = this.getDefaultTiming();
    }
    /** Get default timing for current configuration */
    getDefaultTiming() {
        const key = `${this.config.protocol}_${this.config.baudRate}`;
        const timing = DEFAULT_TIMINGS[key];
        return (timing ?? DEFAULT_TIMINGS.kwp2000_10400);
    }
    /** Update timing configuration */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        this.currentTiming = this.getDefaultTiming();
    }
    /** Get current timing parameters */
    getCurrentTiming() {
        return { ...this.currentTiming };
    }
    /** Calculate adaptive P2 timing based on ECU load */
    calculateAdaptiveP2(baseP2, loadFactor = 1) {
        if (!this.config.adaptive)
            return baseP2;
        // Adjust P2 based on load factor (0.1 = low load, 2.0 = high load)
        const adaptiveP2 = Math.round(baseP2 * loadFactor);
        // Clamp to configured min/max
        return Math.max(this.config.minP2, Math.min(this.config.maxP2, adaptiveP2));
    }
    /** Start timing for incoming request */
    startRequestTiming() {
        this.emit("request_start");
        // Clear any existing timers
        this.clearAllTimers();
        // Simulate ECU processing time (P2 timing)
        const processingTime = this.calculateAdaptiveP2(this.currentTiming.p2);
        this.setTimer("response_delay", () => {
            this.emit("response_start");
        }, processingTime);
    }
    /** Start timing for ECU response */
    startResponseTiming() {
        // Simulate response transmission time based on P1
        if (this.currentTiming.p1 > 0) {
            // For byte-by-byte transmission
            this.setTimer("response_complete", () => {
                this.emit("response_end");
            }, this.currentTiming.p1);
        }
        else {
            // Immediate response for high-speed protocols
            this.emit("response_end");
        }
    }
    /** Wait for P3 timing before allowing next request */
    waitForNextRequest() {
        return new Promise((resolve) => {
            this.setTimer("next_request", () => {
                this.clearTimer("next_request");
                resolve();
            }, this.currentTiming.p3);
        });
    }
    /** Check if timing allows new request */
    canAcceptRequest() {
        return !this.timers.has("next_request");
    }
    /** Simulate timing violation for testing */
    injectTimingViolation(type) {
        switch (type) {
            case "p2_timeout":
                // ECU response timeout
                this.clearTimer("response_delay");
                break;
            case "p3_timeout":
                // Tester request timeout
                this.clearTimer("next_request");
                break;
        }
    }
    /** Add timing event listener */
    onTimingEvent(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    /** Get timing statistics */
    getTimingStats() {
        return {
            activeTimers: Array.from(this.timers.keys()),
            currentConfig: { ...this.config },
            timingParams: { ...this.currentTiming },
        };
    }
    /** Reset timing engine */
    reset() {
        this.clearAllTimers();
        this.currentTiming = this.getDefaultTiming();
    }
    emit(event, data) {
        Array.from(this.listeners).forEach((listener) => {
            listener(event, data);
        });
    }
    setTimer(name, callback, delay) {
        this.clearTimer(name);
        this.timers.set(name, setTimeout(callback, delay));
    }
    clearTimer(name) {
        const timer = this.timers.get(name);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(name);
        }
    }
    clearAllTimers() {
        Array.from(this.timers.entries()).forEach(([name, timer]) => {
            clearTimeout(timer);
        });
        this.timers.clear();
    }
}
exports.TimingEngine = TimingEngine;
// ─── Singleton Instance ──────────────────────────────────────────────────────
exports.timingEngine = new TimingEngine();
//# sourceMappingURL=index.js.map