#!/usr/bin/env node

/**
 * AI Service CLI
 * Command-line interface for the ECU AI Service
 */

const { Command } = require("commander");
const program = new Command();

program
  .name("ai-service")
  .description("ECU AI Service for fault prediction and diagnostics")
  .version("0.1.0");

program
  .command("start")
  .description("Start the AI service API server")
  .option("-p, --port <number>", "Port to listen on", "3001")
  .option("--no-cors", "Disable CORS")
  .option("--no-training", "Disable training endpoints")
  .action(async (options) => {
    console.log("🚀 Starting ECU AI Service...");

    try {
      // Import the API service
      const { AIServiceAPI } = require("./dist/api.js");

      const config = {
        port: parseInt(options.port),
        enableCors: options.cors !== false,
        enableTraining: options.training !== false,
      };

      const api = new AIServiceAPI(config);
      await api.start();

      console.log(`✅ AI Service running on port ${config.port}`);
      console.log(`📊 CORS: ${config.enableCors ? "enabled" : "disabled"}`);
      console.log(
        `🎯 Training endpoints: ${config.enableTraining ? "enabled" : "disabled"}`,
      );

      // Graceful shutdown
      process.on("SIGINT", () => {
        console.log("\n🛑 Shutting down AI Service...");
        api.stop();
        process.exit(0);
      });
    } catch (error) {
      console.error("❌ Failed to start AI Service:", error.message);
      process.exit(1);
    }
  });

program
  .command("demo")
  .description("Run AI service demonstration")
  .action(() => {
    require("../demo-ai-service.js");
  });

program
  .command("generate-data")
  .description("Generate synthetic training data")
  .option("-d, --duration <seconds>", "Duration in seconds", "3600")
  .option("-r, --rate <hz>", "Sample rate in Hz", "10")
  .action(async (options) => {
    console.log("📊 Generating synthetic training data...");

    try {
      const {
        syntheticDataGenerator,
      } = require("./dist/synthetic-data-generator.js");

      const generator = new syntheticDataGenerator({
        durationSeconds: parseInt(options.duration),
        sampleRateHz: parseInt(options.rate),
      });

      const dataset = await generator.generateDataset();

      console.log(`✅ Generated ${dataset.features.length} samples`);
      console.log(`   Normal: ${dataset.labels.filter((l) => l === 0).length}`);
      console.log(`   Faulty: ${dataset.labels.filter((l) => l > 0).length}`);

      // Save to file (simplified)
      const fs = require("fs");
      fs.writeFileSync("training-data.json", JSON.stringify(dataset, null, 2));
      console.log("💾 Data saved to training-data.json");
    } catch (error) {
      console.error("❌ Data generation failed:", error.message);
      process.exit(1);
    }
  });

program
  .command("train")
  .description("Train the fault prediction model")
  .option("-i, --input <file>", "Training data file", "training-data.json")
  .action(async (options) => {
    console.log("🎯 Training fault prediction model...");

    try {
      const { faultPredictionEngine } = require("./dist/index.js");
      const fs = require("fs");

      // Load training data
      const data = JSON.parse(fs.readFileSync(options.input, "utf8"));
      console.log(`📊 Loaded ${data.features.length} training samples`);

      // Initialize and train
      await faultPredictionEngine.initialize();
      const metrics = await faultPredictionEngine.train(
        data.features,
        data.labels,
      );

      console.log("✅ Model training completed:");
      console.log(`   Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`);
      console.log(`   Precision: ${(metrics.precision * 100).toFixed(1)}%`);
      console.log(`   Recall: ${(metrics.recall * 100).toFixed(1)}%`);
      console.log(`   F1 Score: ${(metrics.f1Score * 100).toFixed(1)}%`);
    } catch (error) {
      console.error("❌ Training failed:", error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
