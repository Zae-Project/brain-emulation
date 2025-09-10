# Contributing to Brain Emulation

Thank you for your interest in contributing to the brain emulation project! This guide will help you get started.

## 🎯 Project Goals

This project aims to create an educational and research-focused platform for learning about spiking neural networks (SNNs) and brain emulation concepts. We welcome contributions that align with our mission of open science, education, and collaboration.

## 🗣️ Before You Start: Use Discussions

**Please start with [GitHub Discussions](https://github.com/venturaEffect/brain_emulation/discussions)** for:

- 💡 **New ideas and features** - Get community feedback before implementation
- ❓ **Questions** - Ask about the codebase, neuroscience concepts, or implementation approaches  
- 🔬 **Research discussions** - Share papers, discuss neural network concepts
- 🤝 **Getting help** - Stuck on implementation? The community is here to help

This helps ensure your contributions align with project goals and prevents duplicate work.

## 🛡️ Branch Protection and Workflow

This repository uses **branch protection rules** to maintain code quality:

### ✅ What this means:
- No direct pushes to the `main` branch are allowed
- All changes must go through pull requests
- Pull requests require review before merging
- This ensures code quality and prevents breaking changes

### 🔄 Contribution Workflow:

1. **Fork the repository** or create a feature branch
2. **Make your changes** in your branch (never directly in `main`)
3. **Test your changes** thoroughly
4. **Submit a pull request** with a clear description
5. **Address review feedback** if requested
6. **Wait for approval** before the changes are merged

## 📝 Types of Contributions

We welcome various types of contributions:

### 🐛 Bug Reports
- Use the bug report template
- Include reproduction steps and environment details
- Check existing issues first

### ✨ Feature Requests  
- Start with a Discussion to gather feedback
- Use the feature request template
- Consider the educational focus of the project

### 📚 Documentation
- Improve existing docs
- Add examples and tutorials
- Update API documentation

### 🧠 Educational Content
- New lessons and tutorials
- Improved visualizations
- Research summaries

### 💻 Code Contributions
- Bug fixes
- Performance improvements
- New SNN functionality
- UI/UX enhancements

## 🚀 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/venturaEffect/brain_emulation.git
   cd brain_emulation
   ```

2. **Set up your environment:**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install brian2 websockets  # Basic dependencies
   ```

3. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

4. **Test the setup:**
   ```bash
   python server.py  # Start the SNN server
   python -m http.server 8000  # Serve the frontend
   # Open http://localhost:8000/index.html
   ```

## 🧪 Testing Your Changes

- **Manual testing:** Ensure the WebSocket server starts and the UI loads
- **Code quality:** Follow existing code style and patterns
- **Documentation:** Update docs for any user-facing changes
- **Backwards compatibility:** Avoid breaking existing functionality

## 📋 Pull Request Guidelines

When submitting a pull request:

1. **Use the PR template** - Fill out all relevant sections
2. **Link related issues/discussions** - Reference any related conversations
3. **Provide clear descriptions** - Explain what changed and why
4. **Include tests** - Add or update tests for your changes
5. **Update documentation** - Keep docs in sync with code changes

### PR Title Format:
- `feat: add new SNN visualization feature`
- `fix: resolve WebSocket connection issues`
- `docs: update contributing guidelines`
- `refactor: improve neural network performance`

## 🎨 Code Style

- **Python:** Follow PEP 8, use type hints where helpful
- **JavaScript:** Use consistent formatting and meaningful variable names
- **Comments:** Explain complex logic, especially neuroscience concepts
- **Documentation:** Include docstrings for public functions

## 🔬 Research and Scientific Accuracy

When contributing scientific content:

- **Cite sources** - Include references to papers and research
- **Accuracy first** - Ensure scientific correctness
- **Educational focus** - Make complex concepts accessible
- **Open discussion** - Use Discussions for research questions

## 🤝 Community Guidelines

- **Be respectful** and inclusive
- **Assume good intentions** from all contributors
- **Ask questions** - No question is too basic
- **Share knowledge** - Help others learn
- **Collaborate** - Work together to improve the project

## 📞 Getting Help

- **GitHub Discussions:** Best for questions and brainstorming
- **Issues:** For specific bugs or feature requests
- **Documentation:** Check `docs/` folder for detailed information

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to brain emulation research and education! 🧠✨