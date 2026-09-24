import { useEffect } from 'react';
import { api } from './api/client';
import { connectStream } from './api/socket';
import { useFeeder } from './store/feederStore';
import { MOCK_NODES } from './mocks/fixtures';
import StatusBar from './components/StatusBar';
import FeederMap from './components/FeederMap';
import NodePanel from './components/NodePanel';
import ScenarioPanel from './components/ScenarioPanel';
import CascadeOverlay from './components/CascadeOverlay';
import EventTimeline from './components/EventTimeline';
import CrewAlertMock from './components/CrewAlertMock';
import ThresholdTuner from './components/ThresholdTuner';
import AuditLog from './components/AuditLog';
import { useState } from 'react';

export default function App() {
  const feederId = useFeeder((s) => s.feederId);
  const ingest = useFeeder((s) => s.ingest);
  const setGeo = useFeeder((s) => s.setGeo);
  const setConn = useFeeder((s) => s.setConn);
  const [showExtras, setShowExtras] = useState(false);

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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <StatusBar />
      <main className="mx-auto grid max-w-6xl gap-3 p-3 md:grid-cols-3">
        <section className="flex flex-col gap-3 md:col-span-2">
          <FeederMap />
          <CascadeOverlay />
          <EventTimeline />
        </section>
        <aside className="flex flex-col gap-3">
          <ScenarioPanel />
          <NodePanel />
          <ThresholdTuner />
          <button
            onClick={() => setShowExtras(!showExtras)}
            className="rounded border bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 shadow-sm"
          >
            {showExtras ? 'Hide crew + audit' : 'Show crew + audit'}
          </button>
          {showExtras && <CrewAlertMock />}
          {showExtras && <AuditLog />}
        </aside>
      </main>
    </div>
  );
}
