/**
 * Simplified Synthetic Data Generator
 * Basic data generation for AI training
 */

export interface SyntheticDataConfig {
  durationSeconds: number;
  sampleRateHz: number;
}

export class SyntheticDataGenerator {
  private config: SyntheticDataConfig;

  constructor(config: Partial<SyntheticDataConfig> = {}) {
    this.config = {
      durationSeconds: 3600,
      sampleRateHz: 10,
      ...config,
    };
  }

  async generateDataset(): Promise<{ features: any[]; labels: number[] }> {
    console.log(
      `Generating ${this.config.durationSeconds * this.config.sampleRateHz} synthetic samples`,
    );

    const features = [];
    const labels = [];
    const totalSamples = this.config.durationSeconds * this.config.sampleRateHz;

    for (let i = 0; i < totalSamples; i++) {
      const isFaulty = Math.random() < 0.2; // 20% faulty samples

      features.push({
        timestamp: Date.now() + i * 100,
        dids: {
          0x0001: 75 + Math.random() * 20, // Coolant temp
          0x0002: 3000 + Math.random() * 2000, // RPM
          0x0003: 60 + Math.random() * 40, // Speed
        },
        dtcs: isFaulty ? ["P0300"] : [],
        timing: {
          p1: 0,
          p2: 50 + Math.random() * 20,
          p3: 5000,
          p4: 0,
        },
        errors: isFaulty ? Math.floor(Math.random() * 3) + 1 : 0,
      });

      labels.push(isFaulty ? Math.floor(Math.random() * 4) + 1 : 0);
    }

    return { features, labels };
  }
}

export const syntheticDataGenerator = new SyntheticDataGenerator();
