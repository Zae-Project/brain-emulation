# Realistic Network Implementation Guide

## Overview

The `create_realistic_network()` function in `server.py` implements a biologically plausible spiking neural network architecture based on neuroscience research. This guide explains how to use and integrate this advanced network model.

## Key Features

### 1. **Biologically Realistic Neuron Ratios**
- **80% excitatory neurons** (glutamatergic, pyramidal-like)
- **20% inhibitory neurons** (GABAergic, interneuron-like)
- Based on research: Beaulieu & Colonnier (1985), Ramaswamy et al. (2021)

### 2. **Structured Connectivity**
The network implements four synapse types:
- **E→E** (Excitatory to Excitatory): Moderate recurrent excitation
- **E→I** (Excitatory to Inhibitory): Strong feedforward inhibition recruitment
- **I→E** (Inhibitory to Excitatory): Widespread inhibitory control
- **I→I** (Inhibitory to Inhibitory): Lateral inhibition among interneurons

### 3. **Clustered Topology**
- Neurons organized into 4 clusters (excitatory) + 1 inhibitory pool
- **Higher connection probability within clusters** (60% local vs 10% distant for E→E)
- Mimics cortical microcolumn structure

### 4. **Realistic Parameters**
- **Time constant (tau)**: 20ms (longer, more realistic membrane dynamics)
- **Refractory period**: 5ms for excitatory, 2.5ms for inhibitory
- **Sparse baseline firing**: Lower input currents prevent runaway activity
- **Low noise**: Minimal background noise (1% of threshold)

## Network Architecture

```
Excitatory Population (80%)
├── Cluster 0: neurons 0-9
├── Cluster 1: neurons 10-19
├── Cluster 2: neurons 20-29
└── Cluster 3: neurons 30-39

Inhibitory Population (20%)
└── Cluster 4 (global): neurons 40-49

Connectivity:
- Within-cluster (E→E): 60% probability, weight=0.05
- Between-cluster (E→E): 10% probability, weight=0.05
- E→I: 50% probability (feedforward inhibition)
- I→E: 80% probability (widespread inhibition)
- I→I: 30% probability (interneuron coordination)
```

## Comparison: Simple vs Realistic Network

| Feature | Simple Network | Realistic Network |
|---------|---------------|-------------------|
| **Neuron types** | Homogeneous | 80% E / 20% I |
| **Tau** | 8ms | 20ms |
| **Connectivity** | Random uniform | Clustered modular |
| **Synapse types** | One (E→E) | Four (E→E, E→I, I→E, I→I) |
| **Inhibition** | None | Structured GABAergic |
| **Firing pattern** | Often synchronized | Sparse, realistic |

## Usage Instructions

### Option 1: Direct Replacement (Experimental)

To test the realistic network, modify `server.py`:

```python
# In server.py, replace the initial network setup (lines 83-106) with:

# Use realistic network instead of simple network
N_exc, N_inh = create_realistic_network()
NUM = N_exc + N_inh  # Update total neuron count
```

**Warning**: This changes global network structure. The WebSocket handler expects single `G` neuron group, but realistic network has `G_exc` and `G_inh`.

### Option 2: Conditional Network Mode (Recommended)

Add a network mode toggle:

```python
# At top of server.py, add configuration
NETWORK_MODE = "simple"  # or "realistic"

# Create network based on mode
if NETWORK_MODE == "realistic":
    N_exc, N_inh = create_realistic_network()
    # Combine monitors for compatibility
    sm_combined = SpikeMonitor(G_exc + G_inh)
else:
    # Existing simple network setup
    ...
```

### Option 3: WebSocket Command (Future)

Implement runtime network switching:

```python
elif d.get("cmd") == "setNetworkMode":
    mode = d.get("mode", "simple")
    if mode == "realistic":
        create_realistic_network()
        # Update monitors and reconnect
    else:
        recreate_network()  # Simple network
```

## Integration Roadmap

### Phase 1: Code Cleanup ✅
- [x] Fix PEP8 violations
- [x] Add docstrings
- [x] Document realistic network function

### Phase 2: Adapter Layer (Current)
Create compatibility between simple and realistic networks:

1. **Unified interface**: Make `G_exc + G_inh` behave like `G`
2. **Monitor merging**: Combine spike/voltage monitors
3. **Parameter mapping**: Map PARAMS to both neuron populations

### Phase 3: Full Integration
- Add UI toggle for network mode
- Implement WebSocket command for switching
- Update visualization to show E/I populations differently
- Add cluster visualization

### Phase 4: Advanced Features (Future)
- STDP (spike-timing-dependent plasticity)
- Homeostatic tuning
- Structural plasticity
- Multi-region templates (PFC, Hippocampus, Thalamus)

