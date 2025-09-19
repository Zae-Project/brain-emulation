# brain_emulation

An open, educational, and research-focused project for learning spiking neural networks (SNNs) through interactive lessons and visualization—progressing toward abstract brain emulation concepts and long-term exploration of digital brain emulation.

- **Audience**: researchers, neuroengineers, cognitive scientists, students, and hobbyists
- **Focus**: educational clarity, scientific plausibility, robustness, and open collaboration
- **Vision**: a progressive 12-lesson system from beginner to advanced brain emulation concepts
- **Tech stack**: Python (Brian2) + JavaScript (Three.js) with WebSockets

## Educational Journey

### Phase 1: Neural Fundamentals (Lessons 1-4)

- Basic spike dynamics and neural computation
- Synaptic transmission and network connectivity
- Plasticity mechanisms and learning
- Temporal pattern recognition

### Phase 2: Complex Networks (Lessons 5-8)

- Network topology and clustering principles
- Inhibition and competitive dynamics
- Multi-layer hierarchical processing
- Memory systems and information storage

### Phase 3: Brain-Scale Networks (Lessons 9-10)

- Large-scale integration and global workspace
- Neural oscillations and temporal coordination

### Phase 4: Brain Emulation Concepts (Lessons 11-12)

- Whole brain emulation theory and challenges
- Ethics, consciousness, and future implications

## Features (current and planned)

- **Current**: Interactive 3D SNN visualization with 4 foundational lessons
- **Visual display**: Color-coded neural clusters with activity visualization
- **Real-time interaction**: Adjustable parameters and spike injection
- **Educational content**: Progressive lesson system with full HTML content
- **Planned**: Additional lessons 5-12, enhanced network features, multi-scale modeling

## Quickstart

- Install deps: `pip install brian2 websockets`
- Start SNN server: `python server.py` (WebSocket at ws://localhost:8766)
- Serve UI: `python -m http.server 8000`
- Open: `http://localhost:8000/index.html`

## Project Mission

https://github.com/user-attachments/assets/6de78696-e13a-4489-b89f-9522f9215f70

Based on current research in whole brain emulation (WBE), this project aims to:

1. **Educate**: Build public understanding of neural computation and brain emulation
2. **Prepare**: Develop skills and intuition for future WBE challenges
3. **Research**: Contribute to open research on computational neuroscience
4. **Bridge**: Connect theoretical concepts to practical implementation

Our approach emphasizes responsible development, ethical consideration, and inclusive access to this transformative technology.

## Documentation

- Mission: [docs/mission.md](./docs/mission.md)
- Goals: [docs/goals.md](./docs/goals.md)
- Roadmap: [docs/roadmap.md](./docs/roadmap.md)
- Instructions (install, run, API, contributing): [docs/instructions.md](./docs/instructions.md)
- Lessons: [docs/lessons.md](./docs/lessons.md) - **Complete 12-lesson curriculum**
- References (with summaries): [docs/references.md](./docs/references.md)
- FAQ: [docs/faq.md](./docs/faq.md)
- Ethical Guidelines: [docs/ethics.md](./docs/ethics.md)

## Contributing

We welcome contributions and collaboration! This project uses GitHub Discussions and branch protection to ensure quality and foster community engagement.

**🗣️ Start with [Discussions](https://github.com/venturaEffect/brain_emulation/discussions)** for:

- New ideas and feature proposals
- Questions about implementation or neuroscience concepts
- Research discussions and brainstorming
- Getting help with the codebase

**📋 For formal contributions:**

- All changes must go through pull requests (direct pushes to `main` are protected)
- Use our issue templates for bugs and feature requests
- Follow the guidelines in [CONTRIBUTING.md](./CONTRIBUTING.md)

See also: [docs/instructions.md](./docs/instructions.md) and [docs/lessons.md](./docs/lessons.md)

## Research Foundation

This project builds on current research from leading institutions:

- **Carboncopies Foundation**: WBE research coordination and roadmapping
- **Blue Brain Project**: Detailed cortical simulation and modeling
- **Human Brain Project**: European brain research initiative
- **OpenWorm**: Complete organism simulation (C. elegans)

Our lesson progression follows established neuroscience principles while maintaining accessibility for learners at all levels.

## License

Open source—see [LICENSE](./LICENSE).
