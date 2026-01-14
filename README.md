# Brain Emulation Project

An open source, research focused platform for simulating and visualizing biologically realistic spiking neural networks (SNNs) based on anatomical brain region data from leading neuroscience atlases.

**Mission**: To create accessible, scientifically grounded tools for exploring brain emulation concepts through interactive visualization and atlas based neural network templates.

---

## Overview

This project enables researchers, neuroengineers, cognitive scientists, and students to:

- **Build biologically realistic neural networks** using templates derived from real brain atlases (Allen Brain Atlas, BrainGlobe, Julich-Brain)
- **Visualize network dynamics** with an interactive 3D interface showing neuron activity, connectivity, and voltage traces
- **Explore different brain regions** including prefrontal cortex, motor cortex, visual cortex, somatosensory cortex, and thalamocortical loops
- **Experiment with neuron types** such as pyramidal cells, basket interneurons, chandelier cells, Purkinje cells, and thalamic relay neurons
- **Import and export** custom network configurations with full provenance tracking

---

## Key Features

### 🧠 Atlas-Based Brain Region Templates

Pre configured network templates based on real neuroscience data:

- **Allen Motor Cortex** (BA4): Layer-specific cortical column with corticospinal Layer 5B neurons
- **Allen Prefrontal Cortex** (BA10/46): Two-cluster abstraction with excitatory/inhibitory populations
- **Allen Somatosensory Cortex** (BA3b): Barrel-column representation with thalamorecipient layer 4
- **BrainGlobe Visual Cortex**: Feedforward V1→V2 stream from MNI152 atlas
- **Julich Thalamocortical Loop**: Mediodorsal thalamus ↔ prefrontal cortex circuit

### 🔬 Diverse Neuron Type Library

Accurately modeled neuron types with distinct morphologies and firing patterns:

- **Cortical**: Pyramidal, spiny stellate, Betz cells (giant pyramidal)
- **Interneurons**: Basket, chandelier, Martinotti, double bouquet, neurogliaform
- **Cerebellar**: Purkinje, granule, Golgi, stellate
- **Hippocampal**: Mossy cells, dentate granule
- **Subcortical**: Medium spiny neurons (striatum), dopaminergic (SNc/VTA), cholinergic
- **Thalamic**: Relay cells, reticular neurons
- **Sensory**: Rod, cone, bipolar, ganglion, amacrine (retina)
- **Motor**: Alpha motor neurons (spinal cord)

### 📊 Interactive 3D Visualization

- Real-time spiking activity with clustered organization
- Color-coded neuron types with distinctive glyphs for each morphology
- Adjustable camera orbit controls
- Neuron inspector showing connectivity metrics and voltage traces
- Connection weight visualization

### ⚙️ Flexible Network Configuration

- Adjustable network size, connection probability, synaptic weights
- Support for excitatory/inhibitory neuron ratios
- Cluster-based topology with configurable inter/intra-cluster connectivity
- Template locking to preserve biologically accurate configurations
- JSON import/export with schema validation

---

## Quick Start

### Prerequisites

- Python 3.8+ (for backend simulation)
- Modern web browser (Chrome, Firefox, or Edge recommended)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/venturaEffect/brain_emulation.git
   cd brain_emulation
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the SNN simulation server**:
   ```bash
   python server.py
   ```

   The WebSocket server will start on `ws://localhost:8766`

4. **Serve the web interface**:
   ```bash
   python -m http.server 8000
   ```

5. **Open the visualizer**:
   Navigate to `http://localhost:8000/index.html` in your browser

---

## Usage Guide

### Loading Brain Region Templates

1. Click the **"Preset Templates"** dropdown in the top bar
2. Select a brain region (e.g., "Allen Motor Cortex BA4")
3. The network will automatically configure with biologically realistic parameters
4. Use **"Lock Template"** to prevent accidental modifications

### Interacting with the Network

- **Orbit Camera**: Click and drag to rotate view
- **Zoom**: Mouse wheel to zoom in/out
- **Select Neuron**: Click on any neuron to open the inspector panel
- **Inject Spike**: Select a neuron and click "Inject Spike" to manually trigger activity
- **Show Weights**: Toggle connection visualization for selected neuron

### Customizing Parameters

Available controls (when template is unlocked):

- **Network Size**: Total number of neurons
- **Connection Probability**: Likelihood of synaptic connections
- **Firing Rate**: Background spontaneous activity level
- **Threshold**: Spike generation threshold
- **Cluster Count**: Number of neuron clusters
- **Excitatory Ratio**: Percentage of excitatory vs inhibitory neurons

### Importing/Exporting Configurations

- **Export**: Click "Export" to download current network as JSON
- **Import**: Click "Import" and select a valid brain region template JSON file
- All exports include metadata with source references and provenance

---

## Project Structure

