/**
 * ECU Entity - Core domain entity representing an Electronic Control Unit
 */
export class ECU {
  private id: string;
  private state: 'off' | 'on' | 'sleep';
  private protocol: 'kwp2000' | 'iso9141' | null;
  private sessionActive: boolean;
  private securityLocked: boolean;

  constructor(id: string) {
    this.id = id;
    this.state = 'off';
    this.protocol = null;
    this.sessionActive = false;
    this.securityLocked = false;
  }

  // Getters
  getId(): string {
    return this.id;
  }

  getState(): 'off' | 'on' | 'sleep' {
    return this.state;
  }

  getProtocol(): 'kwp2000' | 'iso9141' | null {
    return this.protocol;
  }

  isSessionActive(): boolean {
    return this.sessionActive;
  }

  isSecurityLocked(): boolean {
    return this.securityLocked;
  }

  // Methods
  powerOn(): void {
    if (this.state === 'off') {
      this.state = 'on';
    }
  }

  powerOff(): void {
    this.state = 'off';
    this.sessionActive = false;
    this.protocol = null;
  }

  enterSleep(): void {
    if (this.state === 'on') {
      this.state = 'sleep';
    }
  }

  wakeUp(): void {
    if (this.state === 'sleep') {
      this.state = 'on';
    }
  }

  setProtocol(protocol: 'kwp2000' | 'iso9141'): void {
    this.protocol = protocol;
  }

  startSession(): void {
    if (this.state === 'on' && !this.securityLocked) {
      this.sessionActive = true;
    }
  }

  endSession(): void {
    this.sessionActive = false;
  }

  lockSecurity(): void {
    this.securityLocked = true;
  }

  unlockSecurity(): void {
    this.securityLocked = false;
  }

  reset(): void {
    this.powerOff();
    this.securityLocked = false;
  }
}