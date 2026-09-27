/**
 * The people. Edit this file and the page follows — nothing else to touch.
 *
 * `track` keys into TRACK below, which decides the accent colour and the
 * one-line remit. Use `href` for wherever someone wants to be sent: a
 * portfolio, a GitHub profile, a LinkedIn, anything.
 */
export type TrackKey =
  | 'lead' | 'hardware' | 'firmware' | 'gateway' | 'simulator' | 'backend' | 'frontend';

export interface Person {
  name: string;
  track: TrackKey;
  /** what they actually own, in their own right */
  owns: string;
  href?: string;
  handle?: string;
}

export const TRACK: Record<TrackKey, { label: string; accent: string; remit: string }> = {
  lead:      { label: 'Lead · Full stack', accent: 'var(--cc-accent)',   remit: 'Backend and frontend, the frozen contract, integration, the demo' },
  hardware:  { label: 'Hardware',   accent: 'var(--cc-warning)',  remit: 'Probe, analog front end, power, enclosure' },
  firmware:  { label: 'Firmware',   accent: 'var(--cc-cyan)',     remit: 'Sampling, the detector state machine, LoRa mesh' },
  gateway:   { label: 'Gateway',    accent: 'var(--cc-critical)', remit: 'The only safety-critical path: decide, then actuate' },
  simulator: { label: 'Simulator',  accent: 'var(--cc-good)',     remit: 'The virtual feeder that unblocked everyone else' },
  backend:   { label: 'Backend',    accent: 'var(--cc-good)',     remit: 'Ingest, the arbiter, WebSocket fan-out' },
  frontend:  { label: 'Frontend',   accent: 'var(--cc-warning)',  remit: 'Everything a judge actually sees' },
};

export const TEAM: Person[] = [
  {
    name: 'Pranav Shukla',
    track: 'lead',
    owns: 'Owns decide() and the frozen contract — and is the one who has to say no when somebody wants to change it quietly. Integration, the demo, the pitch.',
    href: 'https://pranavmshukla.in',
    handle: 'pranavmshukla.in',
  },
  {
    name: 'Md Danish',
    track: 'hardware',
    owns: 'The critical path. A sub-picofarad signal off a plate in the air, and a PCB that has to be ordered before the design feels finished.',
    href: 'https://github.com/danish9661',
    handle: '@danish9661',
  },
  {
    name: 'Shaik Suhail',
    track: 'simulator',
    owns: 'The substation outage, the monsoon burst and the lightning transient you cannot make happen on a bench — which is how the arbiter got tested against them.',
  },
  {
    name: 'Abhishek',
    track: 'firmware',
    owns: 'Turns a field collapse into a SUSPECT assertion and gets it on the radio in time — on a baseline that must never adapt fast enough to forget a fault.',
  },
  {
    name: 'Arnav Sharma',
    track: 'gateway',
    owns: 'The trip path: seven fail-safe rules, a relay that has to be right, and no auto-reclose, ever.',
  },
  {
    name: 'Shristy',
    track: 'frontend',
    owns: 'The only part of this a judge ever sees. Twelve live traces, a map that reads at a glance, and a latency number that is never faked.',
  },
];

/** Mentor, credited separately — not a track owner. */
export const MENTOR = {
  name: 'Dr. Abha Trivedi',
  where: 'SCAI, VIT Bhopal University',
};
