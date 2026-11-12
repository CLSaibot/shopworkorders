import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Alert, Chip, Typography, InputAdornment,
} from '@mui/material';
import EquipmentPicker from './EquipmentPicker';
import { logHours } from '../lib/api';
import { fmtMeter, fmtDate } from '../lib/format';

/** Hour-meter reading input with a sanity check against the last reading. */
function HoursField({ value, onChange, last, autoFocus, label = 'Hour meter reading' }) {
  const n = parseFloat(value);
  const lower = last != null && !isNaN(n) && n < Number(last);
  return (
    <TextField
      label={label}
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
      slotProps={{
        htmlInput: { inputMode: 'decimal', step: '0.1', min: 0 },
        input: { endAdornment: <InputAdornment position="end">hrs</InputAdornment> },
      }}
      color={lower ? 'warning' : undefined}
      helperText={
        lower ? `That's lower than the last reading (${fmtMeter(last)}). Double-check it.`
          : last != null ? `Last reading: ${fmtMeter(last)}` : 'No previous reading'
      }
    />
  );
}

/** Generic confirm-with-optional-input dialog for workflow actions. */
export function ActionDialog({
  open, onClose, title, body, confirmLabel = 'Confirm', onConfirm,
  hours, lastHours, hoursRequired, text, textLabel, textRequired, quickPicks, destructive,
}) {
  const [h, setH] = useState('');
  const [t, setT] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { if (open) { setH(''); setT(''); setError(null); setBusy(false); } }, [open]);

  const go = async () => {
    if (hours && hoursRequired && (h === '' || isNaN(parseFloat(h)))) return setError('Enter the hour meter reading.');
    if (text && textRequired && !t.trim()) return setError(`${textLabel} is required.`);
    setBusy(true); setError(null);
    try {
      await onConfirm({ hours: h === '' ? null : parseFloat(h), text: t.trim() });
      onClose();
    } catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {body && <Typography color="text.secondary">{body}</Typography>}
          {hours && <HoursField value={h} onChange={setH} last={lastHours} autoFocus />}
          {text && (
            <>
              {quickPicks && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {quickPicks.map((q) => (
                    <Chip key={q} label={q} onClick={() => setT(q)} variant={t === q ? 'filled' : 'outlined'}
                      color={t === q ? 'primary' : 'default'} />
                  ))}
                </Stack>
              )}
              <TextField label={textLabel} value={t} onChange={(e) => setT(e.target.value)} multiline minRows={quickPicks ? 1 : 3}
                autoFocus={!hours && !quickPicks} />
            </>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" color={destructive ? 'error' : 'primary'} onClick={go} disabled={busy}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Manual hour-meter reading (inspection), no work order. */
export function LogHoursDialog({ open, onClose, equipment, initialEquipment, mine, onSaved }) {
  const [eq, setEq] = useState(null);
  const [h, setH] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (open) { setEq(initialEquipment || null); setH(''); setNote(''); setError(null); setBusy(false); }
  }, [open, initialEquipment]);

  const save = async () => {
    if (!eq) return setError('Pick the equipment.');
    const n = parseFloat(h);
    if (isNaN(n) || n < 0) return setError('Enter the hour meter reading.');
    setBusy(true);
    try {
      await logHours(eq.id, n, note.trim());
      onSaved?.(eq, n);
      onClose();
    } catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Log hour meter</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            For inspections and spot checks — no work order needed.
          </Typography>
          {!initialEquipment && <EquipmentPicker equipment={equipment} value={eq} onChange={setEq} mine={mine} />}
          {eq && (
            <>
              {initialEquipment && <Typography fontWeight={500}>{eq.asset_number} · {eq.name}</Typography>}
              <HoursField value={h} onChange={setH} last={eq.current_hours} autoFocus={!!initialEquipment} />
              {eq.hours_updated_at && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: '-12px !important' }}>
                  Updated {fmtDate(eq.hours_updated_at)}
                </Typography>
              )}
            </>
          )}
          <TextField label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Monthly inspection" />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy}>Save reading</Button>
      </DialogActions>
    </Dialog>
  );
}
