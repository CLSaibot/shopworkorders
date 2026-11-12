import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Fab, Button, Card, Tabs, Tab, useMediaQuery, Badge,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ReportProblemRounded from '@mui/icons-material/ReportProblemRounded';
import SpeedRounded from '@mui/icons-material/SpeedRounded';
import InboxRounded from '@mui/icons-material/InboxRounded';
import BuildRounded from '@mui/icons-material/BuildRounded';
import TimerRounded from '@mui/icons-material/TimerRounded';
import PauseCircleRounded from '@mui/icons-material/PauseCircleRounded';
import TaskAltRounded from '@mui/icons-material/TaskAltRounded';
import StarBorderRounded from '@mui/icons-material/StarBorderRounded';
import AssignmentTurnedInRounded from '@mui/icons-material/AssignmentTurnedInRounded';
import PauseRounded from '@mui/icons-material/PauseRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import { useAuth } from '../lib/auth';
import { useLoad, useRealtime, useActiveTimer, useTick, useToast } from '../lib/hooks';
import { listEquipment, listMyEquipmentLinks, listWorkOrders, setFavorite } from '../lib/api';
import { greeting, firstName, fmtClock, dayjs } from '../lib/format';
import { OPEN_STATUSES } from '../lib/meta';
import { EquipmentCard, WorkOrderRow } from '../components/Cards';
import { SectionTitle, EmptyState, Loading, ErrorBlock, StatTile } from '../components/ui';
import ReportIssueDialog from '../components/ReportIssueDialog';
import { LogHoursDialog } from '../components/Dialogs';
import EquipmentPicker from '../components/EquipmentPicker';
import { useWorkflow, NextActionButton } from '../components/Workflow';

export default function Home() {
  const { isManager } = useAuth();
  return isManager ? <ShopDashboard /> : <TechHome />;
}

const grid = { display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } };

