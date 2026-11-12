import { Fragment, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Stack, IconButton, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Collapse, Link, Tabs, Tab,
} from '@mui/material';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import PrintRounded from '@mui/icons-material/PrintRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import TimerRounded from '@mui/icons-material/TimerRounded';
import AssignmentRounded from '@mui/icons-material/AssignmentRounded';
import BuildCircleRounded from '@mui/icons-material/BuildCircleRounded';
import PaymentsRounded from '@mui/icons-material/PaymentsRounded';
import { useLoad } from '../lib/hooks';
import { shopReport } from '../lib/api';
import { dayjs, fmtHours, fmtMoney, fmtDecimalHours, downloadCsv, fmtDate } from '../lib/format';
import { PageHeader, StatTile, Loading, ErrorBlock, StatusChip, EquipmentAvatar } from '../components/ui';
import { BarChart } from '../components/Charts';

export default function Reports() {
  const [month, setMonth] = useState(dayjs().startOf('month'));
  const [open, setOpen] = useState({});
  const [view, setView] = useState(0);
  const from = month.toISOString();
  const to = month.add(1, 'month').toISOString();
  const rep = useLoad(() => shopReport(from, to), [from]);
  const r = rep.data;
  const isCurrent = month.isSame(dayjs(), 'month');

  const days = useMemo(() => {
    if (!r) return [];
    const map = new Map(r.by_day.map((d) => [d.day, d.labor_hours]));
    const n = month.daysInMonth();
    return Array.from({ length: n }, (_, i) => {
      const d = month.date(i + 1);
      return { label: d.format('ddd, MMM D'), tick: String(i + 1), value: Number(map.get(d.format('YYYY-MM-DD')) || 0) };
    });
  }, [r, month]);

  const exportCsv = () => {
    const rows = [['Equipment #', 'Equipment', 'Type', 'Work order', 'Problem', 'Status', 'Labor hours', 'Parts cost', 'Completed']];
    r.by_equipment.forEach((e) => e.orders.forEach((o) => rows.push([
      e.asset_number, e.name, e.category, o.id, o.title, o.status, Number(o.labor_hours).toFixed(2), Number(o.parts_cost).toFixed(2),
      o.completed_at ? dayjs(o.completed_at).format('YYYY-MM-DD') : '',
    ])));
    rows.push([]);
    rows.push(['Total', '', '', '', '', '', Number(r.totals.labor_hours).toFixed(2), Number(r.totals.parts_cost).toFixed(2), '']);
    downloadCsv(`shop-report-${month.format('YYYY-MM')}.csv`, rows);
  };

  return (
    <Box>
      <PageHeader
        title="Shop report"
        subtitle="Equipment worked on and time logged"
        actions={r && (
          <>
            <IconButton onClick={() => window.print()} aria-label="Print" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}><PrintRounded /></IconButton>
            <Button variant="tonal" startIcon={<DownloadRounded />} onClick={exportCsv}>CSV</Button>
          </>
        )}
      />

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
        <IconButton onClick={() => setMonth(month.subtract(1, 'month'))} aria-label="Previous month"><ChevronLeftRounded /></IconButton>
        <Typography variant="h6" sx={{ minWidth: 170, textAlign: 'center' }}>{month.format('MMMM YYYY')}</Typography>
        <IconButton onClick={() => setMonth(month.add(1, 'month'))} disabled={isCurrent} aria-label="Next month"><ChevronRightRounded /></IconButton>
        {!isCurrent && <Button onClick={() => setMonth(dayjs().startOf('month'))}>This month</Button>}
      </Stack>

      {rep.error ? <ErrorBlock error={rep.error} onRetry={rep.reload} /> : !r ? <Loading /> : (
        <>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, mb: 2 }}>
            <StatTile icon={TimerRounded} label="Labor logged" value={fmtHours(r.totals.labor_hours)} sub={`${fmtDecimalHours(r.totals.labor_hours)} hrs`} tone="green" />
            <StatTile icon={BuildCircleRounded} label="Equipment worked on" value={r.totals.equipment} />
            <StatTile icon={AssignmentRounded} label="Work orders" value={r.totals.work_orders} sub={`${r.totals.opened} opened · ${r.totals.completed} completed`} />
            <StatTile icon={PaymentsRounded} label="Parts & fluids" value={fmtMoney(r.totals.parts_cost)} />
          </Box>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6">Labor by day</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Hours on the clock each day</Typography>
              <BarChart data={days} formatValue={(v) => fmtHours(v)} formatAxis={(v) => `${v}h`} ariaLabel={`Labor hours per day in ${month.format('MMMM YYYY')}`} />
            </CardContent>
          </Card>

          <Card>
            <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ px: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="By equipment" />
              <Tab label="By person" />
            </Tabs>
            {view === 0 && (r.by_equipment.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 3 }}>No equipment was worked on this month.</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Equipment</TableCell>
                      <TableCell align="right">Orders</TableCell>
                      <TableCell align="right">Labor</TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Parts</TableCell>
                      <TableCell padding="checkbox" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.by_equipment.map((e) => (
                      <Fragment key={e.id}>
                        <TableRow hover onClick={() => setOpen((o) => ({ ...o, [e.id]: !o[e.id] }))} sx={{ cursor: 'pointer', '& > td': { borderBottom: open[e.id] ? 0 : undefined } }}>
                          <TableCell>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <EquipmentAvatar category={e.category} size={36} />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography fontWeight={500} noWrap>{e.asset_number} · {e.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{e.category}</Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">{e.work_orders}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{fmtHours(e.labor_hours)}</TableCell>
                          <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{fmtMoney(e.parts_cost)}</TableCell>
                          <TableCell padding="checkbox">
                            <ExpandMoreRounded sx={{ transform: open[e.id] ? 'rotate(180deg)' : 'none', transition: 'transform .2s', color: 'text.secondary' }} />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={5} sx={{ py: 0, bgcolor: 'm3.surfaceContainerLow' }}>
                            <Collapse in={!!open[e.id]} unmountOnExit>
                              <Stack spacing={1} sx={{ py: 1.5, pl: { sm: 6.5 } }}>
                                {e.orders.map((o) => (
                                  <Stack key={o.id} direction="row" spacing={1.5} alignItems="center">
                                    <Link component={RouterLink} to={`/work-orders/${o.id}`} fontWeight={500} underline="hover">#{o.id}</Link>
                                    <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>{o.title}</Typography>
                                    <StatusChip status={o.status} short />
                                    <Typography variant="body2" sx={{ width: 64, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtHours(o.labor_hours)}</Typography>
                                  </Stack>
                                ))}
                              </Stack>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ))}
            {view === 1 && (r.by_tech.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 3 }}>No time logged this month.</Typography>
            ) : (
              <Table>
                <TableHead><TableRow><TableCell>Person</TableCell><TableCell align="right">Work orders</TableCell><TableCell align="right">Labor</TableCell><TableCell align="right">Avg / work day</TableCell></TableRow></TableHead>
                <TableBody>
                  {r.by_tech.map((t) => {
                    const workdays = days.filter((d) => d.value > 0).length || 1;
                    return (
                      <TableRow key={t.user_id}>
                        <TableCell><Typography fontWeight={500}>{t.name}</Typography></TableCell>
                        <TableCell align="right">{t.work_orders}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>{fmtHours(t.labor_hours)}</TableCell>
                        <TableCell align="right">{fmtHours(t.labor_hours / workdays)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ))}
          </Card>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            {fmtDate(from)} – {fmtDate(month.endOf('month'))}. Time is split by day; jobs that span months count only the hours inside this month.
          </Typography>
        </>
      )}
    </Box>
  );
}
