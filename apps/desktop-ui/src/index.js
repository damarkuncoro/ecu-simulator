"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ECUDiagnosticApp_1 = require("./ECUDiagnosticApp");
// Initialize and start the ECU diagnostic dashboard
var app = new ECUDiagnosticApp_1.ECUDiagnosticApp();
app
    .initialize()
    .then(function () {
    app.start();
})
    .catch(function (error) {
    console.error("Failed to start ECU diagnostic app:", error);
    process.exit(1);
});
