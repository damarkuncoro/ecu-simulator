# 🚗 ECU Simulator — Production-Grade KWP2000/ISO9141 Platform

Simulation-grade ECU diagnostic platform supporting **hybrid transport** (TCP for dev/CI, K-Line serial for hardware-in-loop).

---

## Architecture

```
ecu-simulator/
├── apps/
│   ├── cli-diag/          # CLI diagnostics tool
│   ├── desktop-ui/        # Electron + React dashboard
│   └── cloud-gateway/     # WebSocket bridge for remote testing
│
├── packages/
│   ├── core/
│   │   ├── ecu-kernel/    # Virtual ECU state machine
│   │   ├── timing-engine/ # P1/P2/P3/P4 + jitter simulation
│   │   └── fault-injector/# DTC, sensor, timing, protocol faults
│   │
│   ├── protocols/
│   │   ├── iso9141/       # K-Line physical + 5-baud init
│   │   ├── kwp2000/       # ISO 14230 framing + service router
│   │   ├── uds/           # ISO 14229 (roadmap)
│   │   └── can/           # ISO 15765 CAN TP (roadmap)
│   │
│   ├── services/
│   │   ├── dtc-engine/    # SAE J2012 compliant DTC store
│   │   ├── did-registry/  # Typed DID store + validation
│   │   ├── security-engine/ # Seed/key + OEM plugin support
│   │   └── session-fsm/   # XState session state machine
│   │
│   ├── transport/
│   │   ├── abstract/      # ITransport interface + factory
│   │   ├── tcp/           # TCP socket (dev / CI)
│   │   ├── serial/        # node-serialport + 5-baud init
│   │   └── websocket/     # UI / remote access
│   │
│   └── utils/
│       ├── checksum/      # ISO 14230 XOR + CRC
│       ├── logger/        # Structured logging + PCAP export
│       └── test-helpers/  # Jest utils + scenario builders
│
└── tools/
    ├── scripts/           # setup-virtual-serial.sh
    ├── timing-validator/  # P1-P4 compliance checker
    ├── replay-runner/     # PCAP-style session replay
    └── oem-profiles/      # VAG / Toyota / Honda specifics
```

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

```bash
# 1. Clone and install
git clone <repo>
cd ecu-simulator
npm install

# 2. Configure
cp .env.example .env.local
# Edit .env.local as needed

# 3a. Run in TCP mode (software only)
npm run ecu:start:tcp

# 3b. Run with virtual serial port (no hardware needed)
npm run setup:virtual-serial
npm run ecu:start:serial

# 3c. Run with real K-Line hardware
ECU_SERIAL_PORT=/dev/ttyUSB0 npm run ecu:start:serial
```

### Docker (CI / Cloud)
```bash
# Start virtual ECU + gateway
docker-compose up -d

# Run integration test suite
docker-compose --profile test up test-runner
```

---

## Transport Modes

| Mode | Use Case | Config |
|------|----------|--------|
| `tcp` | Local dev, CI/CD, cloud | `ECU_HOST`, `ECU_PORT` |
| `serial` | Real K-Line hardware (HIL) | `ECU_SERIAL_PORT`, `ECU_BAUD_RATE` |
| `websocket` | Remote UI / dashboard | `GATEWAY_PORT` |

Switch via env var: `ECU_TRANSPORT=serial npm run ecu:start`

---

## Running Tests

```bash
# Unit tests only
npm run test:unit

# Integration tests (requires TCP ECU running or Docker)
npm run test:integration

# Hardware-in-loop (requires K-Line adapter + self-hosted runner)
npm run test:hil
```

---

## Next Steps (Roadmap)

- [ ] `session-fsm` — XState diagnostic session machine
- [ ] `timing-engine` — P1/P2/P3/P4 + jitter simulation
- [ ] `fault-injector` — DTC / sensor / protocol fault injection
- [ ] `kwp2000` — Full service router (0x10, 0x19, 0x22, 0x27, 0x2E...)
- [ ] `oem-profiles` — VAG/Toyota/Honda variant behaviors
- [ ] `desktop-ui` — Electron dashboard
- [ ] AI fault prediction layer
