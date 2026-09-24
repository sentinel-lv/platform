import { useEffect } from 'react';
import { api } from './api/client';
import { connectStream } from './api/socket';
import { useFeeder } from './store/feederStore';
import { MOCK_NODES } from './mocks/fixtures';
import StatusBar from './components/StatusBar';
import FeederMap from './components/FeederMap';
import NodePanel from './components/NodePanel';
import ScenarioPanel from './components/ScenarioPanel';
import NodeInspector from './components/NodeInspector';
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
    <div className="min-h-screen bg-paper font-sans text-ink">
      <div className="cc-grid-bg pointer-events-none fixed inset-0" aria-hidden />
      <div className="relative">
        <StatusBar />
        <main className="mx-auto grid max-w-6xl gap-4 p-3 md:grid-cols-12 md:p-5">
          <section className="flex flex-col gap-4 md:col-span-7">
            <CascadeOverlay />
            <FeederMap />
            <EventTimeline />
          </section>
          <aside className="flex flex-col gap-4 md:col-span-5">
            <ScenarioPanel />
            <NodeInspector />
            <NodePanel />
            <ThresholdTuner />
            <button
              onClick={() => setShowExtras(!showExtras)}
              className="cc-panel-flat px-3 py-2 text-left font-display text-xs font-bold tracking-wide text-ink transition-colors hover:bg-porcelain focus-visible:outline focus-visible:outline-2 focus-visible:outline-insulator"
            >
              {showExtras ? 'Hide crew phone and audit ledger' : 'Show crew phone and audit ledger'}
            </button>
            {showExtras && <CrewAlertMock />}
            {showExtras && <AuditLog />}
          </aside>
        </main>
        <footer className="mx-auto max-w-6xl px-3 pb-6 md:px-5">
          <p className="cc-tick text-[11px] text-ink/60">
            Feeder drawing KSEB-TVM-F12 / Thiruvananthapuram / OSM basemap / 『demo stack: simulator in-process, no broker』
          </p>
        </footer>
      </div>
    </div>
  );
}
