# Shared benchmarks

Cross-pillar benchmarks that run the same atlas template under two simulators,
the biological Brian2 model here and the thermodynamic-core energy-landscape
reference, so the Interface and Substrate pillars can be compared on identical
connectivity. Defined in
`thermodynamic-core/docs/integration/with-brain-emulation.md` section 4.

## Allen Motor Cortex

- **Biological side (this repo):** `allen_m1_brian2.py`. A current-based LIF
  network built from `data/brain_region_maps/allen_motor_cortex.json`
  (438 neurons, 3 layers, 350 excitatory / 88 inhibitory), neuron ordering
  matched to the TC translator.
- **Substrate side:** `thermodynamic-core/sims/brain_translator/benchmark.py`.
  The same template translated to an Ising energy landscape and Gibbs-sampled.

### Running

Brian2 here installs into a Python 3.10+ interpreter (it is not in the 3.8
environment the legacy `server.py` uses):

```
python benchmarks/allen_m1_brian2.py
```

Knobs: `--el-mv` (intrinsic drive, above threshold), `--w-scale` (synaptic
weight scale), `--g` (inhibition gain), `--ext-rate-hz` / `--ext-w-mv`
(Poisson seed). The default regime (`El=-49 mV, w_scale=0.5, g=1.0`) is balanced
and asynchronous.

### Cross-simulator result (2026-05-30)

| Metric | Brian2 LIF (biological) | TC energy landscape |
|---|---|---|
| excitatory mean rate | ~11.5 Hz | ~12.0 Hz |
| inhibitory mean rate | ~25.4 Hz | ~21.4 Hz |
| excitatory/inhibitory ordering | exc < inh | exc < inh |
| per-layer excitatory | L5B ~= L6 > L2/3 | L6 > L2/3 > L5B |

Rates are stochastic and shift a little run to run; the comparison is about
ordering and scale, not exact Hz.

**Agreement.** Both simulators put the network in a balanced regime with the
same excitatory/inhibitory ordering (sparse excitatory below faster
inhibitory) and a similar population rate scale.

**Disagreement.** The per-layer structure differs, most clearly for L5B: the
Brian2 spiking model fires L5B highest (it has the strongest recurrent
excitatory weights), while the equilibrium Ising model places L5B lowest, since
L5B also carries the heaviest inhibitory projection and the symmetric
equilibrium settles into a different fixed point. This matches the limitation
the TC benchmark reports directly: the equilibrium model captures global
excitatory/inhibitory balance but under-represents the dynamic, laminar role of
inhibition. Closing that gap (asymmetric or non-equilibrium TC dynamics) is the
next step on the Substrate side.

This is the first end-to-end cross-simulator comparison between the Interface
and Substrate pillars on a real atlas template. It is a falsifiable result: it
states where the substrate translation matches biology and where it does not.
