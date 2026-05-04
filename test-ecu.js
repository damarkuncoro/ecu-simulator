// Updated test-ecu.js using actual VirtualEcu implementation
const { TcpTransport } = require("@ecu/transport-tcp");
const { Kwp2000Router } = require("@ecu/kwp2000");
const { SessionFSM } = require("@ecu/session-fsm");
const { timingEngine } = require("@ecu/timing-engine");
const { VirtualEcu } = require("@ecu/core-kernel");
const { InMemoryEcuRepository } = require("@ecu/ecu-repository");
const { InMemoryDtcRepository } = require("@ecu/dtc-repository");
const { InMemoryDidRegistry } = require("@ecu/did-registry");
const { IDTCEngine } = require("@ecu/dtc-engine");
const { Logger } = require("@ecu/logger");

// Simple in-memory DTC engine implementation for testing
class SimpleDtcEngine {
  constructor() {
    this.dtcs = new Map();
  }
  
  set(code, status, description) {
    this.dtcs.set(code, { code, status, description });
  }
  
  getAll() {
    return Array.from(this.dtcs.values());
  }
  
  clear() {
    this.dtcs.clear();
  }
}

const PORT = process.env.ECU_PORT || 20000;

async function startEcuSimulator() {
  try {
    // Create repositories
    const ecuRepository = new InMemoryEcuRepository();
    const dtcRepository = new InMemoryDtcRepository();
    const didRegistry = new InMemoryDidRegistry();
    
    // Create DTC engine
    const dtcEngine = new SimpleDtcEngine();
    
    // Create transport
    const transport = new TcpTransport({ port: PORT });
    
    // Create protocol handler (KWP2000)
    const protocolHandler = new Kwp2000Router();
    
    // Create Virtual ECU with all dependencies
    const ecu = new VirtualEcu({
      transport,
      protocolHandler,
      ecuRepository,
      dtcRepository,
      dtcEngine,
      didRegistry,
      session: {
        timeoutMs: 5000,
        testerPresentTimeoutMs: 2000,
        securityTimeoutMs: 5000
      }
    });
    
    // Start the ECU
    await ecu.start();
    
    console.log(`[${new Date().toISOString()}] ECU Simulator listening on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] Ready to accept diagnostic connections`);
    console.log(`[${new Date().toISOString()}] Using real KWP2000 protocol implementation`);
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log(`\n[${new Date().toISOString()}] Shutting down ECU simulator...`);
      await ecu.stop();
      process.exit(0);
    });
    
    return ecu;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to start ECU simulator:`, error);
    process.exit(1);
  }
}

// Start the simulator if this file is run directly
if (require.main === module) {
  startEcuSimulator();
}

module.exports = { startEcuSimulator };