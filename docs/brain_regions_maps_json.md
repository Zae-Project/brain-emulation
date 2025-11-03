Short answer: yes—you can get JSON for human brain region maps and related “neuron cluster” data, but there isn’t a single, complete human-neuron-level connectome database. What exists splits into four tiers:

**1 Region maps & ontologies (JSON)**

- **Allen Brain Map** lets you download the full brain-region hierarchy (“structure graph”) directly as JSON; it’s the cleanest way to get a labeled region tree. ([Allen Brain Map Community Forum][1])
- **EBRAINS / siibra-api** exposes the Julich/Multilevel Human Brain Atlas over HTTP (JSON)—atlases, parcellations, regions, coordinates, and linked datasets. Swagger docs are public. ([siibra-api-stable.apps.hbp.eu][2])
- **BrainGlobe atlas API** distributes atlases with a region-value→name mapping and structure hierarchy in JSON alongside label volumes/meshes. ([brainglobe.info][3])

**2 Cell-type “neuron clusters” (human)**

- **Allen Cell Types / Allen Brain Cell Atlas**: human cortical single-cell/nucleus datasets (transcriptomic clusters, morphologies, electrophys); programmatic access via Allen SDK and release manifests in JSON. These are clusters in the biological sense (gene-expression types), not spatial clusters. ([celltypes.brain-map.org][4])

**3 Neuron morphologies by region (metadata in JSON, skeletons in SWC)**

- **NeuroMorpho.org** has an official REST API that returns JSON metadata (filter by _species=Human_, _brain_region=…_, _cell_type=…_). You then fetch the SWC reconstructions. Good for “give me all human hippocampal interneurons with metadata in JSON.” ([neuromorpho.org][5])

**4 Connectivity ("neural networks")**

- **Macro-scale (region-to-region):** The **Human Connectome Project (HCP)** provides structural/functional connectomes; access is via REST/AWS after registration. Matrices are typically in CIFTI/NIfTI/CSV, but trivial to export as JSON adjacency. The **Brainnetome Atlas** also publishes connectivity patterns for its 246-region parcellation. ([wiki.humanconnectome.org][6])
- **Micro-scale (synapse-level):** The **H01 human cortex EM** release is a petavoxel partial human connectome. Data are served in Neuroglancer "precomputed" format (metadata/annotations via JSON-speaking services like **CAVE**). This is the closest thing to a human neuron-level network, but it's a tiny cortical fragment-not whole-brain. ([h01-release.storage.googleapis.com][7])

---

### Concrete JSON entry points (copy/paste friendly)

- **Allen region tree (JSON):** `http://api.brain-map.org/api/v2/structure_graph_download/{StructureGraphID}.json` → pick the human atlas structure graph ID from their docs and you’ll get a full region hierarchy as JSON. ([Allen Brain Map Community Forum][1])
- **EBRAINS siibra-api (JSON):** `GET https://siibra-api-stable.apps.hbp.eu/v3_0/atlases` → returns available atlases; from there, follow to parcellations, regions, features. ([siibra-api-stable.apps.hbp.eu][2])
- **NeuroMorpho (JSON):** e.g., `https://neuromorpho.org/api/neuron/select?q=species:Human&fq=brain_region:hippocampus` → JSON list of matching neurons + metadata; fetch SWC per neuron. ([neuromorpho.org][5])

---

### What you **can’t** get (yet), bluntly

A complete, standardized, JSON-downloadable **human** neuron-level connectome does not exist. You can either work with (a) macro-connectomes (HCP) at the parcel level, or (b) micro-fragments like H01 at synapse level. Anything claiming “full human neural network database” is marketing or a mouse/fly dataset wearing a fake mustache. ([wiki.humanconnectome.org][6])

---

If you tell me the granularity you want (region ontology, cell-type clusters, morphologies, macro-connectome, or the H01 micro-fragment) and the target region, I’ll pull a ready-to-use JSON sample for you next.

[1]: https://community.brain-map.org/t/downloading-an-ontologys-structure-graph/2880?utm_source=chatgpt.com "Downloading an Ontology's Structure Graph"
[2]: https://siibra-api-stable.apps.hbp.eu/v3_0/docs?utm_source=chatgpt.com "siibra api - Swagger UI"
[3]: https://brainglobe.info/documentation/brainglobe-atlasapi/index.html?utm_source=chatgpt.com "BrainGlobe Atlas API (brainglobe-atlasapi)"
[4]: https://celltypes.brain-map.org/?utm_source=chatgpt.com "Allen Brain Atlas: Cell Types: Overview"
[5]: https://www.neuromorpho.org/apiReference.html?utm_source=chatgpt.com "cngpro.gmu.edu:8080 API Reference - NeuroMorpho.Org"
[6]: https://wiki.humanconnectome.org/docs/How%20To%20Access%20Subject%20Data%20via%20REST.html?utm_source=chatgpt.com "How To Access HCP-YA Subject Data via REST"
[7]: https://h01-release.storage.googleapis.com/landing.html?utm_source=chatgpt.com "A Browsable Petascale Reconstruction of the Human Cortex"
---

