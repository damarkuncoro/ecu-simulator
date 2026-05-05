# ECU Desktop UI

Electron + React diagnostic dashboard for ECU Simulator.

## Overview

The desktop UI provides a comprehensive graphical interface for interacting with the ECU Simulator, featuring:

- **Real-time connection status monitoring**
- **Diagnostic session management** (Default, Extended, Programming, Safety)
- **Data Identifier operations** (DID read/write with live values)
- **Security access control** (seed/key authentication)
- **Fault injection controls** (manual triggering with statistics)
- **Protocol monitoring** with detailed session statistics

## Architecture

```
desktop-ui/
├── src/
│   ├── electron/              # Electron main process
│   │   ├── main.ts           # Application lifecycle & IPC handlers
│   │   └── preload.ts        # Secure IPC bridge to renderer
│   ├── renderer/             # React frontend
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ConnectionPanel.tsx    # Connection management
│   │   │   ├── SessionPanel.tsx       # Session control
│   │   │   ├── DataPanel.tsx          # DID operations
│   │   │   ├── FaultPanel.tsx         # Fault injection
│   │   │   └── StatusBar.tsx          # Status display
│   │   ├── App.tsx           # Main dashboard component
│   │   ├── index.tsx         # React entry point
│   │   └── index.html        # HTML template
│   └── ECUDiagnosticApp.ts   # Backend service layer
```

## Features

### 🔗 Connection Management
- **Transport Selection**: TCP/IP or Serial port configuration
- **Real-time Status**: Live connection state with visual indicators
- **Error Handling**: Comprehensive error reporting and recovery

### 🔧 Diagnostic Operations
- **Session Control**: Start different diagnostic sessions with proper sequencing
- **Security Access**: Request seeds and verify security keys
- **Data Monitoring**: Read/write ECU data identifiers with formatted display
- **Protocol Stats**: Track requests, responses, and error counts

### 🐛 Fault Injection
- **Fault Categories**: Communication, Sensor, Actuator, Memory, Timing faults
- **Manual Triggering**: Trigger faults with severity-based visual indicators
- **Statistics Dashboard**: Monitor active faults, trigger counts, and system health
- **Real-time Updates**: Live fault status with automatic refresh

### 🎨 User Interface
- **Material-UI Design**: Modern, responsive interface with dark theme
- **Component Architecture**: Modular, reusable React components
- **Status Indicators**: Visual feedback for all operations
- **Professional Layout**: Tabbed interface with organized panels

## Component Details

### ConnectionPanel
- Transport type selection (TCP/Serial)
- Host/port configuration
- Connection status with error handling
- Visual connection state indicators

### SessionPanel
- Session type selection with descriptions
- Security level display and access controls
- Session statistics (requests/responses/errors)
- Activity timeline and performance metrics

### DataPanel
- Predefined DID list (Engine RPM, Speed, Temperature, etc.)
- Read/write operations with hex/decimal conversion
- Value formatting with units
- Last read timestamps

### FaultPanel
- Categorized fault display with severity indicators
- Manual fault triggering with status feedback
- Statistics dashboard with charts
- Active fault monitoring

### StatusBar
- Global connection status
- Security level indicators
- Active fault count
- Session performance metrics

## Development Status

### ✅ **Completed Features**
- **Component Architecture**: All major UI components implemented
- **TypeScript Integration**: Full type safety with modern React patterns
- **Material-UI Styling**: Professional dark theme with responsive design
- **State Management**: React hooks with proper error handling
- **IPC Communication**: Secure Electron main/renderer communication
- **Mock Backend**: Comprehensive mock services for demonstration

### 🔄 **Current Implementation**
- **Mock Services**: Simulated ECU operations for UI development
- **Component Integration**: All components connected with proper data flow
- **Error Handling**: Comprehensive error states and user feedback
- **Responsive Design**: Works across different screen sizes

## Development Setup

```bash
# Install dependencies (requires Node.js and npm)
npm install

# Development mode (runs both main and renderer)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Mock Implementation Details

The current implementation uses mock services to demonstrate full functionality:

### Connection Simulation
- Simulated TCP connection with configurable parameters
- Connection state management with proper error handling
- Transport type switching (TCP ↔ Serial)

### Diagnostic Operations
- Mock DID values with realistic automotive data
- Simulated security seed/key exchange (fixed seed for demo)
- Session state management with proper transitions
- Protocol statistics tracking

### Fault System
- Predefined fault catalog with realistic categories
- Manual fault triggering with state management
- Statistics tracking and reporting
- Active fault monitoring

## Integration Points

The UI is designed to integrate with core ECU Simulator components:

- **session-fsm**: Session state management and transitions
- **timing-engine**: Timing parameter monitoring and display
- **fault-injector**: Fault control and statistics integration
- **kwp2000**: Protocol service integration and message handling
- **Transport Layer**: Real connection management (future)

## Future Enhancements

### 🚀 **Planned Features**
- **Real Transport Integration**: Replace mocks with actual ECU communication
- **Live Protocol Monitoring**: Real-time message capture and analysis
- **Advanced Fault Scenarios**: Complex fault combinations and timing
- **OEM Profile Support**: Vehicle-specific diagnostic behaviors
- **Data Logging**: Session recording and export capabilities
- **Multi-Session Management**: Handle multiple concurrent connections

### 🔧 **Technical Improvements**
- **WebSocket Support**: Real-time updates from ECU simulator
- **Data Visualization**: Charts and graphs for diagnostic data
- **Plugin Architecture**: Extensible component system
- **Performance Monitoring**: UI responsiveness and memory usage
- **Accessibility**: Screen reader support and keyboard navigation

## Testing

```bash
# Run unit tests (when implemented)
npm run test:unit

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

## Contributing

The desktop UI follows the same development patterns as the core ECU Simulator:

- **Component-First**: Build reusable components with clear interfaces
- **Type Safety**: Full TypeScript implementation with strict types
- **Error Boundaries**: Comprehensive error handling and user feedback
- **Accessibility**: WCAG-compliant UI components
- **Performance**: Optimized rendering and state management