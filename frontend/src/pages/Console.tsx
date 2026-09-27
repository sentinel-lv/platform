import { useEffect, useState } from 'react';
import CommandBar from '../components/CommandBar';
import KpiStrip from '../components/KpiStrip';
import FeederMap from '../components/FeederMap';
import NodePanel from '../components/NodePanel';
import ScenarioPanel from '../components/ScenarioPanel';
import CascadeOverlay from '../components/CascadeOverlay';
import EventTimeline from '../components/EventTimeline';
import CrewAlertMock from '../components/CrewAlertMock';
import ThresholdTuner from '../components/ThresholdTuner';
import AuditLog from '../components/AuditLog';
import { Btn } from '../components/ui';

type Drawer = 'crew' | 'tuning' | 'audit' | null;

const DRAWER_LABEL: Record<Exclude<Drawer, null>, string> = {
  crew: 'Crew alert mock',
  tuning: 'Threshold tuning',
  audit: 'Audit log',
};

export default function Console() {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const toggle = (d: Exclude<Drawer, null>) => setDrawer((cur) => (cur === d ? null : d));

  // Escape closes the sheet — it covers the stage, so there must be a way out
  // that does not require finding a button.
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <CommandBar />
      <KpiStrip />

      {/* lg: the map is the star and the rail sits beside it.
          below lg: everything stacks and the page scrolls normally. */}
      <main className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-2.5 lg:grid lg:grid-cols-[minmax(0,1fr)_368px] lg:overflow-hidden">
        {/* shrink-0 on mobile: this column's children have fixed heights, so
            letting the column itself shrink made them overflow its box and
            collide with the rail below. At lg the column is a real flex child
            of a fixed-height grid row and shrinks normally. */}
        <div className="flex min-h-0 shrink-0 flex-col gap-2.5 lg:shrink">
          {/* Mobile gets an explicit viewport-relative height. `flex-1` + `h-full`
              only resolves inside a fixed-height flex parent; in the mobile
              stack (which scrolls) the map collapsed and the rail below it
              painted over the canvas. */}
          <div className="relative h-[54vh] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1">
            <FeederMap />
            <CascadeOverlay />
          </div>
          <EventTimeline />
        </div>

        {/* `relative` is load-bearing: MapLibre's canvas is absolutely
            positioned, so it paints above any statically-positioned sibling
            that follows it. In the mobile stack that put the whole rail
            underneath the map. */}
        <aside className="cc-scroll relative z-[1] flex min-h-0 flex-col gap-2.5 lg:overflow-y-auto">
          <ScenarioPanel />
          <NodePanel />

          <nav className="grid shrink-0 grid-cols-3 gap-1.5" aria-label="Secondary views">
            <Btn variant={drawer === 'crew' ? 'primary' : 'ghost'} onClick={() => toggle('crew')}>Crew alert</Btn>
            <Btn variant={drawer === 'tuning' ? 'primary' : 'ghost'} onClick={() => toggle('tuning')}>Tuning</Btn>
            <Btn variant={drawer === 'audit' ? 'primary' : 'ghost'} onClick={() => toggle('audit')}>Audit</Btn>
          </nav>
        </aside>
      </main>

      {/* An overlay sheet, not a flex sibling. As a sibling it stole its height
          from the stage and squeezed the map down to a sliver — the one panel
          you never want to lose mid-demo. */}
      {drawer && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setDrawer(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={DRAWER_LABEL[drawer]}
            className="cc-scroll cc-rise fixed inset-x-0 bottom-0 z-50 max-h-[72vh] overflow-y-auto border-t border-line bg-surface-1 p-3 shadow-lift"
          >
            <div className="mx-auto w-full max-w-3xl">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-2xs font-bold uppercase tracking-[.14em] text-ink-3">
                  {DRAWER_LABEL[drawer]}
                </h2>
                <button
                  onClick={() => setDrawer(null)}
                  className="rounded px-2 py-1 text-2xs font-semibold text-ink-3 transition hover:bg-surface-3 hover:text-ink-2"
                >
                  Close <span aria-hidden="true" className="text-ink-3">esc</span>
                </button>
              </div>
              {drawer === 'crew' && <CrewAlertMock />}
              {drawer === 'tuning' && <ThresholdTuner />}
              {drawer === 'audit' && <AuditLog />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
