import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Stack, IconButton, Button, Divider, Tabs, Tab, Table, TableHead, TableRow,
  TableCell, TableBody, Tooltip,
} from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ReportProblemRounded from '@mui/icons-material/ReportProblemRounded';
import SpeedRounded from '@mui/icons-material/SpeedRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import StarBorderRounded from '@mui/icons-material/StarBorderRounded';
import AssignmentRounded from '@mui/icons-material/AssignmentRounded';
import { useAuth } from '../lib/auth';
import { useLoad, useToast } from '../lib/hooks';
import {
  getEquipment, listWorkOrders, listHourReadings, listEquipment, listMyEquipmentLinks, setFavorite, listAttachments,
} from '../lib/api';
import { fmtMeter, fmtDate, fmtDateTime, fmtHours, dayjs } from '../lib/format';
import { OPEN_STATUSES } from '../lib/meta';
import { EquipmentAvatar, EqStatusChip, Loading, ErrorBlock, KeyValue, StatTile, EmptyState } from '../components/ui';
import { WorkOrderRow } from '../components/Cards';
import { LineChart } from '../components/Charts';
import { Gallery } from '../components/Media';
import ReportIssueDialog from '../components/ReportIssueDialog';
import { LogHoursDialog } from '../components/Dialogs';
import EquipmentFormDialog from '../components/EquipmentFormDialog';

const SOURCE_LABEL = { check_in: 'Shop check-in', work_start: 'Work started', inspection: 'Inspection', other: 'Other' };

