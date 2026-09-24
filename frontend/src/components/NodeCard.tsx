import { Line, LineChart, ReferenceLine, ResponsiveContainer, YAxis } from 'recharts';
import type { NodeView } from '../store/feederStore';
import { isOffline } from '../store/feederStore';

const BADGE: Record<string, string> = {
  NORMAL: 'bg-green-100 text-green-800', SUSPECT: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-red-100 text-red-800', RECOVERED: 'bg-teal-100 text-teal-800',
  OFFLINE: 'bg-gray-200 text-gray-700',
};

export default function NodeCard({ id, view }: { id: string; view: NodeView }) {
  const { tel, hist, base } = view;
  const offline = isOffline(tel);
  const state = offline ? 'OFFLINE' : tel.state;
  const data = hist.map((v, i) => ({ i, v, b: base[i] ?? tel.baseline }));
  const batt = Math.round(((tel.battery_mv - 2800) / (4200 - 2800)) * 100);
  return (
    <div data-testid={`node-${id}`} className="rounded border bg-white p-2 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-bold">{id}</span>
        <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${BADGE[state]}`}>{state}</span>
      </div>
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <YAxis hide domain={['auto', 'auto']} />
            <ReferenceLine y={tel.baseline} stroke="#94a3b8" strokeDasharray="4 3" label={{ value: 'baseline', fontSize: 9, fill: '#94a3b8', position: 'insideTopRight' }} />
            <Line type="monotone" dataKey="v" strokeWidth={1.5} dot={false} isAnimationActive={false}
              stroke={state === 'NORMAL' ? '#16a34a' : state === 'SUSPECT' ? '#f59e0b' : state === 'CONFIRMED' ? '#dc2626' : state === 'RECOVERED' ? '#0d9488' : '#9ca3af'} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-xs text-slate-600">
        <span className="tabular-nums">{tel.efield_rms.toFixed(2)} kV/m ({tel.deviation_pct >= 0 ? '+' : ''}{tel.deviation_pct.toFixed(1)}%)</span>
        <span className="tabular-nums">{tel.rssi} dBm</span>
      </div>
      <div className="mt-1 h-1.5 rounded bg-slate-200">
        <div className="h-1.5 rounded bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, batt))}%` }} />
      </div>
      <div className="text-[11px] tabular-nums text-slate-500">{tel.battery_mv} mV · {tel.temp_c.toFixed(1)} °C</div>
    </div>
  );
}
