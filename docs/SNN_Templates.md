# SNN Templates: Neuron Types, Cluster Logic, and Region Presets

This document specifies how to implement selectable neuron/cluster types and brain-region presets in the SNN visualizer. It is practical and implementation-oriented so we can wire it directly into the app.

## Goals

- Expose biologically-inspired neuron types and cluster archetypes in the UI.
- Allow users to compose “region presets” (collections of clusters with chosen neuron mixes and connectivity) that resemble brain areas (e.g., Frontal Cortex, Amygdala, Thalamus).
- Keep a simple, fast simulation (event-driven integrate-and-fire), but parameterize it so presets feel distinct and educationally accurate.

## Data Model

We add two new concepts on top of the existing `config` + `createNetwork()` pipeline.

1) NeuronType
   - id: string (e.g., "E_pyramidal", "I_fast_spiking", "TC_relay")
   - label: string
   - excitatory: boolean (E=true, I=false)
   - threshold: number (default firing threshold override; null = use global)
   - leak: number (0–1 per step; higher = slower decay)
   - refracMs: number
   - bgImpulse: number (magnitude of random background drive)
   - spikeGain: number (post-synaptic effect scaler for outgoing synapses)

2) ClusterType
   - id: string
   - label: string
   - size: number (neurons/cluster)
   - mix: array of { typeId: string, fraction: number } (sums ~1)
   - intra: { prob: number, weight: {E: [min,max], I: [min,max]} }
   - inter: { prob: number, weight: {E: [min,max], I: [min,max]} }
   - layoutHint: { radius: number, jitter: number } (optional)

3) RegionPreset
   - id: string
   - label: string
   - clusters: array of { typeId: string, count: number }
   - global: overrides for global controls (e.g., pulseDecay, threshold) if desired

These JSON-like structures can live in `js/templates/registry.js` (exporting maps/dicts), or a `templates.json` loaded at startup.

## Implementation Plan

1) Registry
   - Create `js/templates/registry.js` exporting:
     - `NeuronTypes` map by id
     - `ClusterTypes` map by id
     - `RegionPresets` map by id
   - Provide a helper `resolvePreset(id)` that returns a normalized plan with fully expanded cluster list and neuron distributions.

2) UI Changes
   - Add a dropdown “Preset” listing regions (None, Frontal Cortex, Amygdala, Thalamus, etc.).
   - Add a dropdown “Cluster Archetype” to apply per-cluster (when not using a preset) — optional but useful.
   - Keep existing sliders; when a preset is selected, sync derived values (clusters × size), intra/inter parameters, and neuron mixes; gray out conflicting controls if “locked by preset”.

3) Network Construction
   - In `createNetwork()`
     - If a `presetId` is selected, use `resolvePreset(presetId)` to build a list of clusters. Each cluster gets a `ClusterType` and a neuron mix.
     - For each cluster, generate neurons by sampling from the mix. Attach `neuron.typeId` and copy overrides (threshold, leak, refrac, bgImpulse, spikeGain) into the per-neuron struct.
     - Connectivity:
       - Intra connections: sample with `cluster.intra.prob`; weight ranges depend on presynaptic type (E vs I) and the `weight` range.
       - Inter connections: sample with `cluster.inter.prob` and corresponding weight ranges. You can still multiply by the UI inter-Prob/Weight sliders as global modifiers.
   - During the update step:
     - Use per-neuron `leak`, `refractory`, and `bgImpulse` instead of global when present.
     - When a neuron fires, add `spikeGain * weight` to the target’s `inputAccum`.

4) Rendering
   - Coloring stays by per-neuron cluster (palette) but we can subtly tint neuron types:
     - Optional: small hue shift or different border brightness for inhibitory vs excitatory to improve pedagogy.

5) Persistence (optional)
   - Save/Load selections to `localStorage` (preset id, inter sliders, E/I balance, fog, etc.).

## Example Neuron Types

