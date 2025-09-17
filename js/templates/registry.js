// SNN registry: neuron types, cluster archetypes, and region presets (step 1)
// This is a lightweight, non-breaking registry. Later steps will use
// per-neuron overrides; for now presets only inform cluster counts/sizes
// and an approximate E/I ratio.

(function () {
  const NeuronTypes = {
    pyramidal: { type: 'excitatory' },
    basket: { type: 'inhibitory' },
    chandelier: { type: 'inhibitory' },
    relay: { type: 'excitatory' },
  };

  const ClusterTypes = {
    Cortex_L2_3: {
      label: 'Cortex L2/3',
      size: 40,
      mix: [
        { typeId: 'pyramidal', fraction: 0.8 },
        { typeId: 'basket', fraction: 0.2 },
      ],
    },
    Amygdala_CeA: {
      label: 'Amygdala (CeA)',
      size: 30,
      mix: [
        { typeId: 'basket', fraction: 0.6 },
        { typeId: 'pyramidal', fraction: 0.4 },
      ],
    },
    Thalamus_Relay: {
      label: 'Thalamus Relay',
      size: 35,
      mix: [
        { typeId: 'relay', fraction: 0.85 },
        { typeId: 'basket', fraction: 0.15 },
      ],
    },
  };

  const RegionPresets = {
    None: {
      label: 'None',
      clusters: [],
    },
    Frontal_Cortex: {
      label: 'Frontal Cortex',
      clusters: [{ typeId: 'Cortex_L2_3', count: 4 }],
    },
    Amygdala: {
      label: 'Amygdala',
      clusters: [{ typeId: 'Amygdala_CeA', count: 4 }],
    },
    Thalamocortical_Loop: {
      label: 'Thalamocortical Loop',
      clusters: [
        { typeId: 'Thalamus_Relay', count: 2 },
        { typeId: 'Cortex_L2_3', count: 2 },
      ],
    },
  };

  function estimateEI(preset) {
    if (!preset || !preset.clusters || preset.clusters.length === 0) return 0.8;
    let exc = 0;
    let total = 0;
    preset.clusters.forEach(({ typeId, count }) => {
      const c = ClusterTypes[typeId];
      if (!c) return;
      const size = c.size || 30;
      const n = (count || 1) * size;
      total += n;
      const eFrac = (c.mix || [])
        .map((m) => (NeuronTypes[m.typeId]?.type === 'excitatory' ? m.fraction : 0))
        .reduce((a, b) => a + b, 0);
      exc += n * (eFrac || 0.8);
    });
    return total > 0 ? Math.max(0.5, Math.min(0.95, exc / total)) : 0.8;
  }

  function deriveCounts(preset) {
    if (!preset || !preset.clusters || preset.clusters.length === 0) return null;
    const clusters = preset.clusters.reduce((sum, c) => sum + (c.count || 1), 0);
    // Use the size of the first cluster type as a representative per-cluster size for v1
    const firstType = ClusterTypes[preset.clusters[0].typeId];
    const clusterSize = firstType?.size || 30;
    return { clusters, clusterSize };
  }

  window.SNN_REGISTRY = {
    NeuronTypes,
    ClusterTypes,
    RegionPresets,
    estimateEI,
    deriveCounts,
  };
})();

