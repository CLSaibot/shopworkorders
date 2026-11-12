import { useState } from 'react';
import { Button, Stack } from '@mui/material';
import LoginRounded from '@mui/icons-material/LoginRounded';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import PauseRounded from '@mui/icons-material/PauseRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import { ActionDialog } from './Dialogs';
import { checkIn, startWork, pauseWork, completeWork, reopenWork, cancelWork } from '../lib/api';
import { useRefreshTimer, useToast } from '../lib/hooks';

export const PAUSE_REASONS = ['Waiting on parts', 'End of day', 'Lunch', 'Working another job', 'Need tech info'];

/**
 * Returns [openAction(kind, wo), dialogElement].
 * `wo` needs id, title, hours_at_checkin and equipment.current_hours.
 */
export function useWorkflow(onDone) {
  const [state, setState] = useState(null);
  const refreshTimer = useRefreshTimer();
  const toast = useToast();
  const close = () => setState(null);
  const finish = (msg) => { toast(msg); refreshTimer(); onDone?.(); };

  const configs = {
    checkin: (wo) => ({
      title: `Check in #${wo.id}`,
      body: 'The equipment is back in the shop. Read the hour meter before anything else.',
      hours: true, hoursRequired: true, lastHours: wo.equipment?.current_hours, confirmLabel: 'Check in',
      onConfirm: async ({ hours }) => { await checkIn(wo.id, hours); finish(`#${wo.id} checked in at ${hours} hrs`); },
    }),
    start: (wo) => ({
      title: wo.hours_at_checkin == null ? `Start #${wo.id}` : `Clock in to #${wo.id}`,
      body: wo.hours_at_checkin == null
        ? "This job wasn't checked in yet. Enter the hour meter reading to start the clock."
        : 'Starts your labor clock on this job. Any other job you are clocked into will be paused.',
      hours: wo.hours_at_checkin == null, hoursRequired: true, lastHours: wo.equipment?.current_hours,
      confirmLabel: 'Start clock',
      onConfirm: async ({ hours }) => { await startWork(wo.id, hours); finish(`Clocked in to #${wo.id}`); },
    }),
    pause: (wo) => ({
      title: `Pause #${wo.id}`,
      body: 'Stops your clock. Pick a reason so everyone knows why it is waiting.',
      text: true, textLabel: 'Reason', quickPicks: PAUSE_REASONS, confirmLabel: 'Pause',
      onConfirm: async ({ text }) => { await pauseWork(wo.id, text); finish(`#${wo.id} paused`); },
    }),
    complete: (wo) => ({
      title: `Complete #${wo.id}`,
      body: 'Stops the clock and puts the equipment back in service.',
      text: true, textLabel: 'What was done?', confirmLabel: 'Mark complete',
      onConfirm: async ({ text }) => { await completeWork(wo.id, text); finish(`#${wo.id} completed`); },
    }),
    reopen: (wo) => ({
      title: `Reopen #${wo.id}?`, body: 'Moves it back to the open queue.', confirmLabel: 'Reopen',
      onConfirm: async () => { await reopenWork(wo.id); finish(`#${wo.id} reopened`); },
    }),
    cancel: (wo) => ({
      title: `Cancel #${wo.id}?`, body: 'Use this if the issue was reported by mistake or fixed in the field.',
      text: true, textLabel: 'Reason (optional)', confirmLabel: 'Cancel work order', destructive: true,
      onConfirm: async ({ text }) => { await cancelWork(wo.id, text); finish(`#${wo.id} cancelled`); },
    }),
  };

  const openAction = (kind, wo) => setState(configs[kind](wo));
  const dialog = <ActionDialog open={!!state} onClose={close} {...(state || {})} />;
  return [openAction, dialog];
}

/** Primary next-step button for a work order (manager). */
export function NextActionButton({ wo, onAction, clockedInHere, size = 'medium' }) {
  switch (wo.status) {
    case 'submitted':
      return <Button size={size} variant="contained" startIcon={<LoginRounded />} onClick={() => onAction('checkin', wo)}>Check in</Button>;
    case 'checked_in':
    case 'paused':
      return <Button size={size} variant="contained" startIcon={<PlayArrowRounded />} onClick={() => onAction('start', wo)}>{wo.status === 'paused' ? 'Resume' : 'Start'}</Button>;
    case 'in_progress':
      return clockedInHere === false
        ? <Button size={size} variant="contained" startIcon={<PlayArrowRounded />} onClick={() => onAction('start', wo)}>Clock in</Button>
        : <Button size={size} variant="tonal" startIcon={<PauseRounded />} onClick={() => onAction('pause', wo)}>Pause</Button>;
    default:
      return null;
  }
}

/** Full action bar for the work-order page. */
export function WorkflowBar({ wo, onAction, isManager, isReporter, clockedInHere }) {
  if (!isManager) {
    return isReporter && wo.status === 'submitted'
      ? <Button color="error" onClick={() => onAction('cancel', wo)}>Cancel work order</Button>
      : null;
  }
  const closed = ['completed', 'cancelled'].includes(wo.status);
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <NextActionButton wo={wo} onAction={onAction} clockedInHere={clockedInHere} />
      {wo.status === 'in_progress' && clockedInHere === false && (
        <Button variant="tonal" startIcon={<PauseRounded />} onClick={() => onAction('pause', wo)}>Pause</Button>
      )}
      {!closed && wo.status !== 'submitted' && (
        <Button variant="outlined" startIcon={<CheckCircleRounded />} onClick={() => onAction('complete', wo)}>Complete</Button>
      )}
      {!closed && <Button color="error" onClick={() => onAction('cancel', wo)}>Cancel</Button>}
      {closed && <Button variant="outlined" startIcon={<ReplayRounded />} onClick={() => onAction('reopen', wo)}>Reopen</Button>}
    </Stack>
  );
}