```json
{
  "E_pyramidal": {
    "label": "Excitatory: Pyramidal",
    "excitatory": true,
    "threshold": 1.0,
    "leak": 0.985,
    "refracMs": 80,
    "bgImpulse": 0.06,
    "spikeGain": 1.0
  },
  "I_fast_spiking": {
    "label": "Inhibitory: Fast-Spiking",
    "excitatory": false,
    "threshold": 0.9,
    "leak": 0.98,
    "refracMs": 60,
    "bgImpulse": 0.04,
    "spikeGain": 1.0
  },
  "TC_relay": {
    "label": "Thalamocortical Relay",
    "excitatory": true,
    "threshold": 1.1,
    "leak": 0.988,
    "refracMs": 90,
    "bgImpulse": 0.05,
    "spikeGain": 1.2
  }
}
```

## Example Cluster Archetypes

```json
{
  "Cortex_L2_3": {
    "label": "Cortex L2/3 Microcolumn",
    "size": 40,
    "mix": [ { "typeId": "E_pyramidal", "fraction": 0.8 }, { "typeId": "I_fast_spiking", "fraction": 0.2 } ],
    "intra": { "prob": 0.35, "weight": { "E": [0.5, 1.0], "I": [0.3, 0.7] } },
    "inter": { "prob": 0.08, "weight": { "E": [0.1, 0.4], "I": [0.1, 0.3] } },
    "layoutHint": { "radius": 240, "jitter": 0.5 }
  },
  "Amygdala_CeA": {
    "label": "Amygdala (Central Nucleus)",
    "size": 30,
    "mix": [ { "typeId": "I_fast_spiking", "fraction": 0.6 }, { "typeId": "E_pyramidal", "fraction": 0.4 } ],
    "intra": { "prob": 0.30, "weight": { "E": [0.45, 0.9], "I": [0.35, 0.75] } },
    "inter": { "prob": 0.05, "weight": { "E": [0.05, 0.25], "I": [0.05, 0.25] } }
  },
  "Thalamus_Relay": {
    "label": "Thalamus Relay",
    "size": 35,
    "mix": [ { "typeId": "TC_relay", "fraction": 0.85 }, { "typeId": "I_fast_spiking", "fraction": 0.15 } ],
    "intra": { "prob": 0.28, "weight": { "E": [0.45, 0.95], "I": [0.25, 0.55] } },
    "inter": { "prob": 0.10, "weight": { "E": [0.1, 0.35], "I": [0.1, 0.3] } }
  }
}
```

## Example Region Presets

```json
{
  "Frontal_Cortex": {
    "label": "Frontal Cortex",
    "clusters": [ { "typeId": "Cortex_L2_3", "count": 4 } ],
    "global": { "pulseDecay": 0.95 }
  },
  "Amygdala": {
    "label": "Amygdala",
    "clusters": [ { "typeId": "Amygdala_CeA", "count": 4 } ]
  },
  "Thalamocortical_Loop": {
    "label": "Thalamocortical Loop",
    "clusters": [
      { "typeId": "Thalamus_Relay", "count": 2 },
      { "typeId": "Cortex_L2_3", "count": 2 }
    ]
  }
}
```

## UI Wiring Sketch

- Add dropdowns:
  - `Preset` → sets `config.presetId` and triggers `createNetwork()`.
  - `Cluster Archetype` (optional per-cluster edit mode) → when selected, applies to the currently edited cluster.
- Display computed totals (clusters × size) and lock UI sliders that presets override (visually gray them).

## Validation & Performance

- Keep per-frame complexity similar by avoiding extremely dense inter-cluster links.
- Clamp min/max cluster sizes and probabilities to keep frame rate smooth.
- Provide a “Reset to Default” button to return to basic behavior.

## Roadmap (short)

1. Implement registry and preset selection (read-only first).
2. Add per-neuron overrides in the simulator update (leak/refrac/bgImpulse/threshold/spikeGain).
3. Add UI integration and persistence.
4. Add 3–4 curated presets (Frontal, Amygdala, Thalamus, Thalamocortical loop) with clear copy.
5. Iterate on visual cues for neuron types (subtle tint or border).

