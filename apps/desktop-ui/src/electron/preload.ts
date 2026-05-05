/**
 * Electron Preload Script
 * Exposes secure APIs to the renderer process
 */

declare const require: any;
const { contextBridge, ipcRenderer } = require('electron');

interface ECUAPI {
  connect(): Promise<{ success: boolean; error?: string }>;
  disconnect(): Promise<{ success: boolean; error?: string }>;
  readDID(id: number): Promise<{ success: boolean; value?: any; error?: string }>;
  writeDID(id: number, data: Buffer): Promise<{ success: boolean; error?: string }>;
  getSecuritySeed(level: number): Promise<{ success: boolean; seed?: string; error?: string }>;
  verifySecurityKey(level: number, key: string): Promise<{ success: boolean; error?: string }>;
  getSession(): Promise<{ success: boolean; session?: any; error?: string }>;
  getFaults(): Promise<{ success: boolean; faults?: any[]; active?: any[]; stats?: any; error?: string }>;
  triggerFault(id: string): Promise<{ success: boolean; error?: string }>;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('ecuAPI', {
  connect: () => ipcRenderer.invoke('ecu-connect'),
  disconnect: () => ipcRenderer.invoke('ecu-disconnect'),
  readDID: (id: number) => ipcRenderer.invoke('ecu-read-did', { id }),
  writeDID: (id: number, data: Buffer) => ipcRenderer.invoke('ecu-write-did', { id, data }),
  getSecuritySeed: (level: number) => ipcRenderer.invoke('ecu-security-seed', { level }),
  verifySecurityKey: (level: number, key: string) => ipcRenderer.invoke('ecu-security-key', { level, key }),
  getSession: () => ipcRenderer.invoke('ecu-get-session'),
  getFaults: () => ipcRenderer.invoke('ecu-get-faults'),
  triggerFault: (id: string) => ipcRenderer.invoke('ecu-trigger-fault', { id }),
} as ECUAPI);