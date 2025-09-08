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
- Random connections (8% probability)
- Each connection has the same weight (adjustable)

## Interactive Experiments

### Experiment 2.1: Watching Spikes Propagate
1. **Set Input Current to 0.8** (medium-high stimulation)
2. **Watch the network**:
   - Blue neurons are at rest
   - Bright/violet neurons are active (high voltage)
   - White flashes show spikes
   - Bright lines show active connections

3. **Observe the cascade**:
   - One neuron spikes
   - Sends current to connected neurons
   - Connected neurons become more likely to spike
   - Creates spreading waves of activity

### Experiment 2.2: Synaptic Weight Effects
Use the **Synaptic Weight** slider to see how connection strength affects network behavior:

**Weak Synapses (0.0 - 0.1)**:
- Set weight to 0.05
- Observe: Isolated spikes, little interaction
- Why? Not enough current to significantly influence other neurons

**Medium Synapses (0.1 - 0.3)**:
- Set weight to 0.2
- Observe: Some propagation, moderate interaction
- Why? Balanced influence allows for realistic dynamics

**Strong Synapses (0.3 - 1.0)**:
- Set weight to 0.8
- Observe: Explosive activity, synchronized firing
- Why? Strong influence can trigger avalanches

### Experiment 2.3: Connection Probability
Use the **Connection Probability** slider to change network density:

**Sparse Networks (0.0 - 0.05)**:
- Low connectivity
- Isolated activity islands

**Dense Networks (0.15 - 0.2)**:
- High connectivity
- Network-wide synchronization

## Network Dynamics

### Key Phenomena to Observe

1. **Excitation Propagation**:
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
