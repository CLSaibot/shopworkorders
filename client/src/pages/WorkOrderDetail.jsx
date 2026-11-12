import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Stack, IconButton, Button, Divider, TextField, Table, TableBody, TableCell,
  TableHead, TableRow, Tooltip, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete,
  MenuItem, FormControlLabel, Switch, InputAdornment, Avatar, Link,
} from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import SendRounded from '@mui/icons-material/SendRounded';
import TimerRounded from '@mui/icons-material/TimerRounded';
import MoreTimeRounded from '@mui/icons-material/MoreTimeRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import { useAuth } from '../lib/auth';
import { useLoad, useTick, useToast, useRealtime, useRefreshTimer } from '../lib/hooks';
import {
  getWorkOrder, listTimeEntries, listParts, listEvents, listAttachments, uploadAttachment, deleteAttachment,
  addComment, addTimeEntry, deleteTimeEntry, listInventory, addPart, deletePart, saveInventoryItem, updateWorkOrder,
} from '../lib/api';
import {
  fmtDateTime, fmtHours, fmtMoney, fmtMeter, fmtTime, fmtDate, laborHours, fmtClock, initials, dayjs,
} from '../lib/format';
import { PART_SOURCE, UNITS } from '../lib/meta';
import { StatusChip, PriorityLabel, EquipmentAvatar, Loading, ErrorBlock, KeyValue } from '../components/ui';
import { Gallery, MediaPickers } from '../components/Media';
import { useWorkflow, WorkflowBar } from '../components/Workflow';

