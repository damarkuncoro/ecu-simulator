#!/usr/bin/env node

/**
 * AI Service Demo
 * Demonstrates fault prediction engine with synthetic data
 */

const path = require("path");

// Simple demo without full module resolution (for testing)
async function demo() {
  console.log("🤖 ECU AI Service Demo");
  console.log("========================\n");

  try {
    console.log("📊 Generating synthetic training data...");

    // Simulate data generation (would use real synthetic data generator)
    const mockTrainingData = generateMockTrainingData();
    const mockLabels = generateMockLabels(mockTrainingData.length);

    console.log(`✅ Generated ${mockTrainingData.length} training samples`);
    console.log(
      `   - Normal samples: ${mockLabels.filter((l) => l === 0).length}`,
    );
    console.log(
      `   - Faulty samples: ${mockLabels.filter((l) => l > 0).length}`,
    );

    console.log("\n🎯 Simulating model training...");

    // Simulate training metrics
    const mockMetrics = {
      accuracy: 0.89,
      precision: 0.85,
      recall: 0.82,
      f1Score: 0.83,
      trainingTime: 45000, // 45 seconds
      lastUpdated: new Date(),
    };

    console.log("✅ Model training completed:");
    console.log(`   - Accuracy: ${(mockMetrics.accuracy * 100).toFixed(1)}%`);
    console.log(`   - Precision: ${(mockMetrics.precision * 100).toFixed(1)}%`);
    console.log(`   - Recall: ${(mockMetrics.recall * 100).toFixed(1)}%`);
    console.log(`   - F1 Score: ${(mockMetrics.f1Score * 100).toFixed(1)}%`);
    console.log(`   - Training time: ${mockMetrics.trainingTime / 1000}s`);

    console.log("\n🔍 Simulating real-time anomaly detection...");

    // Simulate real-time predictions
    const mockPredictions = [
      {
        faultType: "sensor_drift",
        probability: 0.78,
        confidence: 0.82,
        recommendedActions: [
          "Check sensor calibration",
          "Inspect wiring harness",
        ],
      },
      {
        faultType: "timing_violation",
        probability: 0.45,
        confidence: 0.52,
        recommendedActions: ["Adjust P1-P4 timing parameters"],
      },
    ];

    console.log("🚨 Detected potential faults:");
    mockPredictions.forEach((pred, i) => {
      console.log(`   ${i + 1}. ${pred.faultType}`);
      console.log(`      Probability: ${(pred.probability * 100).toFixed(1)}%`);
      console.log(`      Confidence: ${(pred.confidence * 100).toFixed(1)}%`);
      console.log(`      Actions: ${pred.recommendedActions.join(", ")}`);
    });

    console.log("\n📈 Simulating anomaly detection on telemetry stream...");

    const mockAnomalies = [
      {
        isAnomaly: true,
        score: 0.85,
        threshold: 0.75,
        metric: "timing_p2",
        timestamp: Date.now(),
      },
      {
        isAnomaly: false,
        score: 0.32,
        threshold: 0.75,
        metric: "sensor_values",
        timestamp: Date.now(),
      },
    ];

    console.log("🔍 Anomaly detection results:");
    mockAnomalies.forEach((anomaly, i) => {
      const status = anomaly.isAnomaly ? "🚨 ANOMALY" : "✅ Normal";
      console.log(`   ${i + 1}. ${anomaly.metric}: ${status}`);
      console.log(
        `      Score: ${(anomaly.score * 100).toFixed(1)}% (threshold: ${(anomaly.threshold * 100).toFixed(1)}%)`,
      );
    });

    console.log("\n🎉 AI Service demo completed successfully!");
    console.log("\n📋 Next Steps:");
    console.log("   1. Install TensorFlow.js dependencies");
    console.log("   2. Train models on real ECU data");
    console.log("   3. Integrate with ECU simulator telemetry");
    console.log("   4. Add REST API endpoints for predictions");
    console.log("   5. Implement model monitoring and retraining");
  } catch (error) {
    console.error("❌ Demo failed:", error.message);
    process.exit(1);
  }
}

function generateMockTrainingData() {
  const samples = [];
  const sampleCount = 1000;

  for (let i = 0; i < sampleCount; i++) {
    samples.push({
      timestamp: Date.now() + i * 100,
      dids: {
        0x0001: 75 + Math.random() * 20, // Coolant temp
        0x0002: 3000 + Math.random() * 2000, // RPM
        0x0003: 60 + Math.random() * 40, // Speed
      },
      dtcs: [],
      timing: {
        p1: 0,
        p2: 50 + Math.random() * 20,
        p3: 5000,
        p4: 0,
      },
      errors: Math.floor(Math.random() * 3),
    });
  }

  return samples;
}

function generateMockLabels(sampleCount) {
  const labels = [];
  for (let i = 0; i < sampleCount; i++) {
    // 20% faulty samples
    labels.push(Math.random() < 0.2 ? Math.floor(Math.random() * 5) + 1 : 0);
  }
  return labels;
}

// Run demo
demo().catch(console.error);
