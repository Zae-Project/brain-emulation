# SNN_BioTerms.md

**Purpose.** Canonical, JS-friendly meanings for every field in our SNN presets so the AI code assistant can implement them unambiguously.

## Glossary (plain English → code meaning)

- **AMPA**: Fast glutamatergic synapse; conductance decays quickly $(\tau_{\text{AMPA}}\approx 2–10\,\text{ms})$; excitatory reversal $V_E\approx 0\,\text{mV}$. Use for rapid E→\* targets. &#x20;
- **NMDA**: Slow glutamatergic synapse with voltage dependence (Mg$^{2+}$ block); long decay $(\sim 100\,\text{ms})$; critical for LTP-like effects. Model with a slow gating variable and voltage factor. &#x20;
- **GABA_A**: Fast inhibitory synapse; decay $\sim 5–10\,\text{ms}$; inhibitory reversal $V_I\approx -70\,\text{mV}$. Use for soma/AIS control. &#x20;
- **LIF (Leaky Integrate-and-Fire)**: Membrane integrates input, leaks toward rest, spikes at threshold, then resets:

  $$
  C_m\frac{dV}{dt}= -g_m(V-V_L)+I_{\text{syn}};\quad V\ge V_{\text{th}}\Rightarrow \text{spike},\,V\leftarrow V_{\text{reset}}
  $$

  Keep $\tau_m=C_m/g_m$, $\tau_{\text{ref}}$ explicit.&#x20;

- **AdEx / Izhikevich**: Lightweight spiking models with adaptation/bursting controls; pick when richer patterns are needed at low cost.&#x20;
- **E / I role**: Excitatory (glutamatergic) vs. inhibitory (GABAergic) population tag used for wiring rules and synapse defaults.&#x20;
- **fan.in / fan.out**: Expected number of _incoming_/_outgoing_ synapses per neuron (used to sample connectivity).
- **edges**: Directed connections between **clusters** (source→target) with probabilities, delays, and synapse types.
- **“I->E”, “E->I”, etc.**: Shorthand for connection class (e.g., inhibitory-to-excitatory). Values are probabilities or average degrees.
- **targeting**: Preferred postsynaptic site: `"somatic"` (soma), `"AIS"` (axon initial segment), `"distal"` (apical/distal dendrite).
- **delays_ms**: Axonal + synaptic delay ranges used to sample per-connection delays.
- **STDP**: Pair-based plasticity; weight change depends on pre/post spike timing $\Delta t=t_{\text{post}}-t_{\text{pre}}$:

  $$
  \Delta w =
  \begin{cases}
  A_+ e^{-\Delta t/\tau_+}, & \Delta t>0\\
  -A_- e^{\Delta t/\tau_-}, & \Delta t\le 0
  \end{cases}
  $$

  Set $A_\pm,\tau_\pm$; use nearest-pair or all-to-all per layer. &#x20;

## TypeScript schema (single source of truth)

```ts
export type Role = "E" | "I" | "Mod";
export type Model = "LIF" | "AdEx" | "Izh";
export type Targeting = "somatic" | "AIS" | "distal" | "mixed";

export interface SynSpec {
  tau: number;
  w: number;
  extra?: Record<string, number>;
}
export interface Synapses {
  AMPA?: SynSpec;
  NMDA?: SynSpec;
  GABA_A?: SynSpec;
}

export interface VmSpec {
  EL: number;
  Vth: number;
  Vreset: number;
  Cm: number;
  gL: number;
  tau_ref: number;
  DeltaT?: number;
  a?: number;
  b?: number;
  tau_w?: number;
}

export interface NeuronPreset {
  name: string;
  role: Role;
  model: Model;
  Vm: VmSpec;
  syn: Synapses;
  targeting: Targeting;
  fan: { in_mean: number; out_mean: number };
  delays_ms: { local: [number, number]; long?: [number, number] };
  plasticity?: {
    rule: "STDP" | "None";
    A_plus?: number;
    A_minus?: number;
    tau_plus?: number;
    tau_minus?: number;
  };
}

export interface Cluster {
  name: string;
  N: number;
  types: [presetName: string, fraction: number][];
  recurrent_EE?: number;
  recurrent_II?: number;
}

export interface Edge {
  from: string;
  to: string;
  p: number;
  syn: keyof Synapses;
  delay_ms?: [number, number];
}

export interface Template {
  template: string;
  clusters: Cluster[];
  edges: Edge[];
  p_connect?: {
    "E->E": number;
    "E->I": number;
    "I->E": number;
    "I->I": number;
  };
}
```

## Minimal example (Basket cell, fast inhibition)

```json
{
  "name": "Basket_FS",
  "role": "I",
  "model": "LIF",
  "Vm": {
    "EL": -70,
    "Vth": -50,
    "Vreset": -58,
    "Cm": 100,
    "gL": 20,
    "tau_ref": 1
  },
  "syn": { "GABA_A": { "tau": 6, "w": 1.5 } },
  "targeting": "somatic",
  "fan": { "in_mean": 400, "out_mean": 800 },
  "delays_ms": { "local": [1, 3] }
}
```

**Refs.** Rolls, _Brain Computations and Connectivity_ (AMPA/NMDA/GABA, LIF currents, time constants) \[1]. Abdallah & Dang, _Neuromorphic Computing_ (LIF/Izh overview, STDP variants) \[2]. Thakor (ed.), _Handbook of Neuroengineering_ (pair-based STDP math) \[3].&#x20;