// ---------------------------------------------------------------------------
// Field tech
// ---------------------------------------------------------------------------
function TechHome() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const eq = useLoad(listEquipment, []);
  const links = useLoad(() => listMyEquipmentLinks(user.id), [user.id]);
  const orders = useLoad(() => listWorkOrders({ reportedBy: user.id, limit: 20 }), [user.id]);
  const [report, setReport] = useState(null); // {equipment} | {}
  const [hours, setHours] = useState(false);

  const assigned = useMemo(() => new Set((links.data || []).filter((l) => l.kind === 'assigned').map((l) => l.equipment_id)), [links.data]);
  const favorites = useMemo(() => new Set((links.data || []).filter((l) => l.kind === 'favorite').map((l) => l.equipment_id)), [links.data]);
  const mine = useMemo(() => new Set([...assigned, ...favorites]), [assigned, favorites]);
  const all = eq.data || [];

  const toggleFav = async (e, on) => {
    links.setData((d) => on ? [...d, { equipment_id: e.id, kind: 'favorite' }] : d.filter((l) => !(l.kind === 'favorite' && l.equipment_id === e.id)));
    try { await setFavorite(user.id, e.id, on); toast(on ? `${e.asset_number} added to favorites` : `${e.asset_number} removed from favorites`); }
    catch (err) { toast(err.message); links.reload(); }
  };

  const open = (orders.data || []).filter((o) => OPEN_STATUSES.includes(o.status));
  const recent = (orders.data || []).filter((o) => !OPEN_STATUSES.includes(o.status)).slice(0, 5);

  if (eq.loading && !eq.data) return <Loading />;
  if (eq.error) return <ErrorBlock error={eq.error} onRetry={eq.reload} />;

  const cards = (set) => all.filter((e) => set.has(e.id)).map((e) => (
    <EquipmentCard key={e.id} eq={e} favorite={favorites.has(e.id)} onToggleFavorite={toggleFav} onReport={(x) => setReport({ equipment: x })} />
  ));
  const favOnly = new Set([...favorites].filter((id) => !assigned.has(id)));

  return (
    <Box>
      <Box sx={{ pt: { xs: 1, sm: 2 }, pb: 1 }}>
        <Typography variant="h4" component="h1">{greeting()}, {firstName(profile.full_name)}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>Something not running right? Report it and the shop will take care of it.</Typography>
      </Box>

      <Box sx={{ my: 2.5, maxWidth: 640 }}>
        <EquipmentPicker
          equipment={all}
          mine={mine}
          value={null}
          label="Find any piece of equipment"
          onChange={(e) => e && navigate(`/equipment/${e.id}`)}
        />
      </Box>

      <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
        <Button variant="contained" startIcon={<ReportProblemRounded />} onClick={() => setReport({})}>Report an issue</Button>
        <Button variant="outlined" startIcon={<SpeedRounded />} onClick={() => setHours(true)}>Log hours</Button>
      </Stack>

      {open.length > 0 && (
        <>
          <SectionTitle>My open work orders</SectionTitle>
          <Box sx={grid}>{open.map((o) => <WorkOrderRow key={o.id} wo={o} />)}</Box>
        </>
      )}

      <SectionTitle>My equipment</SectionTitle>
      {assigned.size ? <Box sx={grid}>{cards(assigned)}</Box> : (
        <Card sx={{ bgcolor: 'm3.surfaceContainerLow', border: 0 }}>
          <EmptyState title="Nothing assigned yet" body="Zach can assign the equipment on your truck. Until then, use search above to find anything." />
        </Card>
      )}

      <SectionTitle>Favorites</SectionTitle>
      {favOnly.size ? <Box sx={grid}>{cards(favOnly)}</Box> : (
        <Card sx={{ bgcolor: 'm3.surfaceContainerLow', border: 0 }}>
          <EmptyState icon={StarBorderRounded} title="No favorites yet" body="Tap the star on any equipment you use now and then — like gear on another truck — to keep it here." />
        </Card>
      )}

      {recent.length > 0 && (
        <>
          <SectionTitle action={<Button onClick={() => navigate('/work-orders')}>See all</Button>}>Recently closed</SectionTitle>
          <Box sx={grid}>{recent.map((o) => <WorkOrderRow key={o.id} wo={o} />)}</Box>
        </>
      )}

      <Fab variant="extended" color="primary" onClick={() => setReport({})}
        sx={{ position: 'fixed', right: 16, bottom: { xs: 'calc(96px + env(safe-area-inset-bottom))', md: 24 }, display: { md: 'none' } }}>
        <ReportProblemRounded /> Report issue
      </Fab>

      <Box sx={{ height: { xs: 72, md: 0 } }} />
      <ReportIssueDialog open={!!report} onClose={() => setReport(null)} equipment={all} mine={mine}
        initialEquipment={report?.equipment} onCreated={() => { orders.reload(); eq.reload(); }} />
      <LogHoursDialog open={hours} onClose={() => setHours(false)} equipment={all} mine={mine}
        onSaved={(e, n) => { toast(`${e.asset_number} logged at ${n} hrs`); eq.reload(); }} />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Shop manager
// ---------------------------------------------------------------------------
const COLUMNS = [
  { key: 'submitted', label: 'New from the field', hint: 'Check in when it arrives', icon: InboxRounded, tone: 'amber' },
  { key: 'checked_in', label: 'Checked in', hint: 'Ready to start', icon: AssignmentTurnedInRounded, tone: 'blue' },
  { key: 'in_progress', label: 'In progress', hint: 'Clock running', icon: BuildRounded, tone: 'green' },
  { key: 'paused', label: 'Paused', hint: 'Waiting on something', icon: PauseCircleRounded, tone: 'orange' },
];

function ActiveTimerCard({ onAction }) {
  const timer = useActiveTimer();
  useTick(!!timer);
  const navigate = useNavigate();
  if (!timer) return null;
  const wo = { id: timer.work_order_id, title: timer.wo?.title, status: 'in_progress' };
  return (
    <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', border: 0, p: { xs: 2, sm: 2.5 }, mb: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate(`/work-orders/${wo.id}`)}>
          <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: 'rgba(255,255,255,.14)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <TimerRounded sx={{ color: 'secondary.main' }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>You're clocked in · #{wo.id} · {timer.wo?.equipment?.asset_number}</Typography>
            <Typography variant="subtitle1" noWrap>{wo.title}</Typography>
          </Box>
        </Stack>
        <Typography sx={{ fontFamily: 'Jost', fontWeight: 600, fontSize: 34, fontVariantNumeric: 'tabular-nums', letterSpacing: 1 }}>
          {fmtClock((Date.now() - new Date(timer.started_at).getTime()) / 1000)}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<PauseRounded />} onClick={() => onAction('pause', wo)}
            sx={{ bgcolor: 'rgba(255,255,255,.16)', '&:hover': { bgcolor: 'rgba(255,255,255,.26)' } }}>Pause</Button>
          <Button variant="contained" startIcon={<CheckCircleRounded />} onClick={() => onAction('complete', wo)}
            sx={{ bgcolor: 'secondary.main', color: '#0B2A00', '&:hover': { bgcolor: '#5CC22F' } }}>Complete</Button>
        </Stack>
      </Stack>
    </Card>
  );
}

