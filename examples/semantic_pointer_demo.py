"""
Semantic Pointer Binding Demo
==============================

Demonstrates how to bind "SHAPE" ⊛ "CIRCLE" and unbind to recover "SHAPE"
using semantic pointers in a Brian2 spiking neural network.

Network Architecture:
  Pool A (40 neurons) -> Represents "SHAPE"
  Pool B (40 neurons) -> Represents "CIRCLE"
  Pool C (40 neurons) -> Receives "SHAPE ⊛ CIRCLE" (bound)
  Pool D (40 neurons) -> Unbinds to recover "SHAPE"

This demonstrates:
1. Semantic pointer vocabulary creation
2. Neural encoding of semantic pointers
3. Binding operation through synaptic weights
4. Unbinding operation to recover original representation
5. Similarity measurement to validate accuracy

Author: Zae Project
License: MIT
"""

import numpy as np
from brian2 import (
    ms, NeuronGroup, Synapses, SpikeMonitor, StateMonitor,
    Network, start_scope
)
import sys
import os

# Add parent directory to path to import semantic_algebra
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.semantic_algebra import (
    SemanticVocabulary,
    NeuralEncoder,
    SemanticWeightGenerator,
    cosine_similarity
)


def create_binding_demo():
    """
    Create and run a 4-pool semantic pointer binding/unbinding demonstration.

    Returns:
        dict: Results including similarities and recovered vectors
    """
    print("=" * 70)
    print("Semantic Pointer Binding Demo")
    print("=" * 70)
    print()

    # ========================================================================
    # Step 1: Initialize Semantic Pointer System
    # ========================================================================
    print("Step 1: Initializing semantic pointer vocabulary...")
    sp_dim = 50
    n_neurons = 40

    vocab = SemanticVocabulary(dimensionality=sp_dim)
    vocab.add("SHAPE")
    vocab.add("CIRCLE")
    print(f"✓ Created vocabulary with {len(vocab)} vectors ({sp_dim}D)")
    print()

    # ========================================================================
    # Step 2: Create Neural Encoders
    # ========================================================================
    print("Step 2: Creating neural encoders for each pool...")
    encoder_a = NeuralEncoder(n_neurons=n_neurons, sp_dimensionality=sp_dim, seed=42)
    encoder_b = NeuralEncoder(n_neurons=n_neurons, sp_dimensionality=sp_dim, seed=43)
    encoder_c = NeuralEncoder(n_neurons=n_neurons, sp_dimensionality=sp_dim, seed=44)
    encoder_d = NeuralEncoder(n_neurons=n_neurons, sp_dimensionality=sp_dim, seed=45)
    print(f"✓ Created 4 encoders (each {n_neurons} neurons)")
    print()

    # ========================================================================
    # Step 3: Generate Weight Matrices
    # ========================================================================
    print("Step 3: Generating synaptic weight matrices...")

    # A → C: Bind SHAPE with CIRCLE
    gen_ac = SemanticWeightGenerator(encoder_a, encoder_c)
    W_ac = gen_ac.binding_weights(vocab.get("CIRCLE"))
    print(f"✓ Generated binding weights A→C (bind with CIRCLE)")
    print(f"  Shape: {W_ac.shape}, Range: [{W_ac.min():.3f}, {W_ac.max():.3f}]")

    # C → D: Unbind with CIRCLE to recover SHAPE
    gen_cd = SemanticWeightGenerator(encoder_c, encoder_d)
    W_cd = gen_cd.unbinding_weights(vocab.get("CIRCLE"))
    print(f"✓ Generated unbinding weights C→D (unbind with CIRCLE)")
    print(f"  Shape: {W_cd.shape}, Range: [{W_cd.min():.3f}, {W_cd.max():.3f}]")
    print()

    # ========================================================================
    # Step 4: Create Brian2 Neural Network
    # ========================================================================
    print("Step 4: Creating Brian2 spiking neural network...")
    start_scope()

    # Leaky integrate-and-fire neuron equations
    tau = 20 * ms
    eqs = '''
    dv/dt = (-v + I_input + I_syn) / tau : 1
    I_input : 1
    I_syn : 1
    '''

    # Create 4 neuron pools
    G_a = NeuronGroup(n_neurons, eqs, threshold='v>1', reset='v=0', method='euler')
    G_b = NeuronGroup(n_neurons, eqs, threshold='v>1', reset='v=0', method='euler')
    G_c = NeuronGroup(n_neurons, eqs, threshold='v>1', reset='v=0', method='euler')
    G_d = NeuronGroup(n_neurons, eqs, threshold='v>1', reset='v=0', method='euler')

    # Set initial inputs
    # Pool A encodes SHAPE
    shape_rates = encoder_a.encode(vocab.get("SHAPE"), gain=5.0)
    G_a.I_input = shape_rates * 0.02  # Scale to appropriate current range

    # Pool B encodes CIRCLE (not directly connected, just for comparison)
    circle_rates = encoder_b.encode(vocab.get("CIRCLE"), gain=5.0)
    G_b.I_input = circle_rates * 0.02

    print(f"✓ Created 4 neuron pools (A, B, C, D) with {n_neurons} neurons each")
    print(f"  Pool A: Encodes SHAPE (mean input: {G_a.I_input.mean():.4f})")
    print(f"  Pool B: Encodes CIRCLE (mean input: {G_b.I_input.mean():.4f})")
    print()

    # ========================================================================
    # Step 5: Create Synaptic Connections
    # ========================================================================
    print("Step 5: Creating synaptic connections with SP-derived weights...")

    # A → C: Binding operation
    S_ac = Synapses(G_a, G_c, 'w : 1', on_pre='I_syn_post += w')
    S_ac.connect()  # All-to-all
    # Apply weight matrix (flatten and assign based on source/target indices)
    for i in range(len(S_ac.i)):
        src_idx = int(S_ac.i[i])
        tgt_idx = int(S_ac.j[i])
        S_ac.w[i] = W_ac[tgt_idx, src_idx] * 0.01  # Scale weights

    # C → D: Unbinding operation
    S_cd = Synapses(G_c, G_d, 'w : 1', on_pre='I_syn_post += w')
    S_cd.connect()
    for i in range(len(S_cd.i)):
        src_idx = int(S_cd.i[i])
        tgt_idx = int(S_cd.j[i])
        S_cd.w[i] = W_cd[tgt_idx, src_idx] * 0.01

    print(f"✓ Connected A→C with {len(S_ac)} synapses (binding)")
    print(f"✓ Connected C→D with {len(S_cd)} synapses (unbinding)")
    print()

    # ========================================================================
    # Step 6: Add Monitors
    # ========================================================================
    print("Step 6: Adding monitors...")
    sm_a = SpikeMonitor(G_a)
    sm_c = SpikeMonitor(G_c)
    sm_d = SpikeMonitor(G_d)
    vm_a = StateMonitor(G_a, 'v', record=True)
    vm_c = StateMonitor(G_c, 'v', record=True)
    vm_d = StateMonitor(G_d, 'v', record=True)

    net = Network([G_a, G_b, G_c, G_d, S_ac, S_cd,
                   sm_a, sm_c, sm_d, vm_a, vm_c, vm_d])
    print("✓ Monitors added")
    print()

    # ========================================================================
    # Step 7: Run Simulation
    # ========================================================================
    print("Step 7: Running simulation (500ms)...")
    net.run(500 * ms)
    print("✓ Simulation complete")
    print()

    # ========================================================================
    # Step 8: Analyze Results
    # ========================================================================
    print("Step 8: Analyzing results...")
    print()

    # Calculate average firing rates for last 100ms
    def get_firing_rates(spike_monitor, duration=100):
        """Calculate firing rates from last duration ms."""
        recent_spikes = [
            i for i, t in zip(spike_monitor.i, spike_monitor.t)
            if t > (spike_monitor.t[-1] - duration*ms)
        ]
        rates = np.zeros(n_neurons)
        for idx in recent_spikes:
            rates[int(idx)] += 1
        rates = rates / (duration / 1000.0)  # Convert to Hz
        return rates

    rates_a = get_firing_rates(sm_a)
    rates_c = get_firing_rates(sm_c)
    rates_d = get_firing_rates(sm_d)

    print(f"Firing Rates (last 100ms):")
    print(f"  Pool A (SHAPE):        mean={rates_a.mean():.2f} Hz, max={rates_a.max():.2f} Hz")
    print(f"  Pool C (SHAPE⊛CIRCLE): mean={rates_c.mean():.2f} Hz, max={rates_c.max():.2f} Hz")
    print(f"  Pool D (recovered):    mean={rates_d.mean():.2f} Hz, max={rates_d.max():.2f} Hz")
    print()

    # Decode semantic pointers from firing rates
    recovered_shape = encoder_d.decode(rates_d)

    # Calculate similarities
    sim_original = cosine_similarity(vocab.get("SHAPE"), recovered_shape)
    sim_circle = cosine_similarity(vocab.get("CIRCLE"), recovered_shape)

    print("Similarity Analysis:")
    print(f"  Recovered vs SHAPE:  {sim_original:.3f} {'✓ PASS' if sim_original > 0.60 else '✗ FAIL'}")
    print(f"  Recovered vs CIRCLE: {sim_circle:.3f} {'✓ Should be low' if abs(sim_circle) < 0.4 else '✗ Too high'}")
    print()

    # ========================================================================
    # Step 9: Summary
    # ========================================================================
    print("=" * 70)
    print("Summary")
    print("=" * 70)
    print()
    print(f"1. Input:  Pool A encoded SHAPE")
    print(f"2. Bind:   A → C bound SHAPE with CIRCLE")
    print(f"3. Unbind: C → D unbound with CIRCLE to recover SHAPE")
    print(f"4. Result: Pool D recovered {sim_original*100:.1f}% of original SHAPE")
    print()

    if sim_original > 0.60:
        print("✓ SUCCESS: Semantic pointer binding/unbinding works!")
        print("  The network successfully recovered the original concept.")
    else:
        print("⚠ WARNING: Lower accuracy than expected")
        print(f"  Expected >60% similarity, got {sim_original*100:.1f}%")
        print("  This may be due to insufficient simulation time or neuron count.")
    print()
    print("=" * 70)

    return {
        "similarity_shape": sim_original,
        "similarity_circle": sim_circle,
        "rates_a": rates_a,
        "rates_c": rates_c,
        "rates_d": rates_d,
        "recovered_vector": recovered_shape,
        "success": sim_original > 0.60
    }


if __name__ == "__main__":
    # Set random seed for reproducibility
    np.random.seed(42)

    # Run the demonstration
    results = create_binding_demo()

    # Exit with success/failure code
    import sys
    sys.exit(0 if results["success"] else 1)
