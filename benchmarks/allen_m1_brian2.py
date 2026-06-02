"""Allen Motor Cortex shared benchmark, Brian2 (biological) side.

This is the brain-emulation half of the shared benchmark defined in
`thermodynamic-core/docs/integration/with-brain-emulation.md` section 4. It
builds a current-based LIF network from the same Allen M1 atlas template used
by the thermodynamic-core energy-landscape reference
(`thermodynamic-core/sims/brain_translator/`) and reports per-layer and
excitatory/inhibitory firing statistics, so the two simulators can be compared
on identical connectivity.

Neuron ordering (cluster order, then neuron group within a cluster) matches the
TC translator, so layer indices line up between the two reports.

Run (Brian2 is a Python 3.10+ package here):
    python benchmarks/allen_m1_brian2.py

The comparison is qualitative: rate ordering (sparse excitatory < faster
inhibitory) and per-layer ordering, not absolute Hz. A conductance/current LIF
neuron and an equilibrium Ising unit are different models.
"""
import argparse
import json
import os

import numpy as np

import brian2 as b2
from brian2 import mV, ms, Hz

HERE = os.path.dirname(__file__)
TEMPLATE = os.path.join(HERE, os.pardir, "data", "brain_region_maps",
                        "allen_motor_cortex.json")


def _polarity(template):
    pol = {}
    rules = []
    for c in template["clusters"]:
        rules += c.get("internalConnectivity", [])
    for conn in template.get("connections", []):
        rules += conn.get("connectivity", [])
    for r in rules:
        pol[r["from"]] = +1 if r["type"] == "excitatory" else -1
    return pol


def build_index(template):
    """Enumerate neurons in the same order as the TC translator.

    Returns (n, is_exc bool array, layer int array, layer_names,
             group_span dict (cluster_id, preset) -> (start, end)).
    """
    pol = _polarity(template)
    is_exc, layer, names, span = [], [], [], {}
    idx = 0
    for li, c in enumerate(template["clusters"]):
        names.append(c["id"])
        for grp in c["neuronGroups"]:
            preset, count = grp["preset"], int(grp["count"])
            p = pol.get(preset, +1 if preset == "pyramidal" else -1)
            span[(c["id"], preset)] = (idx, idx + count)
            is_exc += [p > 0] * count
            layer += [li] * count
            idx += count
    return idx, np.array(is_exc, bool), np.array(layer, int), names, span


def run(duration_ms=1000.0, w_scale=0.5, g=1.0, el_mv=-49.0, ext_rate_hz=3.0,
        ext_w_mv=1.0, seed=0):
    b2.start_scope()
    b2.seed(seed)
    b2.defaultclock.dt = 0.1 * ms
    # numpy codegen target works without a C++ compiler
    b2.prefs.codegen.target = "numpy"

    template = json.load(open(TEMPLATE, encoding="utf-8"))
    n, is_exc, layer, names, span = build_index(template)

    tau, taue, taui = 20 * ms, 5 * ms, 10 * ms
    Vt, Vr, El = -50 * mV, -60 * mV, el_mv * mV
    eqs = """
    dv/dt  = (El - v + ge + gi) / tau : volt (unless refractory)
    dge/dt = -ge / taue : volt
    dgi/dt = -gi / taui : volt
    """
    G = b2.NeuronGroup(n, eqs, threshold="v > Vt", reset="v = Vr",
                       refractory=2 * ms, method="exact")
    G.v = (Vr + (Vt - Vr) * np.random.rand(n))

    # external Poisson drive standing in for the TC bias term
    P = b2.PoissonInput(G, "ge", N=1, rate=ext_rate_hz * Hz, weight=ext_w_mv * mV)

    synapses = []
    rules = []
    for c in template["clusters"]:
        cid = c["id"]
        for r in c.get("internalConnectivity", []):
            rules.append((cid, cid, r))
    for conn in template.get("connections", []):
        for r in conn.get("connectivity", []):
            rules.append((conn["fromCluster"], conn["toCluster"], r))

    for fc, tc, r in rules:
        if (fc, r["from"]) not in span or (tc, r["to"]) not in span:
            continue
        a0, a1 = span[(fc, r["from"])]
        b0, b1 = span[(tc, r["to"])]
        w = float(r["weight"]) * w_scale
        if r["type"] == "excitatory":
            S = b2.Synapses(G, G, on_pre="ge += {} * mV".format(w))
        else:
            S = b2.Synapses(G, G, on_pre="gi += {} * mV".format(-g * w))
        cond = "(i>={a0}) and (i<{a1}) and (j>={b0}) and (j<{b1}) and (i!=j)".format(
            a0=a0, a1=a1, b0=b0, b1=b1)
        S.connect(condition=cond, p=float(r["probability"]))
        synapses.append(S)

    mon = b2.SpikeMonitor(G)
    # build the network explicitly: magic run() does not collect Synapses that
    # are held only inside a list, so we pass every object in by hand.
    net = b2.Network(G, P, mon, *synapses)
    net.run(duration_ms * ms)

    counts = np.array(mon.count, dtype=float)
    rates = counts / (duration_ms / 1000.0)   # Hz per neuron
    return {
        "n": n, "is_exc": is_exc, "layer": layer, "names": names,
        "rates": rates,
        "params": dict(duration_ms=duration_ms, w_scale=w_scale, g=g,
                       el_mv=el_mv, ext_rate_hz=ext_rate_hz, ext_w_mv=ext_w_mv,
                       seed=seed),
    }


def report(res):
    exc, inh = res["is_exc"], ~res["is_exc"]
    rates, layer, names = res["rates"], res["layer"], res["names"]
    p = res["params"]
    print("Allen Motor Cortex -> Brian2 LIF (biological side)")
    print("=" * 62)
    print("neurons: {}  (excitatory {} / inhibitory {})".format(
        res["n"], int(exc.sum()), int(inh.sum())))
    print("LIF CUBA, El={el_mv} mV, w_scale={w_scale}, inh_gain={g}, "
          "Poisson {ext_rate_hz} Hz x {ext_w_mv} mV, {duration_ms:.0f} ms".format(**p))
    print("-" * 62)
    print("mean firing rate, excitatory: {:6.2f} Hz".format(rates[exc].mean()))
    print("mean firing rate, inhibitory: {:6.2f} Hz".format(rates[inh].mean()))
    print()
    print("per-layer mean excitatory rate (Hz):")
    for li, name in enumerate(names):
        sel = exc & (layer == li)
        if sel.any():
            print("  {:<8s} {:6.2f}  (n={})".format(name, rates[sel].mean(),
                                                    int(sel.sum())))
    print("=" * 62)
    print("Compare against the TC reference:")
    print("  python -m sims.brain_translator.benchmark  (in thermodynamic-core)")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--duration-ms", type=float, default=1000.0)
    ap.add_argument("--w-scale", type=float, default=0.5)
    ap.add_argument("--g", type=float, default=1.0)
    ap.add_argument("--el-mv", type=float, default=-49.0)
    ap.add_argument("--ext-rate-hz", type=float, default=3.0)
    ap.add_argument("--ext-w-mv", type=float, default=1.0)
    ap.add_argument("--seed", type=int, default=0)
    a = ap.parse_args()
    report(run(duration_ms=a.duration_ms, w_scale=a.w_scale, g=a.g,
               el_mv=a.el_mv, ext_rate_hz=a.ext_rate_hz, ext_w_mv=a.ext_w_mv,
               seed=a.seed))


if __name__ == "__main__":
    main()
