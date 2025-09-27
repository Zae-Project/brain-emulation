# Spiking Neural Network Simulator Development Guide

## Introduction

This guide provides a comprehensive blueprint for developing a biologically inspired Spiking Neural Network (SNN) simulator. It is tailored for an AI coding assistant to progressively build and evolve the simulator, in alignment with the existing JavaScript interface of the project. We will cover the definition of neuron types and their parameters, templates for various brain regions (prefrontal cortex, hippocampus, thalamus), configuration file schemas, and guidelines for maintaining UI style and logic consistent with the current project. The goal is to create an evolving, modular codebase that can grow into a full brain emulation, eventually supporting features like STDP (spike-timing-dependent plasticity), structural plasticity, homeostatic tuning, and learning rules.

**Project Context:** The current interface allows configuring a network with a certain number of neurons and clusters (groups of neurons). Clusters are used to simulate modular brain circuits – connections are denser within a cluster and sparser across clusters. As we extend the simulator, we will introduce multiple neuron types per cluster and more complex region configurations, all while preserving the dark-themed UI (black background, white text, blue accents) and interactive controls defined in index.html, app.js, and styles.css. The code examples below follow the project’s style conventions (e.g. using existing CSS classes and variables, such as var(--bg) for background and var(--text) for text color) to ensure a seamless integration.

## Neuron Types and Biophysical Parameters

To emulate biological realism, we define several neuron types with preset biophysical parameters. Each neuron type (e.g. pyramidal cell, basket cell, chandelier cell) will have specific properties such as resting potential, spike threshold, reset potential after firing, refractory period (firing delay), and typical connectivity patterns. These parameters are drawn from neuroscience literature, ensuring the simulator’s defaults are grounded in real neuronal behavior. The table below summarizes the core neuron types and their key parameters:

- **Pyramidal Neuron** (excitatory): Found in cortex and hippocampus, these are excitatory principal neurons that use glutamate synapses.
- _Resting membrane potential:_ ≈ **-70 mV** (inside relative to outside)[[1]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=conductance). This is the voltage when the neuron is inactive.
- _Spike threshold:_ ≈ **- Fifty to -55 mV** (e.g. -50 mV)[[2]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=typically%20is%20dynamically%20changing%20as,synaptic%20effects%20described%20below%20between). When the membrane potential rises to this level, the neuron fires an action potential. In practice, pyramidal cells often have a threshold around -56 mV in experiments[[3]](https://medium.com/%40serurays/a-beginners-guide-to-computational-neuroscience-3260188a9c01#:~:text=The%20results%20reveal%20fascinating%20differences,70%20mV%20for%20brainstem%20neurons), so using -55 mV is a reasonable default.
- _Post-spike reset potential:_ ≈ **-55 to -60 mV**[[2]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=typically%20is%20dynamically%20changing%20as,synaptic%20effects%20described%20below%20between). After a spike, the neuron’s voltage is reset to a slightly hyperpolarized value (e.g. -55 mV) to simulate the afterhyperpolarization. This brief dip helps enforce a refractory period.
- _Refractory period:_ **2–5 ms** (absolute). During this time after a spike (~2 ms absolute refractory), the neuron cannot fire again. Pyramidal neurons often exhibit an additional relative refractory period where they are less excitable for a few milliseconds more.
- _Membrane time constant:_ ~**20 ms** (typical for cortical pyramidal cells). This governs how quickly the neuron’s voltage decays back toward rest.
- _Synaptic dynamics:_ Uses **AMPA** (and NMDA) receptors for excitatory post-synaptic potentials (EPSPs). AMPA receptors mediate fast excitatory transmission[[4]](https://en.wikipedia.org/wiki/AMPA_receptor#:~:text=The%20%CE%B1,and%20colleagues%20after%20the%20naturally) – EPSPs rise in ~1–5 ms and decay in ~10–20 ms. For example, an EPSP on a pyramidal cell might have a 10–90% rise time of ~3.2 ms and a decay time constant on the order of 15 ms. NMDA receptors (slower, voltage-dependent) are not included at this stage but can be added later.
- _Connectivity profile:_ Pyramidal neurons make long-range excitatory connections. Within a cluster (local circuit), a pyramidal cell typically connects to a fraction of other pyramids (e.g. ~10–20% probability) and to many local interneurons. Across clusters, pyramidal-pyramidal connections are sparser (simulating that most strong connections are local). Pyramidal outputs target both other cortical areas and, in the case of hippocampal ones, other hippocampal regions. We assume their excitatory synapses have a synaptic delay around **1–5 ms** (axonal conduction + synaptic transmission). In simulations, this can be modeled as a random delay per connection (for example, uniformly 1–5 ms or normally distributed around 2 ms). _(Biologically, cortical synaptic delays are often ~0.5–2 ms minimum_[_[5]_](https://royalsocietypublishing.org/doi/10.1098/rspb.1965.0016#:~:text=Journals%20royalsocietypublishing,75%20ms)_; we will use ~1 ms as a base and add variability.)_
- **Basket Interneuron** (inhibitory): Basket cells are fast-spiking GABAergic interneurons that target the soma/proximal dendrites of pyramidal cells.
- _Resting potential:_ ≈ **-65 to -70 mV** (similar to pyramidal). We can use -70 mV as well.
- _Spike threshold:_ ≈ **- Fifty mV** (slightly higher (less negative) than pyramidal, e.g. -50 mV). Basket cells often require strong input to fire, but they receive convergent excitation from many pyramids. In practice, parvalbumin-positive basket cells are very fast and can fire at high frequencies, indicating quick integration of inputs. We set their threshold in the same range as pyramidal or slightly less excitable if needed (tunable).
- _Reset potential:_ ≈ **-70 mV** (or slightly below). Fast-spiking interneurons often have minimal afterhyperpolarization; they tend to quickly resume firing if input persists. We might reset them to the resting potential (no extra hyperpolarization) to allow rapid repetitive firing.
- _Refractory period:_ **1–2 ms** (short). These cells can fire at high rates (e.g. 100–200 Hz), so a very brief refractory period (around 1 ms absolute) is used to simulate their fast-spiking nature.
- _Membrane/time constant:_ ~**10 ms or less**. Smaller cells have a lower membrane time constant, meaning they respond and reset faster than large pyramidal neurons.
- _Synaptic dynamics:_ Uses **GABA<sub>A</sub> receptors** for inhibitory post-synaptic potentials (IPSPs). GABA<sub>A</sub> currents are fast, causing chloride ions to flow and hyperpolarize the target cell. The IPSP rise time is ~1–2 ms and decay ~5–15 ms (fast inhibition). For example, interneuron→pyramidal IPSPs might rise in ~1.7 ms. The reversal potential for GABA<sub>A</sub> is near -70 mV, so activation of these synapses drives the target toward -70 mV (making it harder to reach threshold)[[6]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=the%20inhibitory%20synaptic%20current%20that,Due%20to%20their).
- _Connectivity profile:_ Basket cells are local circuit inhibitory neurons. Each basket cell typically connects to _many_ nearby pyramidal neurons (providing widespread perisomatic inhibition). For modeling, we can assume a basket cell inhibits a large fraction of pyramidal cells in the same cluster (e.g. 80–100% of them within a certain radius). Basket cells may also inhibit other interneurons (I→I connections), though often basket cells primarily target excitatory cells. In our simulator, we can include some I→I connections for completeness (e.g. basket-to-basket synapses with lower probability). Basket cells receive excitatory input from local pyramidal neurons (E→I) – often every nearby pyramidal connects to the interneuron with moderate probability, since feed-forward and feedback excitation of interneurons is common. Across clusters, basket cell connections are rare (we mainly confine inhibition within a region).
- **Chandelier Interneuron** (inhibitory): Chandelier (axo-axonic) cells are a special interneuron type that targets the axon initial segment of pyramidal neurons. They provide powerful inhibition right at the spike initiation zone.
- _Resting potential:_ ≈ **-65 to -70 mV** (as other neurons).
- _Spike threshold:_ ≈ **- Fifty mV** (similar to or slightly higher than basket cell). Chandelier cells are also fast-spiking; for simplicity we can treat their threshold like basket cells.
- _Reset potential:_ ≈ **-70 mV**. We assume a quick reset, enabling high-frequency firing if needed (chandelier cells can fire bursts of spikes).
- _Refractory:_ **1–2 ms** (short, fast-spiking property).
- _Membrane constant:_ ~**10 ms** or less (fast membrane dynamics).
- _Synaptic dynamics:_ **GABA<sub>A</sub>** synapses (fast IPSPs) onto the initial segment of pyramidal neurons. Functionally similar kinetics to basket cell synapses (fast rise, 5–10 ms decay), but these synapses are strategically located to strongly control whether the pyramidal cell can fire. In some literature, chandelier cell synapses can effectively “veto” pyramidal spikes. We model them as standard inhibitory synapses with perhaps a slightly larger weight effect (since axo-axonic synapses have a strong influence).
- _Connectivity profile:_ Each chandelier cell typically connects to the initial segments of dozens of pyramidal neurons in its vicinity. In a cortical column, one chandelier might innervate 50–200 pyramids. For our purposes, within a cluster, assume a chandelier connects to a high percentage of pyramidal neurons (say ~50–100% of them). Unlike basket cells which target soma, chandeliers target axons – but for simulation this distinction just means another inhibitory input. Chandelier cells usually receive excitatory inputs from pyramidal neurons as well (E→I), similar to basket cells, and possibly from other regions. They may also inhibit each other or other interneurons to a lesser extent. In modeling, we can group chandelier outputs with basket outputs as both providing inhibition, but sometimes chandeliers are treated separately due to their unique targeting.

**Technical Term Explanations:**

- **AMPA receptor (AMPAR):** An ionotropic glutamate receptor that mediates _fast excitatory_ synaptic transmission in the brain[[4]](https://en.wikipedia.org/wiki/AMPA_receptor#:~:text=The%20%CE%B1,and%20colleagues%20after%20the%20naturally). When an excitatory neuron (like a pyramidal cell) releases glutamate onto an AMPA receptor on a post-synaptic cell, it causes a rapid depolarizing current (Na<sup>+</sup> influx), producing an EPSP (excitatory post-synaptic potential). AMPA EPSPs are brief, typically peaking within a couple of milliseconds and decaying over a few to tens of milliseconds. (NMDA receptors, not explicitly simulated here yet, are slower glutamate receptors that also allow Ca<sup>2+</sup> influx and have longer-lasting effects.)

* **GABA receptor (GABA<sub>A</sub>):** An ionotropic receptor for the neurotransmitter GABA, responsible for _fast inhibitory_ synaptic transmission. Activation of GABA<sub>A</sub> receptors opens Cl<sup>-</sup> channels, usually causing Cl<sup>-</sup> to enter the neuron (since resting potential ~ -70 mV is above Cl<sup>-</sup> equilibrium ~ -75 mV). This drives the membrane potential toward **-70 mV**, inhibiting firing[[6]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=the%20inhibitory%20synaptic%20current%20that,Due%20to%20their). The resulting IPSP is a hyperpolarization (or shunting effect) that makes it harder for the neuron to reach threshold. GABAergic IPSPs peak quickly (within ~1–5 ms) and typically decay in 5–20 ms. We focus on GABA<sub>A</sub> (fast); there is also GABA<sub>B</sub> (metabotropic, slower inhibitory effect) which we do not include at this stage.
* **E→I, I→E, E→E, I→I connections:** Notation for who is connecting to whom. “E” denotes an excitatory neuron (like a pyramidal or thalamic relay cell), and “I” denotes an inhibitory neuron (interneuron). For example, **I→E** means an inhibitory neuron synapsing onto an excitatory neuron, causing an IPSP in the excitatory neuron. **E→I** means an excitatory neuron synapsing onto an interneuron, causing an EPSP in the interneuron (thus recruiting inhibition). **E→E** is an excitatory-to-excitatory connection (EPSP in the post-synaptic excitatory neuron), and **I→I** is inhibitory-to-inhibitory (one interneuron suppressing another). These connection types are key to network dynamics: E→I and I→E form feedback loops (excitatory neurons trigger interneurons which then inhibit excitatory neurons, a mechanism for oscillations and gain control), while E→E provides recurrent excitation and I→I can synchronize or desynchronize inhibitory networks. In our simulator, we will allow configuration of different probabilities for each connection type. For instance, within a cluster, **I→E** might be very high (each interneuron targets most excitatory cells), **E→I** also high (each excitatory targets many interneurons), **E→E** moderate/sparse (excitatory neurons have fewer direct connections among themselves), and **I→I** low (interneurons may sparsely inhibit each other). By default, connections across clusters (between different groups) will be much sparser than within a cluster. This clustered connectivity mimics the brain’s organization into local modules or microcolumns.

**Expected Parameter Values:** Based on the above, here are some typical numeric defaults we will use in the SNN (these can be adjusted as needed for realism or performance):

- Resting potential (all neurons): **-70 mV**[[1]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=conductance).
- Spike threshold: **-55 mV** for excitatory cells (pyramidal) and around **-50 mV** for fast-spiking inhibitory cells (a slightly higher threshold means needing more depolarization to fire)[[2]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=typically%20is%20dynamically%20changing%20as,synaptic%20effects%20described%20below%20between). In practice, threshold can vary (pyramidal ~ -56 mV, interneurons often similar or a bit different), but these are good starting averages.
- Reset potential after spike: **-65 mV** for excitatory (a bit below rest to include afterhyperpolarization)[[2]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=typically%20is%20dynamically%20changing%20as,synaptic%20effects%20described%20below%20between), and perhaps **-70 mV** for inhibitory (since we assume minimal AHP, resetting to baseline).
- Synaptic reversal potentials: 0 mV for excitatory (AMPA) channels, -70 mV for inhibitory (GABA) channels[[6]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=the%20inhibitory%20synaptic%20current%20that,Due%20to%20their)[[7]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=reversal%20potential%20VGABA%20of%20typically,will%20tend%20to%20hyperpolarize%20the). (These are used if modeling conductance-based synapses; for current-based models, one simply uses positive or negative weight.)
- EPSP time constants: **Rise ~2 ms, Decay ~10 ms** (AMPA). We may implement a simple model where an EPSP adds a fixed increment or use a dual-exponential. For now, assume each excitatory spike delivers a fast impulse current that affects the post-synaptic potential for ~10–20 ms total.
- IPSP time constants: **Rise ~1 ms, Decay ~5 ms** (GABA<sub>A</sub>). Inhibitory effect is fast and short.
- Synaptic delay: **~1 ms** (with variability). Each connection can have a small transmission delay; we will often neglect propagation delay for simplicity in a small network, but to be realistic, one can draw a delay from a distribution (e.g. normal with mean 1 ms, SD 0.2 ms for local connections). Long-range connections (between clusters or regions) could use slightly larger delays (e.g. 5–10 ms if simulating inter-regional conduction time).

These values are grounded in neuroscience norms: e.g. integrate-and-fire models commonly use -70 mV rest, -50 mV threshold, -55 mV reset[[2]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=typically%20is%20dynamically%20changing%20as,synaptic%20effects%20described%20below%20between)[[1]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=conductance), and known synaptic kinetics give the millisecond-scale EPSP/IPSP times. By using these as defaults, the simulator’s behavior (firing rates, temporal dynamics) will qualitatively match real neural tissue. The code should treat these as configurable constants (allowing advanced users to tweak if needed).

## Brain Region Templates and Cluster Configurations

To organize the SNN into biologically inspired structures, we define **templates for brain regions**. A template describes one or more clusters of neurons, the neuron type composition in those clusters, and typical connectivity patterns. These templates will help users (or the AI assistant) quickly instantiate networks resembling specific brain areas. We provide templates for the prefrontal cortex, hippocampus, and thalamus as examples. Each template is essentially a JSON/JavaScript object (or could be a JSON file) that can be loaded to configure the network.

Each **Cluster** in a template represents a localized circuit (e.g. a cortical microcolumn, a hippocampal subregion, etc.). We define the cluster’s neuron groups (counts of each neuron type) and internal connectivity. Additionally, the template can specify **ConnectionEdges** between clusters (for multi-cluster templates), describing how clusters are interconnected (e.g. a connection from a hippocampal CA3 cluster to a CA1 cluster). Below, we describe each region template with an example configuration.

### Prefrontal Cortex (PFC) Template

The prefrontal cortex is a six-layered cortical area, but here we abstract it as a network of excitatory pyramidal neurons and inhibitory interneurons (basket and chandelier cells) arranged in clusters (which you can think of as cortical microcolumns or functional ensembles). Empirically, cortex has about **80% excitatory** and **20% inhibitory** neurons[[8]](https://pmc.ncbi.nlm.nih.gov/articles/PMC3059704/#:~:text=,inhibitory%20%28), so our configuration will reflect that ratio.

**Cluster composition:** We will model the PFC with clusters containing roughly 80% pyramidal cells, 15% basket cells, and 5% chandelier cells (the two interneuron types together making ~20%). For example, a cluster of 100 neurons could have 80 pyramidal, 15 basket, 5 chandelier. You can scale the cluster size as needed; the template will use parameters to maintain the proportions. The number of clusters can also be adjusted – multiple clusters can represent multiple microcolumns or subnetworks in PFC that have sparse inter-connections.

**Connectivity:** Within a PFC cluster, we configure dense recurrent excitation and inhibition: pyramidal neurons will connect to other pyramids with a moderate probability (e.g. 10%), and to interneurons with higher probability (maybe 50%). Interneurons (both basket and chandelier) will target most of the pyramidal cells (e.g. 80%+). Basket cells might inhibit other basket cells to a small extent (to avoid all interneurons firing synchronously), whereas chandelier cells primarily focus on pyramids. Across different clusters in PFC, connectivity is sparse (perhaps a few percent). This creates a clustered network architecture where each cluster is a heavily interconnected unit, and clusters are linked by few long-range connections.

**Example – Single-Cluster PFC template (JavaScript):**

```javascript
// Prefrontal Cortex Template: one cluster representing a cortical microcolumn
const TemplatePFC = {
  regionName: "Prefrontal Cortex",
  clusters: [
    {
      id: "PFC_cluster1",
      name: "PFC Microcolumn 1",
      neuronGroups: [
        { preset: "pyramidal", count: 80 }, // 80 excitatory pyramidal neurons
        { preset: "basket", count: 15 }, // 15 basket interneurons (inhibitory)
        { preset: "chandelier", count: 5 }, // 5 chandelier interneurons (inhibitory)
      ],
      internalConnectivity: [
        // Connectivity rules within this cluster:
        // fromType, toType, probability, and synaptic type are specified.
        {
          from: "pyramidal",
          to: "pyramidal",
          probability: 0.1,
          type: "excitatory",
        }, // E→E, 10% chance
        {
          from: "pyramidal",
          to: "basket",
          probability: 0.5,
          type: "excitatory",
        }, // E→I (basket), 50%
        {
          from: "pyramidal",
          to: "chandelier",
          probability: 0.5,
          type: "excitatory",
        }, // E→I (chandelier), 50%
        {
          from: "basket",
          to: "pyramidal",
          probability: 0.8,
          type: "inhibitory",
        }, // I (basket) → E, 80%
        {
          from: "chandelier",
          to: "pyramidal",
          probability: 0.8,
          type: "inhibitory",
        }, // I (chandelier) → E, 80%
        { from: "basket", to: "basket", probability: 0.1, type: "inhibitory" }, // I→I (basket to basket), low prob
        // (We assume chandelier→basket or chandelier→chandelier connections are negligible or not included.)
      ],
    },
  ],
  connections: [], // No inter-cluster connections in this single-cluster template
};
```

In this example, we have one cluster (PFC_cluster1). The neuronGroups define the counts for each neuron type using presets (we will define the presets separately in the configuration schema). The internalConnectivity array lists connection rules: for instance, { from: "pyramidal", to: "pyramidal", probability: 0.1, type: "excitatory" } means each pyramidal cell has a 10% chance of connecting to any given other pyramidal cell in the same cluster with an excitatory synapse (AMPA-mediated). Similarly, pyramidal→basket and pyramidal→chandelier have 50% chance – meaning each pyramidal neuron will provide excitatory input to roughly half the interneurons, ensuring the inhibitory cells get ample excitation. Basket and chandelier cells both inhibit pyramidal cells (80% probability suggests nearly all pyramids receive input from each interneuron, which creates a strong blanket of inhibition). Basket→basket inhibition is set at 0.1 (10% chance) as a small lateral inhibition among interneurons. We did not include chandelier→interneuron connections in this template for simplicity (those can be considered negligible or could be added similarly with low probability). The connections array is empty because with a single cluster there are no inter-cluster links; if we had multiple clusters in PFC, we would list their sparse connections here.

_(UI note:_ When implementing this in the interface, the cluster’s neuron counts and connectivity could be exposed in a “Cluster Configuration” panel. Sliders or input fields could allow adjusting the percentages or toggling certain connection types. The UI should use consistent styling – e.g., using .control-group and slider elements similar to existing controls. For example, a slider for cluster count already exists (“Clusters: <span id="clustersValue">4</span>”); similarly, one could have an interface to adjust the E→I connection probability with a slider, showing the value in a span, etc. The exact UI controls can be added following the pattern in index.html and styles.css.)

### Hippocampus Template

The hippocampus is another brain region with distinct substructures (e.g. CA1, CA3, dentate gyrus). A simplified approach is to consider two main clusters: one representing CA3 (which has strong recurrent excitation and acts as an autoassociative memory) and one representing CA1 (which receives input from CA3 and sends output onward). We will include interneurons in each cluster for inhibition (mostly basket cells in hippocampus).

**Cluster composition:**

- **CA3 cluster:** Predominantly pyramidal neurons (excitatory) with some basket interneurons. CA3 is known for recurrent collateral connections among pyramidal cells (E→E) forming an auto-associative network for memory. We might configure CA3’s pyramidal-pyramidal connectivity to be higher than in cortex (since CA3 is very recurrent). For instance, maybe ~30% E→E connection probability in CA3 cluster. Interneurons in CA3 provide feedback inhibition to control excitation.
- **CA1 cluster:** Also pyramidal cells and interneurons, but CA1’s pyramidal cells receive major input from CA3 rather than from each other. So within CA1 cluster, we can keep E→E connectivity lower (like 10%), focusing instead on connections coming from CA3. Interneurons in CA1 inhibit the CA1 pyramids as usual.
- We’ll include around 80–85% excitatory and 15–20% inhibitory in each cluster (similar to cortex ratio[[9]](https://pmc.ncbi.nlm.nih.gov/articles/PMC5595216/#:~:text=Cultured%20networks%20of%20excitatory%20projection,1%2C%202%29%20a)). For example, CA3 cluster with 100 neurons: 80 pyramidal, 20 interneurons; CA1 cluster with 100 neurons: 80 pyramidal, 20 interneurons.

**Inter-cluster connections:**
The hallmark connection is **CA3 → CA1** (the Schaffer collateral pathway), which is excitatory. Virtually every CA3 pyramidal cell connects to CA1 pyramidal cells with some probability; in biology this projection is quite extensive but not full (maybe on the order of 30% connectivity). We will include an excitatory ConnectionEdge from the CA3 cluster’s pyramidal group to the CA1 cluster’s pyramidal group (and possibly to CA1 interneurons as well, since excitatory inputs also excite interneurons in the target region). There is also input from entorhinal cortex to both CA3 and CA1 (perforant path) and feedback from CA1 to entorhinal, but we omit those for simplicity. We _will_ include **CA1 → CA3** connections _if_ modeling recurrent loops (there isn’t a direct CA1 to CA3 monosynaptic path in reality, so we can skip it, or set it zero). Instead, any feedback is via other structures, so we will not have CA1→CA3 here.

**Connectivity within clusters:**

- **CA3:** high E→E (e.g. 0.3), high E→I (0.5), high I→E (0.8), etc. This cluster can sustain reverberatory activity (memory recall) due to recurrent excitation, moderated by inhibition.
- **CA1:** lower E→E (0.1), E→I (0.5), I→E (0.8) similar to cortex. CA1 acts more like a feed-forward receiver from CA3 and doesn’t have as strong recurrent loops internally.

**Example – Hippocampus template with two clusters (CA3 and CA1):**

```javascript
// Hippocampus Template with CA3 and CA1 clusters
const TemplateHippocampus = {
  regionName: "Hippocampus",
  clusters: [
    {
      id: "CA3_cluster",
      name: "CA3 Region",
      neuronGroups: [
        { preset: "pyramidal", count: 80 }, // CA3 pyramidal cells
        { preset: "basket", count: 20 }, // CA3 interneurons (mostly basket-type)
      ],
      internalConnectivity: [
        {
          from: "pyramidal",
          to: "pyramidal",
          probability: 0.3,
          type: "excitatory",
        }, // CA3 recurrent E→E (30%)
        {
          from: "pyramidal",
          to: "basket",
          probability: 0.5,
          type: "excitatory",
        }, // E→I (excite interneurons)
        {
          from: "basket",
          to: "pyramidal",
          probability: 0.8,
          type: "inhibitory",
        }, // I→E (feedback inhibition)
        { from: "basket", to: "basket", probability: 0.1, type: "inhibitory" }, // some I→I in CA3
      ],
    },
    {
      id: "CA1_cluster",
      name: "CA1 Region",
      neuronGroups: [
        { preset: "pyramidal", count: 80 }, // CA1 pyramidal cells
        { preset: "basket", count: 20 }, // CA1 interneurons
      ],
      internalConnectivity: [
        {
          from: "pyramidal",
          to: "pyramidal",
          probability: 0.1,
          type: "excitatory",
        }, // CA1 E→E (10%, weaker)
        {
          from: "pyramidal",
          to: "basket",
          probability: 0.5,
          type: "excitatory",
        }, // E→I within CA1
        {
          from: "basket",
          to: "pyramidal",
          probability: 0.8,
          type: "inhibitory",
        }, // I→E within CA1
        { from: "basket", to: "basket", probability: 0.1, type: "inhibitory" },
      ],
    },
  ],
  connections: [
    // Schaffer collateral: CA3 pyramids -> CA1 pyramids and interneurons
    {
      fromCluster: "CA3_cluster", // source cluster ID
      toCluster: "CA1_cluster", // target cluster ID
      connectivity: [
        {
          from: "pyramidal",
          to: "pyramidal",
          probability: 0.3,
          type: "excitatory",
          delay: 5,
        }, // CA3 E -> CA1 E (30%, ~5 ms delay)
        {
          from: "pyramidal",
          to: "basket",
          probability: 0.3,
          type: "excitatory",
          delay: 5,
        }, // CA3 E -> CA1 I (feedforward excite interneurons)
      ],
    },
  ],
};
```

In this TemplateHippocampus, we have two clusters defined in the clusters array: one for CA3 and one for CA1. Each has its own internal connectivity rules. The connections array then defines inter-cluster connections. Here we created one ConnectionEdge object: from CA3_cluster to CA1_cluster. Inside it, we specify that CA3 pyramidal cells connect to CA1 pyramidal cells (30% probability, excitatory) and also to CA1 basket cells (30% probability, excitatory). We included a delay: 5 (ms) to suggest that the CA3→CA1 connection has a slightly longer propagation delay (since this is a longer-range projection than within a cluster – you can adjust this, e.g. 3–5 ms). If needed, more fields like weight could be added (not shown here, assuming default weight handling elsewhere). We did not include a reverse CA1→CA3 connection (there is none directly in biology).

This template allows the simulator to reproduce known hippocampal dynamics: CA3 can generate persistent activity (with 30% recurrent excitatory loops) and sends outputs to CA1; CA1 neurons fire in response but are regulated by both feedforward inhibition (CA3→CA1 interneurons) and feedback inhibition (CA1 interneurons via I→E). The interneuron populations (20 in each cluster) provide about a 4:1 ratio of excitatory to inhibitory neurons, aligning with biological precedent[[10]](https://pmc.ncbi.nlm.nih.gov/articles/PMC5595216/#:~:text=Cultured%20networks%20of%20excitatory%20projection,1%2C%202%29%20a).

_(Advanced extension:_ One could expand the hippocampal template by adding a **dentate gyrus** cluster and **entorhinal cortex input** connections. For example, a dentate cluster of granule cells with sparse connections to CA3 (the mossy fiber pathway), and an EC cluster providing input to both dentate and CA1. For brevity, we omit those; however, the modular structure of templates makes it straightforward to add more clusters and connections.)

### Thalamus Template

The thalamus acts as a relay station routing sensory and cortical information. We’ll model a simple thalamic circuit comprising excitatory relay neurons and inhibitory neurons (e.g. from the thalamic reticular nucleus or local interneurons). In reality, thalamic relay cells (often T-cells) have intrinsic bursting properties and are regulated by a surrounding reticular nucleus of inhibitory neurons. Our template will include these as separate groups and can be extended in future for bursting dynamics.

**Cluster composition:** We can represent the thalamus with one cluster containing two neuron groups: **relay neurons** (excitatory, glutamatergic) and **reticular interneurons** (inhibitory, GABAergic). The ratio in the actual thalamus varies by nucleus, but often the majority are relay cells. We might choose, say, 90 relay cells to 10 inhibitory cells in a 100-neuron cluster (90% excitatory, 10% inhibitory). Alternatively, we can treat the reticular nucleus as a separate cluster that only consists of inhibitory neurons that connect to the relay cluster. For simplicity, here we’ll do a single cluster but illustrate the connectivity as if there are two subpopulations.

**Connectivity:**

- Within the thalamic cluster: Relay (E) neurons do not excite each other strongly (thalamic relay cells are usually more feed-forward). We can set E→E very low or 0. Instead, relay cells will send collaterals to inhibitory cells (E→I), and inhibitory cells will project back to relay cells (I→E), forming a reciprocal interaction. This models how the thalamic reticular nucleus provides inhibition to relay cells, and relay cells excite the reticular neurons. Among inhibitory cells (I→I), there might be some interconnections (the reticular neurons are known to interconnect with each other, possibly via gap junctions or synapses). We might include a small I→I as well.
- The net effect is a feedback inhibition loop: if relay cells get excited (e.g. by sensory input), they activate the reticular neurons which then inhibit the relay cells, controlling burst timing and attention gating.

* External connections: The thalamus template on its own doesn’t specify cortical connections, but in practice, one would connect thalamic relay cells to cortical pyramidal cells (thalamocortical connections, E→E to cortex) and have cortical feedback to thalamus (corticothalamic, E→E to relay and E→I to reticular). Those can be configured when integrating this template with a cortex template. For now, we define just the thalamic internal structure.

**Example – Thalamus (single cluster with two groups):**

```javascript
// Thalamus Template: relay neurons and inhibitory reticular neurons in one cluster
const TemplateThalamus = {
  regionName: "Thalamus",
  clusters: [
    {
      id: "Thalamus_cluster",
      name: "Thalamic Relay + Reticular",
      neuronGroups: [
        { preset: "relay", count: 90 }, // Thalamic relay cells (excitatory)
        { preset: "inhibitory", count: 10 }, // Thalamic inhibitory neurons (reticular)
      ],
      internalConnectivity: [
        // Relay -> Inhibitory (excite reticular neurons)
        {
          from: "relay",
          to: "inhibitory",
          probability: 0.5,
          type: "excitatory",
        },
        // Inhibitory -> Relay (inhibit relay cells)
        {
          from: "inhibitory",
          to: "relay",
          probability: 0.8,
          type: "inhibitory",
        },
        // Lateral inhibition among reticular inhibitory neurons (somewhat connected)
        {
          from: "inhibitory",
          to: "inhibitory",
          probability: 0.2,
          type: "inhibitory",
        },
        // Relay->Relay connections in thalamus are minimal; we can omit or set very low:
        { from: "relay", to: "relay", probability: 0.05, type: "excitatory" },
      ],
    },
  ],
  connections: [], // Thalamus -> Cortex connections would be added when integrating with a cortex template
};
```

Here, we defined a custom preset: "relay" for thalamic relay neurons and used a generic "inhibitory" preset for the reticular neurons (or we could define a specific preset for reticular if needed). The connectivity reflects that relay cells provide input to inhibitory cells (50% probability, you may adjust; basically many relay cells will activate reticular cells) and inhibitory cells strongly inhibit relay cells (80% probability ensures each relay gets input from most reticular neurons, creating global inhibition). Reticular neurons inhibit each other to some extent (20%), which can help them generate synchronized oscillations or avoid all turning on at once. Relay→relay is set to 0.05 (just to not assume completely no interaction; in some thalamic nuclei relay cells might have some electrical coupling or shared input, but generally this is low).

To connect the thalamus to the cortex (say, PFC template), you would add ConnectionEdges like: from Thalamus relay -> PFC pyramidal (feedforward excitation), and PFC pyramidal -> Thalamus relay & reticular (feedback excitation to relay, possibly excitation to reticular as well). Those can be added when composing a full brain configuration, but are not shown here in the standalone template.

**Relay neuron properties:** Thalamic relay cells can fire in two modes: tonic spiking and bursting. In this basic simulator, we treat them similarly to other excitatory neurons (rest ~-70 mV, threshold ~-55 mV). However, they have a tendency for low-threshold Ca<sup>2+</sup> spike bursts when hyperpolarized (due to T-type calcium channels). We don’t simulate that yet – it would require an extension to the neuron model (e.g. an additional state for burst mode or a second threshold). For now, our relay preset might just copy pyramidal-like parameters or slightly different (maybe a bit more hyperpolarized rest or a longer refractory to mimic burst refractory). We note this as a future improvement (see **Future Extensions** below).

_(UI considerations:_ A thalamus template could be selected to quickly create a relay-inhibition circuit. The UI might show two subpopulations within the cluster – possibly color-coded differently (e.g. using one color for excitatory relay and another for inhibitory reticular). The styles can leverage existing color variables or define new ones if needed. For example, using a lighter shade for relay and a red-tinted shade for inhibitory might help visualization. Ensure any new UI elements (like labels for "Relay count" or so) follow the typography and spacing defined in styles.css. We might reuse the .param-info tooltip style to explain what a relay cell is versus a reticular cell when hovering over labels.)

## Config File Schemas (JSON/JavaScript)

To enable flexible configuration of SNN models, we define structured schemas for the main configuration elements: **NeuronTypePreset**, **Cluster**, **ConnectionEdge**, and **Template**. These schemas can be represented as JSON or JavaScript objects. They allow the assistant or user to specify the properties of neuron types, how clusters are composed, and how clusters interconnect, in a reusable way.

Below is a breakdown of each schema and its fields:

- **NeuronTypePreset:** This defines a type of neuron with certain fixed parameters. Rather than hard-coding numeric values throughout the code, presets allow us to refer to neuron types by name (e.g. "pyramidal", "basket") and pull their parameters. Presets might be stored in a dictionary/object, keyed by name. For each preset, we include:
- name (string): Identifier of the neuron type (e.g. "pyramidal", "basket", "chandelier", "relay", "inhibitory").
- type (string): Broad category, typically "excitatory" or "inhibitory". This is used to determine default synaptic sign (e.g. excitatory neurons cause positive postsynaptic changes, inhibitory cause negative).
- **Electrical parameters:**
  - restingPotential (number, in mV) – e.g. -70.
  - spikeThreshold (number, in mV) – e.g. -55.
  - resetPotential (number, in mV) – e.g. -65 (pyramidal) or -70 (inhibitory).
  - refractoryPeriod (number, in ms) – e.g. 2 for excitatory, 1 for fast-spiking inhibitory.
  - membraneTimeConstant (number, in ms) – e.g. 20 for pyramidal, 10 for interneuron. (This could be used in integration of the differential equation for the membrane.)
- **Synaptic parameters:**
  - synapseType (string): The receptor type for its outgoing synapses, e.g. "AMPA" for excitatory neurons, "GABA_A" for inhibitory. Mainly for documentation or advanced modeling (could determine which equation to use).
  - EPSP_rise and EPSP_decay (numbers, ms): If excitatory, how fast the synaptic effect rises/decays. If inhibitory, IPSP rise/decay. For instance, pyramidal preset might have EPSP_rise: 1.5, EPSP_decay: 15 (ms), basket preset might have IPSP_rise: 1.0, IPSP_decay: 8 (ms). (These could also be combined as e.g. synRise/synDecay and interpreted based on type.)
  - synapticDelay (number, ms): A default synaptic delay for connections from this neuron type. Maybe ~1 ms for local excitatory, ~0.5 ms for inhibitory (often inhibitory synapses are localized and very fast). This can be overridden per connection, but it’s a useful default.
  - weight or strength (number): A default synaptic weight magnitude. For instance, an excitatory pyramidal might have weight 1.0 (baseline), an inhibitory basket might have weight 1.0 as well. (If using normalized units, one could calibrate these such that a single excitatory spike raises a target pyramidal by e.g. 0.2 of threshold, whereas an inhibitory spike might reduce by 0.3, etc. These specifics may be tuned by trial to get realistic network activity. The config can store suggested values, but actual use might multiply by a global scaling factor.)

_Example:_ A neuron preset for a pyramidal neuron in JS object form:

```javascript
const NeuronTypePresets = {
  pyramidal: {
    type: "excitatory",
    restingPotential: -70,
    spikeThreshold: -55,
    resetPotential: -65,
    refractoryPeriod: 2, // ms
    membraneTimeConstant: 20, // ms
    synapseType: "AMPA",
    EPSP_rise: 1.5, // ms (10-90% rise time)
    EPSP_decay: 15, // ms (decay tau)
    synapticDelay: 1, // ms
    weight: 1.0, // base excitatory weight
  },
  basket: {
    type: "inhibitory",
    restingPotential: -70,
    spikeThreshold: -50,
    resetPotential: -70,
    refractoryPeriod: 1,
    membraneTimeConstant: 10,
    synapseType: "GABA_A",
    IPSP_rise: 1.0,
    IPSP_decay: 8,
    synapticDelay: 0.5,
    weight: 1.0, // base inhibitory weight (will be applied as negative effect)
  },
  chandelier: {
    type: "inhibitory",
    restingPotential: -70,
    spikeThreshold: -50,
    resetPotential: -70,
    refractoryPeriod: 1,
    membraneTimeConstant: 10,
    synapseType: "GABA_A",
    IPSP_rise: 1.0,
    IPSP_decay: 8,
    synapticDelay: 0.5,
    weight: 1.2, // maybe a bit stronger than basket per synapse
  },
  relay: {
    type: "excitatory",
    restingPotential: -70,
    spikeThreshold: -55,
    resetPotential: -65,
    refractoryPeriod: 2,
    membraneTimeConstant: 20,
    synapseType: "AMPA",
    EPSP_rise: 2.0,
    EPSP_decay: 20,
    synapticDelay: 1,
    weight: 1.0,
    // (In future, could add: burstThreshold, Tcurrent... to simulate bursting)
  },
  inhibitory: {
    type: "inhibitory",
    restingPotential: -70,
    spikeThreshold: -55,
    resetPotential: -70,
    refractoryPeriod: 1,
    membraneTimeConstant: 10,
    synapseType: "GABA_A",
    IPSP_rise: 1.0,
    IPSP_decay: 10,
    synapticDelay: 0.5,
    weight: 1.0,
  },
};
```

In this snippet, NeuronTypePresets is a dictionary of presets. We included pyramidal, basket, chandelier (for cortical/hippocampal), and a generic relay and inhibitory for thalamus. Notice we mark excitatory vs inhibitory and provide all relevant parameters. The simulator code will refer to this when creating neurons. For example, when building a cluster, if it sees preset: "pyramidal" with count 80, it will create 80 neuron objects and assign them these preset values.

_Usage in code:_ The simulation should store for each neuron instance whether it’s excitatory or inhibitory (for computing synaptic effects). For performance, it might store a sign or use separate lists for E vs I. E.g., one could precompute a neuron.sign = +1 for excitatory and -1 for inhibitory, and multiply synaptic weight by that when applying. The preset’s weight is a base magnitude; actual connection weight might be randomized around that (to introduce some heterogeneity). This can be done when generating the connectivity matrix. We keep things simple by default (all weights equal to 1 in magnitude for all connections of a given type), but the framework allows customizing this.

- **Cluster:** A cluster object defines a group of neurons and how they connect internally. Fields include:
- id (string or number): Unique identifier for the cluster. This is used to reference it in connection definitions.
- name (string): Human-readable name for the cluster/region (e.g. "PFC Microcolumn 1", "CA3 Region"). Useful for UI displays or debugging.
- neuronGroups (array): A list of neuron group specifications, each with:
  - preset (string): which NeuronTypePreset to use for this group.
  - count (number): how many neurons of this type in the cluster.
  - _(Optional label or groupName:)_ if we want to label the group separately. Otherwise, the preset name can serve as the label.
  - _(Optional parameters overrides:)_ In some cases we might allow overriding a preset’s parameter for this cluster. For example, maybe we want pyramidal cells in one region to have a slightly different threshold. This could be done by including an override field here. If not needed, we omit it.
- internalConnectivity (array): List of connections _within_ this cluster. Each entry can be structured similarly to a ConnectionEdge (see next), but since source and target are the same cluster, we specify from and to _neuron types_ instead of clusters. For example: { from: "pyramidal", to: "basket", probability: 0.5, type: "excitatory", delay: 1 }. Fields for each rule:
  - from (string): the source neuron type name (matching one of the presets in this cluster’s neuronGroups).
  - to (string): the target neuron type name.
  - probability (number between 0 and 1): the connection probability between any given pair of source and target neuron. If you want a fixed number of connections instead, you could specify e.g. fan-in or fan-out counts, but probability is straightforward. The code will typically loop through all pairs and random-sample a connection based on this probability.
  - type (string): "excitatory" or "inhibitory" – the nature of the synapse. This typically should align with the type of the source neuron’s preset (e.g. if from is a pyramidal which is excitatory, then type should be "excitatory"). It’s redundant but can serve as a consistency check or if one preset can have multiple synapse types (rare). Mainly, the simulator could use this to decide whether to flip the weight sign or not, or potentially to pick which synaptic time constants to use for the postsynaptic effect.
  - delay (number, ms, optional): If specified, overrides the default synaptic delay for these connections. If not, the simulator can use NeuronTypePresets[from].synapticDelay or a global default.
  - weight (number, optional): If specified, override the default weight. E.g. one might want chandelier→pyramid to have weight 1.5 while basket→pyramid is 1.0, reflecting stronger effect. If not given, the simulator can use a base weight from the preset or a global value.
  - _Note:_ The internal connectivity rules are usually symmetric in style (for each rule, you may want a counterpart, like if pyramidal->basket is defined, likely basket->pyramidal is also defined, etc., except when one direction doesn’t make sense). But we list them explicitly for clarity.
- The cluster schema can be extended if needed with fields like position (if placing clusters in space), or layer (for cortical layer info), but those are beyond current scope.
- **ConnectionEdge:** This defines connections between two clusters. In a template that has multiple clusters (like our Hippocampus template with CA3 and CA1), an edge object represents all the connections from neurons in one cluster to neurons in another cluster. Fields:
- fromCluster (string or id): The source cluster identifier (matching some cluster’s id).
- toCluster (string or id): The target cluster identifier.
- connectivity (array): Similar to internalConnectivity, but now describing inter-cluster connections. Each entry might have:
  - from (string): source neuron type **in the source cluster** (e.g. "pyramidal" from CA3 cluster).
  - to (string): target neuron type **in the target cluster** (e.g. "pyramidal" in CA1 cluster).
  - probability (number): probability of connection for each possible pair from those groups.
  - type (string): "excitatory" or "inhibitory". Again, this should align with the nature of the source neuron typically.
  - delay (number, optional): transmission delay for these connections (often longer than internal delays if clusters represent distant areas).
  - weight (number, optional): specific weight for these connections (if different from the default).
  - You can also include any other special parameters (for instance, maybe long-range connections have different synapse dynamics – one could specify a different synapseType if needed, but usually we keep it tied to the source neuron’s type).

The idea is that the simulator will iterate through each ConnectionEdge, and for each pair of source-target neurons across the clusters, decide on a connection based on the given probability. It will assign appropriate weight and delay as specified.

- **Template:** The template is the top-level structure that brings together clusters and connection edges for a region or sub-network. Fields:
- regionName (string): Name of the region/template (for display or reference).
- clusters (array of Cluster objects): The list of clusters in this template. The cluster objects can be embedded (as we did in examples) or references to separately defined cluster prototypes. Typically, they will be defined in place with their neuronGroups and internalConnectivity.
- connections (array of ConnectionEdge objects): The list of inter-cluster connections in this template. If the template has only one cluster, this can be an empty array or omitted. If multiple clusters, each possible directed connection that is present should be listed. (We can omit connections that are not present; by default nothing connects those clusters if not listed.)
- Optionally, one could have a field like description for documentation, or version if the format evolves. Also, if templates might be composed together, we might include a way to mark certain clusters as “inputs” or “outputs” of this template to connect with other templates. That’s an advanced use-case and not needed yet, but the structure is flexible.

**Config Schema Example:** Bringing it all together, here is a conceptual JSON schema example for a full config that might be saved in a file (for instance, pfc_template.json). This illustrates how everything ties in:

```json
{
  "regionName": "Prefrontal Cortex",
  "clusters": [
    {
      "id": "PFC_cluster1",
      "name": "PFC Microcolumn 1",
      "neuronGroups": [
        { "preset": "pyramidal", "count": 80 },
        { "preset": "basket", "count": 15 },
        { "preset": "chandelier", "count": 5 }
      ],
      "internalConnectivity": [
        {
          "from": "pyramidal",
          "to": "pyramidal",
          "probability": 0.1,
          "type": "excitatory"
        },
        {
          "from": "pyramidal",
          "to": "basket",
          "probability": 0.5,
          "type": "excitatory"
        },
        {
          "from": "pyramidal",
          "to": "chandelier",
          "probability": 0.5,
          "type": "excitatory"
        },
        {
          "from": "basket",
          "to": "pyramidal",
          "probability": 0.8,
          "type": "inhibitory"
        },
        {
          "from": "chandelier",
          "to": "pyramidal",
          "probability": 0.8,
          "type": "inhibitory"
        },
        {
          "from": "basket",
          "to": "basket",
          "probability": 0.1,
          "type": "inhibitory"
        }
      ]
    }
  ],
  "connections": []
}
```

This JSON corresponds to the PFC template example we discussed. In practice, the JavaScript code might not literally use JSON files; instead, these could be JavaScript objects constructed and passed to the simulator initialization. The assistant can load such an object and then create the network accordingly. The advantage of having a clear schema is that the assistant (or user) could easily modify a template or create a new one without digging into simulation code. For instance, to create a new region, one could copy this structure and adjust counts and probabilities.

**Simulation Logic Integration:**
Once these configs are defined, the simulator’s initialization process might do something like:

```
function buildNetwork(template) {
 const clusters = {};
 // Create clusters and neurons
 template.clusters.forEach(clusterCfg => {
 const cluster = { id: clusterCfg.id, neurons: [] };
 // For each neuron group in the cluster
 clusterCfg.neuronGroups.forEach(group => {
 const preset = NeuronTypePresets[group.preset];
 for (let i = 0; i < group.count; i++) {
 // Create a neuron object with properties from the preset
 const neuron = {
 type: preset.type,
 potential: preset.restingPotential,
 threshold: preset.spikeThreshold,
 resetPotential: preset.resetPotential,
 refractoryPeriod: preset.refractoryPeriod,
 lastSpikeTime: -Infinity, // track last spike for refractory
 // ... any other state (e.g. adaptation variables, etc.)
 };
 cluster.neurons.push(neuron);
 }
 });
 clusters[clusterCfg.id] = cluster;
 });

 // Now set up connectivity
 // 1. Internal connections
 template.clusters.forEach(clusterCfg => {
 const cluster = clusters[clusterCfg.id];
 cluster.connections = []; // could store a list or adjacency list
 clusterCfg.internalConnectivity.forEach(rule => {
 // find indices of source and target neurons based on type
 const srcIndices = cluster.neurons
 .map((n, idx) => (NeuronTypePresets[rule.from].type === n.type ? idx : -1))
 .filter(idx => idx !== -1);
 const tgtIndices = cluster.neurons
 .map((n, idx) => (NeuronTypePresets[rule.to].type === n.type ? idx : -1))
 .filter(idx => idx !== -1);
 srcIndices.forEach(i => {
 tgtIndices.forEach(j => {
 if (Math.random() < rule.probability) {
 const synDelay = rule.delay ?? NeuronTypePresets[rule.from].synapticDelay;
 const synWeight = rule.weight ?? NeuronTypePresets[rule.from].weight;
 cluster.connections.push({
 pre: i, post: j,
 delay: synDelay,
 weight: (rule.type === "excitatory" ? synWeight : -synWeight)
 });
 }
 });
 });
 });
 });

 // 2. Inter-cluster connections
 template.connections.forEach(edge => {
 const srcCluster = clusters[edge.fromCluster];
 const tgtCluster = clusters[edge.toCluster];
 edge.connectivity.forEach(rule => {
 const srcPreset = NeuronTypePresets[rule.from];
 const tgtPreset = NeuronTypePresets[rule.to];
 const srcNeurons = srcCluster.neurons
 .map((n, idx) => (n.type === srcPreset.type ? idx : -1))
 .filter(idx => idx !== -1);
 const tgtNeurons = tgtCluster.neurons
 .map((n, idx) => (n.type === tgtPreset.type ? idx : -1))
 .filter(idx => idx !== -1);
 srcNeurons.forEach(i => {
 tgtNeurons.forEach(j => {
 if (Math.random() < rule.probability) {
 const synDelay = rule.delay ?? NeuronTypePresets[rule.from].synapticDelay;
 const synWeight = rule.weight ?? NeuronTypePresets[rule.from].weight;
 // We might store cross-cluster connections separately or in a global array
 globalConnections.push({
 pre: {cluster: edge.fromCluster, index: i},
 post: {cluster: edge.toCluster, index: j},
 delay: synDelay,
 weight: (rule.type === "excitatory" ? synWeight : -synWeight)
 });
 }
 });
 });
 });
 });

 return clusters;
}
```

The above pseudo-code demonstrates how the configuration data can drive network construction. It shows: (1) creating neuron objects from presets, (2) wiring up internal cluster connections based on probabilities, (3) wiring up inter-cluster connections similarly. Note the use of rule.type to assign weight sign (positive for excitatory, negative for inhibitory) and defaulting to preset values for delay/weight where not explicitly given in the config. This ensures consistency and reduces repetition in the config files.

The actual simulation loop would then use these connections (both internal and global inter-cluster) to update neuron potentials each timestep. For example, on each simulation tick (say 1 ms or a sub-millisecond step if using smaller dt), for each neuron we would: accumulate inputs from any neurons that spiked delay ms ago (from its incoming connections), add those inputs (if excitatory, add some voltage; if inhibitory, subtract some), then integrate the leak (decay toward resting potential), then check if this neuron’s potential exceeds its threshold. If threshold is exceeded and the neuron is not refractory (compare current time to lastSpikeTime + refractoryPeriod), then emit a spike (set lastSpikeTime = currentTime), register that for future postsynaptic effects, and reset the neuron’s potential to resetPotential. This would result in spiking dynamics consistent with an LIF (leaky integrate-and-fire) model[[2]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=typically%20is%20dynamically%20changing%20as,synaptic%20effects%20described%20below%20between). The values chosen (threshold ~ -55, reset -65 etc.) will influence firing patterns – e.g. a neuron receiving continuous excitation may fire regularly, while one receiving balanced excitation and inhibition might hover under threshold with occasional random spikes (depending on input).

In code, a simplified neuron update might look like:

```javascript
for (const clusterId in clusters) {
  const cluster = clusters[clusterId];
  // apply queued inputs (from previous spikes) to neuron potentials
  cluster.connections.forEach((conn) => {
    // assume we scheduled an input for this time
    if (conn.deliveryTime === currentTime) {
      clusters[clusterId].neurons[conn.post].potential += conn.weight;
    }
  });
  // leak and threshold check for each neuron
  cluster.neurons.forEach((neuron, idx) => {
    if (currentTime - neuron.lastSpikeTime < neuron.refractoryPeriod) {
      return; // skip integration if neuron is in absolute refractory
    }
    // Leak towards resting potential
    const dt = 1; // 1 ms step for simplicity
    const leak =
      (neuron.potential -
        NeuronTypePresets[
          neuron.type === "excitatory" ? "pyramidal" : "inhibitory"
        ].restingPotential) *
      (dt / neuron.membraneTimeConstant);
    neuron.potential -= leak;
    // Check threshold
    if (neuron.potential >= neuron.threshold) {
      // Spike occurs
      neuron.potential = neuron.resetPotential;
      neuron.lastSpikeTime = currentTime;
      // Schedule postsynaptic effects
      cluster.connections
        .filter((conn) => conn.pre === idx)
        .forEach((conn) => {
          conn.deliveryTime = currentTime + conn.delay;
        });
      globalConnections
        .filter(
          (conn) => conn.pre.cluster === clusterId && conn.pre.index === idx
        )
        .forEach((conn) => {
          // schedule in target cluster
          const targetClusterId = conn.post.cluster;
          clusters[targetClusterId].connections.push({
            pre: null,
            post: conn.post.index,
            deliveryTime: currentTime + conn.delay,
            weight: conn.weight,
          });
        });
    }
  });
}
currentTime += 1;
```

(This is highly simplified and not optimized – a real implementation would manage event queues for spikes, etc. But it illustrates how the preset parameters like membraneTimeConstant, threshold, resetPotential, refractoryPeriod are used in neuron behavior logic. The code uses them to integrate and decide on spiking.)

## UI and Styling Considerations

Maintaining consistency with the existing interface is important. The UI uses a dark theme with black backgrounds and blue accents, as defined in styles.css (e.g., --bg: #000000 for background, --text: #ffffff for text). All new interface elements introduced for the SNN configuration should reuse these styles. For example:

- Use the .control-group class to group new controls (this ensures proper spacing and alignment in the controls panel). Each control typically has a <label> and an <input> (range slider, number field, etc.), similar to how "Network Size" and "Cluster Size" are implemented in the existing HTML. For instance, if adding a slider for “Excitatory to Inhibitory connectivity”, wrap it in a .control-group and use a <span class="param-info"> if a tooltip is needed to explain it. The tooltip content can follow the pattern of <div class="tooltip"><span class="tooltip-title">...</span> ...</div> as seen in the HTML. This will automatically get the styling (background color #1a1d29, white text, etc.) for the tooltip as defined in CSS.
- Leverage existing color variables for any color-coding of neuron types. If we decide to color-code neurons in a visualization (for example, perhaps using Three.js to render spheres or points for neurons, with color indicating type), we can choose colors that complement the palette. The CSS variables include --surface-1, --surface-2, etc., which are subtle dark grays, and some highlight colors like the blue used for .param-info (#374e84). We might assign:
- Pyramidal (excitatory) neurons: use a bright color like cyan or green for visibility on black – ensure it’s consistent with any theme (if none available, define in three.js material directly).
- Inhibitory neurons: use a warm color like orange or red for contrast.
  The key is to not clash with the UI accent color. Blue (#374e84) is used for icons and borders, so using a different hue for neuron highlights is preferable (e.g. green for excitatory, red for inhibitory is a common convention). If textual labels are added (e.g. listing cluster names), use var(--text) for color (white) on the dark background.
- **Interaction logic:** The existing app likely has play/pause controls and sliders for global parameters like speed, firing rate, etc. Our extended UI might allow:
- Selecting a template from a dropdown (to load PFC vs Hippocampus vs Thalamus config). This could be a <select> element. Style it similarly (perhaps the CSS already styles <select> elements, otherwise add a rule to match the overall form style).
- Toggling neuron type visibility or adjusting counts dynamically. This could be advanced (maybe for now templates are loaded once at start). But planning ahead, we could include checkboxes to hide/show certain neuron types in the visualization (with .checkbox styling if any).
- Showing tooltips for technical terms: For example, an info icon next to "STDP" or "Homeostasis" toggle that explains what it is. We have the .param-info class which is perfect for such inline info icons with a hover tooltip. Use that consistently.

Everything should keep the clean, modern aesthetic of the current UI: **short labels**, **tooltips for jargon**, **logical grouping** of controls. For example, controls might be grouped into sections: “Network Size & Clusters”, “Neuron Type Composition”, “Connectivity Probabilities”, etc. Each section could be separated by a subtle divider or just whitespace (the current control panel is likely a flex column, and .control-group adds some margin-bottom).

When implementing these UI elements in HTML/JS, follow the patterns in app.js. For instance, the existing code uses document.getElementById("clusterSize") and updates the text in clustersValue on input events. We should do similar: if adding a slider for E→I probability, give it an id like "EIprob" and a span id "EIprobValue" to display the number. Update that on input events to keep the user informed. This ensures a uniform behavior across controls.

Finally, test the UI by loading a template and verifying that the displayed values (like number of neurons, etc.) match the loaded config. The dynamic panel could even allow editing those values before running simulation (which would require regenerating the network). But implementing live editing can be complex; initially, it’s fine to require selecting a template and then pressing a "Build Network" button. In the UI, that could be a button styled similarly to others (perhaps reusing the style of the pause/run button or making a new one). Keep text minimal, e.g. "Apply Template".

## Future Extensions and Evolution

The architecture laid out above is meant to be **extensible**. As we move toward progressive full-brain emulation, several advanced features will be added. This guide anticipates those and suggests how to integrate them:

- **STDP (Spike-Timing-Dependent Plasticity):** STDP is a learning rule where synaptic weights are adjusted based on the timing of pre- and post-synaptic spikes. Typically, if a presynaptic neuron fires shortly _before_ a postsynaptic neuron, the synapse is strengthened (LTP – long-term potentiation), and if the presynaptic fires after the postsynaptic, the synapse is weakened (LTD – long-term depression)[[11]](file://file-U487BPhDpDBrCusQbpALKo#:~:text=categorizes%20presynaptic%20and%20postsynaptic%20spikes,the%20weight%20if%20the%20presynaptic). Implementing STDP means each synapse’s weight becomes dynamic. We might need to store recent spike times to compute the time difference. In code, whenever a neuron spikes, iterate over its outgoing synapses and adjust weight: if the target has spiked within, say, 20 ms after the source, increase weight, etc. Alternatively, a pair-based STDP can be implemented by maintaining traces. This will require some additional config parameters (e.g. learning rate, STDP time constants). The **config schema** could be extended to include an STDP rule toggle or parameters on a per-connection basis. For example, connection: { stdp: true, A_plus: 0.01, tau_plus: 20, A_minus: 0.012, tau_minus: 20 } could attach to a connection rule. Initially, we can keep STDP off (no learning), but the code should be structured so that adding it is straightforward. Perhaps maintain an array of recent spike times per neuron, and in each simulation step, if STDP is enabled, adjust weights accordingly. STDP will allow the network to refine connections based on activity patterns – a step toward learning in the emulation.
- **Structural Plasticity:** This refers to the forming and pruning of connections (or even neurons) over time. In an evolving brain emulation, neurons might sprout new synapses or lose others as part of development or learning. To accommodate this, our data structures should not assume static connectivity. The adjacency lists can be modified at runtime. We can provide functions like addConnection(clusterA, neuronIdxA, clusterB, neuronIdxB) and removeConnection(...) that also update any relevant state (for example, if using an event queue for spikes, ensure it can handle dynamic connection sets). The config templates likely won’t cover structural changes (since those happen during simulation), but the initial templates should not overly constrain possible connections (having a probability of connection means the structure is already somewhat random – structural plasticity could mean changing those probabilities over longer timescales or responding to under/over-activity by connecting previously unconnected pairs). In practice, to simulate structural plasticity, one might periodically check if a neuron hasn’t received input for a long time, then randomly connect it to an active neuron (simulating sprouting), or if a synapse is too weak and rarely used, remove it (pruning). These algorithms can be added iteratively. The important part now is to write the code in a way that can handle connections being added/removed without breaking (for instance, not baking in array sizes that never change, etc.).
- **Homeostatic Tuning:** Neurons in real brains maintain stable activity levels over long term by adjusting their excitability. In simulation, this could be implemented by slowly modifying parameters like threshold or firing rate targets. For example, if a neuron hasn’t fired much in a long time, it might lower its threshold or increase its membrane excitability; if it’s too active, it might raise threshold or reduce synaptic input. One simple homeostatic mechanism is **adaptive threshold** – after each spike, increase the threshold a bit, and let it decay back down if the neuron is quiet[[12]](file://file-U487BPhDpDBrCusQbpALKo#:~:text=Adaptive%20%20%20%20,unchanged%20throughout%20the%20learning%20phase). This produces firing rate stabilization. We can incorporate this by giving each neuron a dynamic threshold instead of fixed. In our neuron object, threshold can be updated: e.g., add neuron.threshold += alpha on spike (with some maxThreshold cap) and each timestep neuron.threshold -= beta (decay toward baseline). The presets give the baseline threshold. Parameters alpha/beta can be set globally or per preset. We might include in NeuronTypePreset something like homeostasis: { enabled: true, threshInc: 5 mV, threshDecTau: 100 ms } as an example. Similarly, homeostatic plasticity can apply to synapses (synaptic scaling), but that’s more complex. Initially focusing on intrinsic homeostasis (neuron threshold or firing rate target) is simpler.
- **Learning Rules:** Beyond STDP, other learning rules (reward-modulated, supervised, etc.) could be added. For instance, a dopaminergic reward signal could modulate synapse changes (this would require global signals, which might be beyond a single template – more of a full brain simulation aspect). The code should be structured to allow a loop over all synapses or neurons to apply such rules periodically. Possibly keep a global list of all synapses and have a function applyLearningRules(deltaTime) that goes through them. In an OOP design, Neuron or Connection could have methods to update themselves. Since we are in a functional style here, we might just handle it in the main loop for now. The key is to design clear points in the code where learning is applied (e.g. end of each simulation second, or continuously each timestep for STDP).
- **Full-Brain Integration:** As we develop templates for various regions, ultimately we can combine them into one large configuration representing a whole brain (or at least major systems). For example, a full config might include clusters from cortex, hippocampus, thalamus, basal ganglia, etc., and many ConnectionEdges between them (cortico-cortical, thalamo-cortical, hippocampo-cortical, etc.). The system we built is modular: we can either merge templates manually into one JSON, or have code load multiple templates and link them. Ensuring unique cluster IDs across templates will be important. Perhaps we give each template’s cluster IDs a prefix (like "PFC\_\_", "HPC\_\_", "THAL\_\*") to avoid collisions. Then, a top-level config could have an array of templates or directly list all clusters from all templates. Both approaches are feasible; for now, focusing on single-template loading is fine, but keep in mind scaling up should mostly be a matter of adding more config, not rewriting logic.
- **Performance considerations:** As the network grows (potentially thousands of neurons and many connections), efficiency becomes key. The current approach (nested loops for connectivity and checking every pair) works for small clusters but doesn’t scale great. In the future, we might use more efficient data structures (like adjacency lists of indices) and algorithms (like event-driven simulation rather than time-step loop for every neuron). For now, correctness and clarity are the priority, but the design should not paint us into a corner. We have separated configuration from simulation, which is good. For performance, one might vectorize operations or use WebGL/GPU for large parallel updates, but that’s beyond this immediate scope. Still, by structuring things cleanly, an assistant can later identify hotspots (e.g. weight updates) and optimize them.

In summary, the SNN simulator is being built in stages. This guide establishes the foundation with biologically inspired parameters, structured configuration, and integration into the existing UI. By following these guidelines and using the examples as starting points, the AI code assistant should be able to implement a working simulator that not only runs an SNN but also allows interactive configuration and visualization. The modularity ensures that as new insights or requirements come (like adding STDP or creating a new brain region template), those can be integrated with minimal changes to the core architecture. The simulator will evolve towards a more complete brain emulation, where each region template might correspond to a piece of the brain, and rules like plasticity make the network learn and self-organize. With careful coding and iterative testing, this vision can be realized step by step, creating an ever more sophisticated platform for exploring brain-like computation.

## References

- Gerstner, W. & Kistler, W. (2002). _Spiking Neuron Models: Single Neurons, Populations, Plasticity_. Cambridge University Press – (for typical neuron model parameters: resting potential ~ -70 mV, threshold ~ -50 mV, reset ~ -55 mV, etc.)[[2]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=typically%20is%20dynamically%20changing%20as,synaptic%20effects%20described%20below%20between)[[1]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=conductance).
- Medium Article by Serra Aksoy (2023). _A Beginner’s Guide to Computational Neuroscience_ – (compares different neuron types; notes pyramidal neuron threshold ~ -56.3 mV vs brainstem ~ -51.8 mV, resting ~ -70 mV)[[3]](https://medium.com/%40serurays/a-beginners-guide-to-computational-neuroscience-3260188a9c01#:~:text=The%20results%20reveal%20fascinating%20differences,70%20mV%20for%20brainstem%20neurons)[[13]](https://medium.com/%40serurays/a-beginners-guide-to-computational-neuroscience-3260188a9c01#:~:text=Our%20measurements%20reveal%20that%20the,neurons%2C%20it%E2%80%99s%20actually%20quite%20significant).
- Wiki: **AMPA receptor** – fast excitatory glutamate receptor mediating most EPSPs in the CNS[[4]](https://en.wikipedia.org/wiki/AMPA_receptor#:~:text=The%20%CE%B1,and%20colleagues%20after%20the%20naturally).
- Wiki: **GABA_A receptor** – principal fast inhibitory receptor, reversal potential ~ -70 mV (IPSPs hyperpolarize toward -70 mV)[[6]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=the%20inhibitory%20synaptic%20current%20that,Due%20to%20their).
- Neurophysiology studies: interneurons have faster synapses – e.g. EPSP 10–90% rise times: ~1.7 ms in interneurons vs 3.2 ms in pyramidal cells (in cortical microcircuits).
- Neuroscience data: cortex neuron ratio ~80% excitatory, 20% inhibitory[[10]](https://pmc.ncbi.nlm.nih.gov/articles/PMC5595216/#:~:text=Cultured%20networks%20of%20excitatory%20projection,1%2C%202%29%20a).
- Neuromorphic engineering literature: clustering neurons with strong internal connectivity reduces inter-cluster connection load.
- R-NASH neuromorphic system (2025) – demonstrates adaptive threshold mechanism for homeostasis[[12]](file://file-U487BPhDpDBrCusQbpALKo#:~:text=Adaptive%20%20%20%20,unchanged%20throughout%20the%20learning%20phase) and describes on-chip STDP implementation (pre-before-post -> weight increase, post-before-pre -> decrease)[[11]](file://file-U487BPhDpDBrCusQbpALKo#:~:text=categorizes%20presynaptic%20and%20postsynaptic%20spikes,the%20weight%20if%20the%20presynaptic). These concepts inspire our planned STDP and homeostatic tuning features.

[[1]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=conductance) [[2]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=typically%20is%20dynamically%20changing%20as,synaptic%20effects%20described%20below%20between) [[6]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=the%20inhibitory%20synaptic%20current%20that,Due%20to%20their) [[7]](file://file-NuKSdCdLw4ULbUXRCNpnma#:~:text=reversal%20potential%20VGABA%20of%20typically,will%20tend%20to%20hyperpolarize%20the) Brain Computations and Connectivity -- Edmund T\_ Rolls -- Oxford University Press USA, Oxford, 2023 -- IRL Press at Oxford University Press -- 9780198887911 -- 884d231a54046e37701e9183f29862b8 -- Anna’s Archive.pdf

<file://file-NuKSdCdLw4ULbUXRCNpnma>

[[3]](https://medium.com/%40serurays/a-beginners-guide-to-computational-neuroscience-3260188a9c01#:~:text=The%20results%20reveal%20fascinating%20differences,70%20mV%20for%20brainstem%20neurons) [[13]](https://medium.com/%40serurays/a-beginners-guide-to-computational-neuroscience-3260188a9c01#:~:text=Our%20measurements%20reveal%20that%20the,neurons%2C%20it%E2%80%99s%20actually%20quite%20significant) A Beginner’s Guide to Computational Neuroscience ‍‍ | by Serra Aksoy (SeruRays) | Medium

[https://medium.com/@serurays/a-beginners-guide-to-computational-neuroscience-3260188a9c01](https://medium.com/%40serurays/a-beginners-guide-to-computational-neuroscience-3260188a9c01)

[[4]](https://en.wikipedia.org/wiki/AMPA_receptor#:~:text=The%20%CE%B1,and%20colleagues%20after%20the%20naturally) AMPA receptor - Wikipedia

<https://en.wikipedia.org/wiki/AMPA_receptor>

[[5]](https://royalsocietypublishing.org/doi/10.1098/rspb.1965.0016#:~:text=Journals%20royalsocietypublishing,75%20ms) The measurement of synaptic delay, and the time course ... - Journals

<https://royalsocietypublishing.org/doi/10.1098/rspb.1965.0016>

[[8]](https://pmc.ncbi.nlm.nih.gov/articles/PMC3059704/#:~:text=,inhibitory%20%28) Genetic Controls Balancing Excitatory and Inhibitory ...

<https://pmc.ncbi.nlm.nih.gov/articles/PMC3059704/>

[[9]](https://pmc.ncbi.nlm.nih.gov/articles/PMC5595216/#:~:text=Cultured%20networks%20of%20excitatory%20projection,1%2C%202%29%20a) [[10]](https://pmc.ncbi.nlm.nih.gov/articles/PMC5595216/#:~:text=Cultured%20networks%20of%20excitatory%20projection,1%2C%202%29%20a) Cultured networks of excitatory projection neurons and inhibitory ...

<https://pmc.ncbi.nlm.nih.gov/articles/PMC5595216/>

[[11]](file://file-U487BPhDpDBrCusQbpALKo#:~:text=categorizes%20presynaptic%20and%20postsynaptic%20spikes,the%20weight%20if%20the%20presynaptic) [[12]](file://file-U487BPhDpDBrCusQbpALKo#:~:text=Adaptive%20%20%20%20,unchanged%20throughout%20the%20learning%20phase) Neuromorphic Computing Principles and Organization -- Abderazek Ben Abdallah; Khanh N\_ Dang -- 2, 2025 -- Springer Nature Switzerland AG -- 9783031830884 -- d0e69542c64c4284c9024c7906530ca6 -- An.pdf

<file://file-U487BPhDpDBrCusQbpALKo>
