# Lesson 1: Understanding Basic Spike Dynamics

## Learning Objectives
- Understand how neurons integrate input over time
- Observe the relationship between input current and firing rate
- Visualize membrane potential dynamics and threshold crossing

## Theory

### The Leaky Integrate-and-Fire Model
A spiking neuron accumulates voltage over time according to:

dv/dt = (-v + I) / τ


Where:
- `v` = membrane potential (voltage)
- `I` = input current (what you control)
- `τ` = membrane time constant (8ms in our simulation)

### Key Concepts
1. **Integration**: The neuron sums up all inputs over time
2. **Leak**: Without input, voltage decays back to 0 with time constant τ
3. **Threshold**: When voltage reaches 1.0, the neuron fires a spike
4. **Reset**: After spiking, voltage immediately returns to 0

## Interactive Experiments

### Experiment 1.1: Single Neuron Dynamics
1. **Select a neuron** by clicking on any blue sphere
2. **Watch the voltage trace** in the right panel:
   - Violet line shows voltage over time
   - Blue dashed line shows threshold (1.0V)
   - Numbers show current voltage value

3. **Observe the pattern**:
   - Voltage rises when neuron receives input
   - Voltage decays when no input arrives
   - Sharp drop to 0 when threshold is crossed

### Experiment 1.2: Input Current Control
Use the **Input Current** slider to control external stimulation:

**Low Input (0.0 - 0.2)**:
- Set slider to 0.1
- Observe: Slow voltage rise, rare spikes
- Why? Insufficient current to reach threshold quickly

**Medium Input (0.3 - 0.7)**:
- Set slider to 0.5
- Observe: Regular, predictable spikes
- Why? Balanced input creates steady firing

**High Input (0.8 - 2.0)**:
- Set slider to 1.2
- Observe: Rapid, frequent spikes
- Why? Strong input reaches threshold quickly

### Experiment 1.3: Time Constant Effects
The time constant (τ = 8ms) determines how fast the neuron responds:
- **Fast integration**: Voltage changes quickly with input
- **Slow leak**: Voltage doesn't decay too rapidly
- **Balanced dynamics**: Allows for realistic neural behavior

## Key Observations to Make

1. **What happens when input = 0?**
   - Voltage should decay exponentially toward 0
   - No spikes should occur

2. **What's the minimum input for spiking?**
   - Try values around 0.2-0.3
   - Find the threshold current for regular firing

3. **How does firing rate change with input?**
   - Higher input → Higher firing rate
   - Relationship is roughly linear for moderate inputs

## Questions to Explore

1. Why doesn't the neuron fire immediately when input > 1.0?
2. What would happen if the time constant was much larger?
3. How would random input (noise) affect the firing pattern?

## Mathematical Insight

The voltage equation has an analytical solution:

v(t) = I(1 - e^(-t/τ)) + v₀e^(-t/τ)


For constant input I and initial voltage v₀:
- **Steady state**: v∞ = I (when t >> τ)
- **Time to threshold**: Depends on I and τ

## Practical Exercises

### Exercise 1: Find the Threshold Current
1. Start with Input Current = 0
2. Slowly increase until you see regular spikes
3. Record the minimum current needed
4. **Question**: Why isn't this exactly 1.0?

### Exercise 2: Measure Firing Rate
1. Set Input Current = 0.8
2. Count spikes for 10 seconds
3. Calculate firing rate (spikes/second)
4. Repeat for different input values
5. **Plot**: Input current vs firing rate

### Exercise 3: Voltage Dynamics
1. Set Input Current = 0.5
2. Watch several spike cycles
3. Measure time between spikes
4. **Question**: Is this time constant? Why/why not?

## Real-World Connections

### Biological Context
- Real neurons work similarly but are more complex
- Multiple ion channels create the dynamics
- Time constants vary from 1ms to 100ms
- Threshold is typically around -55mV

### Engineering Applications
- Artificial neural networks use simplified versions
- Neuromorphic chips implement spiking neurons
- Used in robotics and AI systems
- Energy-efficient computation

## Next Steps

Once you understand how single neurons work, you're ready for:
- **Lesson 2**: How neurons communicate through synapses
- **Lesson 3**: Network effects and collective behavior

## Troubleshooting

**Voltage trace not updating?**
- Make sure you've selected a neuron (click on a blue sphere)
- Check that the simulation is running (not paused)

**Spikes happening too fast/slow?**
- Adjust the Speed slider in the top controls
- Try different Input Current values

**Want to reset?**
- Click "Reset Network" to start fresh
- All neurons will get new random initial voltages

## Summary

In this lesson, you learned:
1. How neurons integrate input current over time
2. The role of threshold and reset in spike generation
3. How firing rate depends on input strength
4. The importance of membrane time constant

**Congratulations!** You now understand the fundamental building block of all neural computation - the spiking neuron. In the next lesson, you'll discover how these individual neurons work together through synaptic connections to create complex neural networks.

## Self-Assessment

Before moving to Lesson 2, make sure you can:
- [ ] Explain what happens when a neuron reaches threshold
- [ ] Predict how changing input current affects firing rate
- [ ] Understand why voltage decays without input
- [ ] Identify the key parameters: threshold, time constant, reset

Ready for synapses and network dynamics? Let's continue!