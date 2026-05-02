/**
 * @ecu/session-fsm
 * Diagnostic session state machine.
 * Manages session lifecycle, timing, and security states.
 */

import {
  DEFAULT_SESSION_TIMEOUT_MS,
  DEFAULT_P3_TIMEOUT_MS,
  DEFAULT_SECURITY_TIMEOUT_MS,
} from "@ecu/protocol-constants";

export const PKG = "@ecu/session-fsm";

// ─── Session Types and States ───────────────────────────────────────────────

export const SESSION_TYPES = {
  DEFAULT: "default",
  PROGRAMMING: "programming",
  EXTENDED_DIAGNOSTIC: "extended",
  SAFETY_SYSTEM: "safety",
} as const;

export type SessionType = (typeof SESSION_TYPES)[keyof typeof SESSION_TYPES];

export const SESSION_STATES = {
  OFFLINE: "offline",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  AUTHENTICATING: "authenticating",
  AUTHENTICATED: "authenticated",
  DIAGNOSTIC_SESSION: "diagnostic_session",
  PROGRAMMING_SESSION: "programming_session",
  SAFETY_SESSION: "safety_session",
  TIMEOUT_WARNING: "timeout_warning",
  DISCONNECTING: "disconnecting",
} as const;

export type SessionState = (typeof SESSION_STATES)[keyof typeof SESSION_STATES];

// ─── Session Events ─────────────────────────────────────────────────────────

export type SessionEvent =
  | { type: "CONNECT" }
  | { type: "DISCONNECT" }
  | { type: "TIMEOUT" }
  | { type: "SESSION_CONTROL"; sessionType: SessionType }
  | { type: "SECURITY_ACCESS"; level: number; key?: Buffer }
  | { type: "DIAGNOSTIC_REQUEST"; serviceId: number }
  | { type: "TESTER_PRESENT" }
  | { type: "SESSION_TIMEOUT" }
  | { type: "AUTH_TIMEOUT" };

// ─── Session Context ────────────────────────────────────────────────────────

export interface SessionContext {
  currentSession: SessionType;
  securityLevel: number;
  lastActivity: number;
  sessionStartTime: number;
  timeouts: {
    session: number; // P1 - max time between messages
    testerPresent: number; // P3 - tester present timeout
    security: number; // Security access timeout
  };
  retryCount: number;
  maxRetries: number;
}

// ─── Session FSM Service ───────────────────────────────────────────────────

export interface SessionFSMConfig {
  sessionTimeoutMs?: number;
  testerPresentTimeoutMs?: number;
  securityTimeoutMs?: number;
  maxRetries?: number;
}

export class SessionFSM {
  private currentState: SessionState = SESSION_STATES.OFFLINE;
  private context: SessionContext;
  private config: Required<SessionFSMConfig>;
  private timeoutHandle: number | undefined;
  private listeners: Array<
    (state: SessionState, context: SessionContext) => void
  > = [];

  constructor(config: SessionFSMConfig = {}) {
    this.config = {
      sessionTimeoutMs: config.sessionTimeoutMs ?? DEFAULT_SESSION_TIMEOUT_MS,
      testerPresentTimeoutMs: config.testerPresentTimeoutMs ?? DEFAULT_P3_TIMEOUT_MS,
      securityTimeoutMs: config.securityTimeoutMs ?? DEFAULT_SECURITY_TIMEOUT_MS,
      maxRetries: config.maxRetries ?? 3,
    };

    this.context = {
      currentSession: SESSION_TYPES.DEFAULT,
      securityLevel: 0,
      lastActivity: 0,
      sessionStartTime: 0,
      timeouts: {
        session: this.config.sessionTimeoutMs,
        testerPresent: this.config.testerPresentTimeoutMs,
        security: this.config.securityTimeoutMs,
      },
      retryCount: 0,
      maxRetries: this.config.maxRetries,
    };
  }

