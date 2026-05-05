import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Alert,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

interface SessionPanelProps {
  session: any;
  onStartSession: (sessionType: string) => Promise<void>;
  onSecurityAccess: () => Promise<void>;
}

const SESSION_TYPES = {
  default: { label: 'Default Session', description: 'Basic diagnostic operations' },
  extended: { label: 'Extended Diagnostics', description: 'Advanced diagnostic features' },
  programming: { label: 'Programming Session', description: 'ECU reprogramming mode' },
  safety: { label: 'Safety System', description: 'Critical system diagnostics' },
};

export function SessionPanel({ session, onStartSession, onSecurityAccess }: SessionPanelProps) {
  const [selectedSessionType, setSelectedSessionType] = useState('default');
  const [startingSession, setStartingSession] = useState(false);
  const [accessingSecurity, setAccessingSecurity] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartSession = async () => {
    if (!session?.connected) return;

    setStartingSession(true);
    setError(null);
    try {
      await onStartSession(selectedSessionType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setStartingSession(false);
    }
  };

  const handleSecurityAccess = async () => {
    setAccessingSecurity(true);
    setError(null);
    try {
      await onSecurityAccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Security access failed');
    } finally {
      setAccessingSecurity(false);
    }
  };

  const getSessionStatusColor = (sessionType: string) => {
    switch (sessionType) {
      case 'default': return 'default';
      case 'extended': return 'primary';
      case 'programming': return 'warning';
      case 'safety': return 'error';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Diagnostic Session Control
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Current Session Status */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Current Session
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {session?.currentSession ? (
              <Chip
                label={SESSION_TYPES[session.currentSession as keyof typeof SESSION_TYPES]?.label || session.currentSession}
                color={getSessionStatusColor(session.currentSession)}
                size="small"
              />
            ) : (
              <Chip label="No Active Session" variant="outlined" size="small" />
            )}

            {session?.securityLevel > 0 && (
              <Chip
                icon={<SecurityIcon />}
                label={`Security Level ${session.securityLevel}`}
                color="success"
                size="small"
              />
            )}
          </Box>
        </Box>

        {/* Session Statistics */}
        {session && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 1, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {session.stats?.requestsSent || 0}
                </Typography>
                <Typography variant="caption">Requests</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 1, textAlign: 'center' }}>
                <Typography variant="h6" color="success.main">
                  {session.stats?.responsesReceived || 0}
                </Typography>
                <Typography variant="caption">Responses</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 1, textAlign: 'center' }}>
                <Typography variant="h6" color="warning.main">
                  {session.stats?.errors || 0}
                </Typography>
                <Typography variant="caption">Errors</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 1, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  {session.lastActivity ? new Date(session.lastActivity).toLocaleTimeString() : 'N/A'}
                </Typography>
                <Typography variant="caption">Last Activity</Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Session Control */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Session Type</InputLabel>
            <Select
              value={selectedSessionType}
              label="Session Type"
              onChange={(e) => setSelectedSessionType(e.target.value)}
            >
              {Object.entries(SESSION_TYPES).map(([key, config]) => (
                <MenuItem key={key} value={key}>
                  <Box>
                    <Typography variant="body2">{config.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {config.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<StartIcon />}
              onClick={handleStartSession}
              disabled={!session?.connected || startingSession}
              fullWidth
            >
              {startingSession ? 'Starting...' : 'Start Session'}
            </Button>

            <Button
              variant="outlined"
              startIcon={<SecurityIcon />}
              onClick={handleSecurityAccess}
              disabled={!session?.connected || accessingSecurity}
              fullWidth
            >
              {accessingSecurity ? 'Accessing...' : 'Security Access'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}