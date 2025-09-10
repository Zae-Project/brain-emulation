# brain_emulation

An open, educational, and research-focused project for learning spiking neural networks (SNNs) through interactive lessons and visualization—progressing toward abstract brain emulation concepts and long-term exploration of digital brain emulation.

- Audience: researchers, neuroengineers, cognitive scientists, students, and hobbyists
- Focus: educational clarity, scientific plausibility, robustness, and open collaboration
- Vision: a progressive lesson system from beginner to advanced that stays up to date with SNN and neuroscience research
- Tech stack: Python (Brian2) + JavaScript (Three.js) with WebSockets

## Features (current and planned)
- Visual display of an SNN with panels showing key details
- Simple parameters to interact with spiking behavior
- Lesson dropdown with multiple starter lessons
- Planned:
  - Color-coded clusters
  - Adjustable neuron counts per cluster
  - Per-neuron info (weights, cluster membership, IDs)
  - Add/remove clusters and increase connectivity complexity

## Quickstart
- Install deps: `pip install brian2 websockets`
- Start SNN server: `python server.py`  (WebSocket at ws://localhost:8766)
- Serve UI: `python -m http.server 8000`
- Open: `http://localhost:8000/index.html`

## Documentation
- Mission: [docs/mission.md](./docs/mission.md)
- Goals: [docs/goals.md](./docs/goals.md)
- Roadmap: [docs/roadmap.md](./docs/roadmap.md)
- Instructions (install, run, API, contributing): [docs/instructions.md](./docs/instructions.md)
- Lessons: [docs/lessons.md](./docs/lessons.md)
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

## License
Open source—see [LICENSE](./LICENSE).