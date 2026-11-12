import { useMemo, useState } from 'react';
import { Box, Stack, Chip, TextField, InputAdornment, Button } from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import BuildCircleRounded from '@mui/icons-material/BuildCircleRounded';
import { useAuth } from '../lib/auth';
import { useLoad, useToast } from '../lib/hooks';
import { listEquipment, listMyEquipmentLinks, setFavorite } from '../lib/api';
import { EQ_STATUS } from '../lib/meta';
import { PageHeader, EmptyState, Loading, ErrorBlock } from '../components/ui';
import { EquipmentCard } from '../components/Cards';
import ReportIssueDialog from '../components/ReportIssueDialog';
import EquipmentFormDialog from '../components/EquipmentFormDialog';

export default function EquipmentList() {
  const { user, isManager } = useAuth();
  const toast = useToast();
  const eq = useLoad(listEquipment, []);
  const links = useLoad(() => listMyEquipmentLinks(user.id), [user.id]);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState(null);
  const [status, setStatus] = useState(null);
  const [scope, setScope] = useState('all');
  const [report, setReport] = useState(null);
  const [form, setForm] = useState(false);

  const favorites = useMemo(() => new Set((links.data || []).filter((l) => l.kind === 'favorite').map((l) => l.equipment_id)), [links.data]);
  const mine = useMemo(() => new Set((links.data || []).map((l) => l.equipment_id)), [links.data]);
  const all = eq.data || [];
  const categories = useMemo(() => [...new Set(all.map((e) => e.category))].sort(), [all]);

  const shown = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter((e) =>
      (scope === 'all' || mine.has(e.id)) &&
      (!cat || e.category === cat) &&
      (!status || e.status === status) &&
      (!s || [e.asset_number, e.name, e.make, e.model, e.serial, e.truck, e.category].some((v) => v && String(v).toLowerCase().includes(s))));
  }, [all, search, cat, status, scope, mine]);

  const toggleFav = async (e, on) => {
    links.setData((d) => on ? [...d, { equipment_id: e.id, kind: 'favorite' }] : d.filter((l) => !(l.kind === 'favorite' && l.equipment_id === e.id)));
    try { await setFavorite(user.id, e.id, on); } catch (err) { toast(err.message); links.reload(); }
  };

  const chipSx = (on) => (on ? { bgcolor: 'm3.secondaryContainer', color: 'm3.onSecondaryContainer' } : undefined);

  return (
    <Box>
      <PageHeader
        title="Equipment"
        subtitle={eq.data ? `${all.length} pieces` : undefined}
        actions={isManager && <Button variant="contained" startIcon={<AddRounded />} onClick={() => setForm(true)}>Add</Button>}
      />
      <TextField
        placeholder="Search number, name, make, serial, truck…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, maxWidth: 640, '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'm3.surfaceContainerHigh', '& fieldset': { border: 0 } } }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> } }}
      />
      <Stack direction="row" spacing={1} sx={{ mb: 1, overflowX: 'auto', pb: 0.5 }}>
        <Chip label="All" variant={scope === 'all' ? 'filled' : 'outlined'} sx={chipSx(scope === 'all')} onClick={() => setScope('all')} />
        <Chip label="Mine & favorites" variant={scope === 'mine' ? 'filled' : 'outlined'} sx={chipSx(scope === 'mine')} onClick={() => setScope('mine')} />
        <Box sx={{ borderLeft: 1, borderColor: 'divider', mx: 0.5 }} />
        {Object.entries(EQ_STATUS).filter(([k]) => k !== 'retired').map(([k, v]) => (
          <Chip key={k} label={v.label} variant={status === k ? 'filled' : 'outlined'} sx={chipSx(status === k)} onClick={() => setStatus(status === k ? null : k)} />
        ))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mb: 2.5, overflowX: 'auto', pb: 0.5 }}>
        {categories.map((c) => (
          <Chip key={c} label={c} size="small" variant={cat === c ? 'filled' : 'outlined'} sx={chipSx(cat === c)} onClick={() => setCat(cat === c ? null : c)} />
        ))}
      </Stack>

      {eq.error ? <ErrorBlock error={eq.error} onRetry={eq.reload} /> : eq.loading && !eq.data ? <Loading /> : shown.length === 0 ? (
        <EmptyState icon={BuildCircleRounded} title="No equipment found" body="Try a different search or filter." />
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' } }}>
          {shown.map((e) => (
            <EquipmentCard key={e.id} eq={e} favorite={favorites.has(e.id)} onToggleFavorite={toggleFav} onReport={(x) => setReport(x)} />
          ))}
        </Box>
      )}

      <ReportIssueDialog open={!!report} onClose={() => setReport(null)} equipment={all} mine={mine} initialEquipment={report} onCreated={eq.reload} />
      {isManager && <EquipmentFormDialog open={form} onClose={() => setForm(false)} onSaved={() => { eq.reload(); toast('Equipment added'); }} />}
    </Box>
  );
}
