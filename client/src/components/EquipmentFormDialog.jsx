import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Alert, MenuItem, Autocomplete, Chip,
} from '@mui/material';
import { saveEquipment, listProfiles, listAssignments, setAssignments } from '../lib/api';
import { EQUIPMENT_CATEGORIES, EQ_STATUS } from '../lib/meta';

const EMPTY = { asset_number: '', name: '', category: 'Mower', make: '', model: '', serial: '', year: '', truck: '', status: 'in_service', notes: '' };

export default function EquipmentFormDialog({ open, onClose, equipment, onSaved }) {
  const [f, setF] = useState(EMPTY);
  const [people, setPeople] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError(null); setBusy(false);
    setF(equipment ? { ...EMPTY, ...Object.fromEntries(Object.entries(equipment).map(([k, v]) => [k, v ?? ''])) } : EMPTY);
    listProfiles().then(setPeople).catch(() => {});
    if (equipment) listAssignments(equipment.id).then((a) => setAssigned(a.map((x) => x.user_id))).catch(() => {});
    else setAssigned([]);
  }, [open, equipment]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!f.asset_number.trim() || !f.name.trim()) return setError('Equipment number and name are required.');
    setBusy(true); setError(null);
    try {
      const row = {
        id: equipment?.id,
        asset_number: f.asset_number.trim(), name: f.name.trim(), category: f.category,
        make: f.make.trim() || null, model: f.model.trim() || null, serial: f.serial.trim() || null,
        year: f.year ? parseInt(f.year, 10) : null, truck: f.truck.trim() || null, status: f.status, notes: f.notes.trim() || null,
      };
      const saved = await saveEquipment(row);
      await setAssignments(saved.id, assigned);
      onSaved?.(saved);
      onClose();
    } catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{equipment ? `Edit ${equipment.asset_number}` : 'Add equipment'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Stack direction="row" spacing={2}>
            <TextField label="Equipment #" value={f.asset_number} onChange={set('asset_number')} sx={{ maxWidth: 160 }} autoFocus />
            <TextField label="Name" value={f.name} onChange={set('name')} placeholder='e.g. 60" Zero-Turn Mower' />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField select label="Type" value={f.category} onChange={set('category')}>
              {[...new Set([...EQUIPMENT_CATEGORIES, f.category])].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField select label="Status" value={f.status} onChange={set('status')}>
              {Object.entries(EQ_STATUS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </TextField>
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="Make" value={f.make} onChange={set('make')} />
            <TextField label="Model" value={f.model} onChange={set('model')} />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="Serial #" value={f.serial} onChange={set('serial')} />
            <TextField label="Year" type="number" value={f.year} onChange={set('year')} sx={{ maxWidth: 120 }} />
          </Stack>
          <TextField label="Truck / location" value={f.truck} onChange={set('truck')} placeholder="e.g. Truck 12, Shop" />
          <Autocomplete
            multiple
            options={people}
            value={people.filter((p) => assigned.includes(p.id))}
            onChange={(_, v) => setAssigned(v.map((p) => p.id))}
            getOptionLabel={(p) => p.full_name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => <TextField {...params} label="Assigned to" helperText="Shows up under “My equipment” for these people" />}
          />
          <TextField label="Notes" value={f.notes} onChange={set('notes')} multiline minRows={2} />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
