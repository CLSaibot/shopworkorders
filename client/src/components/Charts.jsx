import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';

// Single-series charts. Brand green validated for contrast/lightness on light surfaces.
export const SERIES = '#2E7D4F';
const GRID = '#E3E8E1';
const INK2 = '#5B6358';

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function Tooltip({ tip }) {
  if (!tip) return null;
  return (
    <Box sx={{
      position: 'absolute', left: tip.x, top: tip.y, transform: `translate(${tip.flip ? '-100%' : '0'}, -100%) translate(${tip.flip ? -10 : 10}px, -8px)`,
      bgcolor: '#2E312D', color: 'white', px: 1.25, py: 0.75, borderRadius: 1.5, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,.2)',
    }}>
      <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>{tip.label}</Typography>
      <Typography variant="body2" fontWeight={500}>{tip.value}</Typography>
    </Box>
  );
}

/** Vertical bars. data: [{ label, value, tick? }] */
export function BarChart({ data, height = 220, formatValue = (v) => v, formatAxis = formatValue, ariaLabel }) {
  const [ref, width] = useWidth();
  const [tip, setTip] = useState(null);
  const pad = { l: 40, r: 8, t: 12, b: 26 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = [0, max / 2, max];
  const slot = iw / Math.max(1, data.length);
  const bw = Math.max(3, Math.min(28, slot - 2));
  const every = Math.ceil(data.length / Math.max(1, Math.floor(iw / 44)));

  return (
    <Box ref={ref} sx={{ position: 'relative', width: '100%' }} onMouseLeave={() => setTip(null)}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel} style={{ display: 'block' }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={pad.t + ih - (t / max) * ih} y2={pad.t + ih - (t / max) * ih} stroke={GRID} strokeWidth="1" />
            <text x={pad.l - 6} y={pad.t + ih - (t / max) * ih + 4} textAnchor="end" fontSize="11" fill={INK2}>{formatAxis(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * ih;
          const x = pad.l + i * slot + (slot - bw) / 2;
          const y = pad.t + ih - h;
          const r = Math.min(4, bw / 2, h);
          return (
            <g key={i}>
              {h > 0 && (
                <path
                  d={`M${x},${pad.t + ih} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${pad.t + ih} Z`}
                  fill={SERIES}
                  opacity={tip && tip.i !== i ? 0.55 : 1}
                />
              )}
              {i % every === 0 && (
                <text x={x + bw / 2} y={height - 8} textAnchor="middle" fontSize="11" fill={INK2}>{d.tick ?? d.label}</text>
              )}
              {/* hit target bigger than the mark */}
              <rect x={pad.l + i * slot} y={pad.t} width={slot} height={ih} fill="transparent"
                onMouseEnter={() => setTip({ i, x: x + bw / 2, y: Math.min(y, pad.t + ih - 4), label: d.label, value: formatValue(d.value), flip: x > width * 0.7 })}
                onClick={() => setTip({ i, x: x + bw / 2, y: Math.min(y, pad.t + ih - 4), label: d.label, value: formatValue(d.value), flip: x > width * 0.7 })} />
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} />
    </Box>
  );
}

/** Line over time. data: [{ t: Date|string, value, label }] sorted ascending */
export function LineChart({ data, height = 200, formatValue = (v) => v, formatTick = (d) => d, ariaLabel }) {
  const [ref, width] = useWidth();
  const [tip, setTip] = useState(null);
  const pad = { l: 48, r: 12, t: 12, b: 26 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  if (data.length === 0) return null;
  const ts = data.map((d) => new Date(d.t).getTime());
  const t0 = Math.min(...ts); const t1 = Math.max(...ts);
  const vs = data.map((d) => d.value);
  let lo = Math.min(...vs); let hi = Math.max(...vs);
  if (hi === lo) { lo -= 1; hi += 1; }
  const span = hi - lo; lo = Math.max(0, lo - span * 0.1); hi += span * 0.1;
  const x = (t) => pad.l + (t1 === t0 ? iw / 2 : ((t - t0) / (t1 - t0)) * iw);
  const y = (v) => pad.t + ih - ((v - lo) / (hi - lo)) * ih;
  const pts = data.map((d, i) => [x(ts[i]), y(d.value)]);
  const ticks = [lo, (lo + hi) / 2, hi];

  const nearest = (mx) => pts.reduce((best, p, i) => (Math.abs(p[0] - mx) < Math.abs(pts[best][0] - mx) ? i : best), 0);
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = nearest(e.clientX - r.left);
    setTip({ i, x: pts[i][0], y: pts[i][1], label: data[i].label, value: formatValue(data[i].value), flip: pts[i][0] > width * 0.7 });
  };

  return (
    <Box ref={ref} sx={{ position: 'relative', width: '100%' }}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel} style={{ display: 'block' }}
        onMouseMove={onMove} onClick={onMove} onMouseLeave={() => setTip(null)}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill={INK2}>{Math.round(t).toLocaleString()}</text>
          </g>
        ))}
        <text x={pad.l} y={height - 8} fontSize="11" fill={INK2}>{formatTick(data[0].t)}</text>
        {data.length > 1 && <text x={width - pad.r} y={height - 8} textAnchor="end" fontSize="11" fill={INK2}>{formatTick(data[data.length - 1].t)}</text>}
        {tip && <line x1={tip.x} x2={tip.x} y1={pad.t} y2={pad.t + ih} stroke={INK2} strokeDasharray="3 3" strokeWidth="1" />}
        <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={tip?.i === i ? 5 : 4} fill={SERIES} stroke="#fff" strokeWidth="2" />
        ))}
      </svg>
      <Tooltip tip={tip} />
    </Box>
  );
}
