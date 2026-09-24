"""One coroutine per scenario (composable, deterministic). See simulator/README §4.

Each scenario mutates feeder overlays over time then exits. reset() restores NORMAL.
"""
import asyncio

async def break_mid_feeder(feeder, hold_s=30.0):
    feeder.break_from = "N-007"   # span N-006<->N-007 collapses
    await asyncio.sleep(hold_s)

async def break_at_tail(feeder, hold_s=30.0):
    feeder.break_from = "N-011"   # span N-010<->N-011
    await asyncio.sleep(hold_s)

async def rain_burst(feeder, dur_s=8.0):
    # Phase 1: broad -25% dip (visible, below threshold). Phase 2: brief gust to
    # ~-65% so nodes visibly touch SUSPECT (amber) — vetoed (global, not a break)
    # — then recover to green with a FALSE_POSITIVE_REJECTED line (README §4).
    feeder.weather = 0.75
    await asyncio.sleep(max(0.0, dur_s - 1.0))
    feeder.weather = 0.35
    await asyncio.sleep(1.0)
    feeder.weather = 1.0          # recover (nodes -> RECOVERED -> NORMAL)

async def vegetation_contact(feeder, hold_s=30.0, node="N-007"):
    feeder.veg_node = node        # one node -45% fluctuating
    await asyncio.sleep(hold_s)

async def substation_outage(feeder, hold_s=10.0):
    feeder.break_from = "N-001"   # every node ~1-2%
    await asyncio.sleep(hold_s)

async def switching_transient(feeder):
    feeder.weather = 0.3          # 300 ms spike
    await asyncio.sleep(0.3)
    feeder.weather = 1.0

async def node_offline(feeder, hold_s=60.0, node="N-007"):
    feeder.by_id[node].offline = True
    await asyncio.sleep(hold_s)

async def low_battery(feeder, node="N-007", mv=3100):
    feeder.by_id[node].battery_mv = mv

async def reset(feeder):
    feeder.reset()

SCENARIOS = {n: f for n, f in {
    "break_mid_feeder": break_mid_feeder, "break_at_tail": break_at_tail,
    "rain_burst": rain_burst, "vegetation_contact": vegetation_contact,
    "substation_outage": substation_outage, "switching_transient": switching_transient,
    "node_offline": node_offline, "low_battery": low_battery, "reset": reset,
}.items()}