### Mapping These Sources into Our Template Schema

Our importer (`SNN_CONFIG_IO`) expects templates shaped roughly like:

```jsonc
{
  "id": "Region_Key",
  "regionName": "Frontal Cortex",
  "clusters": [
    {
      "id": "PFC_column_1",
      "name": "PFC Column 1",
      "neuronGroups": [
        { "preset": "pyramidal", "count": 120 },
        { "preset": "basket", "count": 30 }
      ],
      "internalConnectivity": [
        { "from": "pyramidal", "to": "pyramidal", "probability": 0.3, "type": "excitatory" }
      ]
    }
  ],
  "connections": [
    {
      "fromCluster": "PFC_column_1",
      "toCluster": "PFC_column_2",
      "connectivity": [
        { "from": "pyramidal", "to": "pyramidal", "probability": 0.2, "type": "excitatory", "weight": 0.9 }
      ]
    }
  ],
  "metadata": { "atlas": "Allen Human Brain Atlas" }
}
```

| External JSON | Template field(s) | Notes |
| --- | --- | --- |
| Allen structure graph (`structure.id`, `structure.name`, `structure.acronym`) | `clusters[*].id`, `clusters[*].name`, `metadata.acronym` | Build one cluster per atlas region; parent-child relations can become default `connections`. |
| EBRAINS siibra (`regions[*].id/name`, `features`) | `regionName`, `clusters[*].metadata` | Use siibra parcellations for cluster layout; attach available features (thickness, receptors) as metadata. |
| BrainGlobe atlas JSON | `clusters[*].metadata.voxelCount` → `neuronGroups` | Convert voxel counts to neuron counts via density heuristics; map atlas hierarchy identical to Allen. |
| NeuroMorpho API (`cell_type`, `brain_region`) | `neuronGroups[*].preset/count` | Aggregate counts per brain_region + cell_type, translate to our preset names using a lookup. |
| HCP/Brainnetome matrices | `connections[*].connectivity` | Normalize weights to `[0,1]`; assign `type` based on known excitatory/inhibitory projections. |

**Proposed ingestion pipeline**

1. **Fetch atlas hierarchy** (Allen, siibra, BrainGlobe) and cache locally.
2. **Join cell-type data** (Allen Cell Types / NeuroMorpho) to produce `neuronGroups` counts per region/preset.
3. **Generate clusters** – one per region (or subregion) with metadata (acronym, references, coordinates).
4. **Add connections** – use macro-connectome matrices where available; otherwise seed archetypal intra-cluster rules and leave inter-cluster empty.
5. **Serialize via `SNN_CONFIG_IO.serializeTemplate`** and expose through Import (local file or hosted URL).
6. **Version metadata** – stamp atlas source, release DOI, and transformation parameters in `metadata` so the UI can display provenance.

The heavy lifting lives in a preprocessing script (e.g., `scripts/build_atlas_template.mjs`) so the client only consumes validated templates.
### Repository Template Library

Curated, ready-to-import templates derived from the pipelines above live in `data/brain_region_maps/`:

| File | Atlas | Summary |
| --- | --- | --- |
| `allen_prefrontal_cortex.json` | Allen Human Brain Atlas | BA10/46 two-column abstraction with pyramidal, basket, and chandelier populations. |
| `allen_motor_cortex.json` | Allen Human Brain Atlas | BA4 corticospinal microcircuit with supragranular feedback. |
| `allen_somatosensory_cortex.json` | Allen Human Brain Atlas | BA3b barrel-column layers with strong layer IV drive. |
| `brainglobe_visual_cortex.json` | BrainGlobe MNI152 | Feedforward V1→V2 stream complemented by deep-layer feedback. |
| `julich_thalamocortical_loop.json` | EBRAINS Julich-Brain | Mediodorsal thalamus ↔ PFC loop with reticular inhibition. |

The HUD now reads `data/brain_region_maps/manifest.json` at startup to auto-register every template listed there. Run `node scripts/refresh_brain_region_manifest.mjs` whenever you drop new template files so the manifest stays in sync. Any manifest entry is lifted into `SNN_REGISTRY` automatically—no manual wiring required beyond the JSON itself.
