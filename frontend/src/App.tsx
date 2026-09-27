import { useEffect, useState } from 'react';
import { api } from './api/client';
import { connectStream } from './api/socket';
import { useFeeder } from './store/feederStore';
import { MOCK_NODES } from './mocks/fixtures';
import CommandBar from './components/CommandBar';
import KpiStrip from './components/KpiStrip';
import FeederMap from './components/FeederMap';
import NodePanel from './components/NodePanel';
import ScenarioPanel from './components/ScenarioPanel';
import CascadeOverlay from './components/CascadeOverlay';
import EventTimeline from './components/EventTimeline';
import CrewAlertMock from './components/CrewAlertMock';
import ThresholdTuner from './components/ThresholdTuner';
import AuditLog from './components/AuditLog';
import { Btn } from './components/ui';

type Drawer = 'crew' | 'tuning' | 'audit' | null;

export default function App() {
  const feederId = useFeeder((s) => s.feederId);
  const ingest = useFeeder((s) => s.ingest);
  const setGeo = useFeeder((s) => s.setGeo);
  const setConn = useFeeder((s) => s.setConn);
  const [drawer, setDrawer] = useState<Drawer>(null);

  useEffect(() => {
    let dead = false;
    api.feeder(feederId)
      .then((g) => {
        if (dead) return;
        setGeo(g.nodes, g.substation, g.mode ?? 'ALERT_ONLY');
        for (const p of g.nodes) {
          api.history(p.node_id, feederId, 60)
            .then((rows) => { if (!dead && rows.length) useFeeder.getState().backfill(p.node_id, rows); })
            .catch(() => {});
        }
      })
      .catch(() => {
        // offline fallback: mock nodes so the demo never renders blank
        if (!dead) {
          setGeo(
            MOCK_NODES.map((n) => ({ node_id: n.node_id, lat: 8.5245, lng: 76.9371, span_m: 42 })),
            { lat: 8.5241, lng: 76.9366 }, 'ALERT_ONLY',
          );
          for (const t of MOCK_NODES) ingest('telemetry', t as never);
        }
      });
    api.events(feederId, 20).then((evs) => {
      // history arrives newest-first; feed oldest-first, but a past recovery
      // line must not resurrect a banner for a healed field.
      const ordered = [...evs].reverse();
      const lastRecovery = ordered.map((e) => e.reason === 'no_fault').lastIndexOf(true);
      const relevant = lastRecovery >= 0 ? ordered.slice(lastRecovery + 1) : ordered;
      if (!dead) for (const e of relevant) ingest('event', e as never);
    }).catch(() => {});
    const off = connectStream(feederId, ingest, (c) => setConn(c === 'live' ? 'live' : 'reconnecting'));
    return () => { dead = true; off(); };
  }, [feederId, ingest, setGeo, setConn]);

  const toggle = (d: Exclude<Drawer, null>) => setDrawer((cur) => (cur === d ? null : d));

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-ink">
      <CommandBar />
      <KpiStrip />

      {/* The stage. lg: map is the star and the rail sits beside it; below lg
          everything stacks and the page scrolls normally. */}
      <main className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-2.5 lg:grid lg:grid-cols-[minmax(0,1fr)_356px] lg:overflow-hidden">
        <div className="flex min-h-0 flex-col gap-2.5">
          <div className="relative min-h-[320px] flex-1 lg:min-h-0">
            <FeederMap />
            <CascadeOverlay />
          </div>
          <EventTimeline />
        </div>

        <aside className="flex min-h-0 flex-col gap-2.5">
          <ScenarioPanel />
          <NodePanel />

          <nav className="grid shrink-0 grid-cols-3 gap-1.5" aria-label="Secondary views">
            <Btn variant={drawer === 'crew' ? 'primary' : 'ghost'} onClick={() => toggle('crew')}>Crew alert</Btn>
            <Btn variant={drawer === 'tuning' ? 'primary' : 'ghost'} onClick={() => toggle('tuning')}>Tuning</Btn>
            <Btn variant={drawer === 'audit' ? 'primary' : 'ghost'} onClick={() => toggle('audit')}>Audit</Btn>
          </nav>
        </aside>
      </main>

      {drawer && (
        <div className="shrink-0 border-t border-line bg-surface-1 p-2.5">
          <div className="cc-rise">
            {drawer === 'crew' && <CrewAlertMock />}
            {drawer === 'tuning' && <ThresholdTuner />}
            {drawer === 'audit' && <AuditLog />}
          </div>
        </div>
      )}
    </div>
  );
}
