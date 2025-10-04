// SNN registry: neuron types, reusable cluster archetypes, and region templates
// Pulls from SNN_TEMPLATE_SCHEMA when available so presets stay aligned with biological data.

(function () {
  const schema = window.SNN_TEMPLATE_SCHEMA || {};

  const defaultNeuronTypes = {
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
    inhibitory: {
      type: 'inhibitory',
      threshold: 0.95,
      leak: 0.98,
      refractoryMs: 55,
      bgImpulse: 0.04,
      spikeGain: 1.0,
    },
  };

  const NeuronTypes = schema.NeuronTypePresets
    ? Object.fromEntries(Object.entries(schema.NeuronTypePresets).map(([key, def]) => [key, { ...def }]))
    : defaultNeuronTypes;

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

  const TemplatePFC = schema.RegionTemplates?.Frontal_Cortex || {
    regionName: 'Prefrontal Cortex',
    clusters: [
      {
        id: 'PFC_cluster1',
        name: 'PFC Microcolumn 1',
        neuronGroups: [
          { preset: 'pyramidal', count: 80 },
          { preset: 'basket', count: 15 },
          { preset: 'chandelier', count: 5 },
        ],
        internalConnectivity: [
          { from: 'pyramidal', to: 'pyramidal', probability: 0.1, type: 'excitatory' },
          { from: 'pyramidal', to: 'basket', probability: 0.5, type: 'excitatory' },
          { from: 'pyramidal', to: 'chandelier', probability: 0.5, type: 'excitatory' },
          { from: 'basket', to: 'pyramidal', probability: 0.8, type: 'inhibitory' },
          { from: 'chandelier', to: 'pyramidal', probability: 0.8, type: 'inhibitory' },
          { from: 'basket', to: 'basket', probability: 0.1, type: 'inhibitory' },
        ],
      },
    ],
    connections: [],
  };

  const TemplateHippocampus = schema.RegionTemplates?.Hippocampus || {
    regionName: 'Hippocampus',
    clusters: [
      {
        id: 'CA3_cluster',
        name: 'CA3 Region',
        neuronGroups: [
          { preset: 'pyramidal', count: 80 },
          { preset: 'basket', count: 20 },
        ],
        internalConnectivity: [
          { from: 'pyramidal', to: 'pyramidal', probability: 0.3, type: 'excitatory' },
          { from: 'pyramidal', to: 'basket', probability: 0.5, type: 'excitatory' },
          { from: 'basket', to: 'pyramidal', probability: 0.8, type: 'inhibitory' },
          { from: 'basket', to: 'basket', probability: 0.1, type: 'inhibitory' },
        ],
      },
      {
        id: 'CA1_cluster',
        name: 'CA1 Region',
        neuronGroups: [
          { preset: 'pyramidal', count: 80 },
          { preset: 'basket', count: 20 },
        ],
        internalConnectivity: [
          { from: 'pyramidal', to: 'pyramidal', probability: 0.1, type: 'excitatory' },
          { from: 'pyramidal', to: 'basket', probability: 0.5, type: 'excitatory' },
          { from: 'basket', to: 'pyramidal', probability: 0.8, type: 'inhibitory' },
          { from: 'basket', to: 'basket', probability: 0.1, type: 'inhibitory' },
        ],
      },
    ],
    connections: [
      {
        fromCluster: 'CA3_cluster',
        toCluster: 'CA1_cluster',
        connectivity: [
          { from: 'pyramidal', to: 'pyramidal', probability: 0.3, type: 'excitatory', delay: 5 },
          { from: 'pyramidal', to: 'basket', probability: 0.3, type: 'excitatory', delay: 5 },
        ],
      },
    ],
  };

  const TemplateThalamus = schema.RegionTemplates?.Thalamocortical_Loop || {
    regionName: 'Thalamus',
    clusters: [
      {
        id: 'Thalamus_cluster',
        name: 'Thalamic Relay + Reticular',
        neuronGroups: [
          { preset: 'relay', count: 90 },
          { preset: 'inhibitory', count: 10 },
        ],
        internalConnectivity: [
          { from: 'relay', to: 'relay', probability: 0.05, type: 'excitatory' },
          { from: 'relay', to: 'inhibitory', probability: 0.5, type: 'excitatory' },
          { from: 'inhibitory', to: 'relay', probability: 0.8, type: 'inhibitory' },
          { from: 'inhibitory', to: 'inhibitory', probability: 0.2, type: 'inhibitory' },
        ],
      },
    ],
    connections: [],
  };

  const RegionTemplates = {
    Frontal_Cortex: TemplatePFC,
    Hippocampus: TemplateHippocampus,
    Thalamocortical_Loop: TemplateThalamus,
  };

  const RegionMetadata = {
    Frontal_Cortex: schema.RegionTemplates?.Frontal_Cortex?.metadata || null,
    Hippocampus: schema.RegionTemplates?.Hippocampus?.metadata || null,
    Thalamocortical_Loop: schema.RegionTemplates?.Thalamocortical_Loop?.metadata || null,
    Amygdala: {
      anatomicalNotes: ['Central nucleus emphasising inhibitory gating of outputs.'],
      references: ['LeDoux (2000) Emotion circuits in the brain.'],
    },
  };

  const RegionPresets = {
    None: { label: 'None', clusters: [] },
    Frontal_Cortex: { label: 'Frontal Cortex', templateKey: 'Frontal_Cortex', template: TemplatePFC, metadata: RegionMetadata.Frontal_Cortex },
    Hippocampus: { label: 'Hippocampus', templateKey: 'Hippocampus', template: TemplateHippocampus, metadata: RegionMetadata.Hippocampus },
    Amygdala: { label: 'Amygdala', clusters: [{ typeId: 'Amygdala_CeA', count: 4 }], metadata: RegionMetadata.Amygdala },
    Thalamocortical_Loop: { label: 'Thalamocortical Loop', templateKey: 'Thalamocortical_Loop', template: TemplateThalamus, metadata: RegionMetadata.Thalamocortical_Loop },
  };

  function resolvePreset(presetOrId) {
    if (!presetOrId) return null;
    if (typeof presetOrId === 'string') return RegionPresets[presetOrId] || null;
    return presetOrId;
  }

  function getTemplateForPreset(presetOrId) {
    const preset = resolvePreset(presetOrId);
    if (!preset) return null;
    if (preset.template) return preset.template;
    if (preset.templateKey && RegionTemplates[preset.templateKey]) return RegionTemplates[preset.templateKey];
    return null;
  }

  function estimateEI(presetOrId) {
    const preset = resolvePreset(presetOrId);
    if (!preset) return 0.8;
    const template = getTemplateForPreset(preset);
    if (template && Array.isArray(template.clusters) && template.clusters.length) {
      let excitatoryCount = 0;
      let total = 0;
      template.clusters.forEach((cluster) => {
        (cluster.neuronGroups || []).forEach((group) => {
          const count = group.count || 0;
          total += count;
          const def = NeuronTypes[group.preset];
          if (!def || def.type !== 'inhibitory') excitatoryCount += count;
        });
      });
      if (total === 0) return 0.8;
      const ratio = excitatoryCount / total;
      return Math.max(0.5, Math.min(0.95, ratio));
    }
    if (!preset.clusters || preset.clusters.length === 0) return 0.8;
    let exc = 0;
    let total = 0;
    preset.clusters.forEach(({ typeId, count }) => {
      const arche = ClusterTypes[typeId];
      if (!arche) return;
      const size = arche.size || 30;
      const n = (count || 1) * size;
      total += n;
      const eFrac = (arche.mix || [])
        .map((m) => (NeuronTypes[m.typeId]?.type === 'excitatory' ? m.fraction : 0))
        .reduce((a, b) => a + b, 0);
      exc += n * (eFrac || 0.8);
    });
    return total > 0 ? Math.max(0.5, Math.min(0.95, exc / total)) : 0.8;
  }

  function deriveCounts(presetOrId) {
    const preset = resolvePreset(presetOrId);
    if (!preset) return null;
    const template = getTemplateForPreset(preset);
    if (template && Array.isArray(template.clusters) && template.clusters.length) {
      const clusterSizes = template.clusters.map((cluster) =>
        (cluster.neuronGroups || []).reduce((sum, group) => sum + (group.count || 0), 0)
      );
      const totalNeurons = clusterSizes.reduce((a, b) => a + b, 0);
      const avgSize = clusterSizes.length ? Math.round(totalNeurons / clusterSizes.length) : 0;
      return { clusters: clusterSizes.length, clusterSize: avgSize, totalNeurons };
    }
    if (!preset.clusters || preset.clusters.length === 0) return null;
    const clusters = preset.clusters.reduce((sum, c) => sum + (c.count || 1), 0);
    const firstType = ClusterTypes[preset.clusters[0].typeId];
    const clusterSize = firstType?.size || 30;
    return { clusters, clusterSize, totalNeurons: clusters * clusterSize };
  }

  window.SNN_REGISTRY = {
    NeuronTypes,
    ClusterTypes,
    RegionTemplates,
    RegionPresets,
    RegionMetadata,
    getTemplateForPreset,
    estimateEI,
    deriveCounts,
  };
})();
