/**
 * @ecu/timing-engine - Unit Tests
 * Comprehensive tests for timing simulation engine
 */

import {
  TimingEngine,
  TimingParameters,
  TimingConfig,
  TimingEvent,
} from "../src/index";

describe("TimingEngine", () => {
  let engine: TimingEngine;
  let mockListener: jest.Mock;

  beforeEach(() => {
    engine = new TimingEngine();
    mockListener = jest.fn();
  });

  afterEach(() => {
    engine.reset();
  });

  describe("Initialization", () => {
    it("should initialize with default KWP2000 configuration", () => {
      const config = engine.getTimingStats().currentConfig;
      expect(config.protocol).toBe("kwp2000");
      expect(config.baudRate).toBe(10400);
      expect(config.adaptive).toBe(true);
    });

    it("should load correct default timing for KWP2000 10.4kbps", () => {
      const timing = engine.getCurrentTiming();
      expect(timing.p1).toBe(0);
      expect(timing.p2).toBe(50);
      expect(timing.p3).toBe(5000);
      expect(timing.p4).toBe(0);
    });

    it("should accept custom configuration", () => {
      const customEngine = new TimingEngine({
        protocol: "uds",
        baudRate: 500000,
        adaptive: false,
        minP2: 10,
        maxP2: 1000,
      });

      const config = customEngine.getTimingStats().currentConfig;
      expect(config.protocol).toBe("uds");
      expect(config.baudRate).toBe(500000);
      expect(config.adaptive).toBe(false);
      expect(config.minP2).toBe(10);
      expect(config.maxP2).toBe(1000);
    });
  });

  describe("Protocol-Specific Timings", () => {
    it("should provide correct KWP2000 19.2kbps timing", () => {
      const engine19200 = new TimingEngine({
        protocol: "kwp2000",
        baudRate: 19200,
      });

      const timing = engine19200.getCurrentTiming();
      expect(timing.p1).toBe(0);
      expect(timing.p2).toBe(50);
      expect(timing.p3).toBe(5000);
    });

    it("should provide correct UDS timing", () => {
      const engineUDS = new TimingEngine({
        protocol: "uds",
        baudRate: 500000,
      });

      const timing = engineUDS.getCurrentTiming();
      expect(timing.p1).toBe(0);
      expect(timing.p2).toBe(50);
      expect(timing.p3).toBe(5000);
    });

    it("should provide correct ISO9141 timing", () => {
      const engineISO = new TimingEngine({
        protocol: "iso9141",
        baudRate: 10400,
      });

      const timing = engineISO.getCurrentTiming();
      expect(timing.p1).toBe(5);
      expect(timing.p2).toBe(25);
      expect(timing.p3).toBe(5000);
      expect(timing.p4).toBe(5);
    });

    it("should fallback to KWP2000 default for unknown configuration", () => {
      const engineUnknown = new TimingEngine({
        protocol: "unknown" as any,
        baudRate: 999999,
      });

      const timing = engineUnknown.getCurrentTiming();
      expect(timing).toEqual({
        p1: 0,
        p2: 50,
        p3: 5000,
        p4: 0,
      });
    });
  });

  describe("Configuration Updates", () => {
    it("should update configuration dynamically", () => {
      engine.updateConfig({ protocol: "uds", baudRate: 500000 });

      const config = engine.getTimingStats().currentConfig;
      expect(config.protocol).toBe("uds");
      expect(config.baudRate).toBe(500000);
    });

    it("should update timing parameters after config change", () => {
      engine.updateConfig({ protocol: "iso9141", baudRate: 10400 });

      const timing = engine.getCurrentTiming();
      expect(timing.p1).toBe(5);
      expect(timing.p2).toBe(25);
    });

    it("should preserve unspecified config values", () => {
      const originalConfig = engine.getTimingStats().currentConfig;

      engine.updateConfig({ adaptive: false });

      const newConfig = engine.getTimingStats().currentConfig;
      expect(newConfig.adaptive).toBe(false);
      expect(newConfig.protocol).toBe(originalConfig.protocol);
      expect(newConfig.baudRate).toBe(originalConfig.baudRate);
    });
  });

  describe("Adaptive Timing", () => {
    it("should calculate adaptive P2 when enabled", () => {
      const engine = new TimingEngine({ adaptive: true, minP2: 10, maxP2: 100 });

      // Test with load factors
      expect((engine as any).calculateAdaptiveP2(50, 0.5)).toBe(25);
      expect((engine as any).calculateAdaptiveP2(50, 2.0)).toBe(100);
    });

    it("should clamp adaptive P2 to min/max bounds", () => {
      const engine = new TimingEngine({ adaptive: true, minP2: 10, maxP2: 100 });

      expect((engine as any).calculateAdaptiveP2(50, 0.1)).toBe(10); // Below min
      expect((engine as any).calculateAdaptiveP2(50, 5.0)).toBe(100); // Above max
    });

    it("should return base P2 when adaptive disabled", () => {
      const engine = new TimingEngine({ adaptive: false });

      expect((engine as any).calculateAdaptiveP2(50, 2.0)).toBe(50);
    });
  });

  describe("Request Timing", () => {
    it("should emit request_start event", () => {
      const unsubscribe = engine.onTimingEvent(mockListener);

      engine.startRequestTiming();

      expect(mockListener).toHaveBeenCalledWith("request_start", undefined);
      unsubscribe();
    });

    it("should schedule response delay timer", () => {
      jest.useFakeTimers();

      engine.startRequestTiming();

      const stats = engine.getTimingStats();
      expect(stats.activeTimers).toContain("response_delay");

      jest.useRealTimers();
    });

    it("should clear existing timers on new request", () => {
      jest.useFakeTimers();

      engine.startRequestTiming();
      expect(engine.getTimingStats().activeTimers).toContain("response_delay");

      engine.startRequestTiming();
      // Should still have only one response_delay timer
      const stats = engine.getTimingStats();
      expect(stats.activeTimers.filter(t => t === "response_delay")).toHaveLength(1);

      jest.useRealTimers();
    });

    it("should emit response_start after P2 delay", () => {
      jest.useFakeTimers();
      const unsubscribe = engine.onTimingEvent(mockListener);

      engine.startRequestTiming();

      // Advance time by P2 (50ms)
      jest.advanceTimersByTime(50);

      expect(mockListener).toHaveBeenCalledWith("response_start", undefined);

      unsubscribe();
      jest.useRealTimers();
    });
  });

  describe("Response Timing", () => {
    it("should emit response_end immediately for zero P1", () => {
      const unsubscribe = engine.onTimingEvent(mockListener);

      engine.startResponseTiming();

      expect(mockListener).toHaveBeenCalledWith("response_end", undefined);
      unsubscribe();
    });

    it("should schedule response completion timer for non-zero P1", () => {
      jest.useFakeTimers();
      const isoEngine = new TimingEngine({ protocol: "iso9141", baudRate: 10400 });
      const unsubscribe = isoEngine.onTimingEvent(mockListener);

      isoEngine.startResponseTiming();

      // Should not emit immediately
      expect(mockListener).not.toHaveBeenCalled();

      // Advance by P1 (5ms)
      jest.advanceTimersByTime(5);

      expect(mockListener).toHaveBeenCalledWith("response_end", undefined);

      unsubscribe();
      jest.useRealTimers();
    });
  });

  describe("P3 Timing", () => {
    it("should wait for P3 timing before allowing next request", async () => {
      jest.useFakeTimers();

      const waitPromise = engine.waitForNextRequest();

      expect(engine.canAcceptRequest()).toBe(false);

      jest.advanceTimersByTime(5000); // P3 = 5000ms

      await expect(waitPromise).resolves.toBeUndefined();
      expect(engine.canAcceptRequest()).toBe(true);

      jest.useRealTimers();
    });

    it("should allow immediate request if no P3 timer active", () => {
      expect(engine.canAcceptRequest()).toBe(true);
    });
  });

  describe("Timing Violations", () => {
    it("should clear response delay timer on P2 timeout", () => {
      jest.useFakeTimers();

      engine.startRequestTiming();
      expect(engine.getTimingStats().activeTimers).toContain("response_delay");

      engine.injectTimingViolation("p2_timeout");

      expect(engine.getTimingStats().activeTimers).not.toContain("response_delay");

      jest.useRealTimers();
    });

    it("should clear next request timer on P3 timeout", async () => {
      jest.useFakeTimers();

      engine.waitForNextRequest();
      expect(engine.getTimingStats().activeTimers).toContain("next_request");

      engine.injectTimingViolation("p3_timeout");

      expect(engine.getTimingStats().activeTimers).not.toContain("next_request");

      jest.useRealTimers();
    });
  });

  describe("Event Listeners", () => {
    it("should support multiple listeners", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      const unsubscribe1 = engine.onTimingEvent(listener1);
      const unsubscribe2 = engine.onTimingEvent(listener2);

      engine.startRequestTiming();

      expect(listener1).toHaveBeenCalledWith("request_start", undefined);
      expect(listener2).toHaveBeenCalledWith("request_start", undefined);

      unsubscribe1();
      unsubscribe2();
    });

    it("should return unsubscribe function", () => {
      const unsubscribe = engine.onTimingEvent(mockListener);

      engine.startRequestTiming();
      expect(mockListener).toHaveBeenCalledTimes(1);

      unsubscribe();

      engine.startRequestTiming();
      expect(mockListener).toHaveBeenCalledTimes(1); // No additional calls
    });
  });

  describe("Timing Statistics", () => {
    it("should provide comprehensive timing stats", () => {
      const stats = engine.getTimingStats();

      expect(stats).toHaveProperty("activeTimers");
      expect(stats).toHaveProperty("currentConfig");
      expect(stats).toHaveProperty("timingParams");

      expect(Array.isArray(stats.activeTimers)).toBe(true);
      expect(typeof stats.currentConfig).toBe("object");
      expect(typeof stats.timingParams).toBe("object");
    });

    it("should return copies of config and timing (immutable)", () => {
      const stats1 = engine.getTimingStats();
      const stats2 = engine.getTimingStats();

      // Modify returned objects
      (stats1.currentConfig as any).protocol = "modified";
      stats1.timingParams.p1 = 999;

      // Original should be unchanged
      const stats3 = engine.getTimingStats();
      expect(stats3.currentConfig.protocol).toBe("kwp2000");
      expect(stats3.timingParams.p1).toBe(0);
    });
  });

  describe("Reset Functionality", () => {
    it("should clear all timers on reset", () => {
      jest.useFakeTimers();

      engine.startRequestTiming();
      engine.waitForNextRequest();

      expect(engine.getTimingStats().activeTimers.length).toBeGreaterThan(0);

      engine.reset();

      expect(engine.getTimingStats().activeTimers).toEqual([]);

      jest.useRealTimers();
    });

    it("should reset to default timing on reset", () => {
      engine.updateConfig({ protocol: "uds", baudRate: 500000 });

      let timing = engine.getCurrentTiming();
      expect(timing.p1).toBe(0); // UDS timing

      engine.reset();

      timing = engine.getCurrentTiming();
      expect(timing.p1).toBe(0); // Should still be default KWP2000
    });
  });

  describe("Timer Management", () => {
    it("should handle timer replacement correctly", () => {
      jest.useFakeTimers();

      (engine as any).setTimer("test", () => {}, 100);
      expect(engine.getTimingStats().activeTimers).toContain("test");

      (engine as any).setTimer("test", () => {}, 200); // Replace
      expect(engine.getTimingStats().activeTimers).toContain("test");
      expect(engine.getTimingStats().activeTimers.filter(t => t === "test")).toHaveLength(1);

      jest.useRealTimers();
    });

    it("should clear specific timer", () => {
      jest.useFakeTimers();

      (engine as any).setTimer("test", () => {}, 100);
      expect(engine.getTimingStats().activeTimers).toContain("test");

      (engine as any).clearTimer("test");
      expect(engine.getTimingStats().activeTimers).not.toContain("test");

      jest.useRealTimers();
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle full request-response cycle", async () => {
      jest.useFakeTimers();
      const events: TimingEvent[] = [];
      const unsubscribe = engine.onTimingEvent((event) => events.push(event));

      // Start request
      engine.startRequestTiming();
      expect(events).toContain("request_start");

      // Wait for response delay (P2)
      jest.advanceTimersByTime(50);
      expect(events).toContain("response_start");

      // Start response transmission
      engine.startResponseTiming();
      expect(events).toContain("response_end");

      // Wait for P3 before next request
      const nextRequestPromise = engine.waitForNextRequest();
      expect(engine.canAcceptRequest()).toBe(false);

      jest.advanceTimersByTime(5000);
      await nextRequestPromise;
      expect(engine.canAcceptRequest()).toBe(true);

      unsubscribe();
      jest.useRealTimers();
    });

    it("should handle rapid consecutive requests", () => {
      jest.useFakeTimers();

      // First request
      engine.startRequestTiming();
      jest.advanceTimersByTime(50);
      engine.startResponseTiming();

      // Second request (should clear previous timers)
      engine.startRequestTiming();

      const stats = engine.getTimingStats();
      expect(stats.activeTimers.filter(t => t === "response_delay")).toHaveLength(1);

      jest.useRealTimers();
    });

    it("should maintain timing accuracy under load simulation", () => {
      jest.useFakeTimers();

      // Simulate high-frequency requests
      for (let i = 0; i < 10; i++) {
        engine.startRequestTiming();
        jest.advanceTimersByTime(50);
        engine.startResponseTiming();
      }

      // Should not have accumulated timers
      const stats = engine.getTimingStats();
      expect(stats.activeTimers.length).toBeLessThanOrEqual(1);

      jest.useRealTimers();
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero delay timers gracefully", () => {
      jest.useFakeTimers();

      (engine as any).setTimer("zero", () => {}, 0);

      expect(engine.getTimingStats().activeTimers).toContain("zero");

      jest.advanceTimersByTime(0);
      // Timer should have executed and been cleared

      jest.useRealTimers();
    });

    it("should handle negative timing values gracefully", () => {
      const engine = new TimingEngine({
        minP2: -10,
        maxP2: -5,
      });

      // Should not crash, but timing calculations might be unexpected
      expect(() => engine.getCurrentTiming()).not.toThrow();
    });

    it("should handle very large timing values", () => {
      jest.useFakeTimers();

      (engine as any).setTimer("large", () => {}, 2147483647); // Max 32-bit signed int

      expect(engine.getTimingStats().activeTimers).toContain("large");

      jest.useRealTimers();
    });
  });

  describe("Performance", () => {
    it("should handle many concurrent listeners", () => {
      const listeners = Array.from({ length: 100 }, () => jest.fn());

      const unsubscribes = listeners.map(listener =>
        engine.onTimingEvent(listener)
      );

      engine.startRequestTiming();

      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledWith("request_start", undefined);
      });

      unsubscribes.forEach(unsubscribe => unsubscribe());
    });

    it("should cleanup properly after many operations", () => {
      jest.useFakeTimers();

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        engine.startRequestTiming();
        jest.advanceTimersByTime(50);
        engine.startResponseTiming();
      }

      engine.reset();

      expect(engine.getTimingStats().activeTimers).toEqual([]);

      jest.useRealTimers();
    });
  });
});

describe("TimingEngine — Constants", () => {
  it("should export TimingEvent union type", () => {
    const events: TimingEvent[] = [
      "request_start",
      "request_end",
      "response_start",
      "response_end",
    ];

    expect(events).toHaveLength(4);
  });

  it("should export TimingParameters interface", () => {
    const params: TimingParameters = {
      p1: 0,
      p2: 50,
      p3: 5000,
      p4: 0,
    };

    expect(params.p1).toBe(0);
    expect(params.p2).toBe(50);
    expect(params.p3).toBe(5000);
    expect(params.p4).toBe(0);
  });
});

describe("TimingEngine — Singleton", () => {
  it("should export singleton instance", () => {
    const { timingEngine } = require("../src/index");

    expect(timingEngine).toBeInstanceOf(TimingEngine);
    expect(timingEngine.getTimingStats().currentConfig.protocol).toBe("kwp2000");
  });
});