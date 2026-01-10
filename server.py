"""
Brain Emulation SNN Server

A WebSocket server for real-time spiking neural network simulation using Brian2.
Supports interactive parameter adjustment and visualization.
"""
import asyncio
import json
import queue
import threading
import time

import websockets
from brian2 import (
    Network, NeuronGroup, PoissonInput, SpikeMonitor, StateMonitor,
    Synapses, collect, defaultclock, ms, prefs, start_scope, Hz
)

prefs.codegen.target = "numpy"

# Server configuration
PORT = 8766
NUM = 50
NETWORK_MODE = "simple"  # "simple" or "realistic"

# UI control state
CTRL = {"paused": False, "dt_ms": 50}

# Neuron count variables (initialized for realistic mode)
N_exc = 0
N_inh = 0

# FIXED: Realistic SNN parameters based on neuroscience research
PARAMS = {
    "input_current": 0.02,  # Much lower baseline - realistic sparse firing
    "synapse_weight": 0.05,  # Weaker synapses for realistic dynamics
    "connection_prob": 0.1,  # Higher but more structured connectivity
    "tau": 20,  # Longer time constant (20ms) - more realistic
    "inhibition_strength": 0.15,  # Inhibitory connections
    "refractory_period": 5,  # 5ms refractory period
    "noise_level": 0.01  # Low background noise
}

def get_neuron_count():
    """
    Get current total number of neurons based on network mode.

    Returns:
        int: Total number of neurons in the active network
    """
    global NUM, N_exc, N_inh, NETWORK_MODE
    if NETWORK_MODE == "realistic":
        return N_exc + N_inh
    return NUM


def get_all_neurons():
    """
    Get unified neuron group for monitoring across network modes.

    Returns:
        NeuronGroup or combined group: Neurons to monitor
    """
    global G, G_exc, G_inh, NETWORK_MODE
    if NETWORK_MODE == "realistic":
        return G_exc + G_inh
    return G


def get_spike_monitor():
    """
    Get active spike monitor based on network mode.

    Returns:
        SpikeMonitor: Active spike monitor
    """
    global sm, NETWORK_MODE
    return sm


def get_voltage_monitor():
    """
    Get active voltage monitor based on network mode.

    Returns:
        StateMonitor: Active voltage monitor
    """
    global vm, NETWORK_MODE
    return vm


def recreate_network():
    """
    Recreate network with current parameters.

    Builds a simple spiking neural network with:
    - Leaky integrate-and-fire neurons
    - Random synaptic connectivity
    - Background Poisson input for sustained activity
    - Noise to prevent network death

    Updates global network objects: G, S, P, sm, vm, net
    """
    global G, S, P, sm, vm, net

    start_scope()
    tau = PARAMS["tau"] * ms

    # Declare I_input as a parameter in the equations
    eqs = (
        "dv/dt=(-v + I_input + I_noise + I_syn)/tau : 1\n"
        "I_input : 1\n"
        "I_noise : 1\n"
        "I_syn : 1"
    )

    G = NeuronGroup(
        NUM, eqs, threshold='v>1', reset='v=0', method='euler'
    )
    G.v = 'rand()*0.3'
    G.I_input = PARAMS["input_current"]

    # Add continuous background noise to keep network active
    G.I_noise = f'{PARAMS["noise_level"]} * randn()'

    S = Synapses(G, G, on_pre=f'v+={PARAMS["synapse_weight"]}')
    S.connect(p=PARAMS["connection_prob"])

    # Add Poisson input to maintain baseline activity
    P = PoissonInput(G, 'I_input', NUM, 2*Hz, weight=0.03)

    sm = SpikeMonitor(G)
    vm = StateMonitor(G, 'v', record=True)
    net = Network(collect())

# Initial network setup - Fixed with proper background activity
start_scope()
tau = 8 * ms

# Add noise term to prevent network death
eqs = (
    "dv/dt=(-v + I_input + I_noise)/tau : 1\n"
    "I_input : 1\n"
    "I_noise : 1"
)

G = NeuronGroup(NUM, eqs, threshold='v>1', reset='v=0', method='euler')
G.v = 'rand()*0.3'  # Lower initial voltages
G.I_input = 0.1  # External input current
G.I_noise = '0.05 + 0.02*randn()'  # Background noise

S = Synapses(G, G, on_pre='v+=0.15')
S.connect(p=0.08)