export default function EquipmentDetail() {
  const { id } = useParams();
  const eqId = Number(id);
  const navigate = useNavigate();
  const { user, isManager } = useAuth();
  const toast = useToast();
  const eq = useLoad(() => getEquipment(eqId), [eqId]);
  const orders = useLoad(() => listWorkOrders({ equipmentId: eqId, limit: 500 }), [eqId]);
  const readings = useLoad(() => listHourReadings(eqId), [eqId]);
  const all = useLoad(listEquipment, []);
  const links = useLoad(() => listMyEquipmentLinks(user.id), [user.id]);
  const woIds = (orders.data || []).map((o) => o.id);
  const media = useLoad(() => (woIds.length ? listAttachments({ woIds }) : Promise.resolve([])), [woIds.join(',')]);
  const [tab, setTab] = useState(0);
  const [report, setReport] = useState(false);
  const [hours, setHours] = useState(false);
  const [edit, setEdit] = useState(false);

  const isFav = (links.data || []).some((l) => l.kind === 'favorite' && l.equipment_id === eqId);
  const isAssigned = (links.data || []).some((l) => l.kind === 'assigned' && l.equipment_id === eqId);

  const stats = useMemo(() => {
    const list = (orders.data || []).filter((o) => o.status !== 'cancelled');
    const sorted = [...list].sort((a, b) => new Date(a.reported_at) - new Date(b.reported_at));
    const yearAgo = dayjs().subtract(12, 'month');
    const gaps = sorted.slice(1).map((o, i) => dayjs(o.reported_at).diff(dayjs(sorted[i].reported_at), 'day', true));
    return {
      total: list.length,
      last12: list.filter((o) => dayjs(o.reported_at).isAfter(yearAgo)).length,
      open: list.filter((o) => OPEN_STATUSES.includes(o.status)).length,
      avgGap: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
      labor: list.reduce((s, o) => s + (o.labor?.[0]?.labor_hours || 0), 0),
      last: sorted.length ? sorted[sorted.length - 1].reported_at : null,
    };
  }, [orders.data]);

  if (eq.loading && !eq.data) return <Loading />;
  if (eq.error) return <ErrorBlock error={eq.error} onRetry={eq.reload} />;
  const e = eq.data;
  const chartData = [...(readings.data || [])].reverse().map((r) => ({ t: r.recorded_at, value: Number(r.hours), label: `${fmtDate(r.recorded_at)} · ${SOURCE_LABEL[r.source]}` }));

  const toggleFav = async () => {
    try { await setFavorite(user.id, eqId, !isFav); links.reload(); toast(isFav ? 'Removed from favorites' : 'Added to favorites'); }
    catch (err) { toast(err.message); }
  };
  const reloadAll = () => { eq.reload(); orders.reload(); readings.reload(); };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 1, mb: 2 }}>
        <IconButton onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/equipment'))} aria-label="Back" sx={{ mt: 0.5 }}>
          <ArrowBackRounded />
        </IconButton>
        <EquipmentAvatar category={e.category} size={56} />
        <Box sx={{ flex: 1, minWidth: 0, pl: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography color="text.secondary" fontWeight={500}>{e.asset_number}</Typography>
            <EqStatusChip status={e.status} />
            {isAssigned && <Typography variant="body2" color="primary" fontWeight={500}>Assigned to you</Typography>}
          </Stack>
          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.45rem', sm: '1.85rem' } }}>{e.name}</Typography>
          <Typography color="text.secondary">{[e.make, e.model, e.year].filter(Boolean).join(' · ')}</Typography>
        </Box>
        <Tooltip title={isFav ? 'Remove from favorites' : 'Add to favorites'}>
          <IconButton onClick={toggleFav} sx={{ color: isFav ? '#E8A400' : 'text.secondary' }}>{isFav ? <StarRounded /> : <StarBorderRounded />}</IconButton>
        </Tooltip>
        {isManager && <Tooltip title="Edit"><IconButton onClick={() => setEdit(true)}><EditRounded /></IconButton></Tooltip>}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2.5, ml: { sm: 6 } }} flexWrap="wrap" useFlexGap>
        <Button variant="contained" startIcon={<ReportProblemRounded />} onClick={() => setReport(true)}>Report an issue</Button>
        <Button variant="outlined" startIcon={<SpeedRounded />} onClick={() => setHours(true)}>Log hours</Button>
      </Stack>

      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, mb: 2 }}>
        <StatTile label="Hour meter" value={e.current_hours != null ? Number(e.current_hours).toLocaleString() : '—'}
          sub={e.hours_updated_at ? `as of ${fmtDate(e.hours_updated_at)}` : 'No reading yet'} tone="green" />
        <StatTile label="Work orders" value={stats.total} sub={`${stats.last12} in last 12 months${stats.open ? ` · ${stats.open} open` : ''}`} />
        <StatTile label="Avg. between issues" value={stats.avgGap != null ? `${stats.avgGap}d` : '—'}
          sub={stats.last ? `Last issue ${fmtDate(stats.last)}` : 'No issues yet'} />
        <StatTile label="Shop labor" value={fmtHours(stats.labor)} sub="All time" />
      </Box>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ px: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="History" />
          <Tab label="Hours" />
          <Tab label="Photos" />
          <Tab label="Details" />
        </Tabs>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          {tab === 0 && (
            orders.loading && !orders.data ? <Loading py={4} /> : (orders.data || []).length === 0 ? (
              <EmptyState icon={AssignmentRounded} title="No work orders yet" body="Every issue reported on this machine will show up here." />
            ) : (
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
                {orders.data.map((o) => <WorkOrderRow key={o.id} wo={o} />)}
              </Box>
            )
          )}
          {tab === 1 && (
            <>
              {chartData.length > 1 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Hour meter over time</Typography>
                  <LineChart data={chartData} formatValue={fmtMeter} formatTick={(t) => dayjs(t).format('MMM D, YY')} ariaLabel="Hour meter readings over time" />
                </Box>
              )}
              {(readings.data || []).length === 0 ? (
                <Typography color="text.secondary">No hour readings yet.</Typography>
              ) : (
                <Box sx={{ overflowX: 'auto', mx: -1 }}>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>When</TableCell><TableCell align="right">Hours</TableCell><TableCell>Source</TableCell><TableCell>By</TableCell></TableRow></TableHead>
                    <TableBody>
                      {readings.data.map((r) => (
                        <TableRow key={r.id} hover sx={{ cursor: r.work_order_id ? 'pointer' : 'default' }}
                          onClick={() => r.work_order_id && navigate(`/work-orders/${r.work_order_id}`)}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.recorded_at)}</TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{Number(r.hours).toLocaleString()}</TableCell>
                          <TableCell>{SOURCE_LABEL[r.source]}{r.work_order_id ? ` · #${r.work_order_id}` : ''}{r.note ? ` · ${r.note}` : ''}</TableCell>
                          <TableCell>{r.who?.full_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </>
          )}
          {tab === 2 && <Gallery items={media.data || []} emptyText="Photos and videos from this machine's work orders show up here." />}
          {tab === 3 && (
            <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' } }}>
              <KeyValue label="Equipment #">{e.asset_number}</KeyValue>
              <KeyValue label="Type">{e.category}</KeyValue>
              <KeyValue label="Truck / location">{e.truck}</KeyValue>
              <KeyValue label="Make">{e.make}</KeyValue>
              <KeyValue label="Model">{e.model}</KeyValue>
              <KeyValue label="Year">{e.year}</KeyValue>
              <KeyValue label="Serial #">{e.serial}</KeyValue>
              <KeyValue label="Added">{fmtDate(e.created_at)}</KeyValue>
              <Box sx={{ gridColumn: '1 / -1' }}><Divider sx={{ mb: 2 }} /><KeyValue label="Notes">{e.notes}</KeyValue></Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <ReportIssueDialog open={report} onClose={() => setReport(false)} equipment={all.data || [e]} initialEquipment={e} onCreated={reloadAll} />
      <LogHoursDialog open={hours} onClose={() => setHours(false)} initialEquipment={e} onSaved={(x, n) => { toast(`${e.asset_number} logged at ${n} hrs`); reloadAll(); }} />
      {isManager && <EquipmentFormDialog open={edit} onClose={() => setEdit(false)} equipment={e} onSaved={() => { eq.reload(); toast('Saved'); }} />}
    </Box>
  );
}
