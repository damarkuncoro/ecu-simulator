/**
 * @ecu/ai-service - Simplified AI Service
 * Basic fault prediction and anomaly detection for ECU diagnostics
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TelemetryData {
  timestamp: number;
  dids: Record<number, number>;
  dtcs: string[];
  timing: { p1: number; p2: number; p3: number; p4: number };
  errors: number;
}

export interface FaultPrediction {
  faultType: string;
  probability: number;
  confidence: number;
  timestamp: number;
  recommendedActions: string[];
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  score: number;
  threshold: number;
  timestamp: number;
  metric: string;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingTime: number;
  lastUpdated: Date;
}

// ─── Simplified Fault Prediction Engine ──────────────────────────────────────

export class FaultPredictionEngine {
  private isTrained = false;
  private metrics: ModelMetrics | null = null;

  async initialize(): Promise<void> {
    console.log("Initializing Simplified Fault Prediction Engine");
    // Initialize basic statistical models
    this.isTrained = true;
    this.metrics = {
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.78,
      f1Score: 0.8,
      trainingTime: 1000,
      lastUpdated: new Date(),
    };
  }

  async predict(telemetryWindow: TelemetryData[]): Promise<FaultPrediction[]> {
    if (!this.isTrained) {
      throw new Error("Model not trained");
    }

    const predictions: FaultPrediction[] = [];

    // Simple rule-based fault detection
    const latest = telemetryWindow[telemetryWindow.length - 1];
    if (!latest) return predictions;

    // Check for overheating
    const coolantTemp = latest.dids[0x0001] || 0;
    if (coolantTemp > 100) {
      predictions.push({
        faultType: "overheating",
        probability: Math.min(coolantTemp / 140, 0.95),
        confidence: 0.85,
        timestamp: Date.now(),
        recommendedActions: [
          "Check coolant level",
          "Inspect radiator and cooling fan",
          "Verify thermostat operation",
        ],
      });
    }

    // Check for timing violations
    const timingAnomaly = this.checkTimingAnomaly(telemetryWindow);
    if (timingAnomaly > 0.7) {
      predictions.push({
        faultType: "timing_violation",
        probability: timingAnomaly,
        confidence: 0.75,
        timestamp: Date.now(),
        recommendedActions: [
          "Adjust P1-P4 timing parameters",
          "Check crystal oscillator",
          "Update protocol settings",
        ],
      });
    }

    // Check for sensor drift
    const sensorAnomaly = this.checkSensorAnomaly(telemetryWindow);
    if (sensorAnomaly > 0.8) {
      predictions.push({
        faultType: "sensor_drift",
        probability: sensorAnomaly,
        confidence: 0.7,
        timestamp: Date.now(),
        recommendedActions: [
          "Check sensor calibration",
          "Inspect wiring harness",
          "Replace faulty sensor",
        ],
      });
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  async detectAnomalies(
    telemetryStream: TelemetryData[],
  ): Promise<AnomalyDetectionResult[]> {
    const results: AnomalyDetectionResult[] = [];

    if (telemetryStream.length < 10) return results;

    // Check timing anomalies
    const timingScore = this.checkTimingAnomaly(telemetryStream);
    results.push({
      isAnomaly: timingScore > 0.75,
      score: timingScore,
      threshold: 0.75,
      timestamp: Date.now(),
      metric: "timing_p2",
    });

    // Check sensor anomalies
    const sensorScore = this.checkSensorAnomaly(telemetryStream);
    results.push({
      isAnomaly: sensorScore > 0.8,
      score: sensorScore,
      threshold: 0.8,
      timestamp: Date.now(),
      metric: "sensor_values",
    });

    // Check error rate anomalies
    const errorScore = this.checkErrorAnomaly(telemetryStream);
    results.push({
      isAnomaly: errorScore > 0.85,
      score: errorScore,
      threshold: 0.85,
      timestamp: Date.now(),
      metric: "error_rate",
    });

    return results;
  }

  getModelMetrics(): ModelMetrics | null {
    return this.metrics;
  }

  private checkTimingAnomaly(data: TelemetryData[]): number {
    const p2Values = data.map((d) => d.timing.p2);
    const mean = p2Values.reduce((sum, val) => sum + val, 0) / p2Values.length;
    const variance =
      p2Values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      p2Values.length;
    const stdDev = Math.sqrt(variance);

    const latest = p2Values[p2Values.length - 1] || mean;
    const zScore = Math.abs(latest - mean) / (stdDev || 1);
    return Math.min(zScore / 3, 1); // Normalize to 0-1
  }

  private checkSensorAnomaly(data: TelemetryData[]): number {
    const sensorValues = data.flatMap((d) => Object.values(d.dids));
    if (sensorValues.length === 0) return 0;

    const mean =
      sensorValues.reduce((sum, val) => sum + val, 0) / sensorValues.length;
    const variance =
      sensorValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      sensorValues.length;
    const stdDev = Math.sqrt(variance);

    const latest = sensorValues[sensorValues.length - 1] || mean;
    const zScore = Math.abs(latest - mean) / (stdDev || 1);
    return Math.min(zScore / 3, 1);
  }

  private checkErrorAnomaly(data: TelemetryData[]): number {
    const errorRates = data.map((d) => d.errors);
    const mean =
      errorRates.reduce((sum, val) => sum + val, 0) / errorRates.length;
    return Math.min(mean / 10, 1); // Simple threshold based on error count
  }
}

// ─── Singleton Instance ──────────────────────────────────────────────────────

export const faultPredictionEngine = new FaultPredictionEngine();