# Add Poisson input for sustained activity
P = PoissonInput(G, 'I_input', NUM, 2*Hz, weight=0.03)
sm = SpikeMonitor(G)
vm = StateMonitor(G, 'v', record=True)
net = Network(collect())

q = queue.Queue()


def brain_loop():
    """
    Main simulation loop running in background thread.

    Continuously runs the Brian2 network simulation and pushes
    results (spikes and voltages) to the queue for WebSocket transmission.

    Respects pause state and adjustable simulation speed.
    Works with both simple and realistic network modes.
    """
    last = 0
    while True:
        if CTRL["paused"]:
            time.sleep(0.05)  # Responsive pause
            continue
        try:
            # Use CTRL["dt_ms"] directly for simulation speed
            # Clamp to reasonable range
            dt = max(5, min(200, CTRL["dt_ms"])) * ms
            net.run(dt)

            # Get monitors using adapter functions
            spike_mon = get_spike_monitor()
            volt_mon = get_voltage_monitor()
            neuron_count = get_neuron_count()

            i, t = spike_mon.i[:], spike_mon.t[:]
            spikes = [
                {"i": int(i[k]), "t": float(t[k]/ms)}
                for k in range(last, len(i))
            ]
            last = len(i)
            volt = {
                str(r): float(volt_mon.v[r, -1])
                for r in range(neuron_count)
            }
            q.put({
                "t": float(defaultclock.t/ms),
                "spikes": spikes,
                "volt": volt
            })

            # Sleep scales with speed for smooth control
            sleep_time = CTRL["dt_ms"] / 1000 * 0.2
            time.sleep(max(0.01, sleep_time))
        except Exception as e:
            print(f"Brain loop error: {e}")
            time.sleep(0.01)


threading.Thread(target=brain_loop, daemon=True).start()

clients = set()


async def handler(ws, path):
    """
    WebSocket connection handler.

    Manages bidirectional communication:
    - rx: receives commands from client (pause, play, parameter updates)
    - tx: sends simulation data to client (spikes, voltages)

    Args:
        ws: WebSocket connection
        path: WebSocket path (unused)
    """
    clients.add(ws)
    print("Client connected:", ws.remote_address)

    async def rx():
        """Receive and process commands from client."""
        async for m in ws:
            try:
                d = json.loads(m)
                print(f"Received command: {d}")

                if d.get("cmd") == "pause":
                    CTRL["paused"] = True
                    print("✓ Simulation PAUSED")
                elif d.get("cmd") == "play":
                    CTRL["paused"] = False
                    print("✓ Simulation RESUMED")
                elif d.get("cmd") == "speed":
                    new_speed = max(5, min(200, int(d["dt_ms"])))
                    CTRL["dt_ms"] = new_speed
                    print(f"✓ Simulation speed: {new_speed}ms timestep")
                elif d.get("cmd") == "setInput":
                    PARAMS["input_current"] = float(d["value"])
                    G.I_input = PARAMS["input_current"]
                    noise_level = max(
                        0.02, 0.1 - PARAMS["input_current"]*0.05
                    )
                    G.I_noise = (
                        f'{noise_level} + {noise_level*0.4}*randn()'
                    )
                    print(f"Input current set to {PARAMS['input_current']}")
                elif d.get("cmd") == "setWeight":
                    PARAMS["synapse_weight"] = float(d["value"])
                    recreate_network()
                    print(
                        f"Synapse weight set to {PARAMS['synapse_weight']}"
                    )
                elif d.get("cmd") == "setConnectionProb":
                    PARAMS["connection_prob"] = float(d["value"])
                    recreate_network()
                    print(
                        f"Connection probability set to "
                        f"{PARAMS['connection_prob']}"
                    )
                elif d.get("cmd") == "setNetworkSize":
                    try:
                        new_num = int(d.get("value", NUM))
                        if 10 <= new_num <= 200:
                            print(
                                f"Changing network size: {NUM} -> {new_num}"
                            )
                            globals()['NUM'] = new_num
                            recreate_network()
                            await ws.send(json.dumps({
                                "cmd": "networkSizeChanged",
                                "value": new_num
                            }))
                        else:
                            print("setNetworkSize out of allowed range")
                    except Exception as ex:
                        print(f"Error setting network size: {ex}")
                elif d.get("cmd") == "reset":
                    recreate_network()
                    print("Network reset with new parameters")
                elif d.get("cmd") == "setNetworkMode":
                    mode = d.get("mode", "simple")
                    if mode in ["simple", "realistic"]:
                        NETWORK_MODE = mode
                        globals()["NETWORK_MODE"] = mode
                        print(f"Switching to {mode} network mode...")

                        if mode == "realistic":
                            create_realistic_network()
                            print(f"✓ Realistic network created:")
                            print(f"  - {N_exc} excitatory neurons (80%)")
                            print(f"  - {N_inh} inhibitory neurons (20%)")
                            print(f"  - Clustered connectivity")
                            print(f"  - 4 synapse types (E→E, E→I, I→E, I→I)")
                        else:
                            recreate_network()
                            print(f"✓ Simple network created:")
                            print(f"  - {NUM} homogeneous neurons")
                            print(f"  - Random connectivity")

                        await ws.send(json.dumps({
                            "cmd": "networkModeChanged",
                            "mode": mode,
                            "neuronCount": get_neuron_count()
                        }))
                    else:
                        print(f"Invalid network mode: {mode}")
                elif d.get("cmd") == "toggleWeights":
                    # Send simple connection data for visualization
                    connections = []

                    if hasattr(S, 'i') and len(S.i) > 0:
                        for idx in range(len(S.i)):
                            connections.append({
                                "from": int(S.i[idx]),
                                "to": int(S.j[idx]),
                                "weight": 0.15,  # Use fixed weight for now
                                "type": "excitatory"
                            })

                    await ws.send(json.dumps({
                        "cmd": "showConnections",
                        "connections": connections
                    }))
                elif d.get("cmd") == "injectPattern":
                    # Inject a specific pattern for lesson 4
                    pattern_neurons = [0, 5, 10, 15, 20]
                    for neuron_id in pattern_neurons:
                        if neuron_id < NUM:
                            # Bring close to threshold
                            G.v[neuron_id] = 0.8
                    print("Pattern injected")
                elif d.get("cmd") == "testMemory":
                    # Test pattern recall
                    test_neurons = [0, 5]  # Partial pattern
                    for neuron_id in test_neurons:
                        if neuron_id < NUM:
                            G.v[neuron_id] = 0.9
                    print("Memory test initiated")

            except Exception as e:
                print(f"Command error: {e}")

    async def tx():
        """Transmit simulation data to all connected clients."""
        loop = asyncio.get_event_loop()
        while True:
            try:
                item = await loop.run_in_executor(None, q.get)
                if clients:
                    alive_clients = [
                        c for c in list(clients) if not c.closed
                    ]
                    if alive_clients:
                        await asyncio.gather(
                            *[c.send(json.dumps(item))
                              for c in alive_clients],
                            return_exceptions=True
                        )
            except Exception as e:
                print(f"Send error: {e}")
    
    try:
        await asyncio.gather(rx(), tx())
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally:
        clients.discard(ws)


