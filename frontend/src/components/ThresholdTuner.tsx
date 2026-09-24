// Per-feeder threshold tuning (frontend v2): writes to ArbiterConfig via
// PATCH /feeders/{id}/config. The gateway pulls the signed config; the cloud
// copy is display/audit only — it never trips anything itself.
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useFeeder } from '../store/feederStore';

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
      const g = (await api.feeder(feederId)) as unknown as {
        arbiter: Record<string, number>;
        tunable: Record<string, { min: number; max: number }>;
        global_collapse_veto?: boolean;
      };
      const { tunable, ...rest } = g;
      setRanges(tunable ?? {});
      setVals(Object.fromEntries(FIELDS.map((f) => [f.key, Number(rest.arbiter?.[f.key] ?? 0)])));
      setVeto(Boolean((rest as Record<string, unknown>).global_collapse_veto ?? true));
    } catch {
      /* backend without config API: leave blank */
    }
  };
  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [feederId]);

  const save = async (patch: Record<string, number | boolean>) => {
    setMsg(null);
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:8015'}/feeders/${feederId}/config`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        },
      ).then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
      });
      setMsg('Saved — gateway pulls signed config; cloud copy is audit-only.');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'save failed');
    }
  };

  if (Object.keys(vals).length === 0) return null;
  return (
    <section aria-label="Threshold tuning" data-testid="tuner" className="cc-panel overflow-hidden">
      <div className="border-b-[1.5px] border-ink px-3 py-2">
        <h2 className="font-display text-sm font-extrabold tracking-tight">
          Threshold tuning <span className="font-sans text-[11px] font-medium text-ink/60">per feeder</span>
        </h2>
      </div>
      <div className="space-y-2.5 bg-paper/50 p-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="block text-xs font-semibold">
            <span className="flex items-baseline justify-between">
              {f.label}
              <span className="cc-tick font-bold">{vals[f.key]}</span>
            </span>
            <input
              data-testid={`tune-${f.key}`}
              type="range"
              className="cc-range mt-1 w-full"
              min={ranges[f.key]?.min ?? 0}
              max={ranges[f.key]?.max ?? 100}
              step={f.step}
              value={vals[f.key] ?? 0}
              onChange={(e) => setVals({ ...vals, [f.key]: Number(e.target.value) })}
            />
          </label>
        ))}
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={veto}
            onChange={(e) => setVeto(e.target.checked)}
            className="h-3.5 w-3.5 accent-[#175641]"
          />
          Global-collapse veto (substation outage never trips)
        </label>
        <div className="flex gap-2">
          <button
            data-testid="tune-save"
            onClick={() => save({ ...vals, global_collapse_veto: veto })}
            className="flex-1 border-[1.5px] border-ink bg-ink px-2 py-1.5 font-display text-xs font-bold text-porcelain hover:bg-insulator focus-visible:outline focus-visible:outline-2 focus-visible:outline-insulator"
          >
            Save
          </button>
          <button
            onClick={() =>
              save({
                collapse_threshold_pct: -60,
                sustain_cycles: 5,
                quorum_required: 2,
                quorum_window_ms: 1500,
                recovery_threshold_pct: -20,
                global_collapse_veto: true,
              })
            }
            className="border-[1.5px] border-ink bg-porcelain px-2 py-1.5 text-xs font-bold hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-insulator"
          >
            Defaults
          </button>
        </div>
        {msg && <p className="text-xs text-ink/75">{msg}</p>}
      </div>
    </section>
  );
}