## Technical Details

### Global Variables Updated

When `create_realistic_network()` is called, these globals are created:

```python
G_exc       # Excitatory neuron group (NeuronGroup)
G_inh       # Inhibitory neuron group (NeuronGroup)
S_ee        # E→E synapses
S_ei        # E→I synapses
S_ie        # I→E synapses
S_ii        # I→I synapses
P           # Poisson input
sm          # Spike monitor (merged)
vm          # Voltage monitor (excitatory only)
net         # Brian2 Network object
N_exc       # Number of excitatory neurons
N_inh       # Number of inhibitory neurons
```

### Connection Algorithm

The `connect_clustered()` internal function implements:

```python
for each source neuron i:
    for each target neuron j:
        if same cluster:
            connect with prob_local (e.g., 60%)
        else:
            connect with prob_distant (e.g., 10%)
```

This creates **small-world** network properties: high local clustering with sparse long-range connections.

### Stimulation Strategy

Unlike the simple network (uniform input), the realistic network:
- Stimulates **one random cluster** at a time
- Only 25% of excitatory neurons receive external input
- Creates localized activity propagation through network
- Inhibition prevents global spread

## Expected Behavior

### Firing Patterns

**Simple Network:**
- Frequent synchronized bursts
- All neurons fire together
- Unrealistic high firing rates (>50 Hz)

**Realistic Network:**
- Sparse asynchronous firing
- Clustered activity (neurons in same cluster fire together briefly)
- Physiological firing rates (1-10 Hz average)
- Inhibition creates pauses between bursts

### Activity Dynamics

1. **Stimulus arrives** at one cluster (e.g., Cluster 2)
2. **Excitatory neurons** in that cluster fire
3. **Inhibitory neurons** are recruited (E→I)
4. **Inhibition suppresses** excitatory activity (I→E)
5. **Brief quiet period** before next spontaneous activity
6. **Occasional spread** to neighboring clusters via weak long-range E→E

This mimics cortical "up states" and "down states".

## Troubleshooting

### Network Dies (No Activity)
- **Cause**: Insufficient external input or too much inhibition
- **Fix**: Increase `PARAMS["input_current"]` or stimulate more clusters:
  ```python
  # In create_realistic_network(), stimulate 2 clusters instead of 1
  for cluster_id in [0, 1]:
      for i in range(N_exc):
          if G_exc.cluster[i] == cluster_id:
              G_exc.I_input[i] = PARAMS["input_current"] * 2
  ```

### Runaway Activity (All Neurons Fire Constantly)
- **Cause**: Too much excitation or insufficient inhibition
- **Fix**: Increase inhibitory strength:
  ```python
  PARAMS["inhibition_strength"] = 0.2  # was 0.15
  ```

### No Cluster Structure Visible
- **Cause**: Connection probabilities too uniform
- **Fix**: Increase local/distant probability ratio:
  ```python
  connect_clustered(S_ee, G_exc, G_exc, prob_local=0.8, prob_distant=0.05)
  ```

## References

### Neuroscience Literature

1. **Beaulieu, C., & Colonnier, M. (1985)**
   - "A laminar analysis of the number of round‐asymmetrical and flat‐symmetrical synapses on spines, dendritic trunks, and cell bodies in area 17 of the cat"
   - Found ~84% excitatory, ~16% inhibitory synapses in cortex

2. **Ramaswamy, S., et al. (2021)**
   - "The neocortical microcircuit collaboration portal: a resource for rat somatosensory cortex"
   - Modern confirmation: ~80% excitatory, ~20% inhibitory neurons

3. **Development Guide Reference**
   - See `docs/spiking_neural_network_simulator_development_guide.md`
   - Comprehensive neuron type specifications
   - Template architectures for PFC, Hippocampus, Thalamus

### Implementation Notes

- Clustered connectivity based on **small-world network** theory
- E→I and I→E loops create **gamma oscillations** (30-80 Hz) when stimulated
- Sparse activity mimics **energy-efficient** cortical computation

## Next Steps

1. **Test realistic network** in isolation
2. **Create adapter** for current WebSocket interface
3. **Add visualization** showing E vs I populations (green vs red spheres)
4. **Implement mode switching** via UI button
5. **Benchmark performance** (realistic network is ~2x slower)

## Questions?

- See comprehensive development guide: `docs/spiking_neural_network_simulator_development_guide.md`
- Check neuron type details: `docs/neuron_types.md`
- Review project roadmap: `docs/roadmap.md`

---

**Status**: Realistic network function is implemented but not yet integrated into main simulation loop. Integration requires adapter layer to maintain backward compatibility.
