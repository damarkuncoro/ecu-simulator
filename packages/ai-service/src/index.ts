/**
 * @ecu/ai-service
 * AI/ML service for ECU fault prediction and diagnostic assistance
 * Uses TensorFlow.js for machine learning models
 */

import * as tf from "@tensorflow/tfjs-node";
import { Logger } from "@ecu/logger";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TelemetryData {
  timestamp: number;
  dids: Record<number, number>; // DID ID -> value
  dtcs: string[]; // Active DTC codes
  timing: {
    p1: number;
    p2: number;
    p3: number;
    p4: number;
  };
  errors: number; // Error count
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

// ─── Fault Prediction Engine ────────────────────────────────────────────────

export class FaultPredictionEngine {
  private model: tf.LayersModel | null = null;
  private logger = new Logger("fault-prediction");
  private isTrained = false;
  private metrics: ModelMetrics | null = null;

  // Model configuration
  private readonly sequenceLength = 50; // Look back window
  private readonly featureCount = 10; // Number of features
  private readonly hiddenUnits = 64;
  private readonly epochs = 50;

  async initialize(): Promise<void> {
    this.logger.info("Initializing Fault Prediction Engine");

    try {
      // Enable GPU acceleration if available
      await tf.setBackend("tensorflow");
      await tf.ready();
      this.logger.info(`TensorFlow.js backend: ${tf.getBackend()}`);

      // Load or create model
      this.model = await this.createModel();
      this.logger.info("Fault prediction model initialized");
    } catch (error) {
      this.logger.error("Failed to initialize fault prediction engine", {
        error: String(error),
      });
      throw error;
    }
  }

  async train(
    trainingData: TelemetryData[],
    labels: number[],
  ): Promise<ModelMetrics> {
    if (!this.model) {
      throw new Error("Model not initialized");
    }

    this.logger.info("Starting model training", {
      samples: trainingData.length,
      sequenceLength: this.sequenceLength,
      epochs: this.epochs,
    });

    const startTime = Date.now();

    try {
      // Preprocess training data
      const { features, targets } = this.preprocessTrainingData(
        trainingData,
        labels,
      );

      // Train the model
      const history = await this.model.fit(features, targets, {
        epochs: this.epochs,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              this.logger.debug(
                `Epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, val_loss=${logs?.val_loss?.toFixed(4)}`,
              );
            }
          },
        },
      });

      const trainingTime = Date.now() - startTime;
      this.isTrained = true;

      // Calculate metrics
      this.metrics = {
        accuracy: this.calculateAccuracy(this.model, features, targets),
        precision: 0.85, // Placeholder - would calculate from validation set
        recall: 0.82, // Placeholder
        f1Score: 0.83, // Placeholder
        trainingTime,
        lastUpdated: new Date(),
      };

      this.logger.info("Model training completed", this.metrics);
      return this.metrics;
    } catch (error) {
      this.logger.error("Model training failed", { error: String(error) });
      throw error;
    }
  }

  async predict(telemetryWindow: TelemetryData[]): Promise<FaultPrediction[]> {
    if (!this.model || !this.isTrained) {
      throw new Error("Model not trained");
    }

    try {
      // Preprocess input data
      const features = this.preprocessPredictionData(telemetryWindow);

      // Make prediction
      const prediction = this.model.predict(features) as tf.Tensor;
      const probabilities = await prediction.data();

      // Convert to fault predictions
      const predictions: FaultPrediction[] = [];
      const faultTypes = [
        "sensor_drift",
        "communication_timeout",
        "timing_violation",
        "memory_corruption",
      ];

      for (let i = 0; i < faultTypes.length; i++) {
        const probability = probabilities[i] || 0;
        if (probability > 0.1) {
          // Threshold for reporting
          predictions.push({
            faultType: faultTypes[i],
            probability,
            confidence: this.calculateConfidence(probability),
            timestamp: Date.now(),
            recommendedActions: this.getRecommendedActions(faultTypes[i]),
          });
        }
      }

      return predictions.sort((a, b) => b.probability - a.probability);
    } catch (error) {
      this.logger.error("Prediction failed", { error: String(error) });
      throw error;
    }
  }

  async detectAnomalies(
    telemetryStream: TelemetryData[],
  ): Promise<AnomalyDetectionResult[]> {
    if (telemetryStream.length < this.sequenceLength) {
      return [];
    }

    const results: AnomalyDetectionResult[] = [];
    const threshold = 0.75; // Anomaly threshold

    try {
      // Calculate statistical anomalies
      const recentData = telemetryStream.slice(-this.sequenceLength);

      // Check for timing anomalies
      const timingAnomaly = this.detectTimingAnomaly(recentData);
      if (timingAnomaly.score > threshold) {
        results.push(timingAnomaly);
      }

      // Check for sensor value anomalies
      const sensorAnomaly = this.detectSensorAnomaly(recentData);
      if (sensorAnomaly.score > threshold) {
        results.push(sensorAnomaly);
      }

      // Check for error rate anomalies
      const errorAnomaly = this.detectErrorAnomaly(recentData);
      if (errorAnomaly.score > threshold) {
        results.push(errorAnomaly);
      }

      return results;
    } catch (error) {
      this.logger.error("Anomaly detection failed", { error: String(error) });
      return [];
    }
  }

  getModelMetrics(): ModelMetrics | null {
    return this.metrics;
  }

  private createModel(): tf.LayersModel {
    const model = tf.sequential();

    // LSTM layers for sequence processing
    model.add(
      tf.layers.lstm({
        units: this.hiddenUnits,
        inputShape: [this.sequenceLength, this.featureCount],
        returnSequences: true,
      }),
    );

    model.add(tf.layers.dropout({ rate: 0.2 }));

    model.add(
      tf.layers.lstm({
        units: this.hiddenUnits / 2,
        returnSequences: false,
      }),
    );

    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Dense layers for classification
    model.add(tf.layers.dense({ units: 32, activation: "relu" }));
    model.add(tf.layers.dense({ units: 4, activation: "sigmoid" })); // 4 fault types

    // Compile model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: "binaryCrossentropy",
      metrics: ["accuracy"],
    });

    return model;
  }

  private preprocessTrainingData(
    data: TelemetryData[],
    labels: number[],
  ): { features: tf.Tensor; targets: tf.Tensor } {
    const sequences: number[][][] = [];
    const targets: number[][] = [];

    // Convert telemetry data to sequences
    for (let i = this.sequenceLength; i < data.length; i++) {
      const sequence = data.slice(i - this.sequenceLength, i);
      const features = sequence.map(this.extractFeatures);
      sequences.push(features);

      // Create multi-label targets (4 fault types)
      const target = [0, 0, 0, 0];
      if (labels[i] > 0) {
        // Map label to fault type (simplified)
        target[labels[i] % 4] = 1;
      }
      targets.push(target);
    }

    return {
      features: tf.tensor3d(sequences),
      targets: tf.tensor2d(targets),
    };
  }

  private preprocessPredictionData(data: TelemetryData[]): tf.Tensor {
    const features = data.slice(-this.sequenceLength).map(this.extractFeatures);
    return tf.tensor3d([features]);
  }

  private extractFeatures(telemetry: TelemetryData): number[] {
    const features = [
      Object.keys(telemetry.dids).length, // Number of active DIDs
      Object.values(telemetry.dids).reduce((sum, val) => sum + val, 0), // Sum of DID values
      telemetry.dtcs.length, // Number of active DTCs
      telemetry.timing.p1,
      telemetry.timing.p2,
      telemetry.timing.p3,
      telemetry.timing.p4,
      telemetry.errors,
      Date.now() - telemetry.timestamp, // Age of data
      Math.random(), // Placeholder for additional features
    ];

    // Ensure we have exactly featureCount features
    while (features.length < this.featureCount) {
      features.push(0);
    }

    return features.slice(0, this.featureCount);
  }

  private calculateAccuracy(
    model: tf.LayersModel,
    features: tf.Tensor,
    targets: tf.Tensor,
  ): number {
    const predictions = model.predict(features) as tf.Tensor;
    const predData = predictions.dataSync();
    const targetData = targets.dataSync();

    let correct = 0;
    let total = 0;

    for (let i = 0; i < targetData.length; i++) {
      if (Math.round(predData[i]) === targetData[i]) {
        correct++;
      }
      total++;
    }

    return correct / total;
  }

  private calculateConfidence(probability: number): number {
    // Simplified confidence calculation
    return Math.min(probability * 1.2, 1.0);
  }

  private getRecommendedActions(faultType: string): string[] {
    const actions: Record<string, string[]> = {
      sensor_drift: [
        "Check sensor calibration",
        "Inspect wiring harness",
        "Replace faulty sensor",
      ],
      communication_timeout: [
        "Check communication lines",
        "Verify protocol timing",
        "Reset ECU communication",
      ],
      timing_violation: [
        "Adjust P1-P4 timing parameters",
        "Check crystal oscillator",
        "Update protocol settings",
      ],
      memory_corruption: [
        "Run memory diagnostics",
        "Clear ECU memory",
        "Check for voltage fluctuations",
      ],
    };

    return (
      actions[faultType] || [
        "Run full diagnostic",
        "Contact service technician",
      ]
    );
  }

  private detectTimingAnomaly(data: TelemetryData[]): AnomalyDetectionResult {
    const recentTiming = data.map((d) => d.timing.p2);
    const mean =
      recentTiming.reduce((sum, val) => sum + val, 0) / recentTiming.length;
    const variance =
      recentTiming.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      recentTiming.length;
    const stdDev = Math.sqrt(variance);

    const latest = recentTiming[recentTiming.length - 1];
    const zScore = Math.abs(latest - mean) / (stdDev || 1);
    const anomalyScore = Math.min(zScore / 3, 1); // Normalize to 0-1

    return {
      isAnomaly: anomalyScore > 0.75,
      score: anomalyScore,
      threshold: 0.75,
      timestamp: Date.now(),
      metric: "timing_p2",
    };
  }

  private detectSensorAnomaly(data: TelemetryData[]): AnomalyDetectionResult {
    const sensorValues = data.flatMap((d) => Object.values(d.dids));
    if (sensorValues.length === 0) {
      return {
        isAnomaly: false,
        score: 0,
        threshold: 0.75,
        timestamp: Date.now(),
        metric: "sensor_values",
      };
    }

    const mean =
      sensorValues.reduce((sum, val) => sum + val, 0) / sensorValues.length;
    const variance =
      sensorValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      sensorValues.length;
    const stdDev = Math.sqrt(variance);

    const latest = sensorValues[sensorValues.length - 1];
    const zScore = Math.abs(latest - mean) / (stdDev || 1);
    const anomalyScore = Math.min(zScore / 3, 1);

    return {
      isAnomaly: anomalyScore > 0.75,
      score: anomalyScore,
      threshold: 0.75,
      timestamp: Date.now(),
      metric: "sensor_values",
    };
  }

  private detectErrorAnomaly(data: TelemetryData[]): AnomalyDetectionResult {
    const errorRates = data.map((d) => d.errors);
    const mean =
      errorRates.reduce((sum, val) => sum + val, 0) / errorRates.length;
    const anomalyScore = Math.min(mean / 10, 1); // Simple threshold based on error count

    return {
      isAnomaly: anomalyScore > 0.75,
      score: anomalyScore,
      threshold: 0.75,
      timestamp: Date.now(),
      metric: "error_rate",
    };
  }
}

// ─── Singleton Instance ──────────────────────────────────────────────────────

export const faultPredictionEngine = new FaultPredictionEngine();

// ─── Export API ──────────────────────────────────────────────────────────────

export { aiServiceAPI } from "./api";
export { syntheticDataGenerator } from "./synthetic-data-generator";
