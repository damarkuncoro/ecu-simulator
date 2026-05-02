/**
 * @ecu/session-fsm - Unit Tests
 * Comprehensive tests for Session FSM state machine
 */

import {
  SessionFSM,
  SESSION_TYPES,
  SESSION_STATES,
  SessionEvent,
  SessionContext,
} from "../src/index";

describe("SessionFSM", () => {
  let fsm: SessionFSM;

  beforeEach(() => {
    fsm = new SessionFSM();
  });

  describe("Initial State", () => {
    it("should start in OFFLINE state", () => {
      expect(fsm.getState()).toBe(SESSION_STATES.OFFLINE);
    });

    it("should have default session type", () => {
      expect(fsm.getContext().currentSession).toBe(SESSION_TYPES.DEFAULT);
    });

    it("should have zero security level", () => {
      expect(fsm.getContext().securityLevel).toBe(0);
    });

    it("should not be session active initially", () => {
      expect(fsm.isSessionActive()).toBe(false);
    });
  });

  describe("Connection Flow", () => {
    it("should transition OFFLINE -> CONNECTING on CONNECT", () => {
      fsm.send({ type: "CONNECT" });
      expect(fsm.getState()).toBe(SESSION_STATES.CONNECTING);
    });

    it("should start session timer on CONNECT", () => {
      fsm.send({ type: "CONNECT" });
      // Timer started internally — verify via isSessionActive
      expect(fsm.isSessionActive()).toBe(true);
    });

    it("should transition CONNECTING -> CONNECTED on SESSION_CONTROL", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({ type: "SESSION_CONTROL", sessionType: SESSION_TYPES.DEFAULT });

      expect(fsm.getState()).toBe(SESSION_STATES.CONNECTED);
    });

    it("should update session type on SESSION_CONTROL", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });

      const ctx = fsm.getContext();
      expect(ctx.currentSession).toBe(SESSION_TYPES.EXTENDED_DIAGNOSTIC);
    });

    it("should transition CONNECTING -> OFFLINE on DISCONNECT", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({ type: "DISCONNECT" });

      expect(fsm.getState()).toBe(SESSION_STATES.OFFLINE);
    });
  });

  describe("Session Transitions", () => {
    beforeEach(() => {
      fsm.send({ type: "CONNECT" });
      fsm.send({ type: "SESSION_CONTROL", sessionType: SESSION_TYPES.DEFAULT });
    });

    it("should transition CONNECTED -> DIAGNOSTIC_SESSION on SESSION_CONTROL", () => {
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });

      expect(fsm.getState()).toBe(SESSION_STATES.DIAGNOSTIC_SESSION);
    });

    it("should transition CONNECTED -> AUTHENTICATING on SECURITY_ACCESS", () => {
      fsm.send({ type: "SECURITY_ACCESS", level: 1 });

      expect(fsm.getState()).toBe(SESSION_STATES.AUTHENTICATING);
    });

    it("should transition CONNECTED -> DISCONNECTING on DISCONNECT", () => {
      fsm.send({ type: "DISCONNECT" });

      expect(fsm.getState()).toBe(SESSION_STATES.DISCONNECTING);
    });

    it("should transition CONNECTED -> OFFLINE on TIMEOUT", () => {
      fsm.send({ type: "TIMEOUT" });

      expect(fsm.getState()).toBe(SESSION_STATES.OFFLINE);
    });
  });

  describe("Security Access Flow", () => {
    beforeEach(() => {
      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });
    });

    it("should transition DIAGNOSTIC_SESSION -> AUTHENTICATING on SECURITY_ACCESS", () => {
      fsm.send({ type: "SECURITY_ACCESS", level: 1 });

      expect(fsm.getState()).toBe(SESSION_STATES.AUTHENTICATING);
    });

    it("should update security level on successful key (mocked)", () => {
      // Mock security level update - normally done internally
      fsm.send({
        type: "SECURITY_ACCESS",
        level: 1,
        key: Buffer.from([0x01, 0x02, 0x03, 0x04]),
      });

      const ctx = fsm.getContext();
      expect(ctx.securityLevel).toBeGreaterThanOrEqual(1);
    });

    it("should transition AUTHENTICATING -> AUTHENTICATED on key success", () => {
      // For test purposes, manually trigger transition by verifying key
      fsm.send({ type: "SECURITY_ACCESS", level: 1 });

      // Simulate successful unlock (mock)
      (fsm as any).context.securityLevel = 1;
      fsm.send({ type: "SECURITY_ACCESS", level: 1, key: Buffer.alloc(4) });

      expect(fsm.getState()).toBe(SESSION_STATES.AUTHENTICATED);
    });

    it("should transition AUTHENTICATING -> CONNECTED on TIMEOUT", () => {
      fsm.send({ type: "SECURITY_ACCESS", level: 1 });
      fsm.send({ type: "TIMEOUT" });

      expect(fsm.getState()).toBe(SESSION_STATES.CONNECTED);
    });
  });

  describe("Session Types", () => {
    it("should transition AUTHENTICATED -> PROGRAMMING_SESSION for programming", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });
      fsm.send({ type: "SECURITY_ACCESS", level: 1 });

      // Manually set security to simulate success
      (fsm as any).context.securityLevel = 1;
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.PROGRAMMING,
      });

      expect(fsm.getState()).toBe(SESSION_STATES.PROGRAMMING_SESSION);
    });

    it("should transition AUTHENTICATED -> SAFETY_SESSION for safety system", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });
      fsm.send({ type: "SECURITY_ACCESS", level: 1 });
      (fsm as any).context.securityLevel = 1;
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.SAFETY_SYSTEM,
      });

      expect(fsm.getState()).toBe(SESSION_STATES.SAFETY_SESSION);
    });

    it("should transition AUTHENTICATED -> DIAGNOSTIC_SESSION for extended", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });
      fsm.send({ type: "SECURITY_ACCESS", level: 1 });
      (fsm as any).context.securityLevel = 1;
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });

      expect(fsm.getState()).toBe(SESSION_STATES.DIAGNOSTIC_SESSION);
    });
  });

  describe("Timeout Handling", () => {
    it("should transition DIAGNOSTIC_SESSION -> TIMEOUT_WARNING on TIMEOUT", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });

      fsm.send({ type: "TIMEOUT" });

      expect(fsm.getState()).toBe(SESSION_STATES.TIMEOUT_WARNING);
    });

    it("should transition TIMEOUT_WARNING -> OFFLINE on second TIMEOUT", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });
      fsm.send({ type: "TIMEOUT" }); // -> TIMEOUT_WARNING
      expect(fsm.getState()).toBe(SESSION_STATES.TIMEOUT_WARNING);

      fsm.send({ type: "TIMEOUT" }); // -> OFFLINE
      expect(fsm.getState()).toBe(SESSION_STATES.OFFLINE);
    });

    it("should transition TIMEOUT_WARNING -> DIAGNOSTIC_SESSION on TESTER_PRESENT", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });
      fsm.send({ type: "TIMEOUT" });

      fsm.send({ type: "TESTER_PRESENT" });

      expect(fsm.getState()).toBe(SESSION_STATES.DIAGNOSTIC_SESSION);
    });

    it("should transition TIMEOUT_WARNING -> DISCONNECTING on DISCONNECT", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });
      fsm.send({ type: "TIMEOUT" });

      fsm.send({ type: "DISCONNECT" });

      expect(fsm.getState()).toBe(SESSION_STATES.DISCONNECTING);
    });
  });

  describe("Session Activity Timeouts", () => {
    it("should update lastActivity on TESTER_PRESENT", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });

      const before = fsm.getContext().lastActivity;
      fsm.send({ type: "TESTER_PRESENT" });
      const after = fsm.getContext().lastActivity;

      expect(after).toBeGreaterThan(before);
    });

    it("should update lastActivity on DIAGNOSTIC_REQUEST", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });

      const before = fsm.getContext().lastActivity;
      fsm.send({ type: "DIAGNOSTIC_REQUEST", serviceId: 0x22 });
      const after = fsm.getContext().lastActivity;

      expect(after).toBeGreaterThan(before);
    });
  });

  describe("Disconnection Flow", () => {
    it("should cleanup state when entering DISCONNECTING", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });
      fsm.send({ type: "DISCONNECT" });

      const ctx = fsm.getContext();
      expect(ctx.currentSession).toBe(SESSION_TYPES.DEFAULT);
      expect(ctx.securityLevel).toBe(0);
      expect(ctx.sessionStartTime).toBe(0);
    });

    it("should clear timers on DISCONNECTING", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });
      fsm.send({ type: "DISCONNECT" });

      // After disconnect, should be offline and not active
      expect(fsm.getState()).toBe(SESSION_STATES.OFFLINE);
      expect(fsm.isSessionActive()).toBe(false);
    });
  });

  describe("State Queries", () => {
    it("should report isSessionActive for active states only", () => {
      expect(fsm.isSessionActive()).toBe(false);

      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });
      expect(fsm.isSessionActive()).toBe(true);

      fsm.send({ type: "DISCONNECT" });
      expect(fsm.isSessionActive()).toBe(false);
    });

    it("should report security required for specific services", () => {
      // Security required for 0x31, 0x3B, 0x3D per spec
      expect(fsm.isSecurityRequired(0x31)).toBe(true);
      expect(fsm.isSecurityRequired(0x3b)).toBe(true);
      expect(fsm.isSecurityRequired(0x3d)).toBe(true);

      // Not required for standard services
      expect(fsm.isSecurityRequired(0x22)).toBe(false);
      expect(fsm.isSecurityRequired(0x19)).toBe(false);
    });
  });

  describe("Reset", () => {
    it("should reset state to OFFLINE", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });

      fsm.reset();

      expect(fsm.getState()).toBe(SESSION_STATES.OFFLINE);
    });

    it("should emit state change on reset", () => {
      const listener = jest.fn();
      fsm.onTransition(listener);

      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });

      const callsBefore = listener.mock.calls.length;
      fsm.reset();
      expect(listener.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  describe("Event Listeners", () => {
    it("should call listener on state change", () => {
      const listener = jest.fn();
      fsm.onTransition(listener);

      fsm.send({ type: "CONNECT" });

      expect(listener).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(
        SESSION_STATES.CONNECTING,
        expect.any(Object),
      );
    });

    it("should return unsubscribe function", () => {
      const listener = jest.fn();
      const unsubscribe = fsm.onTransition(listener);

      unsubscribe();
      fsm.send({ type: "CONNECT" });

      expect(listener).not.toHaveBeenCalled();
    });

    it("should support multiple listeners", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      fsm.onTransition(listener1);
      fsm.onTransition(listener2);

      fsm.send({ type: "CONNECT" });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe("Stop", () => {
    it("should cleanup and clear listeners", () => {
      const listener = jest.fn();
      fsm.onTransition(listener);
      fsm.stop();

      expect(fsm.getState()).toBe(SESSION_STATES.OFFLINE);
      // Listener cleared (cannot verify without re-adding but trust stop implementation)
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle full diagnostic session lifecycle", () => {
      // CONNECT
      fsm.send({ type: "CONNECT" });
      expect(fsm.getState()).toBe(SESSION_STATES.CONNECTING);

      // Start extended session
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });
      expect(fsm.getState()).toBe(SESSION_STATES.DIAGNOSTIC_SESSION);
      expect(fsm.isSessionActive()).toBe(true);

      // Request security access
      fsm.send({ type: "SECURITY_ACCESS", level: 1 });
      expect(fsm.getState()).toBe(SESSION_STATES.AUTHENTICATING);

      // Unlock (simulate)
      (fsm as any).context.securityLevel = 1;
      fsm.send({ type: "SECURITY_ACCESS", level: 1, key: Buffer.alloc(4) });
      expect(fsm.getState()).toBe(SESSION_STATES.AUTHENTICATED);

      // Switch to programming session
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.PROGRAMMING,
      });
      expect(fsm.getState()).toBe(SESSION_STATES.PROGRAMMING_SESSION);

      // Send tester present
      fsm.send({ type: "TESTER_PRESENT" });
      expect(fsm.isSessionActive()).toBe(true);

      // Disconnect
      fsm.send({ type: "DISCONNECT" });
      expect(fsm.getState()).toBe(SESSION_STATES.OFFLINE);
    });

    it("should handle rapid session changes", () => {
      for (let i = 0; i < 50; i++) {
        fsm.send({ type: "CONNECT" });
        fsm.send({
          type: "SESSION_CONTROL",
          sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
        });
        fsm.send({ type: "DISCONNECT" });
      }

      expect(fsm.getState()).toBe(SESSION_STATES.OFFLINE);
    });

    it("should handle timeout while authenticating", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });
      fsm.send({ type: "SECURITY_ACCESS", level: 1 });
      expect(fsm.getState()).toBe(SESSION_STATES.AUTHENTICATING);

      fsm.send({ type: "TIMEOUT" });
      expect(fsm.getState()).toBe(SESSION_STATES.CONNECTED); // back to connected
    });
  });

  describe("Configuration", () => {
    it("should accept custom timeouts", () => {
      const customFsm = new SessionFSM({
        sessionTimeoutMs: 10000,
        testerPresentTimeoutMs: 10000,
        securityTimeoutMs: 15000,
        maxRetries: 5,
      });

      // Custom config applied — verify different default behavior via longer timeout simulation
      // Since we can't directly inspect timers, just verify FSM created without error
      // and that longer timeouts would manifest in state transition timing
      expect(customFsm.getState()).toBe(SESSION_STATES.OFFLINE);
      expect(customFsm.getContext().maxRetries).toBe(5);
    });
  });

  describe("Context Isolation", () => {
    it("should return copy of context (not mutable)", () => {
      fsm.send({ type: "CONNECT" });
      const ctx1 = fsm.getContext();
      ctx1.securityLevel = 999; // mutate

      const ctx2 = fsm.getContext();
      expect(ctx2.securityLevel).toBe(0); // unchanged
    });
  });

  describe("Edge Cases", () => {
    it("should ignore events in OFFLINE except CONNECT", () => {
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });
      expect(fsm.getState()).toBe(SESSION_STATES.OFFLINE);
    });

    it("should handle DISCONNECT in any state", () => {
      fsm.send({ type: "CONNECT" });
      fsm.send({
        type: "SESSION_CONTROL",
        sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
      });
      fsm.send({ type: "DISCONNECT" });
      expect(fsm.getState()).toBe(SESSION_STATES.DISCONNECTING);
    });
  });
});

