# Lesson 3: Plasticity and Network Learning

## Learning Objectives
- Understand how neural networks adapt and learn
- Explore activity-dependent synaptic changes
- Observe how patterns emerge from network dynamics

## Theory

### What is Neural Plasticity?
Plasticity is the brain's ability to reorganize and adapt:
- **Synaptic plasticity**: Connection strengths change based on activity
- **Hebbian learning**: "Cells that fire together, wire together"
- **Homeostasis**: Networks maintain stable activity levels

### Types of Plasticity

1. **Spike-Timing Dependent Plasticity (STDP)**:
   - If pre-neuron fires before post-neuron → strengthen connection
   - If post-neuron fires before pre-neuron → weaken connection
   - Timing window: ~20ms

2. **Rate-based plasticity**:
   - High activity → strengthen connections
   - Low activity → weaken connections

3. **Homeostatic plasticity**:
   - Prevents runaway excitation or silence
   - Maintains network stability

## Observing Emergent Patterns

### Experiment 3.1: Activity-Dependent Organization
1. **Start with random network** (use Reset Network)
2. **Set moderate parameters**:
   - Input Current: 0.4
   - Synaptic Weight: 0.2
   - Connection Probability: 0.1

3. **Observe long-term behavior**:
   - Initially: Random, scattered activity
   - After time: Patterns begin to emerge
   - Eventually: Stable activity clusters

### Experiment 3.2: Creating Activity Clusters
Networks naturally develop functional modules:

**Step 1**: Run simulation for 30+ seconds
**Step 2**: Look for neurons that often fire together
**Step 3**: These form functional "clusters" or "assemblies"

### Why Clusters Form:
- Neurons that spike together strengthen their connections
- Strong connections make them more likely to spike together
- Positive feedback creates stable groups

## Network States and Transitions

### Critical Dynamics
Networks can exist in different regimes:

1. **Subcritical** (low connectivity/weights):
   - Activity dies out quickly
   - Poor signal transmission

2. **Critical** (balanced parameters):
   - Activity propagates but doesn't explode
   - Optimal for computation
   - Maximum information capacity

3. **Supercritical** (high connectivity/weights):
   - Explosive, synchronized activity
   - Poor information processing

### Finding the Critical Point
**Experiment**: Gradually increase Synaptic Weight from 0.1 to 0.5
- Watch for the transition point where behavior changes
- Critical networks show: avalanches, long-range correlations, optimal dynamics

## Computational Properties

### What Networks Can Learn

1. **Pattern Completion**:
   - Partial input triggers full pattern
   - Memory recall mechanism

2. **Pattern Separation**:
   - Similar inputs produce different outputs
   - Prevents memory interference

3. **Temporal Sequences**:
   - Learn and replay activity sequences
   - Basis for motor control and planning

### Experiment 3.3: Memory-like Behavior
1. **Create strong input** (Input Current = 1.0) for 10 seconds
2. **Reduce input** (Input Current = 0.2)
3. **Observe**: Network may continue patterns learned during high input

## Real Neural Networks

### Biological Inspiration
Our simplified model captures key principles:

- **Development**: Baby brains start random, develop structure through experience
- **Learning**: Synaptic changes encode memories and skills
- **Adaptation**: Networks reorganize after injury or new experiences
- **Disorders**: Abnormal plasticity linked to autism, depression, addiction

### Limitations of Our Model
Real brains have:
- Inhibitory neurons (we only model excitatory)
- Complex neuron types
- Multiple neurotransmitters
- Detailed anatomical structure
- Much larger scale (billions of neurons)

## Advanced Experiments

### Experiment A: Resonance Patterns
1. Set Input Current to oscillate (manually vary 0.2 ↔ 0.8)
2. Network may learn to anticipate the rhythm
3. Demonstrates temporal learning

### Experiment B: Stability vs. Flexibility
- High Synaptic Weight: Stable but inflexible
- Low Synaptic Weight: Flexible but unstable
- Find the optimal balance for your "task"

### Experiment C: Recovery from Disruption
1. Establish stable patterns
2. Reset some neurons (Reset Network button)
3. Watch network reorganize and recover

## Mathematical Framework

### Plasticity Rules
Simple Hebbian rule:
