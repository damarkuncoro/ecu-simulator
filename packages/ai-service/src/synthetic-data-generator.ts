/**
 * Synthetic Data Generator for AI Training
 * Uses the fault injector to generate realistic ECU telemetry data with faults
 */

import { faultInjector } from "@ecu/fault-injector";
import { didRegistry } from "@ecu/did-registry";
import { timingEngine } from "@ecu/timing-engine";
import { Logger } from "@ecu/logger";
import { TelemetryData } from "./index";

export interface SyntheticDataConfig {
  durationSeconds: number; // How long to simulate
  sampleRateHz: number; // Samples per second
  faultInjectionRate: number; // Probability of injecting faults
  normalDataRatio: number; // Ratio of normal vs faulty data
}

export class SyntheticDataGenerator {
  private logger = new Logger("synthetic-data");
  private config: SyntheticDataConfig;

  constructor(config: Partial<SyntheticDataConfig> = {}) {
    this.config = {
      durationSeconds: 3600, // 1 hour
      sampleRateHz: 10, // 10 samples/second
      faultInjectionRate: 0.1, // 10% chance of fault injection
      normalDataRatio: 0.7, // 70% normal data
      ...config,
    };
  }

  async generateDataset(): Promise<{
    features: TelemetryData[];
    labels: number[];
  }> {
    this.logger.info("Generating synthetic dataset", this.config);

    const features: TelemetryData[] = [];
    const labels: number[] = [];
    const totalSamples = this.config.durationSeconds * this.config.sampleRateHz;

    // Initialize normal baseline
    this.initializeNormalState();

    for (let i = 0; i < totalSamples; i++) {
      const timestamp = Date.now() + (i * 1000) / this.config.sampleRateHz;
      const isFaulty = Math.random() > this.config.normalDataRatio;

      let faultLabel = 0; // 0 = normal

      if (isFaulty && Math.random() < this.config.faultInjectionRate) {
        faultLabel = this.injectRandomFault();
      }

      // Generate telemetry data
      const telemetry = this.generateTelemetrySample(timestamp, faultLabel > 0);
      features.push(telemetry);
      labels.push(faultLabel);

      // Small delay to simulate real-time generation
      if (i % 100 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    }

    // Clean up injected faults
    faultInjector.clearAllActiveFaults();

    this.logger.info("Dataset generation completed", {
      totalSamples,
      faultySamples: labels.filter((l) => l > 0).length,
      normalSamples: labels.filter((l) => l === 0).length,
    });

    return { features, labels };
  }

  async generateStreamingData(
    callback: (data: TelemetryData, isFaulty: boolean) => void,
  ): Promise<void> {
    this.logger.info("Starting streaming synthetic data generation");

    // Initialize normal baseline
    this.initializeNormalState();

    const interval = 1000 / this.config.sampleRateHz;

    const timer = setInterval(() => {
      const timestamp = Date.now();
      const isFaulty = Math.random() > this.config.normalDataRatio;

      if (isFaulty && Math.random() < this.config.faultInjectionRate) {
        this.injectRandomFault();
      }

      const telemetry = this.generateTelemetrySample(timestamp, isFaulty);
      callback(telemetry, isFaulty);
    }, interval);

    // Stop after duration
    setTimeout(() => {
      clearInterval(timer);
      faultInjector.clearAllActiveFaults();
      this.logger.info("Streaming data generation completed");
    }, this.config.durationSeconds * 1000);
  }

  private initializeNormalState(): void {
    // Set normal DID values
    didRegistry.setValue(0x0001, Buffer.from([75])); // Coolant temp: 75°C
    didRegistry.setValue(0x0002, Buffer.from([0x0f, 0xa0])); // RPM: 4000
    didRegistry.setValue(0x0003, Buffer.from([80])); // Speed: 80 km/h
    didRegistry.setValue(0x0004, Buffer.from([45])); // Load: 45%

    this.logger.debug("Normal ECU state initialized");
  }

  private injectRandomFault(): number {
    const faults = faultInjector.getAllFaults();
    const randomFault = faults[Math.floor(Math.random() * faults.length)];

    if (randomFault && faultInjector.triggerFault(randomFault.id)) {
      this.logger.debug("Injected fault", { fault: randomFault.name });
      return this.mapFaultToLabel(randomFault.id);
    }

    return 0;
  }

  private generateTelemetrySample(
    timestamp: number,
    hasFault: boolean,
  ): TelemetryData {
    // Get current DID values
    const dids: Record<number, number> = {};
    didRegistry.getAllValues().forEach((value) => {
      dids[value.id] = value.data.readUIntBE(0, value.data.length);
    });

    // Add some noise to normal values
    if (!hasFault) {
      Object.keys(dids).forEach((id) => {
        const baseValue = dids[id];
        const noise = (Math.random() - 0.5) * 0.1 * baseValue; // ±5% noise
        dids[id] = Math.max(0, baseValue + noise);
      });
    }

    // Get active DTCs (simplified)
    const dtcs = hasFault ? ["P0300", "P0171"] : [];

    // Get timing parameters
    const timing = timingEngine.getCurrentTiming();

    // Simulate error count based on fault status
    const errors = hasFault ? Math.floor(Math.random() * 5) + 1 : 0;

    return {
      timestamp,
      dids,
      dtcs,
      timing,
      errors,
    };
  }

  private mapFaultToLabel(faultId: string): number {
    const faultLabels: Record<string, number> = {
      sensor_short_circuit: 1,
      sensor_open_circuit: 1,
      sensor_drift: 1,
      actuator_stuck: 2,
      actuator_overcurrent: 2,
      communication_timeout: 3,
      communication_noise: 3,
      comm_disconnect: 3,
      memory_corruption: 4,
      eeprom_failure: 4,
      timing_violation: 5,
    };

    return faultLabels[faultId] || 1;
  }

  // Generate specific fault scenarios for training
  async generateFaultScenarios(): Promise<{
    features: TelemetryData[];
    labels: number[];
  }> {
    const features: TelemetryData[] = [];
    const labels: number[] = [];

    const scenarios = [
      { faultId: "sensor_drift", duration: 300 }, // 5 minutes
      { faultId: "communication_timeout", duration: 120 }, // 2 minutes
      { faultId: "timing_violation", duration: 180 }, // 3 minutes
      { faultId: "memory_corruption", duration: 60 }, // 1 minute
    ];

    for (const scenario of scenarios) {
      this.logger.info("Generating fault scenario", scenario);

      // Generate normal data first
      const normalSamples = 100;
      for (let i = 0; i < normalSamples; i++) {
        const telemetry = this.generateTelemetrySample(
          Date.now() + i * 1000,
          false,
        );
        features.push(telemetry);
        labels.push(0);
      }

      // Inject fault
      const faultLabel = this.mapFaultToLabel(scenario.faultId);
      if (faultInjector.triggerFault(scenario.faultId)) {
        // Generate faulty data
        const faultSamples = scenario.duration * this.config.sampleRateHz;
        for (let i = 0; i < faultSamples; i++) {
          const telemetry = this.generateTelemetrySample(
            Date.now() + (normalSamples + i) * 1000,
            true,
          );
          features.push(telemetry);
          labels.push(faultLabel);
        }
      }

      // Clear fault and add recovery data
      faultInjector.clearFault(scenario.faultId);
      const recoverySamples = 50;
      for (let i = 0; i < recoverySamples; i++) {
        const telemetry = this.generateTelemetrySample(
          Date.now() +
            (normalSamples + scenario.duration * this.config.sampleRateHz + i) *
              1000,
          false,
        );
        features.push(telemetry);
        labels.push(0);
      }
    }

    this.logger.info("Fault scenarios generation completed", {
      totalSamples: features.length,
      scenarios: scenarios.length,
    });

    return { features, labels };
  }
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const syntheticDataGenerator = new SyntheticDataGenerator();
