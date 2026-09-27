import { Area, AreaChart, ReferenceLine, ResponsiveContainer, YAxis } from 'recharts';
import type { NodeView } from '../store/feederStore';
import { isOffline } from '../store/feederStore';
import { STATE, StateBadge } from '../theme/state';
import { Meter } from './ui';

/** LiFePO4 terminal voltage range from PROTOCOL §4.1. */
const BATT_MIN = 2800;
const BATT_MAX = 4200;

function battTone(pct: number): 'good' | 'warning' | 'critical' {
  if (pct < 20) return 'critical';
  if (pct < 45) return 'warning';
  return 'good';
}

export default function NodeCard({ id, view, selected, onSelect }: {
  id: string;
  view: NodeView;
  selected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const { tel, hist, base } = view;
  const offline = isOffline(tel);
  const state = offline ? 'OFFLINE' : tel.state;
  const style = STATE[state];

  const data = hist.map((v, i) => ({ i, v, b: base[i] ?? tel.baseline }));
  const batt = Math.round(((tel.battery_mv - BATT_MIN) / (BATT_MAX - BATT_MIN)) * 100);
  const dev = tel.deviation_pct;

  return (
    <button
      type="button"
      data-testid={`node-${id}`}
      onClick={() => onSelect?.(id)}
      className={`w-full rounded border bg-surface-2 p-2 text-left transition ${
        selected ? 'border-accent' : 'border-line hover:border-ink-3'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="cc-mono text-sm font-bold tracking-tight">{id}</span>
        <StateBadge state={state} size="xs" />
      </div>

      {/* Sparkline: thin mark, no dots, baseline as a recessive dashed rule.
          The fill is a faint wash of the state colour so the card reads as a
          single object at a glance. */}
      <div className="mt-1.5 h-12" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={style.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={style.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={['auto', 'auto']} />
            <ReferenceLine y={tel.baseline} stroke="var(--cc-text-3)" strokeDasharray="3 3" strokeWidth={1} />
            <Area
              type="monotone"
              dataKey="v"
              stroke={style.color}
              strokeWidth={2}
              fill={`url(#fill-${id})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Instrument row. tabular-nums here because these align down a column. */}
      <dl className="mt-0.5 grid grid-cols-3 gap-x-2 text-2xs">
        <div>
          <dt className="text-ink-3">E-field</dt>
          <dd className="cc-mono tabular-nums text-ink-2">{tel.efield_rms.toFixed(2)}<span className="text-ink-3"> kV/m</span></dd>
        </div>
        <div>
          <dt className="text-ink-3">Deviation</dt>
          <dd
            className={`cc-mono tabular-nums font-semibold ${
              dev <= -60 ? 'text-critical' : dev <= -20 ? 'text-warning' : 'text-ink-2'
            }`}
          >
            {dev >= 0 ? '+' : ''}{dev.toFixed(1)}%
          </dd>
        </div>
        <div>
          <dt className="text-ink-3">RSSI</dt>
          <dd className="cc-mono tabular-nums text-ink-2">{tel.rssi}<span className="text-ink-3"> dBm</span></dd>
        </div>
      </dl>

      <div className="mt-1.5 flex items-center gap-2">
        <Meter pct={batt} tone={battTone(batt)} label={`${id} battery`} className="flex-1" />
        <span className="cc-mono shrink-0 text-2xs tabular-nums text-ink-3">
          {tel.battery_mv} mV · {tel.temp_c.toFixed(1)} °C
        </span>
      </div>
    </button>
  );
}
