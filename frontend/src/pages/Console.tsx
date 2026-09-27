import { useState } from 'react';
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

export default function Console() {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const toggle = (d: Exclude<Drawer, null>) => setDrawer((cur) => (cur === d ? null : d));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <CommandBar />
      <KpiStrip />

      {/* lg: the map is the star and the rail sits beside it.
          below lg: everything stacks and the page scrolls normally. */}
      <main className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-2.5 lg:grid lg:grid-cols-[minmax(0,1fr)_368px] lg:overflow-hidden">
        <div className="flex min-h-0 flex-col gap-2.5">
          <div className="relative min-h-[340px] flex-1 lg:min-h-0">
            <FeederMap />
            <CascadeOverlay />
          </div>
          <EventTimeline />
        </div>

        <aside className="cc-scroll flex min-h-0 flex-col gap-2.5 lg:overflow-y-auto">
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
        <div className="max-h-[46vh] shrink-0 overflow-y-auto border-t border-line bg-surface-1 p-2.5 cc-scroll">
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
