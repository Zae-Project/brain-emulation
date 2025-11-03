# Brain Region Template Library

This folder stores curated JSON templates that can be imported directly with the **Import** button in the HUD. Each file follows the schema enforced by `SNN_CONFIG_IO`:

```jsonc
{
  "id": "Unique_Key",
  "regionName": "Human Brain Region",
  "metadata": { "source": "...", "references": [...] },
  "clusters": [
    {
      "id": "Cluster_Id",
      "name": "Readable label",
      "neuronGroups": [{ "preset": "pyramidal", "count": 120 }],
      "internalConnectivity": [{ "from": "...", "to": "...", "probability": 0.3, "type": "excitatory" }],
      "metadata": { ... }
    }
  ],
  "connections": [
    {
      "fromCluster": "...",
      "toCluster": "...",
      "connectivity": [{ "from": "...", "to": "...", "probability": 0.2, "type": "excitatory" }]
    }
  ]
}
```

## Included templates

| File | Notes |
| --- | --- |
| `allen_prefrontal_cortex.json` | Two-cluster abstraction of Allen Human BA10/46 with excitatory/inhibitory populations. |
| `julich_thalamocortical_loop.json` | Mediodorsal thalamus ↔ prefrontal cortex loop derived from Julich-Brain (EBRAINS siibra). |

## Adding new maps

1. Retrieve a region hierarchy (Allen, siibra, BrainGlobe) and determine the clusters you want to model.
2. Aggregate neuron counts per cell-type and map them to our presets (`pyramidal`, `basket`, `relay`, `inhibitory`, `chandelier`, ...).
3. Fill `internalConnectivity` and `connections` with probabilities/weights (normalized to `[0,1]`, sign encoded via `type`).
4. Save the JSON in this directory and verify it round-trips via `SNN_CONFIG_IO.deserializeTemplate`.
5. Import through the HUD or call `SNN_REGISTRY.registerTemplate` programmatically to expose it in the preset list.

Any template placed here is version-controlled and documented, ensuring reproducible atlas imports.
