import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  PlayArrow as ConnectIcon,
  Stop as DisconnectIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

interface ConnectionPanelProps {
  session: any;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function ConnectionPanel({ session, onConnect, onDisconnect }: ConnectionPanelProps) {
  const [transportType, setTransportType] = useState<'tcp' | 'serial'>('tcp');
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('20000');
  const [serialPort, setSerialPort] = useState('/dev/ttyUSB0');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await onConnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await onDisconnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnection failed');
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Connection Management
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Chip
            label={session?.connected ? 'Connected' : 'Disconnected'}
            color={session?.connected ? 'success' : 'error'}
            size="small"
          />
          {session?.protocol && (
            <Chip
              label={`Protocol: ${session.protocol.toUpperCase()}`}
              variant="outlined"
              size="small"
              sx={{ ml: 1 }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Transport Type</InputLabel>
            <Select
              value={transportType}
              label="Transport Type"
              onChange={(e) => setTransportType(e.target.value as 'tcp' | 'serial')}
              disabled={session?.connected}
            >
              <MenuItem value="tcp">TCP/IP</MenuItem>
              <MenuItem value="serial">Serial</MenuItem>
            </Select>
          </FormControl>

          {transportType === 'tcp' ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                size="small"
                disabled={session?.connected}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                size="small"
                disabled={session?.connected}
                sx={{ width: 100 }}
              />
            </Box>
          ) : (
            <TextField
              label="Serial Port"
              value={serialPort}
              onChange={(e) => setSerialPort(e.target.value)}
              size="small"
              disabled={session?.connected}
              fullWidth
            />
          )}
        </Box>
      </CardContent>

      <CardActions>
        <Button
          variant="contained"
          color="success"
          startIcon={<ConnectIcon />}
          onClick={handleConnect}
          disabled={session?.connected || connecting}
          fullWidth
        >
          {connecting ? 'Connecting...' : 'Connect'}
        </Button>

        <Button
          variant="contained"
          color="error"
          startIcon={<DisconnectIcon />}
          onClick={handleDisconnect}
          disabled={!session?.connected}
          fullWidth
        >
          Disconnect
        </Button>
      </CardActions>
    </Card>
  );
}