  /** Send an event to the state machine */
  send(event: SessionEvent): void {
    this.handleEvent(event);
  }

  private handleEvent(event: SessionEvent): void {
    const oldState = this.currentState;

    switch (this.currentState) {
      case SESSION_STATES.OFFLINE:
        if (event.type === "CONNECT") {
          this.transitionTo(SESSION_STATES.CONNECTING);
          this.context.sessionStartTime = Date.now();
          this.context.lastActivity = Date.now();
        }
        break;

      case SESSION_STATES.CONNECTING:
        if (event.type === "DISCONNECT") {
          this.transitionTo(SESSION_STATES.OFFLINE);
        } else if (event.type === "SESSION_CONTROL") {
          this.context.currentSession = event.sessionType;
          this.context.lastActivity = Date.now();
          this.transitionTo(SESSION_STATES.CONNECTED);
          this.scheduleTimeout();
        }
        break;

      case SESSION_STATES.CONNECTED:
        if (event.type === "DISCONNECT") {
          this.transitionTo(SESSION_STATES.DISCONNECTING);
        } else if (event.type === "SESSION_CONTROL") {
          this.context.currentSession = event.sessionType;
          this.context.lastActivity = Date.now();
          this.transitionTo(SESSION_STATES.DIAGNOSTIC_SESSION);
          this.scheduleTimeout();
        } else if (event.type === "SECURITY_ACCESS") {
          this.transitionTo(SESSION_STATES.AUTHENTICATING);
        } else if (event.type === "TIMEOUT") {
          this.transitionTo(SESSION_STATES.OFFLINE);
        }
        break;

      case SESSION_STATES.AUTHENTICATING:
        if (event.type === "DISCONNECT") {
          this.transitionTo(SESSION_STATES.DISCONNECTING);
        } else if (event.type === "SECURITY_ACCESS" && event.key) {
          this.context.securityLevel = Math.max(
            this.context.securityLevel,
            event.level,
          );
          this.context.lastActivity = Date.now();
          this.transitionTo(SESSION_STATES.AUTHENTICATED);
          this.scheduleTimeout();
        } else if (event.type === "TIMEOUT") {
          this.transitionTo(SESSION_STATES.CONNECTED);
        }
        break;

      case SESSION_STATES.AUTHENTICATED:
        if (event.type === "DISCONNECT") {
          this.transitionTo(SESSION_STATES.DISCONNECTING);
        } else if (event.type === "SESSION_CONTROL") {
          this.context.currentSession = event.sessionType;
          this.context.lastActivity = Date.now();
          if (event.sessionType === SESSION_TYPES.PROGRAMMING) {
            this.transitionTo(SESSION_STATES.PROGRAMMING_SESSION);
          } else if (event.sessionType === SESSION_TYPES.SAFETY_SYSTEM) {
            this.transitionTo(SESSION_STATES.SAFETY_SESSION);
          } else {
            this.transitionTo(SESSION_STATES.DIAGNOSTIC_SESSION);
          }
          this.scheduleTimeout();
        } else if (event.type === "TIMEOUT") {
          this.transitionTo(SESSION_STATES.TIMEOUT_WARNING);
        }
        break;

      case SESSION_STATES.DIAGNOSTIC_SESSION:
      case SESSION_STATES.PROGRAMMING_SESSION:
      case SESSION_STATES.SAFETY_SESSION:
        if (event.type === "DISCONNECT") {
          this.transitionTo(SESSION_STATES.DISCONNECTING);
        } else if (
          event.type === "DIAGNOSTIC_REQUEST" ||
          event.type === "TESTER_PRESENT"
        ) {
          this.context.lastActivity = Date.now();
          this.scheduleTimeout();
        } else if (event.type === "SESSION_CONTROL") {
          this.context.currentSession = event.sessionType;
          this.context.lastActivity = Date.now();
          this.scheduleTimeout();
        } else if (event.type === "TIMEOUT") {
          this.transitionTo(SESSION_STATES.TIMEOUT_WARNING);
        }
        break;

      case SESSION_STATES.TIMEOUT_WARNING:
        if (event.type === "TESTER_PRESENT") {
          this.context.lastActivity = Date.now();
          this.transitionTo(SESSION_STATES.DIAGNOSTIC_SESSION);
          this.scheduleTimeout();
        } else if (event.type === "DISCONNECT") {
          this.transitionTo(SESSION_STATES.DISCONNECTING);
        } else if (event.type === "TIMEOUT") {
          this.transitionTo(SESSION_STATES.OFFLINE);
        }
        break;

      case SESSION_STATES.DISCONNECTING:
        // Final state - clean up
        this.cleanup();
        break;
    }

    // Notify listeners if state changed
    if (oldState !== this.currentState) {
      this.notifyListeners();
    }
  }

