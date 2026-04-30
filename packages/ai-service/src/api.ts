/**
 * Simplified AI API for testing
 * Basic API without Express dependencies
 */

export class AIServiceAPI {
  async start(port: number = 3001): Promise<void> {
    console.log(`AI Service API would start on port ${port}`);
    console.log(
      "Note: Full API requires additional dependencies (express, cors)",
    );
    return Promise.resolve();
  }

  stop(): void {
    console.log("AI Service API stopped");
  }
}

export const aiServiceAPI = new AIServiceAPI();
