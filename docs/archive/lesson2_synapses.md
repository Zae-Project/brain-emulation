# Lesson 2: Synaptic Transmission and Network Interactions

## Learning Objectives
- Understand how neurons communicate through synapses
- Observe how spikes propagate through the network
- Explore the role of synaptic weights in neural computation

## Theory

### What are Synapses?
Synapses are connections between neurons that allow communication:
- When neuron A spikes, it sends current to connected neurons
- The amount of current depends on the **synaptic weight**
- Stronger weights = stronger influence

### Network Architecture
Our network has:
- 50 neurons arranged in a circle
- Random connections based on connection probability
- Each connection has adjustable synaptic weight

## Interactive Experiments

### Experiment 2.1: Watching Spikes Propagate
1. **Set Input Current to 0.5** (medium stimulation)
2. **Watch the network**:
   - Blue neurons are at rest
   - Bright neurons are active (high voltage)
   - White flashes show spikes
   - Lines show connections when "Show Connections" is active

3. **Observe the cascade**:
   - One neuron spikes
   - Sends current to connected neurons
   - Connected neurons become more likely to spike
   - Creates spreading waves of activity

### Experiment 2.2: Synaptic Weight Effects
Use the **Synaptic Weight** slider to see how connection strength affects behavior:

**Weak Synapses (0.0 - 0.1)**:
- Isolated spikes, little interaction
- Each neuron acts independently

**Medium Synapses (0.1 - 0.3)**:
- Some propagation, moderate interaction
- Balanced network dynamics

**Strong Synapses (0.3 - 1.0)**:
- Explosive activity, synchronized firing
- Network-wide avalanches

## Key Concepts

### Signal Amplification
- Single inputs can trigger multiple spikes
- Network amplifies weak signals
- Demonstrates computational power

### Synchronization
- Neurons start firing together
- Creates rhythmic network activity
- Important for brain function

### Competition
- Different activity patterns compete
- Some patterns suppress others
- Basis for decision-making

## Practical Exercises

### Exercise 1: Connection Visualization
1. Click "Show Connections" to see synapses
2. Observe how neurons are linked
3. **Question**: Are all neurons equally connected?

### Exercise 2: Propagation Waves
1. Set Synaptic Weight = 0.2
2. Watch for wave-like activity patterns
3. **Question**: How far do waves travel?

### Exercise 3: Synchronization
1. Gradually increase Synaptic Weight
2. Watch for synchronized firing
3. **Question**: At what weight does synchronization emerge?

## Real-World Applications
- **Memory formation**: Synaptic strengthening stores information
- **Learning**: Weight changes encode experiences
- **Neural disorders**: Abnormal connectivity causes problems
- **AI networks**: Artificial synapses enable machine learning

## Next Steps
Ready for Lesson 3: Network Plasticity and Learning!
