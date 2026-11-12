import { Box, Chip, Typography, Stack, CircularProgress, Alert, Card } from '@mui/material';
import { WO_STATUS, EQ_STATUS, PRIORITY, categoryIcon } from '../lib/meta';

export function StatusChip({ status, size = 'small', short }) {
  const m = WO_STATUS[status] || WO_STATUS.submitted;
  return <Chip size={size} label={short ? m.short : m.label} sx={{ bgcolor: m.bg, color: m.fg, height: size === 'small' ? 24 : 32 }} />;
}

export function EqStatusChip({ status, size = 'small' }) {
  const m = EQ_STATUS[status] || EQ_STATUS.in_service;
  return <Chip size={size} label={m.label} sx={{ bgcolor: m.bg, color: m.fg, height: size === 'small' ? 24 : 32 }} />;
}

export function PriorityLabel({ priority, hideNormal }) {
  if (hideNormal && priority === 'normal') return null;
  const m = PRIORITY[priority] || PRIORITY.normal;
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" component="span" sx={{ display: 'inline-flex' }}>
      <Box component="span" sx={{ width: 8, height: 8, borderRadius: 4, bgcolor: m.color }} />
      <Typography component="span" variant="body2" sx={{ color: m.color, fontWeight: 500 }}>{m.label}</Typography>
    </Stack>
  );
}

export function EquipmentAvatar({ category, size = 48, tone = 'primary' }) {
  const Icon = categoryIcon(category);
  return (
    <Box
      sx={{
        width: size, height: size, borderRadius: size > 40 ? 4 : 3, flexShrink: 0, display: 'grid', placeItems: 'center',
        bgcolor: tone === 'primary' ? 'm3.primaryContainer' : 'm3.surfaceContainerHigh',
        color: tone === 'primary' ? 'm3.onPrimaryContainer' : 'text.secondary',
      }}
    >
      <Icon sx={{ fontSize: size * 0.52 }} />
    </Box>
  );
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5, mt: 1, minHeight: 48 }}>
      {back}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '1.85rem' } }}>{title}</Typography>
        {subtitle && <Typography color="text.secondary" sx={{ mt: 0.25 }}>{subtitle}</Typography>}
      </Box>
      {actions && <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>{actions}</Stack>}
    </Stack>
  );
}

export function SectionTitle({ children, action, sx }) {
  return (
    <Stack direction="row" alignItems="center" sx={{ mb: 1.5, mt: 3, ...sx }}>
      <Typography variant="h6" sx={{ flex: 1 }}>{children}</Typography>
      {action}
    </Stack>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 2, color: 'text.secondary' }}>
      {Icon && (
        <Box sx={{ width: 72, height: 72, borderRadius: 999, mx: 'auto', mb: 2, display: 'grid', placeItems: 'center', bgcolor: 'm3.surfaceContainer' }}>
          <Icon sx={{ fontSize: 36, color: 'primary.main' }} />
        </Box>
      )}
      <Typography variant="subtitle1" color="text.primary">{title}</Typography>
      {body && <Typography variant="body2" sx={{ mt: 0.5, maxWidth: 360, mx: 'auto' }}>{body}</Typography>}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}

export function Loading({ py = 8 }) {
  return <Box sx={{ display: 'grid', placeItems: 'center', py }}><CircularProgress /></Box>;
}

export function ErrorBlock({ error, onRetry }) {
  return (
    <Alert severity="error" sx={{ my: 2 }} action={onRetry && <Typography component="button" onClick={onRetry} sx={{ border: 0, bgcolor: 'transparent', color: 'inherit', fontWeight: 500, cursor: 'pointer' }}>Retry</Typography>}>
      {error?.message || String(error)}
    </Alert>
  );
}

export function StatTile({ label, value, sub, icon: Icon, tone = 'default', onClick }) {
  const tones = {
    default: { bg: 'm3.surfaceContainerLow', fg: 'text.primary' },
    green: { bg: 'm3.primaryContainer', fg: 'm3.onPrimaryContainer' },
    amber: { bg: '#FFEFCC', fg: '#4A3200' },
    blue: { bg: '#DCE7FF', fg: '#0F2F5C' },
    orange: { bg: '#FFE4D0', fg: '#4F2400' },
  };
  const t = tones[tone];
  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2, bgcolor: t.bg, color: t.fg, border: 0, cursor: onClick ? 'pointer' : 'default',
        transition: 'filter .15s', '&:hover': onClick ? { filter: 'brightness(0.97)' } : undefined,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, opacity: 0.85 }}>
        {Icon && <Icon fontSize="small" />}
        <Typography variant="body2" fontWeight={500}>{label}</Typography>
      </Stack>
      <Typography sx={{ fontFamily: 'Jost', fontWeight: 600, fontSize: 32, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
      {sub && <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>{sub}</Typography>}
    </Card>
  );
}

export function KeyValue({ label, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>{label}</Typography>
      <Typography sx={{ overflowWrap: 'anywhere' }}>{children ?? '—'}</Typography>
    </Box>
  );
}
