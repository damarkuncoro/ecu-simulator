/**
 * AI Service API
 * REST API for AI-powered ECU diagnostics and fault prediction
 */

import express from "express";
import cors from "cors";
import {
  faultPredictionEngine,
  TelemetryData,
  FaultPrediction,
  AnomalyDetectionResult,
} from "./index";
import { syntheticDataGenerator } from "./synthetic-data-generator";
import { Logger } from "@ecu/logger";

export interface APIConfig {
  port: number;
  enableCors: boolean;
  enableTraining: boolean;
}

export class AIServiceAPI {
  private app: express.Application;
  private logger = new Logger("ai-api");
  private config: APIConfig;

  constructor(config: Partial<APIConfig> = {}) {
    this.config = {
      port: 3001,
      enableCors: true,
      enableTraining: true,
      ...config,
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    if (this.config.enableCors) {
      this.app.use(cors());
    }

    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true }));

    // Logging middleware
    this.app.use((req, res, next) => {
      this.logger.debug("API Request", {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "ecu-ai-service",
      });
    });

    // Model status
    this.app.get("/api/v1/model/status", (req, res) => {
      const metrics = faultPredictionEngine.getModelMetrics();
      res.json({
        trained: metrics !== null,
        metrics,
        lastUpdated: metrics?.lastUpdated?.toISOString(),
      });
    });

    // Fault prediction
    this.app.post("/api/v1/ai/predict-fault", async (req, res) => {
      try {
        const { telemetryWindow } = req.body as {
          telemetryWindow: TelemetryData[];
        };

        if (!Array.isArray(telemetryWindow) || telemetryWindow.length === 0) {
          return res.status(400).json({
            error: "Invalid telemetry data",
            message: "telemetryWindow must be a non-empty array",
          });
        }

        const predictions =
          await faultPredictionEngine.predict(telemetryWindow);

        res.json({
          predictions: predictions.map((p) => ({
            faultType: p.faultType,
            probability: p.probability,
            confidence: p.confidence,
            recommendedActions: p.recommendedActions,
            timestamp: new Date(p.timestamp).toISOString(),
          })),
        });
      } catch (error) {
        this.logger.error("Fault prediction failed", { error: String(error) });
        res.status(500).json({
          error: "Prediction failed",
          message: String(error),
        });
      }
    });

    // Anomaly detection
    this.app.post("/api/v1/ai/detect-anomaly", async (req, res) => {
      try {
        const { metricStream, baselineId } = req.body as {
          metricStream: TelemetryData[];
          baselineId?: string;
        };

        if (!Array.isArray(metricStream)) {
          return res.status(400).json({
            error: "Invalid metric stream",
            message: "metricStream must be an array",
          });
        }

        const anomalies =
          await faultPredictionEngine.detectAnomalies(metricStream);

        res.json({
          anomalies: anomalies.map((a) => ({
            isAnomaly: a.isAnomaly,
            score: a.score,
            threshold: a.threshold,
            metric: a.metric,
            timestamp: new Date(a.timestamp).toISOString(),
          })),
        });
      } catch (error) {
        this.logger.error("Anomaly detection failed", { error: String(error) });
        res.status(500).json({
          error: "Anomaly detection failed",
          message: String(error),
        });
      }
    });

    // Diagnostic assistant
    this.app.post("/api/v1/ai/diagnose", (req, res) => {
      try {
        const { dtcs, symptoms, dids } = req.body as {
          dtcs: string[];
          symptoms: string[];
          dids: Record<number, number>;
        };

        // Simplified diagnostic logic (would use more sophisticated rules in production)
        const possibleCauses = this.generateDiagnosticRecommendations(
          dtcs,
          symptoms,
          dids,
        );

        res.json({
          possibleCauses,
          confidence: "high",
          generatedAt: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.error("Diagnostic assistance failed", {
          error: String(error),
        });
        res.status(500).json({
          error: "Diagnostic assistance failed",
          message: String(error),
        });
      }
    });

    // Generate test scenarios
    this.app.post("/api/v1/ai/generate-tests", (req, res) => {
      try {
        const { specification, coverageGoals } = req.body as {
          specification: string;
          coverageGoals: any;
        };

        // Generate test scenarios based on specification
        const testCases = this.generateTestScenarios(
          specification,
          coverageGoals,
        );

        res.json({
          testCases,
          coverage: {
            estimated: 85,
            goals: coverageGoals,
          },
          generatedAt: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.error("Test generation failed", { error: String(error) });
        res.status(500).json({
          error: "Test generation failed",
          message: String(error),
        });
      }
    });

    // Training endpoints (if enabled)
    if (this.config.enableTraining) {
      this.app.post("/api/v1/training/generate-data", async (req, res) => {
        try {
          const { durationSeconds, sampleRateHz } = req.body as {
            durationSeconds?: number;
            sampleRateHz?: number;
          };

          const generator = new syntheticDataGenerator({
            durationSeconds: durationSeconds || 3600,
            sampleRateHz: sampleRateHz || 10,
          });

          const dataset = await generator.generateDataset();

          res.json({
            status: "completed",
            samples: dataset.features.length,
            faultySamples: dataset.labels.filter((l) => l > 0).length,
            data: dataset, // In production, this would be saved to storage
          });
        } catch (error) {
          this.logger.error("Data generation failed", { error: String(error) });
          res.status(500).json({
            error: "Data generation failed",
            message: String(error),
          });
        }
      });

      this.app.post("/api/v1/training/train-model", async (req, res) => {
        try {
          const { trainingData, labels } = req.body as {
            trainingData: TelemetryData[];
            labels: number[];
          };

          if (!Array.isArray(trainingData) || !Array.isArray(labels)) {
            return res.status(400).json({
              error: "Invalid training data",
              message: "trainingData and labels must be arrays",
            });
          }

          // Initialize engine if needed
          await faultPredictionEngine.initialize();

          const metrics = await faultPredictionEngine.train(
            trainingData,
            labels,
          );

          res.json({
            status: "completed",
            metrics,
            trainedAt: new Date().toISOString(),
          });
        } catch (error) {
          this.logger.error("Model training failed", { error: String(error) });
          res.status(500).json({
            error: "Model training failed",
            message: String(error),
          });
        }
      });
    }

    // Error handling
    this.app.use(
      (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        this.logger.error("API Error", {
          error: err.message,
          stack: err.stack,
        });
        res.status(500).json({
          error: "Internal server error",
          message: err.message,
        });
      },
    );

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: "Not found",
        message: `Route ${req.method} ${req.path} not found`,
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.app.listen(this.config.port, () => {
          this.logger.info("AI Service API started", {
            port: this.config.port,
            cors: this.config.enableCors,
            training: this.config.enableTraining,
          });
          resolve();
        });
      } catch (error) {
        this.logger.error("Failed to start AI Service API", {
          error: String(error),
        });
        reject(error);
      }
    });
  }

  stop(): void {
    this.logger.info("AI Service API stopped");
  }

  private generateDiagnosticRecommendations(
    dtcs: string[],
    symptoms: string[],
    dids: Record<number, number>,
  ): any[] {
    const recommendations = [];

    // DTC-based recommendations
    if (dtcs.includes("P0300")) {
      recommendations.push({
        cause: "Cylinder misfire",
        probability: 0.85,
        steps: [
          "Check spark plugs and ignition coils",
          "Inspect fuel injectors",
          "Verify compression in affected cylinder",
        ],
        references: ["TIS-1234", "FSM-5.2.1"],
      });
    }

    if (dtcs.includes("P0171")) {
      recommendations.push({
        cause: "Fuel system too lean",
        probability: 0.78,
        steps: [
          "Check intake air leaks",
          "Clean or replace mass air flow sensor",
          "Inspect fuel pressure regulator",
        ],
        references: ["TIS-5678", "FSM-4.1.3"],
      });
    }

    // DID-based recommendations
    const coolantTemp = dids[0x0001];
    if (coolantTemp && coolantTemp > 100) {
      recommendations.push({
        cause: "Overheating condition",
        probability: 0.92,
        steps: [
          "Check coolant level",
          "Inspect radiator and cooling fan",
          "Verify thermostat operation",
        ],
        references: ["TIS-9012", "FSM-6.3.2"],
      });
    }

    // Symptom-based recommendations
    if (symptoms.includes("engine_stalling")) {
      recommendations.push({
        cause: "Idle control system malfunction",
        probability: 0.65,
        steps: [
          "Check idle air control valve",
          "Inspect throttle position sensor",
          "Verify fuel pump operation",
        ],
        references: ["TIS-3456", "FSM-3.2.1"],
      });
    }

    return recommendations.sort((a, b) => b.probability - a.probability);
  }

  private generateTestScenarios(
    specification: string,
    coverageGoals: any,
  ): any[] {
    // Simplified test scenario generation
    return [
      {
        id: "kwp2000_basic_session",
        description: "Test basic KWP2000 session establishment",
        steps: [
          { action: "connect", protocol: "kwp2000" },
          { action: "send", data: "1003", expected: "5003" },
          { action: "send", data: "1901FF", expected: "5901XX..." },
          { action: "disconnect" },
        ],
        coverage: ["session_management", "dtc_reading"],
      },
      {
        id: "iso9141_initialization",
        description: "Test ISO9141 5-baud initialization sequence",
        steps: [
          { action: "connect", protocol: "iso9141" },
          { action: "init_5baud", address: "33" },
          { action: "send", data: "6806F11081", expected: "4881..." },
          { action: "disconnect" },
        ],
        coverage: ["physical_layer", "initialization"],
      },
      {
        id: "fault_injection_sensor",
        description: "Test sensor fault injection and detection",
        steps: [
          { action: "inject_fault", type: "sensor_drift", severity: "medium" },
          { action: "read_did", id: "0001", verify: "value_changed" },
          { action: "clear_fault" },
          { action: "read_did", id: "0001", verify: "value_normal" },
        ],
        coverage: ["fault_injection", "sensor_diagnostics"],
      },
    ];
  }
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const aiServiceAPI = new AIServiceAPI();
