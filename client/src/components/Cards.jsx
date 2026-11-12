import { Link as RouterLink } from 'react-router-dom';
import { Card, CardActionArea, Box, Stack, Typography, IconButton, Button, Tooltip } from '@mui/material';
import StarRounded from '@mui/icons-material/StarRounded';
import StarBorderRounded from '@mui/icons-material/StarBorderRounded';
import ReportProblemRounded from '@mui/icons-material/ReportProblemRounded';
import PhotoCameraRounded from '@mui/icons-material/PhotoCameraRounded';
import VideocamRounded from '@mui/icons-material/VideocamRounded';
import TimerRounded from '@mui/icons-material/TimerRounded';
import { EquipmentAvatar, EqStatusChip, StatusChip, PriorityLabel } from './ui';
import { fmtMeter, fmtAgo, fmtHours } from '../lib/format';

export function EquipmentCard({ eq, favorite, onToggleFavorite, onReport }) {
  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', bgcolor: 'm3.surfaceContainerLowest' }}>
      <CardActionArea component={RouterLink} to={`/equipment/${eq.id}`} sx={{ p: 2, flex: 1, alignItems: 'flex-start', display: 'flex', gap: 1.5 }}>
        <EquipmentAvatar category={eq.category} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>{eq.asset_number}</Typography>
          <Typography variant="subtitle1" sx={{ lineHeight: 1.3 }} noWrap>{eq.name}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {[eq.make, eq.model].filter(Boolean).join(' ')}
          </Typography>
        </Box>
      </CardActionArea>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, pb: 1.5 }}>
        <EqStatusChip status={eq.status} />
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }} noWrap>
          {eq.current_hours != null ? fmtMeter(eq.current_hours) : ''}
        </Typography>
        {onToggleFavorite && (
          <Tooltip title={favorite ? 'Remove from favorites' : 'Add to favorites'}>
            <IconButton size="small" onClick={() => onToggleFavorite(eq, !favorite)} aria-label="Favorite"
              sx={{ color: favorite ? '#E8A400' : 'text.secondary' }}>
              {favorite ? <StarRounded /> : <StarBorderRounded />}
            </IconButton>
          </Tooltip>
        )}
        {onReport && (
          <Button size="small" variant="tonal" startIcon={<ReportProblemRounded />} onClick={() => onReport(eq)}>
            Report
          </Button>
        )}
      </Stack>
    </Card>
  );
}

export function WorkOrderRow({ wo, action, dense }) {
  const photos = wo.attachments?.filter((a) => a.mime?.startsWith('image/')).length || 0;
  const videos = wo.attachments?.filter((a) => a.mime?.startsWith('video/')).length || 0;
  const labor = wo.labor?.[0];
  return (
    <Card sx={{ bgcolor: 'm3.surfaceContainerLowest' }}>
      <Stack direction="row" alignItems="stretch">
        <CardActionArea component={RouterLink} to={`/work-orders/${wo.id}`} sx={{ p: dense ? 1.5 : 2, flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>#{wo.id}</Typography>
            <StatusChip status={wo.status} short />
            <PriorityLabel priority={wo.priority} hideNormal />
          </Stack>
          <Typography variant="subtitle1" sx={{ lineHeight: 1.3, overflowWrap: 'anywhere' }}>{wo.title}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {wo.equipment?.asset_number} · {wo.equipment?.name}
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.75, color: 'text.secondary' }} flexWrap="wrap" useFlexGap>
            <Typography variant="caption">{wo.reporter?.full_name} · {fmtAgo(wo.created_at)}</Typography>
            {photos > 0 && <Stack direction="row" spacing={0.25} alignItems="center"><PhotoCameraRounded sx={{ fontSize: 15 }} /><Typography variant="caption">{photos}</Typography></Stack>}
            {videos > 0 && <Stack direction="row" spacing={0.25} alignItems="center"><VideocamRounded sx={{ fontSize: 16 }} /><Typography variant="caption">{videos}</Typography></Stack>}
            {labor?.labor_hours > 0 && (
              <Stack direction="row" spacing={0.25} alignItems="center" sx={{ color: labor.clocked_in ? 'secondary.dark' : undefined }}>
                <TimerRounded sx={{ fontSize: 15 }} /><Typography variant="caption" fontWeight={labor.clocked_in ? 600 : 400}>{fmtHours(labor.labor_hours)}</Typography>
              </Stack>
            )}
          </Stack>
          {wo.status === 'paused' && wo.pause_reason && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#8A4100' }}>Paused: {wo.pause_reason}</Typography>
          )}
        </CardActionArea>
        {action && !dense && <Box sx={{ display: 'flex', alignItems: 'center', pr: 1.5, pl: 0.5 }}>{action}</Box>}
      </Stack>
      {action && dense && <Box sx={{ px: 1.5, pb: 1.5 }}>{action}</Box>}
    </Card>
  );
}
