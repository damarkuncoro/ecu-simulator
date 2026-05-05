import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Grid,
  LinearProgress,
} from '@mui/material';
import {
  BugReport as BugIcon,
  PlayArrow as TriggerIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface FaultPanelProps {
  session: any;
  faults: any[];
  activeFaults: any[];
  stats: any;
  onTriggerFault: (id: string) => Promise<void>;
  onRefreshFaults: () => Promise<void>;
}

export function FaultPanel({
  session,
  faults,
  activeFaults,
  stats,
  onTriggerFault,
  onRefreshFaults
}: FaultPanelProps) {
  const [triggeringFault, setTriggeringFault] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTriggerFault = async (faultId: string) => {
    if (!session?.connected) return;

    setTriggeringFault(faultId);
    setError(null);

    try {
      await onTriggerFault(faultId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger fault');
    } finally {
      setTriggeringFault(null);
    }
  };

  const handleRefreshFaults = async () => {
    setRefreshing(true);
    setError(null);

    try {
      await onRefreshFaults();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh faults');
    } finally {
      setRefreshing(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'high':
        return <ErrorIcon color="error" />;
      case 'medium':
        return <WarningIcon color="warning" />;
      case 'low':
        return <InfoIcon color="info" />;
      default:
        return <BugIcon />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const isFaultActive = (faultId: string) => {
    return activeFaults.some(fault => fault.id === faultId);
  };

  const activeFaultCount = activeFaults.length;
  const totalFaultCount = faults.length;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Fault Injection Control
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshFaults}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Fault Statistics */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {totalFaultCount}
              </Typography>
              <Typography variant="caption">Total Faults</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {activeFaultCount}
              </Typography>
              <Typography variant="caption">Active Faults</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {stats?.triggeredCount || 0}
              </Typography>
              <Typography variant="caption">Triggered</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {stats?.enabled ? 'ON' : 'OFF'}
              </Typography>
              <Typography variant="caption">Injection</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Active Faults Summary */}
        {activeFaultCount > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Active Faults
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {activeFaults.map((fault) => (
                <Chip
                  key={fault.id}
                  icon={getSeverityIcon(fault.severity)}
                  label={fault.name}
                  color={getSeverityColor(fault.severity)}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Fault List */}
        <Typography variant="subtitle2" gutterBottom>
          Available Faults
        </Typography>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Triggered</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {faults.map((fault) => {
                const active = isFaultActive(fault.id);
                const triggering = triggeringFault === fault.id;

                return (
                  <TableRow key={fault.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getSeverityIcon(fault.severity)}
                        {fault.name}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={fault.category}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={fault.severity}
                        size="small"
                        color={getSeverityColor(fault.severity)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={active ? 'Active' : 'Inactive'}
                        size="small"
                        color={active ? 'error' : 'default'}
                        variant={active ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>{fault.triggerCount || 0}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<TriggerIcon />}
                        onClick={() => handleTriggerFault(fault.id)}
                        disabled={!session?.connected || active || triggering}
                      >
                        {triggering ? 'Triggering...' : 'Trigger'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {faults.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <BugIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              No faults available. Connect to ECU to load fault definitions.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}