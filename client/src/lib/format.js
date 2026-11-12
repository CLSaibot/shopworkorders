import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export { dayjs };

export const fmtDate = (d) => (d ? dayjs(d).format('MMM D, YYYY') : '—');
export const fmtDateTime = (d) => (d ? dayjs(d).format('MMM D, YYYY · h:mm A') : '—');
export const fmtTime = (d) => (d ? dayjs(d).format('h:mm A') : '—');
export const fmtAgo = (d) => (d ? dayjs(d).fromNow() : '—');

/** 1.5 → "1h 30m" */
export function fmtHours(h) {
  if (h == null || isNaN(h)) return '—';
  const mins = Math.round(Number(h) * 60);
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  if (hh === 0) return `${mm}m`;
  return mm ? `${hh}h ${mm}m` : `${hh}h`;
}
export const fmtDecimalHours = (h) => (h == null ? '—' : Number(h).toFixed(2));

/** seconds → "01:23:45" */
export function fmtClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

export const fmtMoney = (n) =>
  n == null ? '—' : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export const fmtMeter = (h) => (h == null ? '—' : `${Number(h).toLocaleString('en-US', { maximumFractionDigits: 1 })} hrs`);

export const fmtBytes = (b) => {
  if (!b) return '';
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export const firstName = (n = '') => n.split(' ')[0];
export const initials = (n = '') => n.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

/** Labor hours from time entries (open entries count to now). */
export function laborHours(entries = [], now = Date.now()) {
  return entries.reduce((sum, e) => {
    const end = e.ended_at ? new Date(e.ended_at).getTime() : now;
    return sum + Math.max(0, end - new Date(e.started_at).getTime()) / 3600000;
  }, 0);
}

export function downloadCsv(filename, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
