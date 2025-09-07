import json, threading, queue, asyncio, websockets, time
from brian2 import *; from brian2 import prefs
prefs.codegen.target="numpy"

PORT=8766; NUM=50
CTRL={"paused":False,"dt_ms":50}  # UI controls

# Educational parameters
PARAMS = {
    "input_current": 0.5,
    "synapse_weight": 0.2,
    "connection_prob": 0.1,
    "tau": 10
}

def recreate_network():
    """Recreate network with current parameters"""
    global G, S, P, sm, vm, net
    
    start_scope()
    tau = PARAMS["tau"] * ms
    eqs = "dv/dt=(-v)/tau:1"
    
    G = NeuronGroup(NUM, eqs, threshold='v>1', reset='v=0', method='euler')
    G.v = 'rand()*0.5'
    
    S = Synapses(G, G, on_pre=f'v+={PARAMS["synapse_weight"]}')
    S.connect(p=PARAMS["connection_prob"])
    
    P = PoissonInput(G, 'v', 10, 2*Hz, weight=PARAMS["input_current"])
    
    sm = SpikeMonitor(G)
    vm = StateMonitor(G, 'v', record=True)
    net = Network(collect())

start_scope()
tau=10*ms; eqs="dv/dt=(-v)/tau:1"
G=NeuronGroup(NUM,eqs,threshold='v>1',reset='v=0',method='euler'); G.v='rand()*0.5'
S=Synapses(G,G,on_pre='v+=0.2'); S.connect(p=0.1)
P=PoissonInput(G,'v',10,2*Hz,weight=0.05)
sm=SpikeMonitor(G); vm=StateMonitor(G,'v',record=True)
net=Network(collect())

q=queue.Queue()
def brain_loop():
    last=0
    while True:
        if CTRL["paused"]: time.sleep(0.03); continue
        try:
            net.run(CTRL["dt_ms"]*ms)
            i,t=sm.i[:],sm.t[:]
            spikes=[{"i":int(i[k]),"t":float(t[k]/ms)} for k in range(last,len(i))]
            last=len(i)
            volt={str(r):float(vm.v[r,-1]) for r in range(NUM)}
            q.put({"t":float(defaultclock.t/ms),"spikes":spikes,"volt":volt})
        except Exception as e:
            print(f"Brain loop error: {e}")
            time.sleep(0.1)

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
                    print("Simulation paused")
                elif d.get("cmd") == "play": 
                    CTRL["paused"] = False
                    print("Simulation resumed")
                elif d.get("cmd") == "speed": 
                    CTRL["dt_ms"] = max(10, min(150, int(d["dt_ms"])))
                    print(f"Speed set to {CTRL['dt_ms']}ms")
                elif d.get("cmd") == "setInput":
                    PARAMS["input_current"] = float(d["value"])
                    P.weight = PARAMS["input_current"]
                    print(f"Input current set to {PARAMS['input_current']}")
                elif d.get("cmd") == "setWeight":
                    PARAMS["synapse_weight"] = float(d["value"])
                    # Note: Need to recreate synapses for weight change
                    print(f"Synapse weight set to {PARAMS['synapse_weight']}")
                elif d.get("cmd") == "setConnectionProb":
                    PARAMS["connection_prob"] = float(d["value"])
                    print(f"Connection probability set to {PARAMS['connection_prob']}")
                elif d.get("cmd") == "reset":
                    recreate_network()
                    print("Network reset with new parameters")
                    
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
