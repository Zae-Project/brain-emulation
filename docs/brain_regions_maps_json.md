Short answer: yes—you can get JSON for human brain region maps and related “neuron cluster” data, but there isn’t a single, complete human-neuron-level connectome database. What exists splits into four tiers:

**1 Region maps & ontologies (JSON)**

- **Allen Brain Map** lets you download the full brain-region hierarchy (“structure graph”) directly as JSON; it’s the cleanest way to get a labeled region tree. ([Allen Brain Map Community Forum][1])
- **EBRAINS / siibra-api** exposes the Julich/Multilevel Human Brain Atlas over HTTP (JSON)—atlases, parcellations, regions, coordinates, and linked datasets. Swagger docs are public. ([siibra-api-stable.apps.hbp.eu][2])
- **BrainGlobe atlas API** distributes atlases with a region-value→name mapping and structure hierarchy in JSON alongside label volumes/meshes. ([brainglobe.info][3])

**2 Cell-type “neuron clusters” (human)**

- **Allen Cell Types / Allen Brain Cell Atlas**: human cortical single-cell/nucleus datasets (transcriptomic clusters, morphologies, electrophys); programmatic access via Allen SDK and release manifests in JSON. These are clusters in the biological sense (gene-expression types), not spatial clusters. ([celltypes.brain-map.org][4])

**3 Neuron morphologies by region (metadata in JSON, skeletons in SWC)**

- **NeuroMorpho.org** has an official REST API that returns JSON metadata (filter by _species=Human_, _brain_region=…_, _cell_type=…_). You then fetch the SWC reconstructions. Good for “give me all human hippocampal interneurons with metadata in JSON.” ([neuromorpho.org][5])

**4 Connectivity (“neural networks”)**

- **Macro-scale (region-to-region):** The **Human Connectome Project (HCP)** provides structural/functional connectomes; access is via REST/AWS after registration. Matrices are typically in CIFTI/NIfTI/CSV, but trivial to export as JSON adjacency. The **Brainnetome Atlas** also publishes connectivity patterns for its 246-region parcellation. ([wiki.humanconnectome.org][6])
- **Micro-scale (synapse-level):** The **H01 human cortex EM** release is a petavoxel partial human connectome. Data are served in Neuroglancer “precomputed” format (metadata/annotations via JSON-speaking services like **CAVE**). This is the closest thing to a human neuron-level network, but it’s a tiny cortical fragment—not whole-brain. ([h01-release.storage.googleapis.com][7])

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
