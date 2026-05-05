/**
 * Electron Main Process
 * Controls the application lifecycle and creates browser windows
 */

// Type declarations for Electron (avoiding direct imports for compatibility)
declare const require: any;
const electron = require('electron');
const { app, BrowserWindow, ipcMain, dialog } = electron;
import * as path from 'path';
import { ECUDiagnosticApp } from '../ECUDiagnosticApp';

let mainWindow: any = null;
let ecuApp: ECUDiagnosticApp | null = null;

function createWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'ECU Simulator - Diagnostic Dashboard',
    icon: path.join(__dirname, '../../assets/icon.png'), // Optional
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeECUApp(): Promise<void> {
  try {
    ecuApp = new ECUDiagnosticApp();
    await ecuApp.initialize();

    console.log('ECU Diagnostic App initialized successfully');
  } catch (error) {
    console.error('Failed to initialize ECU App:', error);
    dialog.showErrorBox(
      'Initialization Error',
      `Failed to initialize ECU Diagnostic App: ${error}`
    );
    app.quit();
  }
}

// App event handlers
app.whenReady().then(async () => {
  await initializeECUApp();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (ecuApp) {
    ecuApp.stop();
  }
});

// IPC handlers
ipcMain.handle('ecu-connect', async () => {
  if (!ecuApp) return { success: false, error: 'ECU App not initialized' };
  const handler = ecuApp.getIPCHandler('connect');
  return handler ? await handler() : { success: false, error: 'Handler not found' };
});

ipcMain.handle('ecu-disconnect', async () => {
  if (!ecuApp) return { success: false, error: 'ECU App not initialized' };
  const handler = ecuApp.getIPCHandler('disconnect');
  return handler ? await handler() : { success: false, error: 'Handler not found' };
});

ipcMain.handle('ecu-read-did', async (event: any, params: any) => {
  if (!ecuApp) return { success: false, error: 'ECU App not initialized' };
  const handler = ecuApp.getIPCHandler('read-did');
  return handler ? await handler(params) : { success: false, error: 'Handler not found' };
});

ipcMain.handle('ecu-write-did', async (event: any, params: any) => {
  if (!ecuApp) return { success: false, error: 'ECU App not initialized' };
  const handler = ecuApp.getIPCHandler('write-did');
  return handler ? await handler(params) : { success: false, error: 'Handler not found' };
});

ipcMain.handle('ecu-security-seed', async (event: any, params: any) => {
  if (!ecuApp) return { success: false, error: 'ECU App not initialized' };
  const handler = ecuApp.getIPCHandler('security-seed');
  return handler ? await handler(params) : { success: false, error: 'Handler not found' };
});

ipcMain.handle('ecu-security-key', async (event: any, params: any) => {
  if (!ecuApp) return { success: false, error: 'ECU App not initialized' };
  const handler = ecuApp.getIPCHandler('security-key');
  return handler ? await handler(params) : { success: false, error: 'Handler not found' };
});

ipcMain.handle('ecu-get-session', () => {
  if (!ecuApp) return { success: false, error: 'ECU App not initialized' };
  const handler = ecuApp.getIPCHandler('get-session');
  return handler ? handler() : { success: false, error: 'Handler not found' };
});

ipcMain.handle('ecu-get-faults', () => {
  if (!ecuApp) return { success: false, error: 'ECU App not initialized' };
  const handler = ecuApp.getIPCHandler('get-faults');
  return handler ? handler() : { success: false, error: 'Handler not found' };
});

ipcMain.handle('ecu-trigger-fault', (event: any, params: any) => {
  if (!ecuApp) return { success: false, error: 'ECU App not initialized' };
  const handler = ecuApp.getIPCHandler('trigger-fault');
  return handler ? handler(params) : { success: false, error: 'Handler not found' };
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Unexpected Error', `An unexpected error occurred: ${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  dialog.showErrorBox('Unhandled Error', `An unhandled error occurred: ${reason}`);
});