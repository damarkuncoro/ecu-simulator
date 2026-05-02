/**
 * @ecu/cli-diag
 * CLI entry point — connects to ECU via configured transport and runs diagnostics.
 * Updated to use Clean Architecture factory pattern.
 *
 * Usage:
 *   ECU_TRANSPORT=tcp ECU_HOST=127.0.0.1 ECU_PORT=20000 node dist/index.js
 *   ECU_TRANSPORT=serial ECU_SERIAL_PORT=/dev/ttyUSB0 node dist/index.js
 */

import { Logger } from '@ecu/logger';
import { VirtualEcuFactory } from '@ecu/core-kernel';

const log = new Logger('cli-diag');

async function main() {
  const transportType = process.env['ECU_TRANSPORT'] ?? 'tcp';
  const host = process.env['ECU_HOST'] ?? 'localhost';
  const port = parseInt(process.env['ECU_PORT'] ?? '20000', 10);
  const serialPort = process.env['ECU_SERIAL_PORT'];
  const protocol = (process.env['ECU_PROTOCOL'] ?? 'kwp2000') as 'kwp2000' | 'iso9141';

  log.info('ECU Simulator CLI starting', {
    transport: transportType,
    host,
    port,
    protocol,
  });

  try {
    let ecu: any; // Will be VirtualEcu instance

    // Create ECU using factory based on transport type
    if (transportType === 'tcp') {
      ecu = VirtualEcuFactory.createTcpEcu(
        {
          host,
          port,
          connectTimeoutMs: 5000,
          readTimeoutMs: 2000,
        },
        protocol
      );
    } else if (transportType === 'serial') {
      if (!serialPort) {
        throw new Error("ECU_SERIAL_PORT not set for serial transport");
      }
      // TODO: Implement serial transport factory
      throw new Error("Serial transport factory not yet implemented");
    } else if (transportType === 'websocket') {
      // TODO: Implement websocket transport factory
      throw new Error("Websocket transport factory not yet implemented");
    } else {
      throw new Error(`Unknown transport type: ${transportType}`);
    }

    // Start the ECU
    await ecu.start();
    log.info('Connected to ECU', { mode: transportType, protocol });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      log.info('Shutting down...');
      await ecu.stop();
      process.exit(0);
    });

    // Keep the process running
    process.stdin.resume();

  } catch (err) {
    log.error('Failed to connect', { error: String(err) });
    process.exit(1);
  }
}

main();