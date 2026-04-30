/**
 * @ecu/cli-diag
 * CLI entry point — connects to ECU via configured transport and runs diagnostics.
 *
 * Usage:
 *   ECU_TRANSPORT=tcp  node dist/index.js
 *   ECU_TRANSPORT=serial ECU_SERIAL_PORT=/dev/ttyUSB0 node dist/index.js
 */

import { createTransport } from '@ecu/transport-abstract';
import { Logger } from '@ecu/logger';

const log = new Logger('cli-diag');

async function main() {
  log.info('ECU Simulator CLI starting', {
    transport: process.env['ECU_TRANSPORT'] ?? 'tcp',
    profile: process.env['ECU_PROFILE'] ?? 'generic',
  });

  const transport = await createTransport();

  try {
    await transport.connect();
    log.info('Connected to ECU', { mode: transport.mode });

    // TODO: wire up KWP2000 service router here
    // const router = new Kwp2000Router(transport);
    // await router.startSession();

    process.on('SIGINT', async () => {
      log.info('Shutting down...');
      await transport.disconnect();
      process.exit(0);
    });

  } catch (err) {
    log.error('Failed to connect', { error: String(err) });
    process.exit(1);
  }
}

main();
