import React from 'react';
import {
  Box,
  Chip,
  Typography,
  LinearProgress,
} from '@mui/material';
import {
  Wifi as ConnectedIcon,
  WifiOff as DisconnectedIcon,
  Security as SecurityIcon,
  BugReport as FaultIcon,
  Speed as PerformanceIcon,
} from '@mui/icons-material';

interface StatusBarProps {
  session: any;
  faults: any[];
  activeFaults: any[];
}

export function StatusBar({ session, faults, activeFaults }: StatusBarProps) {
  const connected = session?.connected;
  const securityLevel = session?.securityLevel || 0;
  const activeFaultCount = activeFaults.length;

  const getConnectionStatus = () => {
    if (!session) return { label: 'No Session', color: 'default' as const };
    return connected
      ? { label: 'Connected', color: 'success' as const }
      : { label: 'Disconnected', color: 'error' as const };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      {/* Connection Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {connected ? (
          <ConnectedIcon color="success" fontSize="small" />
        ) : (
          <DisconnectedIcon color="error" fontSize="small" />
        )}
        <Chip
          label={connectionStatus.label}
          color={connectionStatus.color}
          size="small"
          variant="outlined"
        />
      </Box>

      {/* Protocol Info */}
      {session?.protocol && (
        <Chip
          label={`Protocol: ${session.protocol.toUpperCase()}`}
          size="small"
          variant="outlined"
        />
      )}

      {/* Security Level */}
      {securityLevel > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon fontSize="small" color="success" />
          <Chip
            label={`Security L${securityLevel}`}
            color="success"
            size="small"
            variant="outlined"
          />
        </Box>
      )}

      {/* Active Faults */}
      {activeFaultCount > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FaultIcon fontSize="small" color="error" />
          <Chip
            label={`${activeFaultCount} Active Fault${activeFaultCount !== 1 ? 's' : ''}`}
            color="error"
            size="small"
            variant="outlined"
          />
        </Box>
      )}

      {/* Session Stats */}
      {session?.stats && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
          <Typography variant="caption" color="text.secondary">
            Req: {session.stats.requestsSent || 0}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Resp: {session.stats.responsesReceived || 0}
          </Typography>
          {session.stats.errors > 0 && (
            <Typography variant="caption" color="error.main">
              Err: {session.stats.errors}
            </Typography>
          )}
        </Box>
      )}

      {/* Performance Indicator */}
      <Box sx={{ width: 100, ml: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PerformanceIcon fontSize="small" color="action" />
          <Box sx={{ width: '100%', mr: 1 }}>
            <LinearProgress
              variant="determinate"
              value={connected ? 100 : 0}
              color={connected ? 'success' : 'error'}
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}