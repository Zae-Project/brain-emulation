# Instructions

Use this guide to install, run, and contribute. Details will evolve—when in doubt, open an issue or discussion.

Prerequisites
- Git
- Python 3.10+ (recommended)
- Optional: Node.js (for frontend tooling, if/when applicable)

Setup
1) Clone the repository
```bash
git clone https://github.com/venturaEffect/brain_emulation.git
cd brain_emulation
```
2) Create a virtual environment (example using venv)
```bash
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows (PowerShell)
.venv\\Scripts\\Activate.ps1
```
3) Install dependencies
```bash
# TODO: Add specific dependencies here once defined
pip install -r requirements.txt  # if this file exists
```

Running
- This project is under active development. Run instructions will be updated as components land.
- For now, check examples in lessons and the repository README for the latest guidance.

Testing
```bash
# TODO: Add test command once tests are introduced
pytest -q
```

Contributing
- Discuss first: open an issue to align on goals and scope.
- Fork and branch: use descriptive branch names (e.g., docs/lesson-intro-snn).
- Make small, focused changes with clear commit messages.
- Update docs for user-facing changes.
- Open a PR and link to any relevant issues or discussions.

Coding style and checks
- Prefer clear, readable code and comments over cleverness.
- Add minimal, meaningful examples.
- Include type hints and docstrings where helpful.

API and architecture notes
- As modules stabilize, we will document public APIs here with examples and caveats.