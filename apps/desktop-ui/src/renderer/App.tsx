import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Paper,
  Button,
  Box,
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';

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

  // DID dialog state
  const [didDialog, setDidDialog] = useState({
    open: false,
    id: 0x0c00,
    value: '',
    isReading: true,
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
        loadSession();
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
        loadSession();
      } else {
        showSnackbar(`Disconnection failed: ${result.error}`, 'error');
      }
    } catch (error) {
      showSnackbar('Disconnection failed', 'error');
    }
  };

  const handleSecuritySeed = async (level: number) => {
    try {
      const result = await window.ecuAPI.getSecuritySeed(level);
      if (result.success && result.seed) {
        setSecurityDialog(prev => ({ ...prev, seed: result.seed!, level }));
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
        setSecurityDialog({ open: false, level: 1, seed: '', key: '' });
      } else {
        showSnackbar(`Security key rejected: ${result.error}`, 'error');
      }
    } catch (error) {
      showSnackbar('Failed to verify security key', 'error');
    }
  };

  const handleTriggerFault = async (faultId: string) => {
    try {
      const result = await window.ecuAPI.triggerFault(faultId);
      if (result.success) {
        showSnackbar('Fault triggered successfully', 'success');
        loadFaults();
      } else {
        showSnackbar(`Failed to trigger fault: ${result.error}`, 'error');
      }
    } catch (error) {
      showSnackbar('Failed to trigger fault', 'error');
    }
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
          {session && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={session.connected ? 'Connected' : 'Disconnected'}
                color={session.connected ? 'success' : 'error'}
                size="small"
              />
              <Typography variant="body2">
                Session: {session.protocol.toUpperCase()}
              </Typography>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Connection Controls */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<PlayIcon />}
              onClick={handleConnect}
              disabled={session?.connected}
            >
              Connect
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<StopIcon />}
              onClick={handleDisconnect}
              disabled={!session?.connected}
            >
              Disconnect
            </Button>
            <Button
              variant="outlined"
              startIcon={<SecurityIcon />}
              onClick={() => setSecurityDialog({ open: true, level: 1, seed: '', key: '' })}
            >
              Security Access
            </Button>
          </Box>
        </Paper>

        {/* Main Content */}
        <Box sx={{ flexGrow: 1 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Overview" />
            <Tab label="Fault Injection" />
            <Tab label="Data Monitor" />
          </Tabs>

          {/* Overview Tab */}
          {tabValue === 0 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Session Status
                    </Typography>
                    {session ? (
                      <Box>
                        <Typography>Protocol: {session.protocol}</Typography>
                        <Typography>Connected: {session.connected ? 'Yes' : 'No'}</Typography>
                        <Typography>Requests: {session.stats.requestsSent}</Typography>
                        <Typography>Responses: {session.stats.responsesReceived}</Typography>
                        <Typography>Errors: {session.stats.errors}</Typography>
                      </Box>
                    ) : (
                      <Typography color="text.secondary">No active session</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Fault Status
                    </Typography>
                    {faultStats ? (
                      <Box>
                        <Typography>Enabled: {faultStats.enabled ? 'Yes' : 'No'}</Typography>
                        <Typography>Total Faults: {faultStats.totalFaults}</Typography>
                        <Typography>Active Faults: {faultStats.activeFaults}</Typography>
                        <Typography>Triggered: {faultStats.triggeredCount}</Typography>
                      </Box>
                    ) : (
                      <Typography color="text.secondary">Fault data unavailable</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Fault Injection Tab */}
          {tabValue === 1 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Fault Injection Control
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Manually trigger faults for testing diagnostic responses
                    </Typography>
                    <List>
                      {faults.map((fault) => (
                        <ListItem key={fault.id}>
                          <ListItemIcon>
                            {getSeverityIcon(fault.severity)}
                          </ListItemIcon>
                          <ListItemText
                            primary={fault.name}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {fault.description}
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                  <Chip
                                    label={fault.category}
                                    size="small"
                                    sx={{ mr: 1 }}
                                  />
                                  <Chip
                                    label={fault.severity}
                                    size="small"
                                    color={getSeverityColor(fault.severity)}
                                  />
                                  <Chip
                                    label={`Triggered: ${fault.triggerCount}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ ml: 1 }}
                                  />
                                </Box>
                              </Box>
                            }
                          />
                          <Button
                            variant="outlined"
                            color="warning"
                            onClick={() => handleTriggerFault(fault.id)}
                            disabled={activeFaults.some(f => f.id === fault.id)}
                          >
                            Trigger
                          </Button>
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Data Monitor Tab */}
          {tabValue === 2 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Data Identifier Monitor
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Read and monitor ECU data identifiers (DIDs)
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => setDidDialog({ open: true, id: 0x0c00, value: '', isReading: true })}
                    >
                      Read Engine RPM (0x0C00)
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      </Container>

      {/* Security Access Dialog */}
      <Dialog open={securityDialog.open} onClose={() => setSecurityDialog({ open: false, level: 1, seed: '', key: '' })}>
        <DialogTitle>Security Access</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Button
              variant="outlined"
              onClick={() => handleSecuritySeed(securityDialog.level)}
              sx={{ mb: 2 }}
            >
              Request Seed (Level {securityDialog.level})
            </Button>
            {securityDialog.seed && (
              <TextField
                fullWidth
                label="Seed"
                value={securityDialog.seed}
                InputProps={{ readOnly: true }}
                sx={{ mb: 2 }}
              />
            )}
            <TextField
              fullWidth
              label="Key"
              value={securityDialog.key}
              onChange={(e) => setSecurityDialog(prev => ({ ...prev, key: e.target.value }))}
              placeholder="Enter security key"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSecurityDialog({ open: false, level: 1, seed: '', key: '' })}>
            Cancel
          </Button>
          <Button
            onClick={() => handleSecurityKey(securityDialog.level, securityDialog.key)}
            disabled={!securityDialog.key}
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