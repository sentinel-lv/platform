import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useFeeder } from '../store/feederStore';
import { Btn, Panel } from './ui';

// Per-feeder threshold tuning (frontend v2): writes to ArbiterConfig via
// PATCH /feeders/{id}/config. The gateway pulls the signed config; the cloud
// copy is display/audit only — it never trips anything itself.
const FIELDS: { key: string; label: string; step: number; unit?: string; hint: string }[] = [
  { key: 'collapse_threshold_pct', label: 'Collapse threshold', step: 1, unit: '%', hint: 'Deviation below which a node enters SUSPECT' },
  { key: 'sustain_cycles', label: 'Sustain windows', step: 1, hint: 'Consecutive samples required before SUSPECT — this is what rejects a switching transient' },
  { key: 'quorum_required', label: 'Quorum votes', step: 1, hint: 'Downstream neighbours that must agree before a fault is asserted' },
  { key: 'quorum_window_ms', label: 'Vote window', step: 100, unit: 'ms', hint: 'Votes older than this expire' },
  { key: 'recovery_threshold_pct', label: 'Recovery threshold', step: 1, unit: '%', hint: 'Deviation above which a SUSPECT node returns to NORMAL' },
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
    <Panel
      title="Threshold tuning"
      right={<span className="text-2xs text-ink-3">per feeder · ArbiterConfig</span>}
      className="mx-auto w-full max-w-2xl"
      bodyClassName="grid gap-3 sm:grid-cols-2"
    >
      <div data-testid="tuner" className="space-y-2.5 sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-x-5 sm:gap-y-2.5 sm:space-y-0">
        {FIELDS.map((f) => (
          <label key={f.key} className="block" title={f.hint}>
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-ink-2">{f.label}</span>
              <span className="cc-mono text-xs font-bold tabular-nums text-accent">
                {vals[f.key]}{f.unit ?? ''}
              </span>
            </span>
            <input
              data-testid={`tune-${f.key}`}
              type="range" className="cc-range mt-0.5"
              min={ranges[f.key]?.min ?? 0} max={ranges[f.key]?.max ?? 100} step={f.step}
              value={vals[f.key] ?? 0}
              onChange={(e) => setVals({ ...vals, [f.key]: Number(e.target.value) })}
            />
            <span className="block text-2xs leading-tight text-ink-3">{f.hint}</span>
          </label>
        ))}
      </div>

      <label className="flex items-start gap-2 text-xs text-ink-2 sm:col-span-2">
        <input type="checkbox" className="cc-check mt-0.5" checked={veto} onChange={(e) => setVeto(e.target.checked)} />
        <span>
          Global-collapse veto
          <span className="block text-2xs text-ink-3">
            If every node collapses at once it is a substation outage, not a break. Leave this on.
          </span>
        </span>
      </label>

      <div className="flex gap-2 sm:col-span-2">
        <Btn variant="primary" data-testid="tune-save" className="flex-1" onClick={() => save({ ...vals, global_collapse_veto: veto })}>
          Save to feeder
        </Btn>
        <Btn
          onClick={() => save({ collapse_threshold_pct: -60, sustain_cycles: 5, quorum_required: 2, quorum_window_ms: 1500, recovery_threshold_pct: -20, global_collapse_veto: true })}
        >
          Restore defaults
        </Btn>
      </div>

      {msg && <div className="text-2xs text-ink-3 sm:col-span-2">{msg}</div>}
    </Panel>
  );
}
