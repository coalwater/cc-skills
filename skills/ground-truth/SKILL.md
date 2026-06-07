---
name: ground-truth
description: Use when starting any task where you would otherwise guess, infer, or assume your way forward — a bug or failure, an open question you need to answer to decide, or a scoped change/migration/audit over a set you'd be tempted to derive yourself. Triggers include "probably/likely/I assume", "investigate and plan X", "figure out which Y", "fix the broken Z", or any first claim that would cascade through later work.
---

# Ground Truth

## Core principle

**Don't guess. Establish ground truth, then act on it.** Every confidently-wrong foundation — an inferred scope, an unreproduced bug, an unverified assumption — gets built on top of, and correcting it later invalidates the work above it.

**Violating the letter of this discipline is violating the spirit. No "I'm broadly following the pattern" exceptions.**

## The five principles (apply to every track)

1. **Surface assumptions explicitly.** If you'd say "probably/likely/I assume" about it, that is a thing to establish, not to lean on. Name it.
2. **Ground truth is obtained, never inferred-and-built-on.** Reproduce the failure, research the open question, or take the scope as data — depending on the task. Until you have it, you have nothing to build on.
3. **Hypotheses are falsifiable, tested one variable at a time.** "If X is the cause, then changing Y does Z." A claim with no prediction is a vibe — discard or sharpen it.
4. **Scale effort to the stakes.** A claim nobody would notice being wrong for a week ≠ a claim that forces a rewrite. Don't under-investigate the second or over-investigate the first.
5. **Verify against reality before concluding.** Re-run the loop, re-read the code, triangulate the critical claim. Evidence before assertions, always.

## Route to the right track

Three task shapes hang off this spine. Pick by **what you owe** and **how ground truth is obtained**:

```dot
digraph route {
  "What do you owe?" [shape=diamond];
  "a fix" [shape=box];
  "an answer / decision" [shape=box];
  "a plan over a known set" [shape=box];
  "ground-truth-debug" [shape=doublecircle];
  "ground-truth-investigate" [shape=doublecircle];
  "ground-truth-scope" [shape=doublecircle];

  "What do you owe?" -> "a fix" [label="something is broken"];
  "What do you owe?" -> "an answer / decision" [label="open question"];
  "What do you owe?" -> "a plan over a known set" [label="bounded change"];
  "a fix" -> "ground-truth-debug";
  "an answer / decision" -> "ground-truth-investigate";
  "a plan over a known set" -> "ground-truth-scope";
}
```

| You owe | Ground truth comes from | Use |
|---|---|---|
| a **fix** (observable wrong behavior, perf regression) | **reproducing the failure** — build a loop | **REQUIRED SUB-SKILL:** ground-truth-debug |
| an **answer / decision** (open question, "how/which/should we") | **researching** it, possibly fanning out agents | **REQUIRED SUB-SKILL:** ground-truth-investigate |
| a **plan over a known set** ("do X to these N things") | the user **handing it over as data** — don't infer the set | **REQUIRED SUB-SKILL:** ground-truth-scope |

**The tells:**
- *"Why is X failing / X is broken / X is slow"* → debug.
- *"How does X work / which approach / should we / what's affected (unknown)"* → investigate.
- *"Migrate / clean up / refactor / audit these things"* where you'd be tempted to enumerate the set yourself → scope.

If a task spans two (e.g. "investigate the bug then fix it"), do them in order as separate tracks — investigate/scope to ground truth, **stop**, then debug. Never fuse diagnosis with the plan or fix.

## Red flags — STOP

- About to propose a fix, plan, or answer you couldn't defend with reproduced/observed/provided evidence
- The word "probably" is doing load-bearing work in your reasoning
- About to grep/query to discover a scope the user could hand you as data
- About to fuse "here's what's wrong" and "here's what I'll do" into one response

All of these mean: stop, identify which track you're in, and ground the claim first.
