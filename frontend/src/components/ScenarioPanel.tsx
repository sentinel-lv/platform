import { useState } from 'react';
import { api } from '../api/client';
import { useFeeder } from '../store/feederStore';

const get = () => useFeeder.getState();

const SCENARIOS: { id: string; label: string }[] = [
  { id: 'break_mid_feeder', label: 'Break mid-feeder' },
  { id: 'break_at_tail', label: 'Break at tail' },
  { id: 'rain_burst', label: 'Rain burst' },
  { id: 'vegetation_contact', label: 'Vegetation' },
  { id: 'substation_outage', label: 'Substation outage' },
  { id: 'switching_transient', label: 'Switching transient' },
  { id: 'node_offline', label: 'Node offline' },
  { id: 'reset', label: 'Reset' },
];

export default function ScenarioPanel() {
  const running = useFeeder((s) => s.scenarioRunning);
  const setScenario = useFeeder((s) => s.setScenario);
  const [err, setErr] = useState<string | null>(null);
  const fire = async (id: string) => {
    setScenario(id);
    try {
      await api.simulate(id);
    } catch (e) {
      setScenario(null);
      setErr(e instanceof Error ? e.message : 'scenario failed');
      setTimeout(() => setErr(null), 5000);
    }
    // cleared on next event frame; safety timeout in case nothing fires
    setTimeout(() => { if (get().scenarioRunning === id) setScenario(null); }, 35000);
  };
  return (
    <div className="rounded border bg-white p-2 shadow-sm">
      <div className="mb-1 text-sm font-bold">Scenarios</div>
      {err && <div className="mb-1 rounded bg-red-100 px-2 py-1 text-xs text-red-800">{err}</div>}
      <div className="grid grid-cols-2 gap-1.5">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            data-testid={`scenario-${s.id}`}
            onClick={() => fire(s.id)}
            className={`rounded px-2 py-1.5 text-xs font-semibold text-white ${running === s.id ? 'bg-emerald-700' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            {running === s.id ? 'Running…' : s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
