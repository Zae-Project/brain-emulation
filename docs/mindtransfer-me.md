---
site_url: https://mindtransfer.me
exported_at: 2025-11-04
note: This file mirrors all visible text content from the homepage. Update this single file to edit copy across the site.
---

# mindtransfer.me — Brain Emulation Project

An exploration into building faithful, biologically grounded neural simulations in the browser. Every iteration tightens the feedback loop between neuroscience research and interactive tooling, with the ambitious long‑term objective of understanding, and eventually preserving the computations that support human consciousness.

- **CTA:** First demo of the interface
- **Contact:** Email (protected via Cloudflare)

---

## Current Interface

### Visualiser

- Realtime 3D canvas renders a spiking network (orbit camera with mouse drag, zoom, WASD/QE).
- Default network: 4 clusters × 30 neurons (120 neurons total) with excitatory/inhibitory mix.
- Signals propagate along probabilistic synapses; colours reveal cluster boundaries and spike trails.

---

### Control Console (left sidebar)

- Play/Pause master toggle and simulation speed slider.
- Sliders for:
  - Network size, cluster count, and neurons per cluster.
  - Intra-cluster connection probability and inter-cluster probability/weight scaling.
  - Excitatory fraction (E/I balance), background firing rate, leak decay, spike threshold, depth fog.
- Utility buttons: reset network, show weight magnitudes, pause spikes only, inject a spike.

---

### Preset Loader (top centre)

- Dropdown selects pre‑configured brain‑region templates (`None`, `Frontal Cortex`, `Hippocampus`, `Amygdala`, `Thalamocortical Loop`).
- Selecting a preset rebuilds the network using the region schema (cluster composition, connectivity, realistic delays).
- Summary text shows active template makeup and estimated excitatory fraction.

---

### Lessons Panel (top left)

- 12‑lesson curriculum, from membrane potential basics to ethical considerations of whole‑brain emulation.
- Inline preview explains the concept; “View Full Lesson” opens the HTML lesson in a modal overlay.

---

### Navigation Aids (bottom centre)

- Status bar displays camera distance, zoom, and neuron count.
- Hover/click the controller icon to view 3D navigation controls (FPS/Orbit, pan, fly, reset).

---

### Developer Wiring

- `js/templates/schema.js` defines neuron presets and region templates with anatomical annotations (L2/3 PFC microcolumn, hippocampal CA3→CA1 loop, mediodorsal thalamus ↔ PFC relay).
- `js/templates/registry.js` consumes the schema for runtime use while preserving legacy archetypes (e.g. Amygdala CeA).

---

## What You Can Explore

- Watch emergent spiking patterns while tuning connection density and inhibitory ratios.
- Compare different region presets to see how CA3 recurrent loops differ from cortical microcolumns or thalamic relay hubs.
- Step through the lesson series to understand how plasticity, clustering, and large‑scale coordination emerge from simple neuron rules.
- Inspect individual neurons for voltage traces, cluster membership, and preset data.

---

## Why It Matters

Organic brains degrade. Digital emulation offers a path, uncertain but compelling, to preserve identity beyond biological failure. Whether or not mind uploading proves possible, each refinement deepens our grasp of cognitive computation. This project is about honest, incremental progress: one neuron, one lesson, and one scientifically grounded preset at a time.

> “Real neurons. Real learning. Real shot at digital immortality.”

---

## Calls to Action & Media Placeholders

- **Primary CTA:** First demo of the interface
- **Contact:** Email (Cloudflare‑protected)
- **Media:**
  - Hero image/video placeholder
  - Demo video placeholder

---

## Notes for Future Edits (non‑public)

- If you add standalone lesson pages later, append new sections here with the lesson title and summary so we keep one‑file control of copy.
- Replace the placeholders above with actual asset links or shortcodes used by your site generator if applicable.
