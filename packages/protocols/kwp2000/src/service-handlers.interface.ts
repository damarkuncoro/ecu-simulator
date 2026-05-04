/**
 * KWP2000 Service Handler Interface
 * Each diagnostic service implements this to handle requests
 */
import type { Kwp2000Frame, Kwp2000Response } from "./index";

export interface KWP2000ServiceHandler {
  readonly serviceId: number;
  handle(frame: Kwp2000Frame): Kwp2000Response;
}

/**
 * Service Handler Registry
 * Maps service IDs to handlers, enabling OCP compliance
 * New services can be registered without modifying the router
 */
export class ServiceHandlerRegistry {
  private handlers = new Map<number, KWP2000ServiceHandler>();

  register(handler: KWP2000ServiceHandler): void {
    this.handlers.set(handler.serviceId, handler);
  }

  get(serviceId: number): KWP2000ServiceHandler | undefined {
    return this.handlers.get(serviceId);
  }

  getAll(): KWP2000ServiceHandler[] {
    return Array.from(this.handlers.values());
  }
}
