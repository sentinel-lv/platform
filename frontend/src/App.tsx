import { Suspense, lazy, useEffect } from 'react';
import { api } from './api/client';
import { connectStream } from './api/socket';
import { useFeeder } from './store/feederStore';
import { MOCK_NODES } from './mocks/fixtures';
import { useRoute } from './router';
import SiteNav from './components/SiteNav';
import Landing from './pages/Landing';
import Evidence from './pages/Evidence';

/**
 * The console is the only page that needs MapLibre and Recharts — together
 * about 1.3 MB before gzip. Loading it lazily keeps the landing page, which is
 * what "public URL loads in under 3 s on mobile data" is measured against,
 * down to the app shell. SiteNav warms this chunk on hover/focus of the
 * console links, so the navigation itself still feels instant.
 */
const Console = lazy(() => import('./pages/Console'));

/**
 * The feeder connection is opened here, above the router, on purpose.
 *
 * Free-tier backends cold-start. The frontend brief's fix is to wake the
 * backend on page load so it is warm before a judge presses a button — and a
 * judge always lands on the overview first. By the time they reach the
 * console, the socket is up and the ring buffer has history in it.
 */
function useFeederConnection() {
  const feederId = useFeeder((s) => s.feederId);
  const ingest = useFeeder((s) => s.ingest);
  const setGeo = useFeeder((s) => s.setGeo);
  const setConn = useFeeder((s) => s.setConn);

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
}

/** Shown for the moment the console chunk is in flight. */
function ConsoleBooting() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-bg text-ink-3">
      <div className="h-1 w-40 overflow-hidden rounded-full bg-surface-3">
        <div className="cc-sweep relative h-full w-full" />
      </div>
      <p className="text-xs">Connecting to feeder…</p>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  useFeederConnection();

  if (route === '/console') {
    return (
      <Suspense fallback={<ConsoleBooting />}>
        <Console />
      </Suspense>
    );
  }

  return (
    <div className="min-h-full bg-bg text-ink">
      <SiteNav route={route} />
      {route === '/evidence' ? <Evidence /> : <Landing />}
      <footer className="border-t border-line px-5 py-6 text-center text-2xs text-ink-3">
        Closed-Circuit · Team VITBSIH26-388 · VIT Bhopal ·
        {' '}Smart India Hackathon 2026 · Open Innovation · Disaster Management
      </footer>
    </div>
  );
}