function Section({ title, action, children, sx }) {
  return (
    <Card sx={{ mb: 2, ...sx }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        <Stack direction="row" alignItems="center" sx={{ mb: 1.5, minHeight: 36 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>{title}</Typography>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

export default function WorkOrderDetail() {
  const { id } = useParams();
  const woId = Number(id);
  const navigate = useNavigate();
  const { user, isManager } = useAuth();
  const toast = useToast();
  const refreshTimer = useRefreshTimer();

  const wo = useLoad(() => getWorkOrder(woId), [woId]);
  const time = useLoad(() => listTimeEntries(woId), [woId]);
  const parts = useLoad(() => listParts(woId), [woId]);
  const events = useLoad(() => listEvents(woId), [woId]);
  const files = useLoad(() => listAttachments({ woId }), [woId]);
  const reload = () => { wo.reload(); time.reload(); parts.reload(); events.reload(); files.reload(); };
  useRealtime(['work_orders', 'time_entries'], () => { wo.reload(); time.reload(); events.reload(); });
  const [onAction, workflowDialog] = useWorkflow(reload);

  const [uploading, setUploading] = useState(null);
  const [uploadErr, setUploadErr] = useState(null);
  const [partOpen, setPartOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [editRes, setEditRes] = useState(null);

  const entries = time.data || [];
  const running = entries.some((e) => !e.ended_at);
  useTick(running);

  if (wo.loading && !wo.data) return <Loading />;
  if (wo.error) return <ErrorBlock error={wo.error} onRetry={wo.reload} />;
  const w = wo.data;
  const eq = w.equipment;
  const isReporter = w.reported_by === user.id;
  const clockedInHere = entries.some((e) => !e.ended_at && e.user_id === user.id);
  const issueFiles = (files.data || []).filter((f) => f.category === 'issue');
  const shopFiles = (files.data || []).filter((f) => f.category !== 'issue');
  const total = laborHours(entries);
  const partsTotal = (parts.data || []).reduce((s, p) => s + p.quantity * (p.unit_cost || 0), 0);
  const closed = ['completed', 'cancelled'].includes(w.status);

  const upload = async (list, category, partId) => {
    setUploadErr(null);
    for (let i = 0; i < list.length; i++) {
      setUploading(`Uploading ${i + 1} of ${list.length}…`);
      try { await uploadAttachment(list[i], { woId, equipmentId: eq.id, category, partId, userId: user.id }); }
      catch (e) { setUploadErr(`${list[i].name}: ${e.message}`); }
    }
    setUploading(null);
    files.reload();
  };
  const removeFile = async (a) => {
    if (!confirm(`Delete ${a.original_name}?`)) return;
    try { await deleteAttachment(a); files.reload(); } catch (e) { toast(e.message); }
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    try { await addComment(woId, user.id, comment.trim()); setComment(''); events.reload(); } catch (e) { toast(e.message); }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 1, mb: 2 }}>
        <IconButton onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/work-orders'))} aria-label="Back" sx={{ mt: 0.25 }}>
          <ArrowBackRounded />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography color="text.secondary" fontWeight={500}>Work order #{w.id}</Typography>
            <StatusChip status={w.status} />
            <PriorityLabel priority={w.priority} />
          </Stack>
          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.45rem', sm: '1.85rem' }, mt: 0.5, overflowWrap: 'anywhere' }}>
            {w.title}
          </Typography>
          {w.status === 'paused' && w.pause_reason && (
            <Typography sx={{ color: '#8A4100', mt: 0.5 }} fontWeight={500}>Paused: {w.pause_reason}</Typography>
          )}
        </Box>
      </Stack>

      {(isManager || (isReporter && w.status === 'submitted')) && (
        <Box sx={{ mb: 2, ml: { sm: 6 } }}>
          <WorkflowBar wo={w} onAction={onAction} isManager={isManager} isReporter={isReporter} clockedInHere={w.status === 'in_progress' ? clockedInHere : undefined} />
        </Box>
      )}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.6fr) minmax(0, 1fr)' }, alignItems: 'start' }}>
        {/* Left column */}
        <Box>
          <Section title="The problem">
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Avatar sx={{ bgcolor: 'm3.secondaryContainer', color: 'm3.onSecondaryContainer', width: 36, height: 36, fontSize: 14 }}>
                {initials(w.reporter?.full_name)}
              </Avatar>
              <Box>
                <Typography fontWeight={500}>{w.reporter?.full_name}</Typography>
                <Typography variant="body2" color="text.secondary">Happened {fmtDateTime(w.reported_at)}</Typography>
              </Box>
            </Stack>
            <Typography sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{w.description || <i>No details given.</i>}</Typography>
            <Gallery items={issueFiles} canDelete={(a) => isManager || a.uploaded_by === user.id} onDelete={removeFile} />
            {!closed && (isReporter || isManager) && (
              <Box sx={{ mt: 2 }}>
                <MediaPickers onAdd={(f) => upload(f, 'issue')} onError={setUploadErr} disabled={!!uploading} />
              </Box>
            )}
          </Section>

          {isManager || shopFiles.length ? (
            <Section title="Shop photos & receipts">
              <Gallery items={shopFiles} canDelete={(a) => isManager || a.uploaded_by === user.id} onDelete={removeFile}
                emptyText="Before/after photos, receipts and online order screenshots go here." />
              {isManager && (
                <Box sx={{ mt: 2 }}>
                  <ShopUploadButtons onMedia={(f) => upload(f, 'shop')} onReceipt={(f) => upload(f, 'receipt')}
                    disabled={!!uploading} onError={setUploadErr} />
                </Box>
              )}
            </Section>
          ) : null}
          {uploading && <Alert severity="info" sx={{ mb: 2 }}>{uploading}</Alert>}
          {uploadErr && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUploadErr(null)}>{uploadErr}</Alert>}

          <Section
            title="Parts & materials"
            action={isManager && <Button startIcon={<AddRounded />} onClick={() => setPartOpen(true)}>Add</Button>}
          >
            <PartsTable parts={parts.data || []} canEdit={isManager}
              onDelete={async (p) => { if (confirm(`Remove ${p.name}?`)) { try { await deletePart(p.id); parts.reload(); events.reload(); } catch (e) { toast(e.message); } } }} />
            {(parts.data || []).length > 0 && (
              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5, pr: 1 }}>
                <Typography fontWeight={500}>Total {fmtMoney(partsTotal)}</Typography>
              </Stack>
            )}
          </Section>

          {(w.status === 'completed' || w.resolution) && (
            <Section title="What was done" action={isManager && <IconButton onClick={() => setEditRes(w.resolution || '')} aria-label="Edit"><EditRounded fontSize="small" /></IconButton>}>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{w.resolution || <i>No notes.</i>}</Typography>
              {w.completed_at && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Completed {fmtDateTime(w.completed_at)}{w.completer ? ` by ${w.completer.full_name}` : ''}
                </Typography>
              )}
            </Section>
          )}

          <Section title="Activity">
            <Stack spacing={1.5}>
              {(events.data || []).map((ev) => (
                <Stack key={ev.id} direction="row" spacing={1.5}>
                  <Box sx={{ width: 8, height: 8, borderRadius: 4, mt: 1, flexShrink: 0, bgcolor: ev.type === 'comment' ? 'secondary.main' : 'm3.outline' }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                      {ev.type === 'comment' ? <><b>{ev.who?.full_name}:</b> {ev.message}</> : <>{ev.message}{ev.who ? <Typography component="span" variant="body2" color="text.secondary"> · {ev.who.full_name}</Typography> : null}</>}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{fmtDateTime(ev.created_at)}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <TextField size="small" placeholder="Add a note…" value={comment} onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendComment())} multiline maxRows={4} />
              <IconButton color="primary" onClick={sendComment} disabled={!comment.trim()} aria-label="Send"><SendRounded /></IconButton>
            </Stack>
          </Section>
        </Box>

        {/* Right column */}
        <Box>
          <Card sx={{ mb: 2 }}>
            <Box component={RouterLink} to={`/equipment/${eq.id}`} sx={{ display: 'flex', gap: 1.5, p: 2, textDecoration: 'none', color: 'inherit', '&:hover': { bgcolor: 'm3.surfaceContainerLow' } }}>
              <EquipmentAvatar category={eq.category} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>{eq.asset_number}</Typography>
                <Typography variant="subtitle1" noWrap>{eq.name}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>{[eq.make, eq.model, eq.truck].filter(Boolean).join(' · ')}</Typography>
              </Box>
            </Box>
            <Divider />
            <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <KeyValue label="Hours at check-in">{w.hours_at_checkin != null ? fmtMeter(w.hours_at_checkin) : 'Not yet'}</KeyValue>
              <KeyValue label="Meter now">{fmtMeter(eq.current_hours)}</KeyValue>
              <KeyValue label="Submitted">{fmtDateTime(w.created_at)}</KeyValue>
              <KeyValue label="Checked in">{w.checked_in_at ? fmtDateTime(w.checked_in_at) : '—'}</KeyValue>
            </Box>
          </Card>

          <Section
            title="Labor"
            action={isManager && <Tooltip title="Add time manually"><IconButton onClick={() => setTimeOpen(true)}><MoreTimeRounded /></IconButton></Tooltip>}
          >
            <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1.5 }}>
              <Typography sx={{ fontFamily: 'Jost', fontWeight: 600, fontSize: 36, fontVariantNumeric: 'tabular-nums', color: running ? 'secondary.dark' : 'text.primary' }}>
                {running ? fmtClock(total * 3600) : fmtHours(total)}
              </Typography>
              <Typography color="text.secondary">{running ? 'clock running' : 'total'}</Typography>
            </Stack>
            {entries.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No time logged yet.</Typography>
            ) : (
              <Stack divider={<Divider flexItem />} spacing={1}>
                {entries.map((e) => (
                  <Stack key={e.id} direction="row" alignItems="center" spacing={1}>
                    <TimerRounded fontSize="small" sx={{ color: e.ended_at ? 'text.disabled' : 'secondary.dark' }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {fmtDate(e.started_at)} · {fmtTime(e.started_at)} – {e.ended_at ? fmtTime(e.ended_at) : 'now'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {e.who?.full_name}{e.note ? ` · ${e.note}` : ''}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={500} sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtHours(laborHours([e]))}</Typography>
                    {isManager && e.ended_at && (
                      <IconButton size="small" aria-label="Delete time entry"
                        onClick={async () => { if (confirm('Delete this time entry?')) { try { await deleteTimeEntry(e.id); time.reload(); } catch (err) { toast(err.message); } } }}>
                        <DeleteOutlineRounded fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                ))}
              </Stack>
            )}
          </Section>
        </Box>
      </Box>

      {workflowDialog}
      <AddPartDialog open={partOpen} onClose={() => setPartOpen(false)} woId={woId} userId={user.id}
        onSaved={() => { parts.reload(); events.reload(); }} onUploadReceipt={(f, partId) => upload(f, 'receipt', partId)} />
      <AddTimeDialog open={timeOpen} onClose={() => setTimeOpen(false)} woId={woId} userId={user.id}
        onSaved={() => { time.reload(); refreshTimer(); }} />
      <Dialog open={editRes != null} onClose={() => setEditRes(null)} fullWidth maxWidth="sm">
        <DialogTitle>What was done</DialogTitle>
        <DialogContent>
          <TextField multiline minRows={4} value={editRes || ''} onChange={(e) => setEditRes(e.target.value)} sx={{ mt: 1 }} autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRes(null)}>Cancel</Button>
          <Button variant="contained" onClick={async () => { try { await updateWorkOrder(woId, { resolution: editRes.trim() || null }); setEditRes(null); wo.reload(); } catch (e) { toast(e.message); } }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function ShopUploadButtons({ onMedia, onReceipt, disabled, onError }) {
  return <MediaPickers onAdd={onMedia} onReceipt={onReceipt} onError={onError} disabled={disabled} />;
}

function PartsTable({ parts, canEdit, onDelete }) {
  if (!parts.length) return <Typography variant="body2" color="text.secondary">No parts or fluids logged.</Typography>;
  return (
    <Box sx={{ overflowX: 'auto', mx: -1 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            <TableCell align="right">Qty</TableCell>
            <TableCell align="right">Cost</TableCell>
            {canEdit && <TableCell padding="checkbox" />}
          </TableRow>
        </TableHead>
        <TableBody>
          {parts.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Typography variant="body2" fontWeight={500}>{p.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {[p.part_number, PART_SOURCE[p.source], p.vendor].filter(Boolean).join(' · ')}
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{Number(p.quantity)} {p.unit}</TableCell>
              <TableCell align="right">{p.unit_cost != null ? fmtMoney(p.quantity * p.unit_cost) : '—'}</TableCell>
              {canEdit && (
                <TableCell padding="checkbox">
                  <IconButton size="small" onClick={() => onDelete(p)} aria-label={`Remove ${p.name}`}><DeleteOutlineRounded fontSize="small" /></IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function AddPartDialog({ open, onClose, woId, userId, onSaved, onUploadReceipt }) {
  const inv = useLoad(() => (open ? listInventory() : Promise.resolve([])), [open]);
  const [item, setItem] = useState(null);   // inventory item or string (new)
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('each');
  const [cost, setCost] = useState('');
  const [source, setSource] = useState('shop_stock');
  const [vendor, setVendor] = useState('');
  const [saveToList, setSaveToList] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => { setItem(null); setName(''); setPartNumber(''); setQty('1'); setUnit('each'); setCost(''); setSource('shop_stock'); setVendor(''); setSaveToList(false); setReceipts([]); setError(null); setBusy(false); };
  const options = useMemo(() => (inv.data || []), [inv.data]);
  const isNew = !item || typeof item === 'string';

  const pick = (v) => {
    setItem(v);
    if (v && typeof v === 'object') {
      setName(v.name); setPartNumber(v.part_number || ''); setUnit(v.unit); setCost(v.unit_cost ?? ''); setSource('shop_stock');
    } else {
      setName(typeof v === 'string' ? v : ''); setSource('purchased');
    }
  };

  const save = async () => {
    const n = parseFloat(qty);
    if (!name.trim()) return setError('Pick an item or type a name.');
    if (!(n > 0)) return setError('Enter a quantity.');
    setBusy(true); setError(null);
    try {
      let itemId = !isNew ? item.id : null;
      if (isNew && saveToList) {
        const created = await saveInventoryItem({ name: name.trim(), part_number: partNumber || null, unit, unit_cost: cost === '' ? null : parseFloat(cost), qty_on_hand: null, is_stocked: true });
        itemId = created.id;
      }
      const part = await addPart({
        work_order_id: woId, item_id: itemId, name: name.trim(), part_number: partNumber || null, quantity: n, unit,
        unit_cost: cost === '' ? null : parseFloat(cost), source, vendor: vendor.trim() || null, added_by: userId,
      });
      if (receipts.length) onUploadReceipt(receipts.map((f) => f), part.id);
      onSaved(); reset(); onClose();
    } catch (e) { setError(e.message); setBusy(false); }
  };

  const stockLeft = !isNew && item.qty_on_hand != null ? `${Number(item.qty_on_hand)} ${item.unit} in stock` : null;

  return (
    <Dialog open={open} onClose={busy ? undefined : () => { reset(); onClose(); }} fullWidth maxWidth="sm" TransitionProps={{ onEnter: reset }}>
      <DialogTitle>Add part or fluid</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Autocomplete
            freeSolo
            options={options}
            value={item}
            onChange={(_, v) => pick(v)}
            onInputChange={(_, v, reason) => { if (reason === 'input') { setName(v); if (item && typeof item === 'object' && v !== item.name) setItem(v); } }}
            groupBy={(o) => (o.is_stocked ? 'Regular items' : 'One-off items')}
            getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
            filterOptions={(opts, { inputValue }) => {
              const s = inputValue.toLowerCase();
              return opts.filter((o) => [o.name, o.part_number, o.category].some((f) => f && f.toLowerCase().includes(s)))
                .sort((a, b) => b.is_stocked - a.is_stocked);
            }}
            renderOption={({ key, ...props }, o) => (
              <Box component="li" key={key} {...props}>
                <Box sx={{ flex: 1 }}>
                  <Typography>{o.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {[o.part_number, o.qty_on_hand != null ? `${Number(o.qty_on_hand)} ${o.unit} on hand` : null, o.unit_cost != null ? `${fmtMoney(o.unit_cost)}/${o.unit}` : null].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
              </Box>
            )}
            renderInput={(params) => <TextField {...params} label="Item" placeholder="Search inventory or type a new item" autoFocus
              helperText={stockLeft || (isNew && name ? 'New item — not on the inventory list yet' : 'e.g. SAE 30 oil, air filter, blade')} />}
          />
          <Stack direction="row" spacing={2}>
            <TextField label="Quantity" type="number" value={qty} onChange={(e) => setQty(e.target.value)} slotProps={{ htmlInput: { inputMode: 'decimal', step: 'any', min: 0 } }} />
            <TextField select label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} sx={{ maxWidth: 140 }}>
              {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </TextField>
            <TextField label="Cost per unit" type="number" value={cost} onChange={(e) => setCost(e.target.value)}
              slotProps={{ htmlInput: { inputMode: 'decimal', step: '0.01', min: 0 }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField select label="Where it came from" value={source} onChange={(e) => setSource(e.target.value)}>
              {Object.entries(PART_SOURCE).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </TextField>
            {source !== 'shop_stock' && <TextField label="Vendor / store" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Amazon, Stihl dealer" />}
          </Stack>
          {isNew && (
            <TextField label="Part number (optional)" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
          )}
          {isNew && name && (
            <FormControlLabel control={<Switch checked={saveToList} onChange={(e) => setSaveToList(e.target.checked)} />}
              label="Add to our regular inventory list for next time" />
          )}
          {source !== 'shop_stock' && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Receipt or order screenshot</Typography>
              <MediaPickers onAdd={(f) => setReceipts((r) => [...r, ...f])} onError={setError} receiptsOnly />
              {receipts.length > 0 && <Typography variant="body2" sx={{ mt: 1 }}>{receipts.map((r) => r.name).join(', ')}</Typography>}
            </Box>
          )}
          {source === 'shop_stock' && !isNew && item.qty_on_hand != null && (
            <Alert severity="info" icon={false}>This will take {qty || 0} {unit} out of shop stock.</Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { reset(); onClose(); }} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy}>Add to work order</Button>
      </DialogActions>
    </Dialog>
  );
}

function AddTimeDialog({ open, onClose, woId, userId, onSaved }) {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('09:00');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const s = dayjs(`${date}T${start}`); const e = dayjs(`${date}T${end}`);
    if (!e.isAfter(s)) return setError('End time must be after start time.');
    setBusy(true);
    try {
      await addTimeEntry({ work_order_id: woId, user_id: userId, started_at: s.toISOString(), ended_at: e.toISOString(), note: note.trim() || 'Added manually' });
      onSaved(); onClose(); setNote(''); setError(null);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add time manually</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">Forgot to clock in? Add the time you spent here.</Typography>
          <TextField type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Stack direction="row" spacing={2}>
            <TextField type="time" label="Start" value={start} onChange={(e) => setStart(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="time" label="End" value={end} onChange={(e) => setEnd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
          <TextField label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy}>Add time</Button>
      </DialogActions>
    </Dialog>
  );
}
