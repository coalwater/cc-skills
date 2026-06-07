---
name: grill-with-docs
description: Grilling session tied to one or more documents. Use when the user wants to be questioned about a doc, challenged against a reference doc, or wants decisions captured into a file. Triggers on "grill me on this doc", "grill me with [file]", or when a document is provided as subject or context for grilling.
---

Read the referenced document(s), then interview me relentlessly — one question at a time.

- If the doc is the **subject**: challenge me on its contents, gaps, inconsistencies, and decisions.
- If the doc is **context**: use it as reference while grilling me on the plan or topic I've described. Surface conflicts between what I say and what the doc says.

If a question can be answered by re-reading the doc or exploring the codebase, do that instead of asking.

When I make a claim, verify it against the code before accepting it. If the code contradicts what I said or what the doc says, surface the conflict explicitly before moving on. For deeper verification — a broken claim, an open question, or a scope that needs enumeration — invoke the ground-truth skill.

When the session ends or I ask to save: write a concise summary of answers and decisions to the target file (or a new file if none was specified).
