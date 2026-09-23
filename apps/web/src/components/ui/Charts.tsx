import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Хамааралгүй (SVG) энгийн графикууд — тайлан, хандлагад.
 * Recharts зэрэг том сан ачаалахгүй.
 */

export interface Series {
  name: string;
  values: (number | null)[];
  color: string;
  format?: (v: number) => string;
}

export function LineChart({ labels, series, height = 220, yMin, yMax }: { labels: string[]; series: Series[]; height?: number; yMin?: number; yMax?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const pad = { l: 44, r: 12, t: 12, b: 44 };
  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  const min = yMin ?? Math.min(0, ...all);
  const max = yMax ?? Math.max(1, ...all) * 1.1;
  const x = (i: number) => pad.l + (labels.length <= 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (labels.length - 1));
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  const ticks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4);
  const fmt = series[0]?.format ?? ((v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v * 100) / 100)));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="stroke-line" strokeDasharray="3 3" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" className="fill-faint">{fmt(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => (
          <g key={l + i}>
            <text x={x(i)} y={H - pad.b + 16} textAnchor="middle" fontSize="10" className="fill-muted">{l.length > 14 ? `${l.slice(0, 13)}…` : l}</text>
            <rect x={x(i) - 20} y={pad.t} width={40} height={H - pad.t - pad.b} fill="transparent" onMouseEnter={() => setHover(i)} />
          </g>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="stroke-line-strong" />}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v === null ? null : `${x(i)},${y(v)}`)).filter(Boolean);
          return (
            <g key={s.name}>
              <polyline points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" />
              {s.values.map((v, i) => (v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 3.5} className="fill-surface" stroke={s.color} strokeWidth={2} />))}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-4 text-[12px]">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-muted">
            <span className="h-2 w-3 rounded-sm" style={{ background: s.color }} />
            {s.name}
            {hover !== null && s.values[hover] !== null && <b className="num text-ink">{(s.format ?? fmt)(s.values[hover]!)}</b>}
          </span>
        ))}
        {hover !== null && <span className="ml-auto text-faint">{labels[hover]}</span>}
      </div>
    </div>
  );
}

export function BarChart({ labels, values, color = '#1E4B8F', height = 200, format = (v: number) => String(v), className }: { labels: string[]; values: number[]; color?: string; height?: number; format?: (v: number) => string; className?: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className={cn('flex items-end gap-2', className)} style={{ height }}>
      {values.map((v, i) => (
        <div key={labels[i] + i} className="flex flex-1 flex-col items-center gap-1" title={`${labels[i]}: ${format(v)}`}>
          <span className="num text-[11px] text-muted">{format(v)}</span>
          <div className="w-full rounded-t" style={{ height: `${(v / max) * (height - 40)}px`, minHeight: 2, background: color }} />
          <span className="num truncate text-[11px] text-faint">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
