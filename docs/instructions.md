# Instructions

Use this guide to install, run, and contribute. Details will evolve. When in doubt, open an issue or discussion.

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

## Contributing

This repository uses GitHub Discussions and branch protection rules to ensure quality collaboration.

### 🛡️ Branch Protection Workflow
This repository protects the `main` branch to ensure code quality:

1. **Fork** the repository or create a **feature branch** (never work directly on `main`)
2. **Make your changes** with clear, focused commits
3. **Test thoroughly** - ensure your changes work and don't break existing functionality
4. **Submit a pull request** using our PR template
5. **Address review feedback** promptly and respectfully
6. **Wait for approval** before changes are merged

### 📝 Contribution Types
- **Bug fixes:** Use our bug report template to identify issues first
- **New features:** Start with a Discussion, then use the feature request template
- **Documentation:** Improve setup guides, add examples, update API docs
- **Educational content:** New lessons, visualizations, or research summaries

### 📋 Pull Request Guidelines
- Use descriptive commit messages and PR titles
- Fill out the entire PR template
- Link to related issues or discussions
- Include tests for new functionality
- Update documentation for user-facing changes
- Ensure backward compatibility

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

Coding style and checks
- Prefer clear, readable code and comments over cleverness.
- Add minimal, meaningful examples.
- Include type hints and docstrings where helpful.

API and architecture notes
- As modules stabilize, we will document public APIs here with examples and caveats.
