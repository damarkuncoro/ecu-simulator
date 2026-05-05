# ECU Desktop UI

Electron + React diagnostic dashboard for ECU Simulator.

## Overview

The desktop UI provides a graphical interface for interacting with the ECU Simulator, featuring:

- Real-time connection status monitoring
- Diagnostic session management
- Data Identifier (DID) reading/writing
- Security access control
- Fault injection controls
- Protocol monitoring

## Architecture

```
desktop-ui/
├── src/
│   ├── electron/          # Electron main process
│   │   ├── main.ts       # Application lifecycle
│   │   └── preload.ts    # Secure IPC bridge
│   ├── renderer/         # React frontend
│   │   ├── App.tsx       # Main dashboard component
│   │   ├── index.tsx     # React entry point
│   │   └── index.html    # HTML template
│   └── ECUDiagnosticApp.ts # Backend service layer
```

## Features

### Connection Management
- Connect/disconnect from ECU simulator
- Real-time connection status
- Protocol information display

### Diagnostic Operations
- Read Data by Identifier (DID)
- Security access (seed/key exchange)
- Session control

### Fault Injection
- View available faults by category
- Manually trigger faults for testing
- Monitor active faults and statistics

### User Interface
- Material-UI based modern design
- Dark theme optimized for diagnostics
- Responsive layout
- Real-time status updates

## Development Setup

```bash
# Install dependencies
npm install

# Development mode (runs both main and renderer in parallel)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Mock Implementation

The current implementation includes mock services for demonstration:

- Simulated ECU connection
- Mock DID values (RPM, speed)
- Mock security seed/key validation
- Sample fault definitions

## Integration Points

The UI integrates with core ECU Simulator components:

- **session-fsm**: Session state management
- **timing-engine**: Timing parameter display
- **fault-injector**: Fault control interface
- **kwp2000**: Protocol service integration

## Future Enhancements

- Real transport layer integration
- Live protocol message monitoring
- Advanced fault injection scenarios
- OEM-specific diagnostic profiles
- Data logging and export
- Multi-session support