# Lesson System and Guidelines

Goals
- Provide a progressive path from fundamentals to advanced topics.
- Keep lessons runnable, visual, and tightly linked to the underlying concepts.

Lesson structure (proposed)
- Each lesson lives in a dedicated folder: `lessons/<slug>/`.
- Recommended files:
  - `README.md`: lesson overview, learning objectives, steps, questions.
  - `assets/`: images or data used by the lesson.
  - `code/`: minimal runnable example(s), well commented.
  - Optional: `metadata.yml` (title, level, tags, prerequisites, duration).

Lesson template
```markdown
# Lesson Title

## Overview
Brief description of what this lesson covers.

## Learning objectives
- Objective 1
- Objective 2

## Prerequisites
List any required background knowledge or previous lessons.

## Steps
1. Step 1 with explanation
2. Step 2 with explanation

## Questions to explore
- Question 1
- Question 2

## Further reading
Links to relevant papers, books, or documentation.
```

Content guidelines
- Prefer small, well-explained examples with clear outputs.
- Highlight what to observe and why it matters.
- Keep external dependencies minimal.
- Cite sources when adapting models or figures.