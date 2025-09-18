// SNN registry: neuron types, cluster archetypes, and region presets (step 1)
// This is a lightweight, non-breaking registry. Later steps will use
// per-neuron overrides; for now presets only inform cluster counts/sizes
// and an approximate E/I ratio.

(function () {
  const NeuronTypes = {
    pyramidal: {
      type: 'excitatory',
      threshold: 1.0,
      leak: 0.985,
      refractoryMs: 80,
      bgImpulse: 0.06,
      spikeGain: 1.0,
    },
    basket: {
      type: 'inhibitory',
      threshold: 0.95,
      leak: 0.98,
      refractoryMs: 60,
      bgImpulse: 0.04,
      spikeGain: 1.0,
    },
    chandelier: {
      type: 'inhibitory',
      threshold: 0.95,
      leak: 0.98,
      refractoryMs: 55,
      bgImpulse: 0.04,
      spikeGain: 1.1,
    },
    relay: {
      type: 'excitatory',
      threshold: 1.05,
      leak: 0.988,
      refractoryMs: 90,
      bgImpulse: 0.05,
      spikeGain: 1.2,
    },
  };

  const ClusterTypes = {
    Cortex_L2_3: {
      label: 'Cortex L2/3',
      size: 40,
      mix: [
        { typeId: 'pyramidal', fraction: 0.8 },
        { typeId: 'basket', fraction: 0.2 },
      ],
      intra: { prob: 0.35, weight: { E: [0.5, 1.0], I: [0.3, 0.7] } },
      inter: { prob: 0.08, weight: { E: [0.1, 0.4], I: [0.1, 0.3] } },
    },
    Amygdala_CeA: {
      label: 'Amygdala (CeA)',
      size: 30,
      mix: [
        { typeId: 'basket', fraction: 0.6 },
        { typeId: 'pyramidal', fraction: 0.4 },
      ],
      intra: { prob: 0.30, weight: { E: [0.45, 0.9], I: [0.35, 0.75] } },
      inter: { prob: 0.05, weight: { E: [0.05, 0.25], I: [0.05, 0.25] } },
    },
    Thalamus_Relay: {
      label: 'Thalamus Relay',
      size: 35,
      mix: [
        { typeId: 'relay', fraction: 0.85 },
        { typeId: 'basket', fraction: 0.15 },
      ],
      intra: { prob: 0.28, weight: { E: [0.45, 0.95], I: [0.25, 0.55] } },
      inter: { prob: 0.10, weight: { E: [0.10, 0.35], I: [0.10, 0.30] } },
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
