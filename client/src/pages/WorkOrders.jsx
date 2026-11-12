import { useMemo, useState } from 'react';
import { Box, Stack, Chip, TextField, InputAdornment, Button } from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import AssignmentRounded from '@mui/icons-material/AssignmentRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import { useAuth } from '../lib/auth';
import { useLoad, useRealtime } from '../lib/hooks';
import { listWorkOrders, listEquipment } from '../lib/api';
import { OPEN_STATUSES } from '../lib/meta';
import { PageHeader, EmptyState, Loading, ErrorBlock } from '../components/ui';
import { WorkOrderRow } from '../components/Cards';
import ReportIssueDialog from '../components/ReportIssueDialog';

const FILTERS = [
  { key: 'open', label: 'Open', statuses: OPEN_STATUSES },
  { key: 'submitted', label: 'Waiting check-in', statuses: ['submitted'] },
  { key: 'paused', label: 'Paused', statuses: ['paused'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
  { key: 'all', label: 'All', statuses: null },
];

export default function WorkOrders() {
  const { user, isManager } = useAuth();
  const [filter, setFilter] = useState('open');
  const [mineOnly, setMineOnly] = useState(!isManager);
  const [search, setSearch] = useState('');
  const [report, setReport] = useState(false);
  const f = FILTERS.find((x) => x.key === filter);
  const orders = useLoad(() => listWorkOrders({ statuses: f.statuses, reportedBy: mineOnly ? user.id : undefined, limit: 500 }), [filter, mineOnly]);
  const eq = useLoad(listEquipment, []);
  useRealtime(['work_orders'], orders.reload);

  const shown = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return orders.data || [];
    return (orders.data || []).filter((o) =>
      [String(o.id), o.title, o.equipment?.asset_number, o.equipment?.name, o.reporter?.full_name]
        .some((v) => v && v.toLowerCase().includes(s)));
  }, [orders.data, search]);

  return (
    <Box>
      <PageHeader
        title={isManager ? 'Work orders' : 'My work orders'}
        actions={<Button variant="contained" startIcon={<AddRounded />} onClick={() => setReport(true)}>New</Button>}
      />
      <TextField
        placeholder="Search by #, problem, equipment or person"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, maxWidth: 640, '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'm3.surfaceContainerHigh', '& fieldset': { border: 0 } } }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> } }}
      />
      <Stack direction="row" spacing={1} sx={{ mb: 2.5, overflowX: 'auto', pb: 0.5 }}>
        <Chip label="Reported by me" variant={mineOnly ? 'filled' : 'outlined'} color={mineOnly ? 'primary' : 'default'} onClick={() => setMineOnly(!mineOnly)} />
        <Box sx={{ borderLeft: 1, borderColor: 'divider', mx: 0.5 }} />
        {FILTERS.map((x) => (
          <Chip key={x.key} label={x.label} onClick={() => setFilter(x.key)}
            variant={filter === x.key ? 'filled' : 'outlined'}
            sx={filter === x.key ? { bgcolor: 'm3.secondaryContainer', color: 'm3.onSecondaryContainer' } : undefined} />
        ))}
      </Stack>
      {orders.error ? <ErrorBlock error={orders.error} onRetry={orders.reload} /> : orders.loading && !orders.data ? <Loading /> : shown.length === 0 ? (
        <EmptyState icon={AssignmentRounded} title="No work orders here" body={search ? 'Try a different search.' : 'Nothing matches this filter.'} />
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' } }}>
          {shown.map((o) => <WorkOrderRow key={o.id} wo={o} />)}
        </Box>
      )}
      <ReportIssueDialog open={report} onClose={() => setReport(false)} equipment={eq.data || []} onCreated={orders.reload} />
    </Box>
  );
}
