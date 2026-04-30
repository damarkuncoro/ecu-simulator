const net = require('net');

// Minimal TCP server simulating ECU responding to KWP2000
const server = net.createServer((socket) => {
  console.log(`[${new Date().toISOString()}] ECU: Client connected from ${socket.remoteAddress}:${socket.remotePort}`);
  
  socket.on('data', (data) => {
    console.log(`[${new Date().toISOString()}] ECU: Received ${data.length} bytes:`, data.toString('hex'));
    
    // Try to parse KWP2000/ISO14230 frame
    if (data.length >= 3) {
      const len = data[1];
      const sid = data[2];
      
      console.log(`  -> Length: ${len}, Service: 0x${sid.toString(16).padStart(2, '0').toUpperCase()}`);
      
      let response;
      switch (sid) {
        case 0x00: // Positive response to 0x00
        case 0x10: // DiagnosticSessionControl
          response = Buffer.from([0x40 + sid, 0x01, 0x50, 0x00, 0x32]) + // P2max=50ms
          console.log(`  <- Session control response`);
          break;
        case 0x11: // ECUReset
          response = Buffer.from([0x40 + sid, 0x01]);
          console.log(`  <- Reset response`);
          break;
        case 0x14: // ClearDTC
          response = Buffer.from([0x40 + sid]);
          console.log(`  <- Clear DTC response`);
          break;
        case 0x19: // ReadDTC
          response = Buffer.from([0x40 + sid, 0x02, 0x00]); // 0 DTCs
          console.log(`  <- Read DTC response: 0 DTCs`);
          break;
        case 0x22: // ReadDataByIdentifier
          response = Buffer.from([0x40 + sid, data[3], data[4], 0x0F, 0xA0]); // 4000 RPM
          console.log(`  <- Read DID response`);
          break;
        case 0x27: // SecurityAccess
          if (data[2] % 2 === 1) {
            // Request seed
            response = Buffer.from([0x40 + sid, 0x01, 0x12, 0x34, 0x56, 0x78]);
            console.log(`  <- Seed response`);
          } else {
            // Send key
            response = Buffer.from([0x40 + sid, 0x02]);
            console.log(`  <- Key accepted`);
          }
          break;
        case 0x3E: // TesterPresent
          response = Buffer.from([0x40 + sid, 0x00]);
          console.log(`  <- TesterPresent response`);
          break;
        default:
          // Negative response 0x7F, service, NRC=0x11 (service not supported)
          response = Buffer.from([0x7F, sid, 0x11]);
          console.log(`  <- NRC: Service not supported (0x11)`);
      }
      
      if (response) {
        socket.write(response);
        console.log(`  ECU: Sent ${response.length} bytes:`, response.toString('hex'));
      }
    }
  });
  
  socket.on('close', () => {
    console.log(`[${new Date().toISOString()}] ECU: Client disconnected`);
  });
  
  socket.on('error', (err) => {
    console.log(`[${new Date().toISOString()}] ECU: Socket error:`, err.message);
  });
});

const PORT = process.env.ECU_PORT || 20000;
server.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] ECU Simulator listening on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] Ready to accept diagnostic connections`);
});

process.on('SIGINT', () => {
  console.log(`\n[${new Date().toISOString()}] Shutting down ECU simulator...`);
  server.close();
  process.exit(0);
});
