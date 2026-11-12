import { useEffect, useMemo, useState } from 'react';
import {
  Box, Card, Table, TableHead, TableRow, TableCell, TableBody, TextField, InputAdornment, Button, Chip, Stack, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, FormControlLabel, Switch, Alert, useMediaQuery, List,
  ListItemButton, ListItemText, Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchRounded from '@mui/icons-material/SearchRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import { useLoad, useToast } from '../lib/hooks';
import { listInventory, saveInventoryItem, deleteInventoryItem } from '../lib/api';
import { fmtMoney } from '../lib/format';
import { UNITS } from '../lib/meta';
import { PageHeader, Loading, ErrorBlock, EmptyState } from '../components/ui';

const LOW = 2;

export default function Inventory() {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('sm'));
  const toast = useToast();
  const inv = useLoad(() => listInventory(), []);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('regular');
  const [edit, setEdit] = useState(null);

  const shown = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (inv.data || []).filter((i) =>
      (scope === 'all' || (scope === 'regular' ? i.is_stocked : scope === 'oneoff' ? !i.is_stocked : i.qty_on_hand != null && i.qty_on_hand <= LOW)) &&
      (!s || [i.name, i.part_number, i.category].some((v) => v && v.toLowerCase().includes(s))));
  }, [inv.data, search, scope]);
  const lowCount = (inv.data || []).filter((i) => i.qty_on_hand != null && i.qty_on_hand <= LOW).length;

  const chip = (k, label) => (
    <Chip label={label} onClick={() => setScope(k)} variant={scope === k ? 'filled' : 'outlined'}
      sx={scope === k ? { bgcolor: 'm3.secondaryContainer', color: 'm3.onSecondaryContainer' } : undefined} />
  );
  const qtyText = (i) => (i.qty_on_hand == null ? 'Not tracked' : `${Number(i.qty_on_hand)} ${i.unit}`);
  const isLow = (i) => i.qty_on_hand != null && i.qty_on_hand <= LOW;

  return (
    <Box>
      <PageHeader title="Inventory" subtitle="Parts, fluids and fuel used in the shop"
        actions={<Button variant="contained" startIcon={<AddRounded />} onClick={() => setEdit({})}>Add item</Button>} />
      <TextField placeholder="Search items or part numbers" value={search} onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, maxWidth: 640, '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'm3.surfaceContainerHigh', '& fieldset': { border: 0 } } }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> } }} />
      <Stack direction="row" spacing={1} sx={{ mb: 2.5, overflowX: 'auto', pb: 0.5 }}>
        {chip('regular', 'Regular items')}
        {chip('oneoff', 'One-off items')}
        {chip('low', `Low stock${lowCount ? ` (${lowCount})` : ''}`)}
        {chip('all', 'All')}
      </Stack>

      {inv.error ? <ErrorBlock error={inv.error} onRetry={inv.reload} /> : inv.loading && !inv.data ? <Loading /> : shown.length === 0 ? (
        <EmptyState icon={Inventory2Rounded} title="No items" body="Add the parts and fluids you use regularly so they're one tap away on a work order." />
      ) : wide ? (
        <Card>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell><TableCell>Category</TableCell><TableCell align="right">On hand</TableCell>
                <TableCell align="right">Cost / unit</TableCell><TableCell>List</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shown.map((i) => (
                <TableRow key={i.id} hover onClick={() => setEdit(i)} sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Typography fontWeight={500}>{i.name}</Typography>
                    {i.part_number && <Typography variant="caption" color="text.secondary">{i.part_number}</Typography>}
                  </TableCell>
                  <TableCell>{i.category || '—'}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: isLow(i) ? 'error.main' : undefined, fontWeight: isLow(i) ? 600 : 400 }}>{qtyText(i)}</TableCell>
                  <TableCell align="right">{i.unit_cost != null ? `${fmtMoney(i.unit_cost)} / ${i.unit}` : '—'}</TableCell>
                  <TableCell>{i.is_stocked ? 'Regular' : 'One-off'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <List disablePadding>
            {shown.map((i, n) => (
              <Box key={i.id}>
                {n > 0 && <Divider component="li" />}
                <ListItemButton onClick={() => setEdit(i)} sx={{ borderRadius: 0 }}>
                  <ListItemText primary={i.name} secondary={[i.part_number, i.unit_cost != null ? `${fmtMoney(i.unit_cost)}/${i.unit}` : null].filter(Boolean).join(' · ')} />
                  <Typography sx={{ color: isLow(i) ? 'error.main' : 'text.secondary', fontWeight: isLow(i) ? 600 : 400, whiteSpace: 'nowrap' }}>{qtyText(i)}</Typography>
                </ListItemButton>
              </Box>
            ))}
          </List>
        </Card>
      )}
      <ItemDialog item={edit} onClose={() => setEdit(null)} onSaved={(msg) => { inv.reload(); toast(msg); }} />
    </Box>
  );
}

