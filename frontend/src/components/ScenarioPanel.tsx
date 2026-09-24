import { useState } from 'react';
import { api } from '../api/client';
import { useFeeder } from '../store/feederStore';

const get = () => useFeeder.getState();

const SCENARIOS: { id: string; label: string; hint: string }[] = [
  { id: 'break_mid_feeder', label: 'Snap the line, mid-feeder', hint: 'FAULT' },
  { id: 'break_at_tail', label: 'Snap the line, at the tail', hint: 'FAULT' },
  { id: 'rain_burst', label: 'Monsoon burst over the line', hint: 'WEATHER' },
  { id: 'vegetation_contact', label: 'Branch leaning on a wire', hint: 'AMBIENT' },
  { id: 'substation_outage', label: 'Substation trips upstream', hint: 'GRID' },
  { id: 'switching_transient', label: 'Switching transient', hint: 'GRID' },
  { id: 'node_offline', label: 'Silence one instrument', hint: 'COMMS' },
  { id: 'reset', label: 'Re-string and reset', hint: 'RESET' },
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
    setTimeout(() => {
      if (get().scenarioRunning === id) setScenario(null);
    }, 35000);
  };
  return (
    <section aria-label="Field trials" className="cc-panel overflow-hidden">
      <div className="border-b-[1.5px] border-ink px-3 py-2">
        <h2 className="font-display text-sm font-extrabold tracking-tight">Field trials</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-ink/70">
          Choreographed faults and weather, run against the live consensus engine.
        </p>
      </div>
      <div className="p-2">
        {err && (
          <p role="alert" className="mb-2 border border-fault bg-fault/10 px-2 py-1 text-xs text-faultdeep">
            {err}
          </p>
        )}
        <div className="grid grid-cols-1 gap-1.5">
          {SCENARIOS.map((s) => {
            const active = running === s.id;
            const isFault = s.hint === 'FAULT';
            return (
              <button
                key={s.id}
                data-testid={`scenario-${s.id}`}
                onClick={() => fire(s.id)}
                className={`group flex items-center gap-2 border-[1.5px] border-ink px-2.5 py-2 text-left transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-insulator active:translate-x-[1px] active:translate-y-[1px] ${
                  active
                    ? 'bg-insulator text-porcelain'
                    : isFault
                      ? 'bg-fault text-porcelain hover:bg-faultdeep'
                      : 'bg-porcelain text-ink hover:bg-amber-100'
                }`}
              >
                <span
                  className={`cc-tick shrink-0 border px-1 py-0.5 text-[10px] font-bold ${
                    active || isFault ? 'border-porcelain/50' : 'border-ink/40'
                  }`}
                >
                  {s.hint}
                </span>
                <span className="text-xs font-bold leading-tight">
                  {active ? 'Running — watch the line…' : s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
