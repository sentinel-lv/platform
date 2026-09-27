import { useState } from 'react';
import { api } from '../api/client';
import { useFeeder } from '../store/feederStore';
import { Panel } from './ui';

const get = () => useFeeder.getState();

/**
 * Scenarios grouped by what they are supposed to PROVE, not by name.
 *
 * Half a demo's credibility is in the second group: anyone can build a
 * detector that trips. Showing the four cases that must *not* trip, next to
 * the two that must, is the argument. The grouping makes that argument
 * without anyone having to narrate it.
 */
const GROUPS: { title: string; note: string; tone: string; items: { id: string; label: string; hint: string }[] }[] = [
  {
    title: 'Must isolate',
    note: 'real conductor break',
    tone: 'text-critical',
    items: [
      { id: 'break_mid_feeder', label: 'Break mid-feeder', hint: 'N-007 and everything downstream collapse; N-006 stays normal. That asymmetry is the signature.' },
      { id: 'break_at_tail', label: 'Break at tail', hint: 'The last two nodes collapse — the span is asserted at the tail.' },
    ],
  },
  {
    title: 'Must not trip',
    note: 'the credibility set',
    tone: 'text-accent',
    items: [
      { id: 'rain_burst', label: 'Rain burst', hint: 'All nodes drop 25% for 8 s, then recover — refused before the sustain window closes.' },
      { id: 'vegetation_contact', label: 'Vegetation', hint: 'One node at −45%, fluctuating. Alert only: a single node is never a quorum.' },
      { id: 'substation_outage', label: 'Substation outage', hint: 'Every node collapses at once. Global-collapse veto: that is an outage, not a break.' },
      { id: 'switching_transient', label: 'Switching transient', hint: 'A 300 ms spike — fails the sustain requirement, so it never reaches SUSPECT.' },
    ],
  },
  {
    title: 'Maintenance',
    note: 'alert, never a vote',
    tone: 'text-warning',
    items: [
      { id: 'node_offline', label: 'Node offline', hint: 'One node stops transmitting. Comms loss is a maintenance alert and never a vote toward isolation.' },
    ],
  },
];

export default function ScenarioPanel({ bare = false }: { bare?: boolean } = {}) {
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

  const body = (
    <>
      {err && (
        <div role="alert" className="rounded border border-critical bg-critical-dim px-2 py-1.5 text-xs text-critical">
          {err}
        </div>
      )}

      {GROUPS.map((g) => (
        <div key={g.title}>
          <div className="mb-1.5 flex items-baseline gap-1.5">
            <span className={`text-2xs font-bold uppercase tracking-[.12em] ${g.tone}`}>{g.title}</span>
            <span className="text-2xs text-ink-3">{g.note}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {g.items.map((s) => {
              const isRunning = running === s.id;
              return (
                <button
                  key={s.id}
                  data-testid={`scenario-${s.id}`}
                  onClick={() => fire(s.id)}
                  disabled={!!running && !isRunning}
                  title={s.hint}
                  className={`relative overflow-hidden rounded border px-2 py-2 text-left text-xs font-semibold transition disabled:opacity-40 ${
                    isRunning
                      ? 'border-accent bg-accent-dim text-accent'
                      : 'border-line bg-surface-2 text-ink-2 hover:border-ink-3 hover:text-ink'
                  }`}
                >
                  {isRunning ? 'Running…' : s.label}
                  {isRunning && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent cc-pulse" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );

  const reset = (
    <button
      data-testid="scenario-reset"
      onClick={() => fire('reset')}
      /* Never gated on another scenario running. Reset is the escape hatch:
         if a scenario hangs mid-demo, this is the button that saves it. */
      disabled={running === 'reset'}
      title="Return every node to NORMAL — a clean slate for the next run"
      className="flex min-h-[32px] items-center rounded border border-line px-2.5 text-2xs font-semibold text-ink-3 transition hover:border-ink-3 hover:text-ink-2 disabled:opacity-40 sm:min-h-0 sm:py-0.5"
    >
      {running === 'reset' ? 'Resetting…' : 'Reset'}
    </button>
  );

  // In the mobile sheet the surrounding dialog already supplies a heading, so
  // the panel would otherwise read "Scenarios" twice.
  if (bare) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">{reset}</div>
        {body}
      </div>
    );
  }

  return (
    <Panel title="Scenarios" right={reset} className="shrink-0" bodyClassName="flex flex-col gap-3">
      {body}
    </Panel>
  );
}
