---
site_url: https://mindtransfer.me
exported_at: 2025-11-04
note: This file mirrors all visible text content from the homepage. Update this single file to edit copy across the site.
---

# mindtransfer.me | Human cognition, simulated

Mindtransfer.me is a small, research-led project that joins published brain data with an interactive neural network visualiser. We want to show what mind uploading and mind transfer might demand in the real world by documenting assumptions, citing sources, and keeping the work reproducible.

- **Try the demo:** Launch the current interface
- **Contact:** Email (protected with Cloudflare)

---

## What we are building

We are building an open toolkit for exploring whole brain emulation. Every change must be traceable to a dataset or paper, and every feature has to be explainable to someone new to the field. This keeps the roadmap honest and lets others check the work.

---

## Current capabilities

### Interactive brain emulation playground

- Real-time 3D spiking neural network visualiser with orbit controls and smooth zooming.
- Inspector shows cluster context, neuron taxonomy, excitatory/inhibitory balance, and live voltage traces.
- Consistent glyphs and warm desert palette keep clusters and cell types easy to read.

### Scientifically grounded region templates

- Curated human brain maps sourced from the Allen Human Brain Atlas, the EBRAINS Julich-Brain project, and the BrainGlobe atlas ecosystem.
- Layer-specific motor cortex, somatosensory barrel fields, occipital visual streams, and mediodorsal thalamic loops, each with realistic neuron ratios (≈80% excitatory, 20% inhibitory), delays, and projection targets backed by published literature.
- Import/export pipeline for JSON templates so researchers can test their own atlases without rewriting code.

### Guided documentation for every concept

- Twelve documentation chapters replace the old “lessons,” covering everything from the project vision to advanced configuration and troubleshooting.
- Plain-language explanations help newcomers understand what mind uploading demands, while contributors get the detail needed to extend the simulator responsibly.

---

## Scientific foundation

- **Neuron diversity:** Taxonomy aligns with transcriptomic and morphological datasets (pyramidal, basket, chandelier, medium spiny, thalamic relay, and more), each mapped to distinct visual glyphs.
- **Connectivity realism:** Atlas templates respect reported projection probabilities, including dense CA3 recurrence and corticothalamic feedback. Probability sliders apply scaling factors without breaking biological proportions.
- **Data provenance:** Every preset cites its source atlas, release date, and key references directly in the UI. Import scripts encourage researchers to attach DOIs and methodology notes.

---

## In active development

- Automated atlas ingestion script to convert Allen and siibra data into ready to run templates.
- Expanded analytic overlays (frequency spectra, spike synchrony) to measure mind relevant signatures like oscillations and global workspace dynamics.
- Preservation tooling: versioned exports, integrity checks, and reproducible manifests to support long-term mind transfer archives.

---

## Why mindtransfer.me matters

Mind uploading and whole brain emulation demand rigorous models. By shipping a transparent simulator today complete with verifiable data, intuitive controls, and documented assumptions we advance the field toward a future where consciousness can be studied, preserved, and perhaps migrated with scientific confidence.

> “Real neurons. Real research. A clear path toward digital continuity.”

---

## Explore + connect

- **See it in action:** Launch the browser demo, tune neural parameters, and inspect how living brain data behaves in silico.
- **Collaborate:** Share atlas templates, propose validation studies, or integrate new neuron datasets.
- **Stay updated:** Contact us via the protected email link or follow project notes on the demo page.

Mindtransfer.me exists for researchers, builders, and anyone who believes that understanding every spike brings us closer to true mind transfer. Welcome aboard.
