import { Line, LineChart, ReferenceLine, ResponsiveContainer, YAxis } from 'recharts';
import type { NodeView } from '../store/feederStore';
import { isOffline } from '../store/feederStore';

const BADGE: Record<string, string> = {
  NORMAL: 'border-insulator bg-insulator/10 text-insulatordeep',
  SUSPECT: 'border-wire bg-amber-200/60 text-ink',
  CONFIRMED: 'border-fault bg-fault text-porcelain',
  RECOVERED: 'border-recover bg-recover/10 text-recover',
  OFFLINE: 'border-stone-500 bg-stone-200 text-stone-700',
};

const TRACE: Record<string, string> = {
  NORMAL: '#175641',
  SUSPECT: '#9A6B00',
  CONFIRMED: '#B3261E',
  RECOVERED: '#0F766E',
  OFFLINE: '#A8A29E',
};

export default function NodeCard({ id, view }: { id: string; view: NodeView }) {
  const { tel, hist, base } = view;
  const offline = isOffline(tel);
  const state = offline ? 'OFFLINE' : tel.state;
  const data = hist.map((v, i) => ({ i, v, b: base[i] ?? tel.baseline }));
  const batt = Math.round(((tel.battery_mv - 2800) / (4200 - 2800)) * 100);
  const collapsed = tel.deviation_pct <= -60;
  return (
    <div data-testid={`node-${id}`} className="border border-ink/25 bg-porcelain px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="cc-tick text-sm font-bold">{id}</span>
        <span className={`border px-1.5 py-0.5 text-[11px] font-bold ${BADGE[state]}`}>{state}</span>
      </div>
      <div className="mt-1 h-16 border border-ink/15 bg-paper/60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <YAxis hide domain={['auto', 'auto']} />
            <ReferenceLine
              y={tel.baseline}
              stroke="#1B2A23"
              strokeOpacity={0.45}
              strokeDasharray="4 3"
              label={{ value: 'baseline', fontSize: 9, fill: '#1B2A23', opacity: 0.6, position: 'insideTopRight' }}
            />
            <Line
              type="monotone"
              dataKey="v"
              strokeWidth={collapsed ? 2.5 : 1.75}
              dot={false}
              isAnimationActive={false}
              stroke={TRACE[state]}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="cc-tick mt-1 flex justify-between text-[11px] text-ink/80">
        <span>
          {tel.efield_rms.toFixed(2)} kV/m ({tel.deviation_pct >= 0 ? '+' : ''}
          {tel.deviation_pct.toFixed(1)}%)
        </span>
        <span>{tel.rssi} dBm</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-2 flex-1 border border-ink/40 bg-paper" aria-label={`Battery ${tel.battery_mv} millivolts`}>
          <div
            className={`h-full ${batt < 25 ? 'bg-fault' : 'bg-insulator'}`}
            style={{ width: `${Math.max(0, Math.min(100, batt))}%` }}
          />
        </div>
        <span className="cc-tick text-[11px] text-ink/70">
          {tel.battery_mv} mV · {tel.temp_c.toFixed(1)} °C
        </span>
      </div>
    </div>
  );
}