  private transitionTo(state: SessionState): void {
    this.currentState = state;
    if (
      state === SESSION_STATES.OFFLINE ||
      state === SESSION_STATES.DISCONNECTING
    ) {
      this.cleanup();
    }
  }

  private scheduleTimeout(): void {
    this.clearTimeout();

    let timeoutMs: number;
    switch (this.currentState) {
      case SESSION_STATES.CONNECTED:
      case SESSION_STATES.AUTHENTICATED:
        timeoutMs = this.context.timeouts.session;
        break;
      case SESSION_STATES.DIAGNOSTIC_SESSION:
      case SESSION_STATES.PROGRAMMING_SESSION:
      case SESSION_STATES.SAFETY_SESSION:
        timeoutMs = this.context.timeouts.testerPresent;
        break;
      case SESSION_STATES.AUTHENTICATING:
        timeoutMs = this.context.timeouts.security;
        break;
      case SESSION_STATES.TIMEOUT_WARNING:
        timeoutMs = 2000; // Final timeout
        break;
      default:
        return;
    }

    this.timeoutHandle = setTimeout(() => {
      this.send({ type: "TIMEOUT" });
    }, timeoutMs) as any;
  }

  private clearTimeout(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = undefined;
    }
  }

  private cleanup(): void {
    this.clearTimeout();
    this.context.currentSession = SESSION_TYPES.DEFAULT;
    this.context.securityLevel = 0;
    this.context.lastActivity = 0;
    this.context.sessionStartTime = 0;
    this.context.retryCount = 0;
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.currentState, this.context);
    }
  }

  /** Get current state */
  getState(): SessionState {
    return this.currentState;
  }

  /** Get current context */
  getContext(): SessionContext {
    return { ...this.context };
  }

  /** Check if session is active */
  isSessionActive(): boolean {
    const activeStates: SessionState[] = [
      SESSION_STATES.CONNECTED,
      SESSION_STATES.AUTHENTICATED,
      SESSION_STATES.DIAGNOSTIC_SESSION,
      SESSION_STATES.PROGRAMMING_SESSION,
      SESSION_STATES.SAFETY_SESSION,
    ];
    return activeStates.includes(this.currentState);
  }

  /** Check if security access is required for current operation */
  isSecurityRequired(serviceId: number): boolean {
    // Services that typically require security access
    const securityRequiredServices = [0x31, 0x3b, 0x3d]; // Example services
    return securityRequiredServices.includes(serviceId);
  }

  /** Check if current security level is sufficient */
  hasRequiredSecurity(requiredLevel: number): boolean {
    return this.context.securityLevel >= requiredLevel;
  }

  /** Reset the state machine */
  reset(): void {
    this.cleanup();
    this.currentState = SESSION_STATES.OFFLINE;
    this.notifyListeners();
  }

  /** Subscribe to state changes */
  onTransition(
    listener: (state: SessionState, context: SessionContext) => void,
  ): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /** Stop the state machine */
  stop(): void {
    this.cleanup();
    this.listeners = [];
  }
}
