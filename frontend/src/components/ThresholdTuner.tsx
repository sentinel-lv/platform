import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useFeeder } from '../store/feederStore';

// Per-feeder threshold tuning (frontend v2): writes to ArbiterConfig via
// PATCH /feeders/{id}/config. The gateway pulls the signed config; the cloud
// copy is display/audit only — it never trips anything itself.
const FIELDS: { key: string; label: string; step: number }[] = [
  { key: 'collapse_threshold_pct', label: 'Collapse % (SUSPECT below)', step: 1 },
  { key: 'sustain_cycles', label: 'Sustain windows', step: 1 },
  { key: 'quorum_required', label: 'Quorum votes', step: 1 },
  { key: 'quorum_window_ms', label: 'Vote window ms', step: 100 },
  { key: 'recovery_threshold_pct', label: 'Recover % (above)', step: 1 },
];

export default function ThresholdTuner() {
  const feederId = useFeeder((s) => s.feederId);
  const [vals, setVals] = useState<Record<string, number>>({});
  const [ranges, setRanges] = useState<Record<string, { min: number; max: number }>>({});
  const [veto, setVeto] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      const g = await api.feeder(feederId) as unknown as {
        arbiter: Record<string, number>; tunable: Record<string, { min: number; max: number }>;
        global_collapse_veto?: boolean;
      };
      const { tunable, ...rest } = g;
      setRanges(tunable ?? {});
      setVals(Object.fromEntries(FIELDS.map((f) => [f.key, Number(rest.arbiter?.[f.key] ?? 0)])));
      setVeto(Boolean((rest as Record<string, unknown>).global_collapse_veto ?? true));
    } catch { /* backend without config API: leave blank */ }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [feederId]);

  const save = async (patch: Record<string, number | boolean>) => {
    setMsg(null);
    try {
      await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8015'}/feeders/${feederId}/config`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      }).then(async (r) => { if (!r.ok) throw new Error(await r.text()); });
      setMsg('Saved — gateway pulls signed config; cloud copy is audit-only.');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'save failed');
    }
  };

  if (Object.keys(vals).length === 0) return null;
  return (
    <div data-testid="tuner" className="rounded border bg-white p-2 shadow-sm">
      <div className="mb-1 text-sm font-bold">Threshold tuning <span className="font-normal text-slate-500">(per feeder)</span></div>
      {FIELDS.map((f) => (
        <label key={f.key} className="block text-xs">
          {f.label}: <span className="font-mono font-bold">{vals[f.key]}</span>
          <input
            data-testid={`tune-${f.key}`}
            type="range" className="w-full"
            min={ranges[f.key]?.min ?? 0} max={ranges[f.key]?.max ?? 100} step={f.step}
            value={vals[f.key] ?? 0}
            onChange={(e) => setVals({ ...vals, [f.key]: Number(e.target.value) })}
          />
        </label>
      ))}
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={veto} onChange={(e) => setVeto(e.target.checked)} />
        Global-collapse veto (substation outage never trips)
      </label>
      <div className="mt-2 flex gap-2">
        <button data-testid="tune-save" onClick={() => save({ ...vals, global_collapse_veto: veto })} className="flex-1 rounded bg-slate-800 px-2 py-1.5 text-xs font-bold text-white">Save</button>
        <button
          onClick={() => save({ collapse_threshold_pct: -60, sustain_cycles: 5, quorum_required: 2, quorum_window_ms: 1500, recovery_threshold_pct: -20, global_collapse_veto: true })}
          className="rounded border px-2 py-1.5 text-xs"
        >Defaults</button>
      </div>
      {msg && <div className="mt-1 text-xs text-slate-600">{msg}</div>}
    </div>
  );
}
