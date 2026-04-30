import { ECUDiagnosticApp } from "./ECUDiagnosticApp";

// Initialize and start the ECU diagnostic dashboard
const app = new ECUDiagnosticApp();
app
  .initialize()
  .then(() => {
    app.start();
  })
  .catch((error) => {
    console.error("Failed to start ECU diagnostic app:", error);
    process.exit(1);
  });
