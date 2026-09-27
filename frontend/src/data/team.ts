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
  lead:      { label: 'Team lead',  accent: 'var(--cc-accent)',   remit: 'Integration, the contract, and the demo script' },
  hardware:  { label: 'Hardware',   accent: 'var(--cc-warning)',  remit: 'Probe, analog front end, power, enclosure' },
  firmware:  { label: 'Firmware',   accent: 'var(--cc-good)',     remit: 'Sampling, the detector state machine, LoRa mesh' },
  gateway:   { label: 'Gateway',    accent: 'var(--cc-critical)', remit: 'The only safety-critical path: decide, then actuate' },
  simulator: { label: 'Simulator',  accent: 'var(--cc-accent)',   remit: 'The virtual feeder that unblocked everyone else' },
  backend:   { label: 'Backend',    accent: 'var(--cc-good)',     remit: 'Ingest, the arbiter, WebSocket fan-out' },
  frontend:  { label: 'Frontend',   accent: 'var(--cc-warning)',  remit: 'Everything a judge actually sees' },
};

export const TEAM: Person[] = [
  {
    name: 'Pranav Shukla',
    track: 'lead',
    owns: 'Holds the frozen contract, wires the tracks together, runs the demo.',
    href: 'https://pranavmshukla.in',
    handle: 'pranavmshukla.in',
  },
  {
    name: 'Abhishek',
    track: 'backend',
    owns: 'Owns decide() — the one function the gateway and the firmware both re-implement.',
  },
  {
    name: 'Arnav Sharma',
    track: 'firmware',
    owns: 'Turns a field collapse into a SUSPECT assertion, and gets it on the radio in time.',
  },
  {
    name: 'Danish',
    track: 'gateway',
    owns: 'The trip path. Seven fail-safe rules, and a relay that has to be right.',
    href: 'https://github.com/danish9661',
    handle: '@danish9661',
  },
];

/** Mentor, credited separately — not a track owner. */
export const MENTOR = {
  name: 'Dr. Abha Trivedi',
  where: 'SCAI, VIT Bhopal University',
};
