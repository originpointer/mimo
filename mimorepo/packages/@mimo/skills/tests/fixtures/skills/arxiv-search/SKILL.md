---
name: arxiv-search
description: Search arXiv for research papers in physics, math, and computer science
version: 1.0.0
---

# arXiv Search Skill

Use this skill when you need to find recent preprints or published papers.

## When to Use

- Search for papers not yet in journals
- Find cutting-edge research in physics, math, or CS
- Access preprints before formal publication

## Instructions

Use the `search` script with your query.

## Example

```bash
run_skill_script("arxiv-search", "search", {query: "machine learning", limit: 5})
```