async def main():
    """Start the WebSocket server and run indefinitely."""
    print(f"Starting Brian2 SNN server...")
    print(f"WebSocket server at ws://localhost:{PORT}")
    state = 'paused' if CTRL['paused'] else 'running'
    print(f"Neurons: {NUM}, Initial state: {state}")

    async with websockets.serve(handler, "localhost", PORT):
        await asyncio.Future()

def create_realistic_network():
    """
    Create a biologically realistic SNN with proper topology.

    This function implements the advanced network architecture described in
    docs/spiking_neural_network_simulator_development_guide.md

    Features:
    - 80% excitatory / 20% inhibitory neuron ratio (research-backed)
    - Separate excitatory and inhibitory populations
    - Clustered connectivity with higher intra-cluster connections
    - Structured E→E, E→I, I→E, and I→I synaptic pathways
    - Realistic time constants (tau=20ms) and refractory periods
    - Proper inhibitory dynamics

    Updates global network objects:
    - G_exc, G_inh: Neuron groups (excitatory and inhibitory)
    - S_ee, S_ei, S_ie, S_ii: Synapse groups (E→E, E→I, I→E, I→I)
    - P, sm, vm, net: Poisson input, monitors, and network

    Reference:
        Based on neuroscience research showing cortical circuits have
        ~80% excitatory and ~20% inhibitory neurons (Beaulieu &
        Colonnier 1985; Ramaswamy et al. 2021).
    """
    global G_exc, G_inh, S_ee, S_ei, S_ie, S_ii, P, sm, vm, net, N_exc, N_inh

    start_scope()

    # Realistic neuron populations: 80% excitatory, 20% inhibitory
    N_exc = int(NUM * 0.8)
    N_inh = int(NUM * 0.2)

    tau = PARAMS["tau"] * ms
    tau_ref = PARAMS["refractory_period"] * ms

    # Leaky integrate-and-fire with realistic parameters
    eqs = """
    dv/dt = (-v + I_input + I_noise + I_syn)/tau : 1
    I_input : 1
    I_noise : 1
    I_syn : 1
    cluster : 1  # Which cluster this neuron belongs to
    """

    # Excitatory population with cluster assignments
    G_exc = NeuronGroup(
        N_exc, eqs,
        threshold='v > 1',
        reset='v = 0',
        refractory=tau_ref,
        method='euler'
    )

    # Inhibitory population
    G_inh = NeuronGroup(
        N_inh, eqs,
        threshold='v > 1',
        reset='v = 0',
        refractory=tau_ref/2,
        method='euler'
    )
    
    # Assign clusters (4 clusters for excitatory neurons)
    for i in range(N_exc):
        G_exc.cluster[i] = i // (N_exc // 4)  # 4 clusters

    for i in range(N_inh):
        G_inh.cluster[i] = 4  # Inhibitory cluster

    # Initialize with realistic resting potentials
    G_exc.v = 'rand() * 0.1'
    G_inh.v = 'rand() * 0.1'

    # Realistic input currents - only some neurons receive external input
    G_exc.I_input = 0
    G_inh.I_input = 0

    # Background noise
    G_exc.I_noise = f'{PARAMS["noise_level"]} * randn()'
    G_inh.I_noise = f'{PARAMS["noise_level"]} * randn()'
    
    # STRUCTURED CONNECTIVITY with weights
    S_ee = Synapses(
        G_exc, G_exc,
        'w : 1',
        on_pre='I_syn_post += w'
    )

    S_ei = Synapses(
        G_exc, G_inh,
        'w : 1',
        on_pre='I_syn_post += w'
    )

    S_ie = Synapses(
        G_inh, G_exc,
        'w : 1',
        on_pre='I_syn_post -= w'
    )

    S_ii = Synapses(
        G_inh, G_inh,
        'w : 1',
        on_pre='I_syn_post -= w'
    )
    
    # Create clustered connectivity
    def connect_clustered(
        synapses, source_group, target_group,
        prob_local=0.4, prob_distant=0.08
    ):
        """
        Connect neurons with clustered topology.

        Same-cluster connections have higher probability than cross-cluster.
        This creates modular network structure.
        """
        import numpy as np
        for i in range(len(source_group)):
            for j in range(len(target_group)):
                if i != j:  # No self-connections
                    # Same cluster = higher probability
                    if (hasattr(source_group, 'cluster') and
                            hasattr(target_group, 'cluster')):
                        same_cluster = (
                            source_group.cluster[i] ==
                            target_group.cluster[j]
                        )
                        if same_cluster:
                            if np.random.rand() < prob_local:
                                synapses.connect(i=i, j=j)
                        else:
                            if np.random.rand() < prob_distant:
                                synapses.connect(i=i, j=j)
                    else:
                        if np.random.rand() < prob_distant:
                            synapses.connect(i=i, j=j)
    
    # Apply structured connectivity
    connect_clustered(S_ee, G_exc, G_exc, prob_local=0.6, prob_distant=0.1)
    connect_clustered(S_ei, G_exc, G_inh, prob_local=0.0, prob_distant=0.5)
    connect_clustered(S_ie, G_inh, G_exc, prob_local=0.0, prob_distant=0.8)
    connect_clustered(S_ii, G_inh, G_inh, prob_local=0.0, prob_distant=0.3)
    
    # Set synaptic weights
    S_ee.w = PARAMS["synapse_weight"]
    S_ei.w = PARAMS["synapse_weight"] * 1.5
    S_ie.w = PARAMS["inhibition_strength"]
    S_ii.w = PARAMS["inhibition_strength"] * 0.8
    
    # SPARSE EXTERNAL INPUT - stimulate one cluster at a time
    cluster_to_stimulate = np.random.randint(0, 4)
    for i in range(N_exc):
        if G_exc.cluster[i] == cluster_to_stimulate:
            G_exc.I_input[i] = PARAMS["input_current"] * 2
    
    # Poisson input
    P = PoissonInput(G_exc, 'I_input', N_exc, 1*Hz, weight=0.01)
    
    # Monitors
    sm = SpikeMonitor(G_exc + G_inh)
    vm = StateMonitor(G_exc, 'v', record=True)
    
    net = Network(collect())
    
    return N_exc, N_inh


if __name__ == "__main__":
    asyncio.run(main())