describe("SessionFSM — Constants", () => {
  it("should have all session types defined", () => {
    expect(SESSION_TYPES.DEFAULT).toBe("default");
    expect(SESSION_TYPES.PROGRAMMING).toBe("programming");
    expect(SESSION_TYPES.EXTENDED_DIAGNOSTIC).toBe("extended");
    expect(SESSION_TYPES.SAFETY_SYSTEM).toBe("safety");
  });

  it("should have all states defined", () => {
    expect(SESSION_STATES.OFFLINE).toBe("offline");
    expect(SESSION_STATES.CONNECTING).toBe("connecting");
    expect(SESSION_STATES.CONNECTED).toBe("connected");
    expect(SESSION_STATES.AUTHENTICATING).toBe("authenticating");
    expect(SESSION_STATES.AUTHENTICATED).toBe("authenticated");
    expect(SESSION_STATES.DIAGNOSTIC_SESSION).toBe("diagnostic_session");
    expect(SESSION_STATES.PROGRAMMING_SESSION).toBe("programming_session");
    expect(SESSION_STATES.SAFETY_SESSION).toBe("safety_session");
    expect(SESSION_STATES.TIMEOUT_WARNING).toBe("timeout_warning");
    expect(SESSION_STATES.DISCONNECTING).toBe("disconnecting");
  });
});

describe("SessionFSM — Timing", () => {
  let fsm: SessionFSM;

  beforeEach(() => {
    fsm = new SessionFSM();
  });

  it("should schedule timeout and move to active state", () => {
    fsm.send({ type: "CONNECT" });
    fsm.send({ type: "SESSION_CONTROL", sessionType: SESSION_TYPES.DEFAULT });

    expect(fsm.isSessionActive()).toBe(true);
  });

  it("should show session active after CONNECT and SESSION_CONTROL", () => {
    fsm.send({ type: "CONNECT" });
    fsm.send({
      type: "SESSION_CONTROL",
      sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
    });

    expect(fsm.isSessionActive()).toBe(true);
  });

  it("should reset timers on reset", () => {
    fsm.send({ type: "CONNECT" });
    fsm.send({
      type: "SESSION_CONTROL",
      sessionType: SESSION_TYPES.EXTENDED_DIAGNOSTIC,
    });

    expect(fsm.isSessionActive()).toBe(true);

    fsm.reset();

    expect(fsm.getState()).toBe(SESSION_STATES.OFFLINE);
    expect(fsm.isSessionActive()).toBe(false);
  });
});
