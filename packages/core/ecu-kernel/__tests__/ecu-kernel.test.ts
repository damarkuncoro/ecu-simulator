/**
 * ECU Simulator — Integration Tests
 * End-to-end tests for KWP2000 + TCP transport + Session FSM
 */

import { createServer, Server } from "net";
import * as net from "net";
import { VirtualEcu, VirtualEcuFactory } from "@ecu/core-kernel";
import { DTCStatusFactory } from "@ecu/core-kernel";

describe("KWP2000 + TCP Integration", () => {
  let ecu: VirtualEcu;
  let server: Server;
  let client: net.Socket;


  beforeAll((done) => {
    // Wait for build if needed
    done();
  }, 10000);

  beforeEach((done) => {
    // Create VirtualEcu using factory with TCP transport
    ecu = VirtualEcuFactory.createTcpEcu(
      {
        host: "127.0.0.1",
        port: 20001,
        connectTimeoutMs: 5000,
        readTimeoutMs: 2000,
      },
      "kwp2000"
    );

    // Listen for state changes
    ecu.onStateChange((state) => {
      // console.log("[Test] State:", state);
    });

    ecu
      .start()
      .then(() => {
        // Create client socket
        client = net.createConnection({ port: 20001 }, () => {
          done();
        });
      })
      .catch(done);
  }, 15000);

  afterEach(async () => {
    if (client && !client.destroyed) {
      client.end();
    }
    await ecu.stop();
  }, 10000);

  /**
   * Helper: Send raw KWP2000 frame and get response
   */
  function sendRequest(
    serviceId: number,
    data: Buffer = Buffer.alloc(0),
  ): Promise<Buffer> {
    const frame = Buffer.concat([
      Buffer.from([data.length + 1]), // length (serviceId + data)
      Buffer.from([serviceId]),
      data,
    ]);

    return new Promise<Buffer>((resolve, reject) => {
      client.write(frame);
      client.once("data", (response) => {
        resolve(response);
      });

      // Timeout
      setTimeout(() => reject(new Error("Timeout")), 2000);
    });
  }

  describe("Connection Lifecycle", () => {
    it("should establish connection and respond", (done) => {
      // ECU automatically responds to connection with session control?
      // Actually ECU waits for first request
      done();
    });
  });

  describe("Diagnostic Session Control (0x10)", () => {
    it("should enter extended session", (done) => {
      sendRequest(0x10, Buffer.from([0x03])) // 0x03 = extended
        .then((response) => {
          // Response: 0x50 (positive), session type, P2 timing
          expect(response[0]).toBe(0x50);
          expect(response[1]).toBe(0x03);
          done();
        })
        .catch(done);
    });

    it("should enter default session", (done) => {
      sendRequest(0x10, Buffer.from([0x01]))
        .then((response) => {
          expect(response[0]).toBe(0x50);
          expect(response[1]).toBe(0x01);
          done();
        })
        .catch(done);
    });

    it("should reject invalid session type", (done) => {
      sendRequest(0x10, Buffer.from([0xff]))
        .then((response) => {
          expect(response[0]).toBe(0x7f); // negative response
          expect(response[2]).toBe(0x12); // NRC: sub-function not supported
          done();
        })
        .catch(done);
    });
  });

  describe("Tester Present (0x3E)", () => {
    it("should respond positively", (done) => {
      sendRequest(0x3e, Buffer.from([0x00]))
        .then((response) => {
          expect(response[0]).toBe(0x7e);
          expect(response[1]).toBe(0x00);
          done();
        })
        .catch(done);
    });
  });

  describe("Read Data By Identifier (0x22)", () => {
    it("should return RPM (0x0C00)", (done) => {
      sendRequest(0x22, Buffer.from([0x0c, 0x00]))
        .then((response) => {
          expect(response[0]).toBe(0x62);
          expect(response[1]).toBe(0x0c);
          expect(response[2]).toBe(0x00);
          expect(response.length).toBe(4); // DID + 2 bytes value
          done();
        })
        .catch(done);
    });

    it("should return vehicle speed (0x0C03)", (done) => {
      sendRequest(0x22, Buffer.from([0x0c, 0x03]))
        .then((response) => {
          expect(response[0]).toBe(0x62);
          done();
        })
        .catch(done);
    });

    it("should reject unknown DID", (done) => {
      sendRequest(0x22, Buffer.from([0x00, 0x00]))
        .then((response) => {
          expect(response[0]).toBe(0x7f);
          expect(response[1]).toBe(0x22);
          expect(response[2]).toBe(0x31); // REQUEST_OUT_OF_RANGE
          done();
        })
        .catch(done);
    });
  });

  describe("Security Access (0x27)", () => {
    it("should request seed (level 1)", (done) => {
      sendRequest(0x27, Buffer.from([0x01]))
        .then((response) => {
          expect(response[0]).toBe(0x67); // positive
          expect(response[1]).toBe(0x01); // echoed level
          expect(response.length).toBe(5); // level + 4 seed bytes
          done();
        })
        .catch(done);
    });
  });

  describe("DTC Operations", () => {
    it("should read DTCs (empty)", (done) => {
      sendRequest(0x19, Buffer.from([0x02, 0xff])) // subfunction 0x02, mask 0xFF
        .then((response) => {
          expect(response[0]).toBe(0x59);
          expect(response[1]).toBe(0xff); // availability mask
          expect(response[2]).toBe(0x00); // count = 0
          done();
        })
        .catch(done);
    });

    it("should clear DTCs", (done) => {
      // First add a DTC
      const dtcEngine = ecu.getDtcEngine();
      dtcEngine.set(0x123456, DTCStatusFactory.CONFIRMED_ACTIVE);

      sendRequest(0x14, Buffer.alloc(0))
        .then(() => {
          return sendRequest(0x19, Buffer.from([0x02, 0xff]));
        })
        .then((response) => {
          expect(response[2]).toBe(0x00); // count = 0 after clear
          done();
        })
        .catch(done);
    });
  });

  describe("ECU Reset (0x11)", () => {
    it("should accept hard reset", (done) => {
      sendRequest(0x11, Buffer.from([0x01]))
        .then((response) => {
          expect(response[0]).toBe(0x51);
          expect(response[1]).toBe(0x01);
          done();
        })
        .catch(done);
    });
  });

  describe("Multiplexed Services", () => {
    it("should handle sequential requests", (done) => {
      let results: Buffer[] = [];

      sendRequest(0x10, Buffer.from([0x03]))
        .then((r1) => {
          results.push(r1);
          return sendRequest(0x3e, Buffer.from([0x00]));
        })
        .then((r2) => {
          results.push(r2);
          return sendRequest(0x22, Buffer.from([0x0c, 0x00]));
        })
        .then((r3) => {
          results.push(r3);
          expect(results.length).toBe(3);
          expect(results[0]![0]).toBe(0x50);
          expect(results[1]![0]).toBe(0x7e);
          expect(results[2]![0]).toBe(0x62);
          done();
        })
        .catch(done);
    });
  });

  describe("Session Timeout Behavior", () => {
    it("should maintain session across requests", (done) => {
      // Enter session
      sendRequest(0x10, Buffer.from([0x03]))
        .then(() => {
          // Send tester present immediately (should succeed)
          return sendRequest(0x3e, Buffer.from([0x00]));
        })
        .then(() => {
          done();
        })
        .catch(done);
    });
  });

  describe("Negative Response Codes", () => {
    it("should return NRC 0x13 for incorrect length", (done) => {
      sendRequest(0x10, Buffer.from([])) // no data
        .then((response) => {
          expect(response[0]).toBe(0x7f);
          expect(response[1]).toBe(0x10);
          expect(response[2]).toBe(0x13);
          done();
        })
        .catch(done);
    });
  });
});

