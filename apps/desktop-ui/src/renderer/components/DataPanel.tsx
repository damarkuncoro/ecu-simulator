import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ReadMore as ReadIcon,
  Edit as WriteIcon,
  Add as AddIcon,
} from '@mui/icons-material';

interface DataPanelProps {
  session: any;
  onReadDID: (id: number) => Promise<{ success: boolean; value?: string; error?: string }>;
  onWriteDID: (id: number, data: string) => Promise<{ success: boolean; error?: string }>;
}

interface DIDEntry {
  id: number;
  name: string;
  description: string;
  value?: string;
  lastRead?: Date;
  unit?: string;
}

const PREDEFINED_DIDS: DIDEntry[] = [
  { id: 0x0C00, name: 'Engine RPM', description: 'Engine revolutions per minute', unit: 'RPM' },
  { id: 0x0C04, name: 'Engine Speed', description: 'Vehicle speed from engine', unit: 'km/h' },
  { id: 0x0C0A, name: 'Fuel Pressure', description: 'Fuel rail pressure', unit: 'kPa' },
  { id: 0x0C0B, name: 'Intake Pressure', description: 'Manifold absolute pressure', unit: 'kPa' },
  { id: 0x0C0C, name: 'Engine Temp', description: 'Engine coolant temperature', unit: '°C' },
  { id: 0x0C0D, name: 'Air Temp', description: 'Intake air temperature', unit: '°C' },
  { id: 0x0C0F, name: 'Vehicle Speed', description: 'Vehicle speed', unit: 'km/h' },
  { id: 0x0C10, name: 'Throttle Position', description: 'Throttle valve position', unit: '%' },
];

export function DataPanel({ session, onReadDID, onWriteDID }: DataPanelProps) {
  const [dids, setDids] = useState<DIDEntry[]>(PREDEFINED_DIDS);
  const [readingDID, setReadingDID] = useState<number | null>(null);
  const [writingDID, setWritingDID] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Write dialog state
  const [writeDialog, setWriteDialog] = useState({
    open: false,
    did: null as DIDEntry | null,
    value: '',
  });

  const handleReadDID = async (did: DIDEntry) => {
    if (!session?.connected) return;

    setReadingDID(did.id);
    setError(null);
    setSuccess(null);

    try {
      const result = await onReadDID(did.id);
      if (result.success && result.value) {
        // Update DID value in state
        setDids(prev => prev.map(d =>
          d.id === did.id
            ? { ...d, value: result.value, lastRead: new Date() }
            : d
        ));
        setSuccess(`Successfully read ${did.name}`);
      } else {
        setError(result.error || 'Failed to read DID');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Read operation failed');
    } finally {
      setReadingDID(null);
    }
  };

  const handleWriteDID = async () => {
    if (!writeDialog.did || !session?.connected) return;

    setWritingDID(writeDialog.did.id);
    setError(null);
    setSuccess(null);

    try {
      const result = await onWriteDID(writeDialog.did.id, writeDialog.value);
      if (result.success) {
        setSuccess(`Successfully wrote to ${writeDialog.did.name}`);
        setWriteDialog({ open: false, did: null, value: '' });
      } else {
        setError(result.error || 'Failed to write DID');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Write operation failed');
    } finally {
      setWritingDID(null);
    }
  };

  const openWriteDialog = (did: DIDEntry) => {
    setWriteDialog({
      open: true,
      did,
      value: did.value || '',
    });
  };

  const formatValue = (value: string | undefined, unit: string | undefined) => {
    if (!value) return 'Not read';
    if (unit) {
      // Convert hex to decimal for display
      const decimal = parseInt(value, 16);
      return `${decimal} ${unit}`;
    }
    return value;
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Data Identifier Operations
        </Typography>

        {(error || success) && (
          <Alert
            severity={error ? 'error' : 'success'}
            sx={{ mb: 2 }}
            onClose={() => {
              setError(null);
              setSuccess(null);
            }}
          >
            {error || success}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Read and write ECU data identifiers. Values are displayed in decimal format with units.
        </Typography>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Last Read</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dids.map((did) => (
                <TableRow key={did.id} hover>
                  <TableCell>
                    <Chip
                      label={`0x${did.id.toString(16).toUpperCase()}`}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{did.name}</TableCell>
                  <TableCell>{did.description}</TableCell>
                  <TableCell>
                    {formatValue(did.value, did.unit)}
                  </TableCell>
                  <TableCell>
                    {did.lastRead ? did.lastRead.toLocaleTimeString() : 'Never'}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<ReadIcon />}
                      onClick={() => handleReadDID(did)}
                      disabled={!session?.connected || readingDID === did.id}
                      sx={{ mr: 1 }}
                    >
                      {readingDID === did.id ? 'Reading...' : 'Read'}
                    </Button>
                    <Button
                      size="small"
                      startIcon={<WriteIcon />}
                      onClick={() => openWriteDialog(did)}
                      disabled={!session?.connected || writingDID === did.id}
                    >
                      {writingDID === did.id ? 'Writing...' : 'Write'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      {/* Write DID Dialog */}
      <Dialog
        open={writeDialog.open}
        onClose={() => setWriteDialog({ open: false, did: null, value: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Write Data Identifier
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {writeDialog.did && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">
                  {writeDialog.did.name} (0x{writeDialog.did.id.toString(16).toUpperCase()})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {writeDialog.did.description}
                </Typography>
              </Box>
            )}
            <TextField
              fullWidth
              label="Value (hex)"
              value={writeDialog.value}
              onChange={(e) => setWriteDialog(prev => ({ ...prev, value: e.target.value }))}
              placeholder="Enter hex value (e.g., 0FA0)"
              helperText="Enter value in hexadecimal format"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWriteDialog({ open: false, did: null, value: '' })}>
            Cancel
          </Button>
          <Button
            onClick={handleWriteDID}
            disabled={!writeDialog.value.trim()}
            variant="contained"
          >
            Write
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}