function ShopDashboard() {
  const { profile, user } = useAuth();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('lg'));
  const [tab, setTab] = useState(0);
  const [report, setReport] = useState(false);
  const eq = useLoad(listEquipment, []);
  const orders = useLoad(() => listWorkOrders({ statuses: OPEN_STATUSES }), []);
  const done = useLoad(() => listWorkOrders({ statuses: ['completed'], limit: 50 }), []);
  const reloadAll = () => { orders.reload(); done.reload(); eq.reload(); };
  useRealtime(['work_orders', 'time_entries'], reloadAll);
  const [onAction, dialog] = useWorkflow(reloadAll);
  const timer = useActiveTimer();

  const eqById = useMemo(() => new Map((eq.data || []).map((e) => [e.id, e])), [eq.data]);
  const withEq = (o) => ({ ...o, equipment: { ...o.equipment, current_hours: eqById.get(o.equipment_id)?.current_hours } });
  const by = (s) => (orders.data || []).filter((o) => o.status === s).map(withEq)
    .sort((a, b) => ['urgent', 'high', 'normal', 'low'].indexOf(a.priority) - ['urgent', 'high', 'normal', 'low'].indexOf(b.priority) || a.id - b.id);
  const weekStart = dayjs().startOf('week');
  const doneThisWeek = (done.data || []).filter((o) => dayjs(o.completed_at).isAfter(weekStart)).length;

  if (orders.loading && !orders.data) return <Loading />;
  if (orders.error) return <ErrorBlock error={orders.error} onRetry={orders.reload} />;

  const column = (c) => {
    const list = by(c.key);
    return (
      <Box key={c.key} sx={{ minWidth: 0 }}>
        {wide && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, px: 0.5 }}>
            <Typography variant="subtitle1" sx={{ flex: 1 }}>{c.label}</Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>{list.length}</Typography>
          </Stack>
        )}
        <Stack spacing={1.5}>
          {list.length === 0 && (
            <Box sx={{ border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 4, p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Nothing here</Typography>
            </Box>
          )}
          {list.map((o) => (
            <WorkOrderRow key={o.id} wo={o} dense
              action={<NextActionButton wo={o} onAction={onAction} size="small"
                clockedInHere={o.status === 'in_progress' ? timer?.work_order_id === o.id : undefined} />} />
          ))}
        </Stack>
      </Box>
    );
  };

  return (
    <Box>
      <Stack direction="row" alignItems="flex-end" sx={{ pt: { xs: 1, sm: 2 }, pb: 2 }} spacing={2}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1">{greeting()}, {firstName(profile.full_name)}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Here's what's in the shop today.</Typography>
        </Box>
        <Button variant="tonal" startIcon={<ReportProblemRounded />} onClick={() => setReport(true)} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
          New work order
        </Button>
      </Stack>

      <ActiveTimerCard onAction={onAction} />

      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, mb: 3 }}>
        {COLUMNS.map((c, i) => (
          <StatTile key={c.key} label={c.label} value={by(c.key).length} icon={c.icon} tone={c.tone}
            onClick={wide ? undefined : () => setTab(i)} />
        ))}
        <StatTile label="Done this week" value={doneThisWeek} icon={TaskAltRounded} />
      </Box>

      {wide ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 2, alignItems: 'start' }}>
          {COLUMNS.map(column)}
        </Box>
      ) : (
        <>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
            {COLUMNS.map((c) => (
              <Tab key={c.key} label={<Badge badgeContent={by(c.key).length} color="primary" sx={{ '& .MuiBadge-badge': { right: -14 } }}>{c.label}</Badge>} sx={{ pr: 4 }} />
            ))}
          </Tabs>
          {column(COLUMNS[tab])}
        </>
      )}

      <Box sx={{ height: { xs: 72, sm: 0 } }} />
      <Fab variant="extended" color="primary" onClick={() => setReport(true)}
        sx={{ position: 'fixed', right: 16, bottom: 'calc(96px + env(safe-area-inset-bottom))', display: { sm: 'none' } }}>
        <ReportProblemRounded /> New
      </Fab>
      <ReportIssueDialog open={report} onClose={() => setReport(false)} equipment={eq.data || []} onCreated={reloadAll} />
      {dialog}
    </Box>
  );
}