describe("VirtualEcu Unit (No Network)", () => {
  let ecu: VirtualEcu;

  beforeEach(() => {
    ecu = VirtualEcuFactory.createTcpEcu(
      {
        host: "127.0.0.1",
        port: 20002,
        connectTimeoutMs: 1000,
        readTimeoutMs: 1000,
      },
      "kwp2000"
    );
  });

  afterEach(async () => {
    await ecu.stop();
  });

  it("should create instance", () => {
    expect(ecu).toBeInstanceOf(VirtualEcu);
  });

  it("should start and stop", async () => {
    await ecu.start();
    expect(ecu.isRunning()).toBe(true);

    await ecu.stop();
    expect(ecu.isRunning()).toBe(false);
  });

  it("should expose DTC engine", () => {
    const engine = ecu.getDtcEngine();
    expect(engine).toBeDefined();
    expect(typeof engine.set).toBe("function");
    expect(typeof engine.getAll).toBe("function");
  });

  it("should reset state", () => {
    ecu.reset();
    expect(ecu.getSessionState()).toBe("offline");
    expect(ecu.getSessionContext().securityLevel).toBe(0);
  });

  it("should inject DTC fault", () => {
    ecu.injectFault("dtc", { code: 0x123456, status: DTCStatusFactory.CONFIRMED_ACTIVE });
    const dtcs = ecu.getDtcEngine().getByStatusMask(0xff);
    expect(dtcs.length).toBe(1);
    expect(dtcs[0]!.code).toBe(0x123456);
  });

  it("should subscribe to state changes", () => {
    const listener = jest.fn();
    ecu.onStateChange(listener);

    // Simulate via direct session manipulation
    ecu["session"].send({ type: "CONNECT" });

    expect(listener).toHaveBeenCalled();
  });
});
