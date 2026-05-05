import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Tabs,
  Tab,
  Box,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { ConnectionPanel, SessionPanel, DataPanel, FaultPanel, StatusBar } from './components';

interface Session {
  id: string;
  connected: boolean;
  protocol: string;
  lastActivity: Date;
  stats: {
    requestsSent: number;
    responsesReceived: number;
    errors: number;
  };
}

interface Fault {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  active: boolean;
  triggerCount: number;
}

interface FaultStats {
  enabled: boolean;
  totalFaults: number;
  activeFaults: number;
  triggeredCount: number;
  config: any;
}

declare global {
  interface Window {
    ecuAPI: {
      connect(): Promise<{ success: boolean; error?: string }>;
      disconnect(): Promise<{ success: boolean; error?: string }>;
      readDID(id: number): Promise<{ success: boolean; value?: any; error?: string }>;
      writeDID(id: number, data: Buffer): Promise<{ success: boolean; error?: string }>;
      getSecuritySeed(level: number): Promise<{ success: boolean; seed?: string; error?: string }>;
      verifySecurityKey(level: number, key: string): Promise<{ success: boolean; error?: string }>;
      getSession(): Promise<{ success: boolean; session?: Session; error?: string }>;
      getFaults(): Promise<{ success: boolean; faults?: Fault[]; active?: Fault[]; stats?: FaultStats; error?: string }>;
      triggerFault(id: string): Promise<{ success: boolean; error?: string }>;
    };
  }
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [faults, setFaults] = useState<Fault[]>([]);
  const [activeFaults, setActiveFaults] = useState<Fault[]>([]);
  const [faultStats, setFaultStats] = useState<FaultStats | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Security dialog state
  const [securityDialog, setSecurityDialog] = useState({
    open: false,
    level: 1,
    seed: '',
    key: '',
  });

  useEffect(() => {
    loadSession();
    loadFaults();
  }, []);

  const loadSession = async () => {
    try {
      const result = await window.ecuAPI.getSession();
      if (result.success && result.session) {
        setSession(result.session);
      }
    } catch (error) {
      showSnackbar('Failed to load session', 'error');
    }
  };

  const loadFaults = async () => {
    try {
      const result = await window.ecuAPI.getFaults();
      if (result.success) {
        setFaults(result.faults || []);
        setActiveFaults(result.active || []);
        setFaultStats(result.stats || null);
      }
    } catch (error) {
      showSnackbar('Failed to load faults', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleConnect = async () => {
    try {
      const result = await window.ecuAPI.connect();
      if (result.success) {
        showSnackbar('Connected to ECU', 'success');
        await loadSession();
        await loadFaults();
      } else {
        showSnackbar(`Connection failed: ${result.error}`, 'error');
      }
    } catch (error) {
      showSnackbar('Connection failed', 'error');
    }
  };

  const handleDisconnect = async () => {
    try {
      const result = await window.ecuAPI.disconnect();
      if (result.success) {
        showSnackbar('Disconnected from ECU', 'success');
        await loadSession();
        await loadFaults();
      } else {
        showSnackbar(`Disconnection failed: ${result.error}`, 'error');
      }
    } catch (error) {
      showSnackbar('Disconnection failed', 'error');
    }
  };

  const handleStartSession = async (sessionType: string) => {
    // Mock session start - in real implementation this would call ECU
    if (session) {
      setSession(prev => prev ? { ...prev, currentSession: sessionType } : null);
      showSnackbar(`Started ${sessionType} session`, 'success');
    }
  };

  const handleSecurityAccess = async () => {
    try {
      const result = await window.ecuAPI.getSecuritySeed(1);
      if (result.success && result.seed) {
        setSecurityDialog(prev => ({ ...prev, seed: result.seed!, level: 1 }));
        showSnackbar('Security seed generated', 'success');
      } else {
        showSnackbar(`Failed to get seed: ${result.error}`, 'error');
      }
    } catch (error) {
      showSnackbar('Failed to get security seed', 'error');
    }
  };

  const handleSecurityKey = async (level: number, key: string) => {
    try {
      const result = await window.ecuAPI.verifySecurityKey(level, key);
      if (result.success) {
        showSnackbar('Security key accepted', 'success');
        if (session) {
          setSession(prev => prev ? { ...prev, securityLevel: level } : null);
        }
        setSecurityDialog({ open: false, level: 1, seed: '', key: '' });
      } else {
        showSnackbar(`Security key rejected: ${result.error}`, 'error');
      }
    } catch (error) {
      showSnackbar('Failed to verify security key', 'error');
    }
  };

  const handleReadDID = async (id: number) => {
    try {
      const result = await window.ecuAPI.readDID(id);
      if (result.success) {
        showSnackbar(`Successfully read DID 0x${id.toString(16)}`, 'success');
        return result;
      } else {
        showSnackbar(`Failed to read DID: ${result.error}`, 'error');
        return result;
      }
    } catch (error) {
      showSnackbar('Failed to read DID', 'error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const handleWriteDID = async (id: number, data: string) => {
    try {
      const result = await window.ecuAPI.writeDID(id, Buffer.from(data, 'hex'));
      if (result.success) {
        showSnackbar(`Successfully wrote DID 0x${id.toString(16)}`, 'success');
        return result;
      } else {
        showSnackbar(`Failed to write DID: ${result.error}`, 'error');
        return result;
      }
    } catch (error) {
      showSnackbar('Failed to write DID', 'error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const handleTriggerFault = async (faultId: string) => {
    try {
      const result = await window.ecuAPI.triggerFault(faultId);
      if (result.success) {
        showSnackbar('Fault triggered successfully', 'success');
        await loadFaults();
      } else {
        showSnackbar(`Failed to trigger fault: ${result.error}`, 'error');
      }
    } catch (error) {
      showSnackbar('Failed to trigger fault', 'error');
    }
  };

  const handleRefreshFaults = async () => {
    await loadFaults();
    showSnackbar('Faults refreshed', 'info');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'high': return <ErrorIcon color="error" />;
      case 'medium': return <WarningIcon color="warning" />;
      case 'low': return <WarningIcon color="info" />;
      default: return <WarningIcon />;
    }
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ECU Simulator - Diagnostic Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      <StatusBar session={session} faults={faults} activeFaults={activeFaults} />

      <Container maxWidth="xl" sx={{ mt: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Grid container spacing={3}>
          {/* Connection Panel */}
          <Grid item xs={12} lg={4}>
            <ConnectionPanel
              session={session}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          </Grid>

          {/* Session Panel */}
          <Grid item xs={12} lg={8}>
            <SessionPanel
              session={session}
              onStartSession={handleStartSession}
              onSecurityAccess={handleSecurityAccess}
            />
          </Grid>
        </Grid>

        {/* Main Content */}
        <Box sx={{ mt: 3, flexGrow: 1 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Data Monitor" />
            <Tab label="Fault Injection" />
          </Tabs>

          {/* Data Monitor Tab */}
          {tabValue === 0 && (
            <Box sx={{ mt: 2 }}>
              <DataPanel
                session={session}
                onReadDID={handleReadDID}
                onWriteDID={handleWriteDID}
              />
            </Box>
          )}

          {/* Fault Injection Tab */}
          {tabValue === 1 && (
            <Box sx={{ mt: 2 }}>
              <FaultPanel
                session={session}
                faults={faults}
                activeFaults={activeFaults}
                stats={faultStats}
                onTriggerFault={handleTriggerFault}
                onRefreshFaults={handleRefreshFaults}
              />
            </Box>
          )}
        </Box>
      </Container>

      {/* Security Access Dialog */}
      <Dialog open={securityDialog.open} onClose={() => setSecurityDialog({ open: false, level: 1, seed: '', key: '' })}>
        <DialogTitle>Security Access</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Request a security seed and provide the corresponding key for authentication.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => handleSecurityAccess()}
              sx={{ mb: 2 }}
            >
              Request Seed (Level 1)
            </Button>
            {securityDialog.seed && (
              <TextField
                fullWidth
                label="Seed (hex)"
                value={securityDialog.seed}
                InputProps={{ readOnly: true }}
                sx={{ mb: 2 }}
              />
            )}
            <TextField
              fullWidth
              label="Key (hex)"
              value={securityDialog.key}
              onChange={(e) => setSecurityDialog(prev => ({ ...prev, key: e.target.value }))}
              placeholder="Enter security key (e.g., 12345678)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSecurityDialog({ open: false, level: 1, seed: '', key: '' })}>
            Cancel
          </Button>
          <Button
            onClick={() => handleSecurityKey(securityDialog.level, securityDialog.key)}
            disabled={!securityDialog.key.trim()}
            variant="contained"
          >
            Verify Key
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}