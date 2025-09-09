import json, threading, queue, asyncio, websockets, time
from brian2 import *; from brian2 import prefs
prefs.codegen.target="numpy"

PORT=8766; NUM=50
CTRL={"paused":False,"dt_ms":50}  # UI controls

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

def recreate_network():
    """Recreate network with current parameters"""
    global G, S, P, sm, vm, net
    
    start_scope()
    tau = PARAMS["tau"] * ms
    # Fixed: Declare I_input as a parameter in the equations
    eqs = "dv/dt=(-v + I_input + I_noise + I_syn)/tau : 1\nI_input : 1\nI_noise : 1\nI_syn : 1"
    
    G = NeuronGroup(NUM, eqs, threshold='v>1', reset='v=0', method='euler')
    G.v = 'rand()*0.3'
    G.I_input = PARAMS["input_current"]
    # Add continuous background noise to keep network active
    G.I_noise = f'{PARAMS["noise_level"]} * randn()'  # Small random current
    
    S = Synapses(G, G, on_pre=f'v+={PARAMS["synapse_weight"]}')
    S.connect(p=PARAMS["connection_prob"])
    
    # Add Poisson input to maintain baseline activity
    P = PoissonInput(G, 'I_input', NUM, 2*Hz, weight=0.03)
    
    sm = SpikeMonitor(G)
    vm = StateMonitor(G, 'v', record=True)
    net = Network(collect())

# Initial network setup - Fixed with proper background activity
start_scope()
tau=8*ms
# Add noise term to prevent network death
eqs="dv/dt=(-v + I_input + I_noise)/tau : 1\nI_input : 1\nI_noise : 1"
G=NeuronGroup(NUM,eqs,threshold='v>1',reset='v=0',method='euler'); 
G.v='rand()*0.3'  # Lower initial voltages
G.I_input = 0.1  # External input current
G.I_noise = '0.05 + 0.02*randn()'  # Background noise

S=Synapses(G,G,on_pre='v+=0.15'); S.connect(p=0.08)
# Add Poisson input for sustained activity
P=PoissonInput(G, 'I_input', NUM, 2*Hz, weight=0.03)
sm=SpikeMonitor(G); vm=StateMonitor(G,'v',record=True)
net=Network(collect())

q=queue.Queue()
def brain_loop():
    last=0
    while True:
        if CTRL["paused"]: 
            time.sleep(0.05)  # Responsive pause
            continue
        try:
            # FIXED: Use CTRL["dt_ms"] directly for simulation speed
            dt = max(5, min(200, CTRL["dt_ms"])) * ms  # Wider range for better control
            net.run(dt)
            
            i,t=sm.i[:],sm.t[:]
            spikes=[{"i":int(i[k]),"t":float(t[k]/ms)} for k in range(last,len(i))]
            last=len(i)
            volt={str(r):float(vm.v[r,-1]) for r in range(NUM)}
            q.put({"t":float(defaultclock.t/ms),"spikes":spikes,"volt":volt})
            
            # FIXED: Sleep scales with speed for smooth control
            sleep_time = CTRL["dt_ms"] / 1000 * 0.2  # Proportional to simulation speed
            time.sleep(max(0.01, sleep_time))
        except Exception as e:
            print(f"Brain loop error: {e}")
            time.sleep(0.01)

threading.Thread(target=brain_loop,daemon=True).start()

clients=set()
async def handler(ws,path):
    clients.add(ws); print("Client connected:",ws.remote_address)
    async def rx():
        async for m in ws:
            try:
                d=json.loads(m)
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
                    noise_level = max(0.02, 0.1 - PARAMS["input_current"]*0.05)
                    G.I_noise = f'{noise_level} + {noise_level*0.4}*randn()'
                    print(f"Input current set to {PARAMS['input_current']}")
                elif d.get("cmd") == "setWeight":
                    PARAMS["synapse_weight"] = float(d["value"])
                    recreate_network()
                    print(f"Synapse weight set to {PARAMS['synapse_weight']}")
                elif d.get("cmd") == "setConnectionProb":
                    PARAMS["connection_prob"] = float(d["value"])
                    recreate_network()
                    print(f"Connection probability set to {PARAMS['connection_prob']}")
                elif d.get("cmd") == "reset":
                    recreate_network()
                    print("Network reset with new parameters")
                elif d.get("cmd") == "toggleWeights":
                    # Send realistic connection data
                    connections = []
                    
                    # Add E->E connections
                    if hasattr(S_ee, 'i') and len(S_ee.i) > 0:
                        for idx in range(len(S_ee.i)):
                            connections.append({
                                "from": int(S_ee.i[idx]), 
                                "to": int(S_ee.j[idx]), 
                                "weight": float(S_ee.w[idx]),
                                "type": "excitatory"
                            })
                    
                    # Add I->E connections (inhibitory)
                    if hasattr(S_ie, 'i') and len(S_ie.i) > 0:
                        for idx in range(len(S_ie.i)):
                            connections.append({
                                "from": int(S_ie.i[idx]) + N_exc,  # Offset for inhibitory neurons
                                "to": int(S_ie.j[idx]), 
                                "weight": float(S_ie.w[idx]),
                                "type": "inhibitory"
                            })
                    
                    await ws.send(json.dumps({"cmd": "showConnections", "connections": connections}))
                elif d.get("cmd") == "injectPattern":
                    # Inject a specific pattern for lesson 4
                    pattern_neurons = [0, 5, 10, 15, 20]  # Example pattern
                    for neuron_id in pattern_neurons:
                        if neuron_id < NUM:
                            G.v[neuron_id] = 0.8  # Bring close to threshold
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
        loop=asyncio.get_event_loop()
        while True:
            try:
                item=await loop.run_in_executor(None,q.get)
                if clients:
                    alive_clients = [c for c in list(clients) if not c.closed]
                    if alive_clients:
                        await asyncio.gather(*[c.send(json.dumps(item)) for c in alive_clients], return_exceptions=True)
            except Exception as e:
                print(f"Send error: {e}")
    
    try: 
        await asyncio.gather(rx(),tx())
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally: 
        clients.discard(ws)

async def main():
    print(f"Starting Brian2 SNN server...")
    print(f"WebSocket server at ws://localhost:{PORT}")
    print(f"Neurons: {NUM}, Initial state: {'paused' if CTRL['paused'] else 'running'}")
    
    async with websockets.serve(handler,"localhost",PORT):
        await asyncio.Future()

if __name__=="__main__": 
    asyncio.run(main())
