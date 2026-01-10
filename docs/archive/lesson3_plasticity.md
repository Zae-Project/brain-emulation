# Lesson 3: Network Plasticity and Learning

## Learning Objectives
- Understand how neural networks adapt and learn
- Explore activity-dependent synaptic changes
- Observe how patterns emerge from network dynamics

## Theory

### What is Neural Plasticity?
Plasticity is the brain's ability to reorganize and adapt:
- **Synaptic plasticity**: Connection strengths change based on activity
- **Structural plasticity**: New connections form, old ones disappear
- **Homeostasis**: Networks maintain stable activity levels

### Critical Network Dynamics
Networks can exist in different regimes based on connectivity and weights:

**Subcritical**: Activity dies out quickly
**Critical**: Activity propagates optimally
**Supercritical**: Activity explodes uncontrollably

## Interactive Experiments

### Experiment 3.1: Critical Dynamics
Networks can exist in different regimes:

1. **Subcritical** (low weights/connectivity):
   - Set Connection Density = 0.02, Synaptic Weight = 0.1
   - Observe: Activity dies out quickly
   - Why? Insufficient connections to maintain activity

2. **Critical** (balanced parameters):
   - Set Connection Density = 0.08, Synaptic Weight = 0.15
   - Observe: Sustained, variable activity
   - Why? Perfect balance between excitation and decay

3. **Supercritical** (high weights/connectivity):
   - Set Connection Density = 0.2, Synaptic Weight = 0.4
   - Observe: Explosive, synchronized activity
   - Why? Too much excitation overwhelms the network

### Experiment 3.2: Phase Transitions
1. **Start with low connectivity** (Connection Density = 0.02)
2. **Gradually increase** to 0.2
3. **Watch for sudden changes** in network behavior
4. **Find the critical point** where behavior shifts dramatically

### Experiment 3.3: Self-Organization
1. **Reset the network** to start fresh
2. **Set moderate parameters**:
   - Input Current: 0.4
   - Synaptic Weight: 0.2
   - Connection Density: 0.1
3. **Observe long-term evolution**:
   - Initially: Random activity
   - After time: Patterns emerge
   - Eventually: Stable clusters form

## Key Concepts

### Criticality
- Networks at criticality show optimal information processing
- Maximum sensitivity to inputs
- Balance between order and chaos
- Found in real brain networks

### Avalanches
- Activity spreads in cascades
- Size and duration follow power laws
- Sign of critical dynamics
- Important for neural computation

### Homeostasis
- Networks self-regulate activity levels
- Prevents over-excitation or silence
- Maintains optimal operating point
- Essential for stable function

## Practical Exercises

### Exercise 1: Find the Critical Point
1. Start with Connection Density = 0.01
2. Increase gradually while watching activity
3. Record when behavior changes dramatically
4. **Question**: What defines the critical transition?

### Exercise 2: Avalanche Analysis
1. Set parameters near criticality
2. Count cascade sizes (how many neurons spike together)
3. **Question**: Do you see power-law distributions?

### Exercise 3: Stability vs Flexibility
1. Compare subcritical vs supercritical networks
2. **Question**: Which responds better to inputs?
3. **Question**: Which is more stable over time?

## Real-World Applications

### Brain Development
- Networks self-organize during growth
- Critical periods for learning
- Plasticity decreases with age

### Learning and Memory
- Synaptic changes encode experiences
- Hebbian learning: "Cells that fire together, wire together"
- Long-term potentiation strengthens connections

### Neurological Disorders
- Autism: Altered connectivity patterns
- Epilepsy: Loss of critical balance
- Depression: Disrupted network dynamics

### Artificial Intelligence
- Neural networks use similar principles
- Backpropagation adjusts connection weights
- Deep learning relies on network plasticity

## Mathematical Insight

The critical point occurs when the largest eigenvalue of the connectivity matrix equals 1:
- Below 1: Subcritical (activity dies)
- Equal to 1: Critical (optimal)
- Above 1: Supercritical (explosive)

## Next Steps
Ready for Lesson 4: Pattern Recognition and Memory!