```
brain_emulation/
├── server.py                 # Brian2 backend simulation server
├── test_network_modes.py     # Testing script for simple/realistic modes
├── index.html                # Main web interface
├── js/
│   ├── app.js               # Core visualization and network logic
│   ├── templates/
│   │   ├── registry.js      # Template registration system
│   │   ├── schema.js        # JSON schema validation
│   │   └── config_io.js     # Import/export functionality
│   └── three.min.js         # 3D rendering library
├── css/
│   └── styles.css           # UI styling (dark theme)
├── guides/                   # Documentation (HTML format)
│   ├── guide1.html          # Project Overview & Goals
│   ├── guide2.html          # Quick Start & Environment Setup
│   ├── guide3.html          # Interface Tour
│   ├── guide4.html          # Controls & Parameter Panel
│   ├── guide5.html          # Neuron Taxonomy & Glyph Dictionary
│   ├── guide6.html          # Brain Regions & Template Library
│   ├── guide7.html          # Simulation Pipeline & Runtime
│   ├── guide8.html          # Importing & Exporting Atlas Data
│   ├── guide9.html          # Neuron Inspector & Analytics
│   ├── guide10.html         # Advanced Configuration & Manifest
│   ├── guide11.html         # Troubleshooting & Verification
│   └── guide12.html         # Glossary & Further Resources
├── data/
│   └── brain_region_maps/   # Atlas-based JSON templates
│       ├── allen_motor_cortex.json
│       ├── allen_prefrontal_cortex.json
│       ├── allen_somatosensory_cortex.json
│       ├── brainglobe_visual_cortex.json
│       ├── julich_thalamocortical_loop.json
│       └── manifest.json
└── docs/
    ├── realistic_network_guide.md     # Realistic network integration guide
    ├── spiking_neural_network_simulator_development_guide.md
    ├── neuron_types.md
    ├── roadmap.md
    ├── mission.md
    ├── goals.md
    ├── ethics.md
    └── archive/              # Archived lesson content
```

---

## Network Architecture

### Simple Mode (Default)

- Homogeneous neuron population
- Random connectivity
- Single synapse type
- Fast, basic dynamics for learning and experimentation

### Realistic Mode

- **80% excitatory / 20% inhibitory** neuron ratio (research-backed)
- Separate excitatory and inhibitory populations
- 4 synapse types: E→E, E→I, I→E, I→I
- Clustered connectivity with higher intra-cluster connections
- Biologically plausible firing patterns
- Based on neuroscience literature (Beaulieu & Colonnier 1985, Ramaswamy et al. 2021)

Switch between modes via WebSocket command:
```javascript
ws.send(JSON.stringify({cmd: "setNetworkMode", mode: "realistic"}))
```

---

## Documentation

All documentation is accessible through the **Documentation dropdown** in the interface, or directly from the `guides/` folder:

1. **Project Overview & Goals** - Mission, architecture, design principles
2. **Quick Start & Environment Setup** - Installation, repository layout
3. **Interface Tour** - Canvas, HUD controls, inspector, status bar
4. **Controls & Parameter Panel** - Detailed reference for every slider and toggle
5. **Neuron Taxonomy & Glyph Dictionary** - Neuron presets, biological names, glyphs
6. **Brain Regions & Template Library** - Template schema, atlas sources, manifest workflow
7. **Simulation Pipeline & Runtime** - How templates become networks
8. **Importing & Exporting Atlas Data** - JSON round-tripping with validation
9. **Neuron Inspector & Analytics** - Inspector cards, connectivity metrics, voltage traces
10. **Advanced Configuration & Manifest** - Environment variables, template registration
11. **Troubleshooting & Verification** - Diagnostic workflow, common fixes
12. **Glossary & Further Resources** - Terminology and reference links

Additional technical documentation:
- [Realistic Network Guide](docs/realistic_network_guide.md)
- [SNN Development Guide](docs/spiking_neural_network_simulator_development_guide.md)
- [Neuron Types](docs/neuron_types.md)
- [Project Roadmap](docs/roadmap.md)
- [Ethics Guidelines](docs/ethics.md)

---

## Data Sources & References

This project uses anatomical data from:

- **[Allen Brain Atlas](https://portal.brain-map.org/)**: High resolution brain maps with cell type specific data
- **[BrainGlobe](https://brainglobe.info/)**: MNI152 atlas and standardized coordinate systems
- **[Julich-Brain / EBRAINS siibra](https://siibra.eu/)**: Cytoarchitectonic brain region definitions
- **Neuroscience Literature**: Research-backed neuron parameters and connectivity patterns

### Key Research References

- Beaulieu, C., & Colonnier, M. (1985). A laminar analysis of the number of round‐asymmetrical and flat‐symmetrical synapses on spines, dendritic trunks, and cell bodies in area 17 of the cat
- Ramaswamy, S., et al. (2021). The neocortical microcircuit collaboration portal: a resource for rat somatosensory cortex
- Blue Brain Project: Detailed cortical simulation and modeling
- Human Brain Project: European brain research initiative

### Comprehensive Research Resources

For the complete bibliography supporting this and related projects, see the **[Zae Project Bibliography](https://github.com/Zae-Project/zae-docs/blob/main/reference/bibliography.md)** - a centralized repository containing:

- **100+ Key Researchers** - Leading scientists in consciousness, BCIs, neuromorphic computing, and computational neuroscience
- **50+ Foundational Papers** - Seminal publications with full citations including BCI pioneers
- **35+ Essential Books** - Organized by topic with reading recommendations
- **Research Institutions & Labs** - Major centers advancing BCI and neural interface research
- **Industry Leaders** - Companies working on BCIs (Neuralink, Kernel, Paradromics, Synchron, Blackrock)

**Relevant Sections for Brain Emulation:**
- Brain-Computer Interfaces (Nicolelis, Donoghue, Rao, Shenoy, Chang)
- Computational Neuroscience (Sejnowski, Gerstner, Izhikevich, Markram)
- Consciousness Studies (Chalmers, Koch, Tononi, Dehaene, Seth)
- Whole Brain Emulation (Sandberg, Bostrom, Koene, Hayworth)

Also see the **[Researchers Directory](https://github.com/Zae-Project/zae-docs/blob/main/reference/researchers-directory.md)** for detailed profiles and contact information.

---

## Contributing

We welcome contributions! This project uses **GitHub Discussions** and **branch protection** to ensure quality.

### 📋 For formal contributions:

- All changes must go through pull requests (direct pushes to `main` are protected)
- Use our issue templates for bugs and feature requests
- Follow the guidelines in [CONTRIBUTING.md](./CONTRIBUTING.md)

See also: [docs/instructions.md](./docs/instructions.md)

---

## Roadmap

### Current Features (v1.0)

- ✅ Interactive 3D SNN visualization
- ✅ 5 brain region templates from major atlases
- ✅ 30+ neuron types with distinct glyphs
- ✅ Simple and realistic network modes
- ✅ JSON import/export with validation
- ✅ Real-time parameter adjustment
- ✅ Neuron inspector with analytics

### Planned Features (v2.0)

- **STDP (Spike-Timing-Dependent Plasticity)**: Learning rules for synaptic modification
- **Homeostatic Tuning**: Self-regulating network stability mechanisms
- **Multi-Region Networks**: Connect multiple brain regions (e.g., sensory-motor loops)
- **Structural Plasticity**: Dynamic synapse formation/elimination
- **Enhanced Atlas Integration**: Direct API access to Allen/BrainGlobe databases
- **Performance Optimization**: GPU acceleration for larger networks (1000+ neurons)
- **Advanced Visualizations**: Oscillation analysis, raster plots, firing rate histograms

See [docs/roadmap.md](./docs/roadmap.md) for detailed timeline.

---

## Testing

### Test Network Modes

```bash
# Test simple network
python test_network_modes.py simple

# Test realistic network
python test_network_modes.py realistic

# Test both modes sequentially
python test_network_modes.py simple --both
```

### Verify Template Loading

1. Start the server: `python server.py`
2. Open the web interface
3. Try loading each brain region template from the dropdown
4. Verify neuron counts and connectivity match expected values

---

## Technical Details

### Backend (Python)

- **Brian2**: High performance SNN simulation framework
- **WebSockets**: Real time bidirectional communication
- **NumPy**: Numerical operations

### Frontend (JavaScript)

- **Three.js**: WebGL based 3D rendering
- **Vanilla JS**: No framework dependencies (lightweight and fast)
- **JSON Schema**: Template validation

### Network Protocol

WebSocket commands:
- `pause`, `play`, `speed`: Simulation control
- `setInput`, `setWeight`, `setConnectionProb`: Parameter updates
- `setNetworkSize`, `reset`: Network reconstruction
- `setNetworkMode`: Switch between simple/realistic modes
- `toggleWeights`, `injectPattern`, `testMemory`: Interactions

---

## License

Open source - see [LICENSE](./LICENSE)

---

## Acknowledgments

This project builds on research from:
- **Carboncopies Foundation**: WBE research coordination
- **Blue Brain Project**: Detailed cortical modeling
- **Human Brain Project**: European brain initiative
- **OpenWorm**: Complete organism simulation (C. elegans)

---

## Support & Contact

- **Issues**: [GitHub Issues](https://github.com/venturaEffect/brain_emulation/issues)
- **Discussions**: [GitHub Discussions](https://github.com/venturaEffect/brain_emulation/discussions)
- **Documentation**: See `guides/` folder or in app documentation dropdown

---

**Built with scientific rigor, open collaboration, and a vision for understanding the computational principles of biological intelligence.**
