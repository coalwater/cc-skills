---
name: execute
description: Autonomous goal execution with no check-ins. Use when the user says "/execute", "run this to completion", "work through this plan unattended", or wants a goal or plan file executed autonomously without interruption.
---

# Execute

Run a goal or plan to completion via the Workflow tool. Each task runs in an isolated subagent — context compaction cannot interrupt the run.

## Invocation

```
/execute "refactor the auth module to use JWT"
/execute path/to/plan.md
/execute --effort high "migrate the database schema"
```

**Effort** (default: `medium`) controls execution depth:

| Flag | Behavior |
|------|----------|
| `--effort low` | execute only, skip verification |
| `--effort medium` | execute + basic sanity checks |
| `--effort high` | execute + full verification and retry on doubt |

Model per task is chosen by complexity: `sonnet` for most tasks, `opus` for deep reasoning or architecture decisions, `haiku` for simple mechanical work.

## Workflow structure

Call the Workflow tool with an inline script containing three phases:

**Plan** — one agent derives an ordered task list from the goal or plan file.
Schema: `{ tasks: [{ id, description, dependsOn: string[], model: "haiku"|"sonnet"|"opus" }] }`.
The planner assigns a model to each task based on complexity. If a plan file path was given, extract tasks from it rather than deriving them.

**Execute** — loop over tasks sequentially so each agent receives prior context.
Per-agent context block:
- Task description
- Summaries of prior completed tasks (not full content)
- Relevant file paths (not contents)
- Destructive-op guard: "Pause and require explicit user confirmation before `rm -rf`, force-push, or DB mutations."

Use the model assigned by the planner. Each agent returns `{ summary: string, blocked: boolean }`.

**Report** — return: tasks completed, tasks blocked with reasons, key decisions made.

## Rules

- Never stop to ask. This skill suspends ask-first for the entire run.
- Failed task: retry once. Still fails: mark `[blocked]`, continue.
- Discovered tasks grow past 3× original count: `log()` a warning, keep going.
