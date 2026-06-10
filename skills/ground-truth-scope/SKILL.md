---
name: ground-truth-scope
description: Use when a task acts on a bounded set you could enumerate as data — affected rows, files to change, tests to run, components to audit — and you'd otherwise infer that set yourself. Triggers include "migrate/clean up/refactor/audit these", "fix the affected X", "investigate and plan Y when the affected set is known or cheaply enumerable" (unknown set → ground-truth-investigate instead), or any multi-step task that mixes "figure out the set" with "act on the set".
---

# Ground Truth Scope

The scope track of **REQUIRED BACKGROUND:** ground-truth. The ground rules (cc-skills block in CLAUDE.md) apply; this skill adds the discipline for bounded, data-defined work.

## Core principle

**Scope is data the user provides. It is never something you infer and then build on.**

For any task where the unit-of-scope can be enumerated — affected rows, files to change, tests to run, components to audit — that enumeration belongs in prompt 1. Inferred scope produces a confidently-wrong foundation that every later step builds on; correcting it invalidates hours of follow-on work.

**Violating the letter is violating the spirit. No "I'm broadly following the pattern" exceptions.**

## When this fires (vs the other tracks)

- Nothing is *broken* (that's ground-truth-debug) and nothing is genuinely *open/unknown* (that's ground-truth-investigate).
- The set **exists or is cheaply enumerable**, and the risk is **inferring it** and **fusing diagnosis with planning**.

Do NOT fire for: genuine open-ended exploration where scope IS the question; single-step lookups with no plan phase; tasks where the user explicitly said "you decide the scope".

## The pattern

| ❌ Without this skill | ✅ With this skill |
|---|---|
| "Investigate TICKET-123 and plan the fix" | "Here are the 4 rows: [table]. Verify state. Stop after the table." |
| Claude derives scope → writes plan → user reads both fused | User freezes scope → Claude verifies → user reviews → Claude plans |
| First pushback → Claude swaps one assumption for another | First pushback → Claude re-grounds against fresh data |
| 700-token plan with 8 "open questions" buried in it | Plan as a table; max 3 open questions, called out |
| 6 hours, two scope corrections, one reset | ~90 minutes, no rework |

## The five rules

**1. Freeze scope as data in prompt 1.** Hand over the IDs, mappings, file paths — whatever the unit-of-scope is. State explicitly: *scope is fixed; do not re-derive.* If the user doesn't have the data yet, the FIRST sub-task is producing it as a table the user signs off on — separate from any plan.

**2. Two-phase contract: diagnose → STOP → plan.** Diagnostic and plan never arrive in the same response. "Step 1: produce a table of [current observable state]. Stop. Do not propose anything yet." Plan is a separate prompt, only after the diagnostic table is reviewed.

**3. Output as evidence-shaped artifacts.** Tables, not prose. A diagnostic is a markdown table scannable in 15 seconds. A plan is a table of operations (one row per unit of scope). Assumptions hide in narrative; they're visible in tables.

**4. On first pushback: re-ground, don't patch.** If output is wrong on a foundational claim, don't say "fix it." Say: *"Stop. Quote your source for [claim]. What assumption did you make?"* This breaks the assumption-swap loop where pushback produces a freshly-wrong answer of the same shape.

**5. Self-surfaced unresolved assumptions = STOP.** If the plan lists "open questions" or "assumptions to verify", that's a checkpoint, not a footnote. Resolve them one-by-one before advancing. Cap follow-on prompts at "resolve question 1" — never "proceed despite these".

## Prompt templates

**Scope freeze (prompt 1):**
> Working on [task]. Scope is fixed at exactly these rows: [paste table or list]. Do not re-derive scope.
> Step 1 only: produce a table of [current observable state per row]. Stop after the table. Do not propose a plan.

**Plan request (after diagnostic verified):**
> Plan as a table. Columns: [row_id, operation, target_state, idempotency_check]. No narrative, no philosophy. If you have open questions, max 3, listed under the table.

**Pushback (first correction on a foundational claim):**
> Stop. Don't rewrite. First: what was your source for [claim]? Quote it. Then: what assumption did you make? Then I'll tell you what's actually true.

**Anti-bloat constraint (for one-shot data operations — migrations, cleanups, row-level fixes):**
> No new helpers, services, or abstractions. No future-proofing. Inline the logic for these N rows.

*For refactors:* abstractions are sometimes the point — apply this constraint only when the task is a data operation, not when the explicit goal is structural improvement.

## Rationalizations to forbid

| Excuse | Reality |
|---|---|
| "Let me investigate the scope first to be thorough" | Scope was provided or providable. About to bake in an inferred-scope error. |
| "I'll write the plan now, correct scope later" | Plans build on scope. Scope corrections invalidate plans. Reverse the order. |
| "First pushback was small, I'll just tweak the query" | Pushback signals the foundation is wrong. Swapping assumptions produces the same class of failure. |
| "8 open questions but the plan is mostly there" | Self-surfaced gaps are the system asking for a checkpoint. Take it. |
| "Adding a helper class for cleaner code" | Not authorized for one-shot data operations. If the task is a refactor, abstractions may be the point — but confirm scope first. |
| "User said 'work autonomously', so I'll infer scope" | Autonomy applies to execution *after* scope is frozen. Scope still comes from data. |

## Red flags — STOP

- About to write a "comprehensive plan" before a diagnostic table has been reviewed
- Output mixes findings and recommendations in flowing prose
- Plan contains a numbered list of "assumptions to verify"
- Just received pushback; about to issue a second diagnostic query without first asking *what assumption produced the first one*
- Adding helpers, services, or abstractions to a one-shot data operation scoped at "fix N rows"
- About to spawn a research agent to "figure out the scope" of a task the user has spec'd

**All of these mean: stop the current step. Re-ground from data the user provided (or ask for it as data).**

## Real-world impact

A 4-user data migration took 6 hours instead of ~90 minutes because Claude inferred "2 affected users" from its own diagnostic, wrote a 700-token plan with 8 unresolved assumptions on top, and on first pushback ("it's 4 users") produced a *second* flawed diagnostic with a different baked-in assumption. Every failure is addressed by one of the five rules above.
