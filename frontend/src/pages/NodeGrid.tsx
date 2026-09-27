import { useMemo, useState } from 'react';
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { useFeeder, isOffline } from '../store/feederStore';
import type { NodeState } from '../types/protocol';
import { STATE, STATE_ORDER, StateBadge } from '../theme/state';
import { Link } from '../router';
import CommandBar from '../components/CommandBar';
import { Empty, Meter, Panel } from '../components/ui';

type Filter = 'all' | NodeState;

const BATT_MIN = 2800;
const BATT_MAX = 4200;

function battTone(pct: number): 'good' | 'warning' | 'critical' {
  if (pct < 20) return 'critical';
  if (pct < 45) return 'warning';
  return 'good';
}

function ChartTip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-line bg-surface-1 px-2 py-1 shadow-lift">
      <span className="cc-mono text-2xs tabular-nums text-ink">
        {payload[0].value.toFixed(2)} <span className="text-ink-3">kV/m</span>
      </span>
    </div>
  );
}

/**
 * Every node's field trace on one screen.
 *
 * The console rail shows the same cards, but a 360px column can hold two of
 * twelve at a time — which is the wrong shape for the question this view
 * answers: "is anything drifting anywhere on the feeder?" That is a
 * small-multiples question, and small multiples need to be side by side.
 */
export default function NodeGrid() {
  const order = useFeeder((s) => s.order);
  const nodes = useFeeder((s) => s.nodes);
  const [filter, setFilter] = useState<Filter>('all');

  const now = Date.now();
  const stateOf = (id: string): NodeState => {
    const tel = nodes[id]?.tel;
    if (!tel) return 'OFFLINE';
    return isOffline(tel, now) ? 'OFFLINE' : tel.state;
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const id of order) c[stateOf(id)] = (c[stateOf(id)] ?? 0) + 1;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, nodes]);

  const shown = order.filter((id) => filter === 'all' || stateOf(id) === filter);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <CommandBar />

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface-1 px-3 py-2">
        <Link to="/console" className="flex min-h-[36px] items-center text-xs font-semibold text-ink-3 transition hover:text-ink-2 sm:min-h-0">
          ← Console
        </Link>
        <span className="h-4 w-px bg-line" />
        <h1 className="text-2xs font-bold uppercase tracking-[.14em] text-ink-3">All nodes</h1>
        <span className="hidden text-2xs text-ink-3 sm:inline">
          every node's field trace, side by side
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`flex min-h-[34px] items-center rounded-full px-3 text-2xs font-semibold transition sm:min-h-0 sm:py-1 ${
              filter === 'all' ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            All <span className="cc-mono tabular-nums">{order.length}</span>
          </button>
          {STATE_ORDER.filter((s) => counts[s]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? 'all' : s)}
              title={STATE[s].meaning}
              className={`flex min-h-[34px] items-center gap-1 rounded-full px-3 text-2xs font-semibold transition sm:min-h-0 sm:py-1 ${
                filter === s ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink-2'
              }`}
            >
              <span aria-hidden="true" style={{ color: STATE[s].color }}>{STATE[s].glyph}</span>
              {STATE[s].label} <span className="cc-mono tabular-nums">{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="cc-scroll min-h-0 flex-1 overflow-y-auto p-3">
        {shown.length === 0 ? (
          <Empty>No nodes in this state.</Empty>
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
            {shown.map((id) => {
              const view = nodes[id];
              if (!view) return null;
              const { tel, hist, base } = view;
              const st = stateOf(id);
              const style = STATE[st];
              const data = hist.map((v, i) => ({ i, v, b: base[i] ?? tel.baseline }));
              const batt = Math.round(((tel.battery_mv - BATT_MIN) / (BATT_MAX - BATT_MIN)) * 100);
              const dev = tel.deviation_pct;
              const age = Math.round((now - tel.ts) / 1000);

              return (
                <Panel
                  key={id}
                  title={<span className="cc-mono text-xs font-bold tracking-tight text-ink">{id}</span>}
                  right={<StateBadge state={st} size="xs" />}
                  dense
                >
                  <div className="h-28 px-1 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                        <defs>
                          <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={style.color} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={style.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <YAxis hide domain={['auto', 'auto']} />
                        <ReferenceLine
                          y={tel.baseline}
                          stroke="var(--cc-text-3)"
                          strokeDasharray="3 3"
                          strokeWidth={1}
                          label={{ value: 'baseline', fontSize: 9, fill: 'var(--cc-text-3)', position: 'insideTopLeft' }}
                        />
                        <Tooltip content={<ChartTip />} cursor={{ stroke: 'var(--cc-text-3)', strokeWidth: 1 }} />
                        <Area
                          type="monotone" dataKey="v" stroke={style.color} strokeWidth={2}
                          fill={`url(#g-${id})`} dot={false} isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-3 pb-2 pt-1 text-2xs">
                    <div>
                      <dt className="text-ink-3">E-field</dt>
                      <dd className="cc-mono tabular-nums text-ink-2">{tel.efield_rms.toFixed(2)} kV/m</dd>
                    </div>
                    <div>
                      <dt className="text-ink-3">Deviation</dt>
                      <dd className={`cc-mono font-semibold tabular-nums ${
                        dev <= -60 ? 'text-critical' : dev <= -20 ? 'text-warning' : 'text-ink-2'
                      }`}>
                        {dev >= 0 ? '+' : ''}{dev.toFixed(1)}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-3">RSSI</dt>
                      <dd className="cc-mono tabular-nums text-ink-2">{tel.rssi} dBm</dd>
                    </div>
                    <div>
                      <dt className="text-ink-3">Enclosure</dt>
                      <dd className="cc-mono tabular-nums text-ink-2">{tel.temp_c.toFixed(1)} °C</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="flex items-baseline justify-between text-ink-3">
                        <span>Battery</span>
                        <span className="cc-mono tabular-nums">{tel.battery_mv} mV</span>
                      </dt>
                      <dd className="mt-1"><Meter pct={batt} tone={battTone(batt)} label={`${id} battery`} /></dd>
                    </div>
                    <div className="col-span-2 flex items-baseline justify-between border-t border-line-soft pt-1.5 text-ink-3">
                      <span>seq <span className="cc-mono tabular-nums">{tel.seq}</span></span>
                      <span className={age > 30 ? 'text-warning' : ''}>
                        last seen <span className="cc-mono tabular-nums">{age}s</span> ago
                      </span>
                    </div>
                  </dl>
                </Panel>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
