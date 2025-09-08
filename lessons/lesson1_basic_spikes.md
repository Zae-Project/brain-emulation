# Lesson 1: Understanding Basic Spike Dynamics

## Learning Objectives
- Understand how neurons integrate input over time
- Observe the relationship between input current and firing rate
- Visualize membrane potential dynamics and threshold crossing

## Theory

### The Leaky Integrate-and-Fire Model
A spiking neuron accumulates voltage over time according to:

$$\tau \frac{dV}{dt} = - (V - E_L) + R_m I(t)$$

where:
- $\tau$ is the membrane time constant
- $V$ is the membrane potential
- $E_L$ is the equilibrium potential
- $R_m$ is the membrane resistance
- $I(t)$ is the input current at time $t$

When the membrane potential $V$ reaches a certain threshold $\theta$, the neuron fires an action potential (spike) and the membrane potential is reset to a resting value.

### Parameters
- **Membrane Time Constant ($\tau$)**: Determines how quickly the membrane potential responds to changes in input current. A smaller $\tau$ means faster dynamics.
- **Equilibrium Potential ($E_L$)**: The membrane potential at which there is no net current through the membrane. It is typically around -70mV for mammalian neurons.
- **Membrane Resistance ($R_m$)**: A measure of how much the membrane resists the flow of current. High resistance means that the neuron will accumulate voltage more quickly.
- **Threshold ($\theta$)**: The critical value of membrane potential that must be reached for the neuron to fire an action potential.

## Simulation

In this simulation, you will be able to:
1. Adjust the parameters $\tau$, $E_L$, $R_m$, and $\theta$.
2. Inject a current $I(t)$ into the neuron and observe the resulting membrane potential $V(t)$.
3. Measure the inter-spike interval (ISI) and firing rate of the neuron.

### Tasks
- [ ] Task 1: Explore the effect of the membrane time constant $\tau$ on spike timing.
- [ ] Task 2: Investigate how the equilibrium potential $E_L$ influences the shape of the action potential.
- [ ] Task 3: Examine the role of membrane resistance $R_m$ in determining the firing rate of the neuron.
- [ ] Task 4: Analyze the impact of the threshold $\theta$ on the neuron's responsiveness to input current.

## Questions
1. How does changing the membrane time constant $\tau$ affect the neuron's ability to follow high-frequency input currents?
2. What is the relationship between the equilibrium potential $E_L$ and the resting membrane potential of the neuron?
3. How does membrane resistance $R_m$ interact with the input current to determine the firing rate of the neuron?
4. Why is the threshold $\theta$ critical for the generation of action potentials in the neuron?

## Further Reading
- Chapter 1: Introduction to Neural Dynamics
- Chapter 2: The Leaky Integrate-and-Fire Model in Detail
- Chapter 3: Experimental Methods for Studying Neuronal Activity
