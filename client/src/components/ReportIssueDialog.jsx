import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Typography, Alert,
  ToggleButtonGroup, ToggleButton, useMediaQuery, IconButton, Box, LinearProgress, AppBar, Toolbar,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseRounded from '@mui/icons-material/CloseRounded';
import EquipmentPicker from './EquipmentPicker';
import { MediaPickers, PendingFiles } from './Media';
import { createWorkOrder, uploadAttachment, listWorkOrders } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dayjs } from '../lib/format';
import { OPEN_STATUSES } from '../lib/meta';
import { useToast } from '../lib/hooks';

export default function ReportIssueDialog({ open, onClose, equipment, initialEquipment, mine, onCreated }) {
  const theme = useTheme();
  const full = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [eq, setEq] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState('normal');
  const [files, setFiles] = useState([]);
  const [fileStatus, setFileStatus] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [openOrders, setOpenOrders] = useState([]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    const now = dayjs();
    setEq(initialEquipment || null);
    setDate(now.format('YYYY-MM-DD'));
    setTime(now.format('HH:mm'));
    setTitle(''); setDetails(''); setPriority('normal'); setFiles([]); setFileStatus({});
    setError(null); setBusy(false); setTouched(false);
  }, [open, initialEquipment]);

  useEffect(() => {
    if (!eq) return setOpenOrders([]);
    listWorkOrders({ equipmentId: eq.id, statuses: OPEN_STATUSES, limit: 5 }).then(setOpenOrders).catch(() => {});
  }, [eq]);

  const submit = async () => {
    setTouched(true);
    if (!eq || !title.trim()) return;
    setBusy(true); setError(null);
    try {
      const reportedAt = dayjs(`${date}T${time || '00:00'}`).toISOString();
      const wo = await createWorkOrder({
        equipment_id: eq.id, title: title.trim(), description: details.trim() || null, priority,
        reported_at: reportedAt, reported_by: user.id,
      });
      const failed = [];
      for (let i = 0; i < files.length; i++) {
        setFileStatus((s) => ({ ...s, [i]: 'uploading' }));
        try {
          await uploadAttachment(files[i], { woId: wo.id, equipmentId: eq.id, category: 'issue', userId: user.id });
          setFileStatus((s) => ({ ...s, [i]: 'done' }));
        } catch (e) {
          failed.push(`${files[i].name}: ${e.message}`);
          setFileStatus((s) => ({ ...s, [i]: 'failed' }));
        }
      }
      toast(failed.length
        ? `Work order #${wo.id} submitted, but ${failed.length} file(s) didn't upload. You can add them from the work order.`
        : `Work order #${wo.id} submitted — the shop has been notified.`);
      onCreated?.(wo);
      onClose();
      navigate(`/work-orders/${wo.id}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const doneCount = Object.values(fileStatus).filter((s) => s === 'done').length;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullScreen={full} fullWidth maxWidth="sm">
      {full ? (
        <AppBar position="sticky" sx={{ bgcolor: 'm3.surfaceContainerLow' }}>
          <Toolbar>
            <IconButton edge="start" onClick={onClose} disabled={busy} aria-label="Close"><CloseRounded /></IconButton>
            <Typography sx={{ flex: 1, ml: 1, fontFamily: 'Jost', fontWeight: 600, fontSize: 20 }}>Report an issue</Typography>
            <Button variant="contained" onClick={submit} disabled={busy}>Submit</Button>
          </Toolbar>
        </AppBar>
      ) : (
        <DialogTitle>What's wrong with this equipment?</DialogTitle>
      )}
      {busy && <LinearProgress variant={files.length ? 'determinate' : 'indeterminate'} value={files.length ? (doneCount / files.length) * 100 : undefined} />}
      <DialogContent sx={{ pt: full ? 2 : '8px !important' }}>
        {full && <Typography variant="h6" sx={{ mb: 2 }}>What's wrong with this equipment?</Typography>}
        <Stack spacing={2.5}>
          <EquipmentPicker
            equipment={equipment}
            value={eq}
            onChange={setEq}
            mine={mine}
            disabled={busy}
            error={touched && !eq}
            helperText={touched && !eq ? 'Pick the piece of equipment' : undefined}
          />
          {openOrders.length > 0 && (
            <Alert severity="info">
              This equipment already has {openOrders.length === 1 ? 'an open work order' : `${openOrders.length} open work orders`}:{' '}
              {openOrders.map((o) => `#${o.id} ${o.title}`).join('; ')}. You can still report a new issue.
            </Alert>
          )}
          <Stack direction="row" spacing={2}>
            <TextField type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} disabled={busy}
              slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="time" label="Time" value={time} onChange={(e) => setTime(e.target.value)} disabled={busy}
              slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
          <TextField
            label="What's the problem?"
            placeholder="e.g. Engine smoking, won't start, blade bent"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
            error={touched && !title.trim()}
            helperText={touched && !title.trim() ? 'Give the shop a short summary' : undefined}
            slotProps={{ htmlInput: { maxLength: 140 } }}
          />
          <TextField
            label="Describe what happened"
            placeholder="When did it start? What were you doing? Any sounds, smells, or warning lights?"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            multiline
            minRows={4}
            disabled={busy}
          />
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>How bad is it?</Typography>
            <ToggleButtonGroup exclusive value={priority} onChange={(_, v) => v && setPriority(v)} size="small" disabled={busy}
              sx={{ flexWrap: 'wrap' }}>
              <ToggleButton value="low">Low</ToggleButton>
              <ToggleButton value="normal">Normal</ToggleButton>
              <ToggleButton value="high">High</ToggleButton>
              <ToggleButton value="urgent">Down / unsafe</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
              Photos & videos <Typography component="span" variant="caption">— a video helps with engine noises</Typography>
            </Typography>
            <MediaPickers onAdd={(f) => setFiles((p) => [...p, ...f])} onError={setError} disabled={busy} />
            <PendingFiles files={files} status={fileStatus} onRemove={busy ? null : (i) => setFiles((p) => p.filter((_, j) => j !== i))} />
          </Box>
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        </Stack>
      </DialogContent>
      {!full && (
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={busy}>
            {busy ? (files.length ? `Uploading ${doneCount}/${files.length}…` : 'Submitting…') : 'Submit work order'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
