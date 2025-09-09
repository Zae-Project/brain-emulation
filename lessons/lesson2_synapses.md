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

## Next Steps
Ready for Lesson 3: Network Plasticity and Learning!
   - Spikes travel along connections
   - Create expanding waves of activity

2. **Amplification**:
   - Single inputs can trigger multiple spikes
   - Network amplifies weak signals

3. **Synchronization**:
   - Neurons start firing together
   - Creates rhythmic network activity

4. **Competition**:
   - Different activity patterns compete
   - Some suppress others

## Mathematical Insights

### Synaptic Integration
Each neuron receives input from multiple sources:
