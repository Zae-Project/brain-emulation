// Schema definitions for biologically grounded SNN templates

(function () {
  const NeuronTypeSchema = {
    name: 'string',
    type: 'excitatory|inhibitory|neuromodulatory',
    threshold: 'number',
    leak: 'number',
    refractoryMs: 'number',
    bgImpulse: 'number',
    spikeGain: 'number',
    bio: {
      restingPotential: 'number?',
      spikeThreshold: 'number?',
      resetPotential: 'number?',
      membraneTimeConstant: 'number?',
      synapseType: 'string?',
      EPSP_rise: 'number?',
      EPSP_decay: 'number?',
      IPSP_rise: 'number?',
      IPSP_decay: 'number?',
      synapticDelay: 'number?',
      weight: 'number?',
    },
  };

  const NeuronTypePresets = {
    pyramidal: {
      type: 'excitatory',
      threshold: 1.0,
      leak: 0.985,
      refractoryMs: 80,
      bgImpulse: 0.06,
      spikeGain: 1.0,
      bio: {
        restingPotential: -70,
        spikeThreshold: -55,
        resetPotential: -65,
        membraneTimeConstant: 20,
        synapseType: 'AMPA',
        EPSP_rise: 1.5,
        EPSP_decay: 15,
        synapticDelay: 1.0,
        weight: 1.0,
      },
    },
    basket: {
      type: 'inhibitory',
      threshold: 0.95,
      leak: 0.98,
      refractoryMs: 60,
      bgImpulse: 0.04,
      spikeGain: 1.0,
      bio: {
        restingPotential: -70,
        spikeThreshold: -50,
        resetPotential: -70,
        membraneTimeConstant: 10,
        synapseType: 'GABA_A',
        IPSP_rise: 1.0,
        IPSP_decay: 8,
        synapticDelay: 0.5,
        weight: 1.1,
      },
    },
    chandelier: {
      type: 'inhibitory',
      threshold: 0.95,
      leak: 0.98,
      refractoryMs: 55,
      bgImpulse: 0.04,
      spikeGain: 1.1,
      bio: {
        restingPotential: -70,
        spikeThreshold: -50,
        resetPotential: -70,
        membraneTimeConstant: 10,
        synapseType: 'GABA_A',
        IPSP_rise: 1.0,
        IPSP_decay: 8,
        synapticDelay: 0.5,
        weight: 1.2,
      },
    },
    relay: {
      type: 'excitatory',
      threshold: 1.05,
      leak: 0.988,
      refractoryMs: 90,
      bgImpulse: 0.05,
      spikeGain: 1.2,
      bio: {
        restingPotential: -70,
        spikeThreshold: -55,
        resetPotential: -65,
        membraneTimeConstant: 22,
        synapseType: 'AMPA',
        EPSP_rise: 2.0,
        EPSP_decay: 20,
        synapticDelay: 1.2,
        weight: 1.1,
      },
    },
    inhibitory: {
      type: 'inhibitory',
      threshold: 0.95,
      leak: 0.98,
      refractoryMs: 55,
      bgImpulse: 0.04,
      spikeGain: 1.0,
      bio: {
        restingPotential: -70,
        spikeThreshold: -52,
        resetPotential: -70,
        membraneTimeConstant: 10,
        synapseType: 'GABA_A',
        IPSP_rise: 1.0,
        IPSP_decay: 8,
        synapticDelay: 0.5,
        weight: 1.0,
      },
    },
  };

  const TemplateSchema = {
    regionName: 'string',
    clusters: 'Array<Cluster>',
    connections: 'Array<ConnectionEdge>?',
    metadata: 'TemplateMetadata?',
  };

  const TemplateMetadata = {
    anatomicalNotes: 'Array<string>?',
    neuromodulators: 'Array<string>?',
    corticalLayers: 'Array<string>?',
    references: 'Array<string>?',
  };

  const RegionTemplates = {
    Frontal_Cortex: {
      regionName: 'Prefrontal Cortex (L2/3 microcolumn)',
      clusters: [
        {
          id: 'PFC_L23',
          name: 'PFC Microcolumn',
          neuronGroups: [
            { preset: 'pyramidal', count: 160 },
            { preset: 'basket', count: 32 },
            { preset: 'chandelier', count: 12 },
          ],
          internalConnectivity: [
            { from: 'pyramidal', to: 'pyramidal', probability: 0.08, type: 'excitatory' },
            { from: 'pyramidal', to: 'basket', probability: 0.55, type: 'excitatory' },
            { from: 'pyramidal', to: 'chandelier', probability: 0.6, type: 'excitatory' },
            { from: 'basket', to: 'pyramidal', probability: 0.9, type: 'inhibitory' },
            { from: 'chandelier', to: 'pyramidal', probability: 0.95, type: 'inhibitory' },
            { from: 'basket', to: 'basket', probability: 0.15, type: 'inhibitory' },
          ],
        },
      ],
      metadata: {
        anatomicalNotes: [
          'Layer II/III microcolumn emphasising recurrent excitation for working memory.',
          'Interneuron densities reflect human dorsolateral PFC counts (~20% interneurons).',
        ],
        neuromodulators: [
          'Dopamine D1 projections stabilise sustained pyramidal activity.',
          'Acetylcholine modulates basket cell gain during attentional control.',
        ],
        corticalLayers: ['II', 'III'],
        references: [
          'Wang, X.-J. (2001) Synaptic reverberation underlying mnemonic persistent activity.',
        ],
      },
    },
    Hippocampus: {
      regionName: 'Hippocampus (CA3 -> CA1)',
      clusters: [
        {
          id: 'CA3',
          name: 'CA3 Recurrent Subfield',
          neuronGroups: [
            { preset: 'pyramidal', count: 200 },
            { preset: 'basket', count: 40 },
          ],
          internalConnectivity: [
            { from: 'pyramidal', to: 'pyramidal', probability: 0.32, type: 'excitatory' },
            { from: 'pyramidal', to: 'basket', probability: 0.55, type: 'excitatory' },
            { from: 'basket', to: 'pyramidal', probability: 0.85, type: 'inhibitory' },
            { from: 'basket', to: 'basket', probability: 0.18, type: 'inhibitory' },
          ],
        },
        {
          id: 'CA1',
          name: 'CA1 Output Subfield',
          neuronGroups: [
            { preset: 'pyramidal', count: 180 },
            { preset: 'basket', count: 36 },
          ],
          internalConnectivity: [
            { from: 'pyramidal', to: 'pyramidal', probability: 0.08, type: 'excitatory' },
            { from: 'pyramidal', to: 'basket', probability: 0.52, type: 'excitatory' },
            { from: 'basket', to: 'pyramidal', probability: 0.82, type: 'inhibitory' },
          ],
        },
      ],
      connections: [
        {
          fromCluster: 'CA3',
          toCluster: 'CA1',
          connectivity: [
            { from: 'pyramidal', to: 'pyramidal', probability: 0.32, type: 'excitatory', delay: 5, weight: 1.0 },
            { from: 'pyramidal', to: 'basket', probability: 0.36, type: 'excitatory', delay: 5, weight: 0.9 },
          ],
        },
      ],
      metadata: {
        anatomicalNotes: [
          'CA3 recurrent collaterals implement auto-associative memory completion.',
          'CA1 receives Schaffer collateral input and relays to entorhinal cortex.',
        ],
        neuromodulators: [
          'Septal acetylcholine supports theta rhythm and encoding.',
          'VTA dopamine bursts tag CA1 synapses during novelty.',
        ],
        references: [
          'Rolls, E. (2015) Cerebral cortex: principles of operation.',
          'Lisman, J. (1999) Relating hippocampal CA3 and CA1 to episodic memory.',
        ],
      },
    },
    Thalamocortical_Loop: {
      regionName: 'Thalamocortical Relay Loop',
      clusters: [
        {
          id: 'Thalamus_Relay',
          name: 'MD Thalamus Relay',
          neuronGroups: [
            { preset: 'relay', count: 110 },
            { preset: 'inhibitory', count: 20 },
          ],
          internalConnectivity: [
            { from: 'relay', to: 'relay', probability: 0.06, type: 'excitatory', weight: 0.4 },
            { from: 'relay', to: 'inhibitory', probability: 0.58, type: 'excitatory', weight: 0.7 },
            { from: 'inhibitory', to: 'relay', probability: 0.88, type: 'inhibitory', weight: 1.1 },
            { from: 'inhibitory', to: 'inhibitory', probability: 0.22, type: 'inhibitory', weight: 0.8 },
          ],
        },
        {
          id: 'PFC_Target',
          name: 'PFC Recipient Column',
          neuronGroups: [
            { preset: 'pyramidal', count: 140 },
            { preset: 'basket', count: 28 },
          ],
          internalConnectivity: [
            { from: 'pyramidal', to: 'pyramidal', probability: 0.09, type: 'excitatory' },
            { from: 'pyramidal', to: 'basket', probability: 0.5, type: 'excitatory' },
            { from: 'basket', to: 'pyramidal', probability: 0.85, type: 'inhibitory' },
          ],
        },
      ],
      connections: [
        {
          fromCluster: 'Thalamus_Relay',
          toCluster: 'PFC_Target',
          connectivity: [
            { from: 'relay', to: 'pyramidal', probability: 0.42, type: 'excitatory', delay: 3.5, weight: 1.1 },
            { from: 'relay', to: 'basket', probability: 0.35, type: 'excitatory', delay: 3.5, weight: 0.9 },
          ],
        },
        {
          fromCluster: 'PFC_Target',
          toCluster: 'Thalamus_Relay',
          connectivity: [
            { from: 'pyramidal', to: 'relay', probability: 0.28, type: 'excitatory', delay: 4.2, weight: 0.8 },
            { from: 'pyramidal', to: 'inhibitory', probability: 0.18, type: 'excitatory', delay: 4.2, weight: 0.7 },
          ],
        },
      ],
      metadata: {
        anatomicalNotes: [
          'Models mediodorsal thalamus ↔ PFC loop with reticular gating.',
          'Relay burst/tonic balance maintained via reticular inhibition.',
        ],
        neuromodulators: ['Thalamic reticular GABA_A, cortical glutamate, cholinergic input'],
        references: ['Halassa & Kastner (2017) Thalamic functions in distributed cognitive control.'],
      },
    },
  };

  window.SNN_TEMPLATE_SCHEMA = {
    NeuronTypeSchema,
    NeuronTypePresets,
    TemplateSchema,
    TemplateMetadata,
    RegionTemplates,
  };
})();