function ItemDialog({ item, onClose, onSaved }) {
  const [f, setF] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (item) {
      setF({ name: '', part_number: '', category: '', unit: 'each', unit_cost: '', qty_on_hand: '', is_stocked: true, notes: '',
        ...Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v ?? ''])) });
      setError(null); setBusy(false);
    }
  }, [item]);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const save = async () => {
    if (!f.name?.trim()) return setError('Name is required.');
    setBusy(true);
    try {
      await saveInventoryItem({
        id: item.id, name: f.name.trim(), part_number: f.part_number?.trim() || null, category: f.category?.trim() || null, unit: f.unit,
        unit_cost: f.unit_cost === '' ? null : parseFloat(f.unit_cost), qty_on_hand: f.qty_on_hand === '' ? null : parseFloat(f.qty_on_hand),
        is_stocked: !!f.is_stocked, notes: f.notes?.trim() || null,
      });
      onSaved(item.id ? 'Item saved' : 'Item added'); onClose();
    } catch (e) { setError(e.message); setBusy(false); }
  };
  const remove = async () => {
    if (!confirm(`Delete ${item.name}? Past work orders keep their record of it.`)) return;
    try { await deleteInventoryItem(item.id); onSaved('Item deleted'); onClose(); } catch (e) { setError(e.message); }
  };
  return (
    <Dialog open={!!item} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{item?.id ? 'Edit item' : 'Add inventory item'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField label="Name" value={f.name || ''} onChange={set('name')} autoFocus placeholder="e.g. SAE 30 Engine Oil" />
          <Stack direction="row" spacing={2}>
            <TextField label="Part number" value={f.part_number || ''} onChange={set('part_number')} />
            <TextField label="Category" value={f.category || ''} onChange={set('category')} placeholder="Fluids, Filters…" />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField select label="Unit" value={f.unit || 'each'} onChange={set('unit')} sx={{ maxWidth: 130 }}>
              {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </TextField>
            <TextField label="Cost per unit" type="number" value={f.unit_cost} onChange={set('unit_cost')}
              slotProps={{ htmlInput: { step: '0.01', min: 0, inputMode: 'decimal' }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
            <TextField label="On hand" type="number" value={f.qty_on_hand} onChange={set('qty_on_hand')} helperText="Blank = don't track"
              slotProps={{ htmlInput: { step: 'any', inputMode: 'decimal' } }} />
          </Stack>
          <FormControlLabel control={<Switch checked={!!f.is_stocked} onChange={(e) => setF((p) => ({ ...p, is_stocked: e.target.checked }))} />}
            label="Regular item (show first when adding parts)" />
          <TextField label="Notes" value={f.notes || ''} onChange={set('notes')} multiline minRows={2} />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        {item?.id && <Button color="error" onClick={remove} sx={{ mr: 'auto' }}>Delete</Button>}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
