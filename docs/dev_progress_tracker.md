# Development Progress Tracker

## Session Summary (latest)
- Styled the preset selector to match the dark HUD palette and hover accents.
- Added hippocampus to the preset list and introduced template-driven network construction (PFC, Hippocampus, Thalamus) via `js/templates/registry.js` and `js/app.js`.
- Introduced `js/templates/schema.js` to centralise biologically grounded neuron presets and region templates, and wired `registry.js` to consume it (with anatomical metadata).
- `applyPreset` now locks sliders, loads the appropriate template, and the network builder instantiates neurons/edges directly from template connectivity rules.
- Created `js/templates/config_io.js` with validation/serialisation helpers and wired import/export buttons in the HUD so templates can be saved to or loaded from JSON.
- Added an expanded neuron detail inspector: clicking any neuron now surfaces region, cluster, cell-type, and biophysical parameters plus connectivity counts in the right-hand panel (sourced from template metadata).
- Retired the persistent lesson card so lessons only open on demand, and returned the status bar to the bottom while keeping the preset controls docked at the top.
- Curated additional atlas templates (M1, S1, V1/V2) under `data/brain_region_maps/` with a manifest-driven auto-loader and CLI helper to rebuild the manifest.
- Applied neuron-type glyphs across the canvas (triangles, diamonds, hexagons, etc.) and mirrored the same icons in the inspector so morphology cues stay consistent.

## Technical Notes
- Template connectivity respects global probability/weight sliders as scaling factors (baseline 0.3 intra / 0.2 inter) and jitters weights for variability.
- Template summary text now lists cluster compositions (e.g., "CA3 Region: 80x pyramidal, 20x basket").
- Legacy presets (e.g., Amygdala) still fall back to archetype-based generation.
- `SNN_REGISTRY.registerTemplate/exportTemplateConfig` exposes the config IO pipeline for programmatic use; UI import ensures unique keys and automatically selects the new preset.

## Next Actions (from Guide)
1. ~~Implement the configuration schema layer so templates can be serialized/loaded externally (`Config File Schemas` section of guide).~~ ✅ Deployed via `SNN_CONFIG_IO`, registry helpers, HUD import/export, and inline schema docs.
2. Surface per-cluster / per-connection metrics in the UI (e.g., display CA3->CA1 probabilities) and allow optional editing before rebuild.
3. Prepare infrastructure for future plasticity hooks (placeholders for STDP/homeostatic tuning mentioned under Future Extensions).
4. Build the brain-region JSON importer:
   - Download and cache an atlas hierarchy (Allen/siibra/BrainGlobe).
   - Merge cell-type counts (Allen Cell Types/NeuroMorpho) into 
euronGroups presets.
   - Map macro-connectome weights to template connections and emit serialized templates ready for Import.
   - Promote `scripts/refresh_brain_region_manifest.mjs` into a richer CLI that can fetch/transform remote atlases automatically.

## Verification Checklist
- [ ] Manual smoke test: select each preset and confirm network builds without console errors.
- [ ] Inspect hippocampus template in the visualizer (ensure CA3->CA1 projections dominate and inhibitory ratios look reasonable).
- [ ] Adjust global connection sliders to confirm scaling propagates through template wiring.
- [ ] Export the active template and confirm the downloaded JSON validates and re-imports without errors.
- [ ] Import an external template JSON and verify it appears in the preset dropdown and builds successfully.
- [ ] Click neurons across presets to confirm the inspector reports correct region/cluster/type data and biophysical parameters.
- [ ] Confirm each neuron type renders with the expected glyph on the canvas and the inspector badge matches.
- [ ] Select lessons from the dropdown to ensure the modal opens (and no residual bottom card appears).
- [ ] Run the atlas-import script on a sample JSON (Allen/siibra) and verify the generated template loads without schema errors.
- [ ] Place a new template in `data/brain_region_maps/`, run the manifest refresh script, reload the app, and confirm the preset auto-registers.





