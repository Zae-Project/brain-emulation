# Documentation Chapters

The former “lesson” curriculum has been refactored into a twelve-part
documentation handbook that lives in `lessons/lesson*.html`. Each chapter now
serves as a focused reference for a different aspect of the project—from high
level goals to implementation details. The modal opened through the **Lessons**
button inside the app now presents these chapters in order.

## Chapter Overview

1. **Project Overview & Goals** – Mission, architecture, design principles.  
2. **Quick Start & Environment Setup** – Clone, install, launch, repo layout.  
3. **Interface Tour** – Canvas, HUD, inspector, status bar.  
4. **Controls & Parameter Panel** – Slider semantics, procedural vs template modes.  
5. **Neuron Taxonomy & Glyph Dictionary** – Mapping between slugs, labels, and shapes.  
6. **Brain Regions & Template Library** – Template schema, curated atlas sources.  
7. **Simulation Pipeline & Runtime** – Network build lifecycle and update loop.  
8. **Importing & Exporting Atlas Data** – Round-tripping templates via the HUD.  
9. **Neuron Inspector & Analytics** – Understanding the metadata cards and traces.  
10. **Advanced Configuration & Manifest** – Environment toggles, manifest workflow.  
11. **Troubleshooting & Verification** – Diagnostic tools and QA checklist.  
12. **Glossary & Further Resources** – Terminology and curated reading links.

## How to Contribute

- Update the relevant chapter when changing UI behavior, neuron metadata, or
  template schemas.
- Keep prose accessible and cite data sources (atlas, DOI, publication year).
- When adding a new chapter, ensure the lessons modal is updated and document
  the change here.

For deeper technical notes, continue to leverage the markdown files in
`docs/`—this handbook is optimized for end users operating the visualizer,
while the markdown references support contributors and reviewers.
