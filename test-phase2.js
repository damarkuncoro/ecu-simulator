#!/usr/bin/env node

/**
 * Phase 2 Validation Test
 * Tests the new KWP2000 router, Session FSM, and ISO9141 components
 */

const net = require("net");
const { DTCEngine } = require("./packages/services/dtc-engine/dist/index.js");
const {
  Kwp2000Router,
} = require("./packages/protocols/kwp2000/dist/protocols/kwp2000/src/index.js");
const { SessionFSM } = require("./packages/services/session-fsm/dist/index.js");

console.log("🚗 Phase 2 ECU Simulator Validation Test");
console.log("========================================\n");

// Initialize components
const dtcEngine = new DTCEngine();
const router = new Kwp2000Router({
  dtcEngine,
  sessionTimeoutMs: 5000,
  p2TimeoutMs: 50,
  p3TimeoutMs: 5000,
});

const sessionFSM = new SessionFSM();

// Add some test DTCs
dtcEngine.set(
  0x1234,
  {
    testFailed: true,
    testFailedThisMonitoringCycle: true,
    pendingDTC: true,
    confirmedDTC: true,
    testNotCompletedSinceLastClear: false,
    testFailedSinceLastClear: true,
    testNotCompletedThisMonitoringCycle: false,
    warningIndicatorRequested: false,
  },
  "Test DTC for validation",
);

console.log("✅ Components initialized");
console.log(`   - DTC Engine: ${dtcEngine.getAll().length} DTCs loaded`);
console.log(`   - KWP2000 Router: Ready`);
console.log(`   - Session FSM: ${sessionFSM.getState()}\n`);

// Create TCP server using our new components
const server = net.createServer((socket) => {
  console.log(
    `🔗 Client connected from ${socket.remoteAddress}:${socket.remotePort}`,
  );

  // Initialize session for this connection
  sessionFSM.send({ type: "CONNECT" });

  socket.on("data", (data) => {
    console.log(
      `📥 Received ${data.length} bytes:`,
      data.toString("hex").toUpperCase(),
    );

    try {
      // Parse KWP2000 frame
      const frame = router.parseFrame(data);
      if (!frame) {
        console.log("❌ Invalid frame format");
        return;
      }

      console.log(
        `   → Service: 0x${frame.serviceId.toString(16).padStart(2, "0").toUpperCase()}`,
      );

      // Update session FSM based on service
      switch (frame.serviceId) {
        case 0x10: // Diagnostic Session Control
          sessionFSM.send({ type: "SESSION_CONTROL", sessionType: "extended" });
          break;
        case 0x27: // Security Access
          if (frame.data.length > 0 && frame.data[0] === 0x01) {
            sessionFSM.send({ type: "SECURITY_ACCESS", level: 1 });
          }
          break;
        default:
          sessionFSM.send({
            type: "DIAGNOSTIC_REQUEST",
            serviceId: frame.serviceId,
          });
          break;
      }

      // Process with router
      const response = router.processRequest(frame);
      const responseFrame = router.formatResponse(response);

      console.log(
        `   ← Response: 0x${response.serviceId.toString(16).padStart(2, "0").toUpperCase()} (${response.isPositive ? "POS" : "NEG"})`,
      );
      console.log(
        `📤 Sending ${responseFrame.length} bytes:`,
        responseFrame.toString("hex").toUpperCase(),
      );

      socket.write(responseFrame);
    } catch (error) {
      console.error("❌ Processing error:", error.message);
      // Send negative response
      const nrcFrame = Buffer.from([0x03, 0x7f, data[2] || 0x00, 0x10]); // General reject
      socket.write(nrcFrame);
    }
  });

  socket.on("close", () => {
    console.log(`🔌 Client disconnected`);
    sessionFSM.send({ type: "DISCONNECT" });
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err.message);
  });
});

const PORT = process.env.ECU_PORT || 20001; // Use different port for Phase 2 validation
server.listen(PORT, () => {
  console.log(`🎯 Phase 2 ECU Simulator listening on port ${PORT}`);
  console.log(`🔧 Using new KWP2000 router with DTC engine and Session FSM`);
  console.log(`\n📋 Test Commands:`);
  console.log(
    `   Diagnostic Session Control: printf '\\x02\\x01\\x10\\x03' | nc localhost ${PORT} | xxd -p`,
  );
  console.log(
    `   Read DTCs: printf '\\x02\\x01\\x19\\x02' | nc localhost ${PORT} | xxd -p`,
  );
  console.log(
    `   Security Access (Seed): printf '\\x02\\x01\\x27\\x01' | nc localhost ${PORT} | xxd -p`,
  );
  console.log(
    `   Read Engine RPM: printf '\\x03\\x01\\x22\\x0c\\x00' | nc localhost ${PORT} | xxd -p`,
  );
  console.log(
    `   Tester Present: printf '\\x02\\x01\\x3e\\x00' | nc localhost ${PORT} | xxd -p`,
  );
  console.log(`\n⚡ Ready for testing...`);
});

process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down Phase 2 validation server...");
  server.close();
  process.exit(0);
});
