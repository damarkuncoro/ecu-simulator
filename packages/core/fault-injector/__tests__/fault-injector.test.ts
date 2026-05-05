/**
 * @ecu/fault-injector - Unit Tests
 * Comprehensive tests for fault injection engine
 */

import {
  FaultInjector,
  FaultCondition,
  FaultInjectionConfig,
} from "../src/index";

describe("FaultInjector", () => {
  let injector: FaultInjector;
  let mockFault: FaultCondition;

  beforeEach(() => {
    injector = new FaultInjector();
    mockFault = {
      id: "test_fault",
      name: "Test Fault",
      description: "A test fault condition",
      category: "communication",
      severity: "medium",
      probability: 0.5,
      active: false,
      triggerCount: 0,
    };
  });

  afterEach(() => {
    injector.disable();
  });

  describe("Initialization", () => {
    it("should initialize with default configuration", () => {
      const config = injector.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.globalProbability).toBe(0.05);
      expect(config.maxConcurrentFaults).toBe(3);
      expect(config.autoRecovery).toBe(true);
      expect(config.recoveryDelayMs).toBe(30000);
    });

    it("should accept custom configuration", () => {
      const customInjector = new FaultInjector({
        enabled: true,
        globalProbability: 0.1,
        maxConcurrentFaults: 5,
        autoRecovery: false,
        recoveryDelayMs: 60000,
      });

      const config = customInjector.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.globalProbability).toBe(0.1);
      expect(config.maxConcurrentFaults).toBe(5);
      expect(config.autoRecovery).toBe(false);
      expect(config.recoveryDelayMs).toBe(60000);
    });

    it("should load default fault conditions", () => {
      const faults = injector.getAllFaults();
      expect(faults.length).toBeGreaterThan(0);

      // Check that default faults are loaded
      const commTimeout = injector.getFault("comm_timeout");
      expect(commTimeout).toBeDefined();
      expect(commTimeout?.category).toBe("communication");
    });
  });

  describe("Configuration Management", () => {
    it("should enable fault injection", () => {
      expect(injector.isEnabled()).toBe(false);
      injector.enable();
      expect(injector.isEnabled()).toBe(true);
    });

    it("should disable fault injection", () => {
      injector.enable();
      expect(injector.isEnabled()).toBe(true);
      injector.disable();
      expect(injector.isEnabled()).toBe(false);
    });

    it("should update configuration", () => {
      injector.updateConfig({ globalProbability: 0.2, maxConcurrentFaults: 10 });

      const config = injector.getConfig();
      expect(config.globalProbability).toBe(0.2);
      expect(config.maxConcurrentFaults).toBe(10);
    });

    it("should return copy of configuration (immutable)", () => {
      const config1 = injector.getConfig();
      config1.globalProbability = 0.9;

      const config2 = injector.getConfig();
      expect(config2.globalProbability).toBe(0.05); // Unchanged
    });
  });

  describe("Fault Registration", () => {
    it("should register custom fault", () => {
      injector.registerFault(mockFault);

      const retrieved = injector.getFault("test_fault");
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("Test Fault");
      expect(retrieved?.category).toBe("communication");
    });

    it("should update existing fault when re-registering", () => {
      injector.registerFault(mockFault);

      const updatedFault = { ...mockFault, name: "Updated Name" };
      injector.registerFault(updatedFault);

      const retrieved = injector.getFault("test_fault");
      expect(retrieved?.name).toBe("Updated Name");
    });

    it("should return undefined for non-existent fault", () => {
      const fault = injector.getFault("non_existent");
      expect(fault).toBeUndefined();
    });
  });

  describe("Fault Queries", () => {
    beforeEach(() => {
      // Clear default faults for predictable test results
      (injector as any).faults.clear();
      injector.registerFault(mockFault);
      injector.registerFault({
        ...mockFault,
        id: "sensor_fault",
        category: "sensor",
      });
      injector.registerFault({
        ...mockFault,
        id: "memory_fault",
        category: "memory",
      });
    });

    it("should get all faults", () => {
      const faults = injector.getAllFaults();
      expect(faults.length).toBeGreaterThanOrEqual(3); // At least our registered ones
    });

    it("should filter faults by category", () => {
      const sensorFaults = injector.getFaultsByCategory("sensor");
      expect(sensorFaults.length).toBe(1);
      expect(sensorFaults[0]?.id).toBe("sensor_fault");

      const commFaults = injector.getFaultsByCategory("communication");
      expect(commFaults.length).toBeGreaterThanOrEqual(1);
      expect(commFaults.some(f => f.id === "test_fault")).toBe(true);
    });

    it("should return empty array for category with no faults", () => {
      const actuatorFaults = injector.getFaultsByCategory("actuator");
      expect(actuatorFaults).toEqual([]);
    });
  });

  describe("Manual Fault Triggering", () => {
    beforeEach(() => {
      injector.registerFault(mockFault);
    });

    it("should not trigger fault when disabled", () => {
      expect(injector.isEnabled()).toBe(false);
      const result = injector.triggerFault("test_fault");
      expect(result).toBe(false);
      expect(injector.getActiveFaults()).toHaveLength(0);
    });

    it("should trigger fault when enabled", () => {
      injector.enable();

      const result = injector.triggerFault("test_fault");
      expect(result).toBe(true);

      const activeFaults = injector.getActiveFaults();
      expect(activeFaults).toHaveLength(1);
      expect(activeFaults[0]?.id).toBe("test_fault");
    });

    it("should not trigger non-existent fault", () => {
      injector.enable();

      const result = injector.triggerFault("non_existent");
      expect(result).toBe(false);
    });

    it("should not trigger already active fault", () => {
      injector.enable();

      injector.triggerFault("test_fault");
      const result = injector.triggerFault("test_fault"); // Try again

      expect(result).toBe(false);
      expect(injector.getActiveFaults()).toHaveLength(1);
    });

    it("should update fault statistics on trigger", () => {
      injector.enable();

      const beforeTrigger = injector.getFault("test_fault");
      expect(beforeTrigger?.triggerCount).toBe(0);

      injector.triggerFault("test_fault");

      const afterTrigger = injector.getFault("test_fault");
      expect(afterTrigger?.triggerCount).toBe(1);
      expect(afterTrigger?.active).toBe(true);
      expect(afterTrigger?.lastTriggered).toBeInstanceOf(Date);
    });
  });

  describe("Fault Clearing", () => {
    beforeEach(() => {
      injector.registerFault(mockFault);
      injector.enable();
    });

    it("should clear specific fault", () => {
      injector.triggerFault("test_fault");
      expect(injector.getActiveFaults()).toHaveLength(1);

      injector.clearFault("test_fault");
      expect(injector.getActiveFaults()).toHaveLength(0);

      const fault = injector.getFault("test_fault");
      expect(fault?.active).toBe(false);
    });

    it("should do nothing when clearing non-existent fault", () => {
      injector.triggerFault("test_fault");
      expect(injector.getActiveFaults()).toHaveLength(1);

      injector.clearFault("non_existent");
      expect(injector.getActiveFaults()).toHaveLength(1);
    });

    it("should clear all active faults", () => {
      const fault2 = { ...mockFault, id: "fault2" };
      injector.registerFault(fault2);

      injector.triggerFault("test_fault");
      injector.triggerFault("fault2");
      expect(injector.getActiveFaults()).toHaveLength(2);

      injector.clearAllActiveFaults();
      expect(injector.getActiveFaults()).toHaveLength(0);
    });

    it("should disable and clear all faults", () => {
      injector.triggerFault("test_fault");
      expect(injector.getActiveFaults()).toHaveLength(1);
      expect(injector.isEnabled()).toBe(true);

      injector.disable();
      expect(injector.isEnabled()).toBe(false);
      expect(injector.getActiveFaults()).toHaveLength(0);
    });
  });

  describe("Random Fault Triggering", () => {
    beforeEach(() => {
      injector.registerFault(mockFault);
    });

    it("should not trigger random fault when disabled", () => {
      const result = injector.triggerRandomFault();
      expect(result).toBeNull();
    });

    it("should check random trigger conditions", () => {
      injector.enable();

      // With very low probability, should not trigger
      injector.updateConfig({ globalProbability: 0.0 });
      expect(injector.shouldTriggerRandomFault()).toBe(false);

      // With high probability, should trigger (but depends on random)
      injector.updateConfig({ globalProbability: 1.0 });
      expect(injector.shouldTriggerRandomFault()).toBe(true);
    });

    it("should not trigger when at max concurrent faults", () => {
      injector.enable();
      injector.updateConfig({ maxConcurrentFaults: 0 });

      expect(injector.shouldTriggerRandomFault()).toBe(false);
    });

    it("should trigger random fault with high probability", () => {
      injector.enable();
      injector.updateConfig({ globalProbability: 1.0 });

      // Set fault probability to 1.0 as well
      const highProbFault = { ...mockFault, probability: 1.0 };
      injector.registerFault(highProbFault);

      const result = injector.triggerRandomFault();
      expect(result).not.toBeNull();
      expect(result?.id).toBe("test_fault");
    });

    it("should respect individual fault probabilities", () => {
      injector.enable();
      injector.updateConfig({ globalProbability: 1.0 });

      // Register fault with zero probability
      const zeroProbFault = { ...mockFault, id: "zero_prob", probability: 0.0 };
      injector.registerFault(zeroProbFault);

      // Should not trigger zero probability fault
      // (This is probabilistic, but with enough attempts should work)
      let triggered = false;
      for (let i = 0; i < 100; i++) {
        const result = injector.triggerRandomFault();
        if (result?.id === "zero_prob") {
          triggered = true;
          break;
        }
      }
      expect(triggered).toBe(false);
    });
  });

  describe("Auto Recovery", () => {
    beforeEach(() => {
      injector.registerFault(mockFault);
      injector.enable();
    });

    it("should schedule auto recovery when enabled", () => {
      jest.useFakeTimers();

      injector.triggerFault("test_fault");
      expect(injector.getActiveFaults()).toHaveLength(1);

      // Fast-forward past recovery delay
      jest.advanceTimersByTime(30000);

      expect(injector.getActiveFaults()).toHaveLength(0);

      jest.useRealTimers();
    });

    it("should not auto recover when disabled", () => {
      injector.updateConfig({ autoRecovery: false });
      jest.useFakeTimers();

      injector.triggerFault("test_fault");
      expect(injector.getActiveFaults()).toHaveLength(1);

      // Fast-forward past recovery delay
      jest.advanceTimersByTime(30000);

      // Should still be active
      expect(injector.getActiveFaults()).toHaveLength(1);

      jest.useRealTimers();
    });

    it("should clear recovery timer on manual clear", () => {
      jest.useFakeTimers();

      injector.triggerFault("test_fault");

      // Manually clear before auto-recovery
      injector.clearFault("test_fault");
      expect(injector.getActiveFaults()).toHaveLength(0);

      // Fast-forward past recovery delay - should not reactivate
      jest.advanceTimersByTime(30000);
      expect(injector.getActiveFaults()).toHaveLength(0);

      jest.useRealTimers();
    });
  });

  describe("Statistics", () => {
    it("should provide comprehensive statistics", () => {
      injector.registerFault(mockFault);
      injector.enable();
      injector.triggerFault("test_fault");

      const stats = injector.getStats();

      expect(stats.enabled).toBe(true);
      expect(stats.totalFaults).toBeGreaterThan(0);
      expect(stats.activeFaults).toBe(1);
      expect(stats.triggeredCount).toBe(1);
      expect(stats.config).toBeDefined();
    });

    it("should track trigger counts across multiple faults", () => {
      // Clear default faults for predictable counts
      (injector as any).faults.clear();
      injector.registerFault(mockFault);
      const fault2 = { ...mockFault, id: "fault2" };
      injector.registerFault(fault2);
      injector.enable();
      injector.updateConfig({ maxConcurrentFaults: 3 }); // Allow multiple concurrent

      injector.triggerFault("test_fault");
      injector.triggerFault("fault2");
      injector.clearFault("fault2"); // Clear one to allow re-triggering
      injector.clearFault("test_fault"); // Clear test_fault so it can be triggered again
      injector.triggerFault("test_fault"); // Trigger again

      const stats = injector.getStats();
      expect(stats.triggeredCount).toBe(3);

      const fault1 = injector.getFault("test_fault");
      const fault2Retrieved = injector.getFault("fault2");
      expect(fault1?.triggerCount).toBe(2);
      expect(fault2Retrieved?.triggerCount).toBe(1);
    });

    it("should return copy of config in stats (immutable)", () => {
      const stats = injector.getStats();
      stats.config.globalProbability = 0.9;

      const originalConfig = injector.getConfig();
      expect(originalConfig.globalProbability).toBe(0.05);
    });
  });

  describe("Default Faults", () => {
    it("should include all default fault categories", () => {
      const faults = injector.getAllFaults();
      const categories = [...new Set(faults.map(f => f.category))];

      expect(categories).toContain("communication");
      expect(categories).toContain("sensor");
      expect(categories).toContain("actuator");
      expect(categories).toContain("memory");
      expect(categories).toContain("timing");
    });

    it("should have realistic default probabilities", () => {
      const faults = injector.getAllFaults();

      faults.forEach(fault => {
        expect(fault.probability).toBeGreaterThanOrEqual(0.0);
        expect(fault.probability).toBeLessThanOrEqual(1.0);
      });
    });

    it("should have appropriate severity levels", () => {
      const faults = injector.getAllFaults();
      const severities = ["low", "medium", "high", "critical"];

      faults.forEach(fault => {
        expect(severities).toContain(fault.severity);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty fault registry", () => {
      const emptyInjector = new FaultInjector();
      // Clear all faults (this is a bit hacky but for testing)
      (emptyInjector as any).faults.clear();

      expect(emptyInjector.getAllFaults()).toEqual([]);
      expect(emptyInjector.getActiveFaults()).toEqual([]);
      expect(emptyInjector.triggerRandomFault()).toBeNull();
    });

    it("should handle maximum concurrent faults", () => {
      injector.updateConfig({ maxConcurrentFaults: 1 });
      injector.enable();

      // Clear default faults and register test faults
      (injector as any).faults.clear();
      const fault1 = { ...mockFault, id: "fault1" };
      const fault2 = { ...mockFault, id: "fault2" };
      injector.registerFault(fault1);
      injector.registerFault(fault2);

      injector.triggerFault("fault1");
      expect(injector.getActiveFaults()).toHaveLength(1);

      injector.triggerFault("fault2");
      expect(injector.getActiveFaults()).toHaveLength(1); // Still 1, not 2
    });

    it("should handle zero recovery delay", () => {
      injector.updateConfig({ recoveryDelayMs: 0 });
      injector.enable();
      jest.useFakeTimers();

      injector.triggerFault("test_fault");
      // Should recover immediately
      expect(injector.getActiveFaults()).toHaveLength(0);

      jest.useRealTimers();
    });

    it("should handle very large recovery delay", () => {
      injector.updateConfig({ recoveryDelayMs: 100000 }); // Large but testable delay
      injector.enable();
      jest.useFakeTimers();

      injector.registerFault(mockFault);
      injector.triggerFault("test_fault");
      expect(injector.getActiveFaults()).toHaveLength(1);

      // Even after a reasonable time, should still be active
      jest.advanceTimersByTime(50000);
      expect(injector.getActiveFaults()).toHaveLength(1);

      jest.useRealTimers();
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle rapid trigger/clear cycles", () => {
      injector.enable();
      injector.registerFault(mockFault);

      for (let i = 0; i < 100; i++) {
        injector.triggerFault("test_fault");
        injector.clearFault("test_fault");
      }

      expect(injector.getActiveFaults()).toHaveLength(0);
      const fault = injector.getFault("test_fault");
      expect(fault?.triggerCount).toBe(100);
    });

    it("should handle multiple random triggers", () => {
      injector.enable();
      injector.updateConfig({ globalProbability: 1.0 });

      const highProbFault = { ...mockFault, probability: 1.0 };
      injector.registerFault(highProbFault);

      for (let i = 0; i < 50; i++) {
        injector.triggerRandomFault();
      }

      // Should not exceed max concurrent faults
      expect(injector.getActiveFaults().length).toBeLessThanOrEqual(3);
    });
  });

  describe("FaultInjector — Singleton", () => {
    it("should export singleton instance", () => {
      const { faultInjector } = require("../src/index");

      expect(faultInjector).toBeInstanceOf(FaultInjector);
      expect(faultInjector.isEnabled()).toBe(false);
    });
  });
});