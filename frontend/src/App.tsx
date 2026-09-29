import { Suspense, lazy, useEffect, useState } from 'react';
import { api } from './api/client';
import { connectStream } from './api/socket';
import { useFeeder } from './store/feederStore';
import { useRoute } from './router';
import BootScreen from './components/BootScreen';
import SiteNav from './components/SiteNav';
import Landing from './pages/Landing';
import Evidence from './pages/Evidence';
import Team from './pages/Team';

/**
 * The console is the only page that needs MapLibre and Recharts — together
 * about 1.3 MB before gzip. Loading it lazily keeps the landing page, which is
 * what "public URL loads in under 3 s on mobile data" is measured against,
 * down to the app shell. SiteNav warms this chunk on hover/focus of the
 * console links, so the navigation itself still feels instant.
 */
const Console = lazy(() => import('./pages/Console'));
const NodeGrid = lazy(() => import('./pages/NodeGrid'));

/**
 * The feeder connection is opened here, above the router, on purpose.
 *
 * Free-tier backends cold-start. The frontend brief's fix is to wake the
 * backend on page load so it is warm before a judge presses a button — and a
 * judge always lands on the overview first. By the time they reach the
 * console, the socket is up and the ring buffer has history in it.
 */
/** Render's free tier sleeps; a cold start is routinely 30-50 s. */
const WAKE_BUDGET_MS = 120_000;

function useFeederConnection() {
  const feederId = useFeeder((s) => s.feederId);
  const ingest = useFeeder((s) => s.ingest);
  const setGeo = useFeeder((s) => s.setGeo);
  const setConn = useFeeder((s) => s.setConn);
  const setBackend = useFeeder((s) => s.setBackend);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let dead = false;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    /**
     * Poll until the backend answers.
     *
     * The old code made ONE request and, on any failure, populated the page
     * with MOCK_NODES — twelve fabricated nodes pinned to a single
     * coordinate with telemetry that never moves. On a cold start that is the
     * worst possible outcome: the dashboard looks alive while showing numbers
     * that are not real. Better to say plainly that the service is waking.
     */
    const bootstrap = async (): Promise<void> => {
      if (dead) return;
      try {
        const g = await api.feeder(feederId);
        if (dead) return;
        setGeo(g.nodes, g.substation, g.mode ?? 'ALERT_ONLY');
        setBackend('live');

        for (const p of g.nodes) {
          api.history(p.node_id, feederId, 60)
            .then((rows) => { if (!dead && rows.length) useFeeder.getState().backfill(p.node_id, rows); })
            .catch(() => {});
        }
        api.events(feederId, 20).then((evs) => {
          // history arrives newest-first; feed oldest-first, but a past recovery
          // line must not resurrect a banner for a healed field.
          const ordered = [...evs].reverse();
          const lastRecovery = ordered.map((e) => e.reason === 'no_fault').lastIndexOf(true);
          const relevant = lastRecovery >= 0 ? ordered.slice(lastRecovery + 1) : ordered;
          if (!dead) for (const e of relevant) ingest('event', e as never);
        }).catch(() => {});
        return;
      } catch {
        if (dead) return;
        if (Date.now() - startedAt > WAKE_BUDGET_MS) {
          setBackend('unreachable');
          return;
        }
        // Gentle backoff: a sleeping instance is spinning up, not failing.
        timer = setTimeout(bootstrap, 2500);
      }
    };

    setBackend('waking');
    void bootstrap();

    const off = connectStream(feederId, ingest, (c) => setConn(c === 'live' ? 'live' : 'reconnecting'));
    return () => { dead = true; clearTimeout(timer); off(); };
  }, [feederId, ingest, setGeo, setConn, setBackend, attempt]);

  return () => setAttempt((n) => n + 1);
}

export default function App() {
  const route = useRoute();
  const retryBackend = useFeederConnection();

  if (route === '/console' || route === '/nodes') {
    return (
      <Suspense fallback={<BootScreen onRetry={retryBackend} />}>
        {route === '/nodes' ? <NodeGrid /> : <Console />}
      </Suspense>
    );
  }

  return (
    <div className="min-h-full bg-bg text-ink">
      <SiteNav route={route} />
      {route === '/evidence' ? <Evidence /> : route === '/team' ? <Team /> : <Landing />}
      <footer className="border-t border-line px-5 py-6 text-center text-2xs text-ink-3">
        Closed-Circuit · Team 173301 · VIT Bhopal ·
        {' '}Smart India Hackathon 2026 · SIH26223 · Student Innovation — Disaster Management
      </footer>
    </div>
  );
}
