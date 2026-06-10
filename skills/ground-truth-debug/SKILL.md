---
name: ground-truth-debug
description: Use when something is broken, throwing, failing, flaky, or regressed — a bug, a failing test, unexpected behavior, a build failure, or a performance regression. Triggers include "diagnose this", "debug this", "why is X failing", "X is slow", or any observable wrong behavior you need to root-cause and fix.
---

# Ground Truth Debug

The debug track of **REQUIRED BACKGROUND:** ground-truth. The ground rules (cc-skills block in CLAUDE.md) apply; this skill adds the debugging procedure.

## The Iron Law

```
NO FIX WITHOUT A REPRODUCED FAILURE AND A ROOT CAUSE
```

Symptom fixes are failure. If you haven't reproduced the bug and traced it to a root cause, you cannot propose a fix. **Violating the letter is violating the spirit** — no "quick fix for now", no "just try changing X".

## Phase 1 — Build a feedback loop

**This is the skill.** Everything else is mechanical. A fast, deterministic, agent-runnable pass/fail signal for the bug *is* ground truth — bisection, hypothesis-testing, and instrumentation all just consume it. Without one, no amount of staring at code will save you.

Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**

A catalog of loop constructions (failing test → curl → CLI snapshot → headless browser → replay a captured trace → throwaway harness → fuzz loop → bisection → differential → HITL) and how to sharpen them lives in `feedback-loops.md`. Read it when the obvious loop isn't available.

Build the right loop and the bug is 90% fixed. **Do not proceed to hypotheses without a loop you believe in.** If you genuinely cannot build one, stop and say so explicitly: list what you tried, and ask the user for environment access, a captured artifact (HAR, log dump, core dump, recording with timestamps), or permission to add temporary instrumentation.

## Phase 2 — Reproduce

Run the loop. Watch the bug appear. Confirm:

- [ ] The loop produces the failure the **user** described — not a different nearby failure. Wrong bug = wrong fix.
- [ ] Reproducible across runs (or, for non-deterministic bugs, at a high enough rate to debug against — loop the trigger, parallelise, add stress until a 1% flake becomes a 50% flake).
- [ ] You captured the exact symptom (error, wrong output, timing) so later phases can verify the fix addresses it.

## Phase 3 — Hypothesise

Generate **3–5 ranked, falsifiable hypotheses before testing any.** Single-hypothesis generation anchors on the first plausible idea.

> Format: "If <X> is the cause, then <changing Y> makes the bug disappear / <Z> makes it worse."

If you can't state the prediction, it's a vibe — sharpen or discard. **Show the ranked list to the user before testing** — they often re-rank instantly ("we just deployed #3") or know what's already ruled out. Don't block on it if they're AFK.

For bugs deep in the call stack, trace backward to the original trigger instead of fixing where the error surfaces — see `root-cause-tracing.md`.

## Phase 4 — Instrument

Each probe maps to a specific prediction from Phase 3. **Change one variable at a time.**

1. **Debugger / REPL inspection** if the env supports it. One breakpoint beats ten logs.
2. **Targeted logs** at the boundaries that distinguish hypotheses. Never "log everything and grep".
3. **Tag every debug log** with a unique prefix (`[DEBUG-a4f2]`) so cleanup is one grep. Untagged logs survive; tagged logs die.

**Perf branch.** For regressions, logs are usually wrong. Establish a baseline measurement (timing harness, `performance.now()`, profiler, query plan), then bisect. Measure first, fix second.

## Phase 5 — Fix + regression test

Write the regression test **before the fix** — but only if a **correct seam** exists. A correct seam exercises the real bug pattern as it occurs at the call site. A too-shallow seam (single-caller test for a multi-caller bug) gives false confidence.

**If no correct seam exists, that itself is the finding.** The architecture is preventing the bug from being locked down — note it for Phase 6.

If a correct seam exists: turn the repro into a failing test → watch it fail → apply the fix → watch it pass → re-run the Phase 1 loop against the original (un-minimised) scenario.

## Phase 6 — Cleanup + post-mortem

Required before declaring done:

- [ ] Original repro no longer reproduces (re-run the Phase 1 loop)
- [ ] Regression test passes (or absence of seam is documented)
- [ ] All `[DEBUG-...]` instrumentation removed (`grep` the prefix)
- [ ] Throwaway harnesses deleted or moved to a clearly-marked debug location
- [ ] The correct hypothesis is stated in the commit / PR message — so the next debugger learns

**Then ask: what would have prevented this?** If the answer is architectural (no good seam, tangled callers, hidden coupling), hand off to ground-truth-investigate with specifics — *after* the fix is in, when you know the most.

## When 3+ fixes have failed

"Fix" here means a fully-applied change that appeared to address the root cause but didn't hold — not a hypothesis probe during Phase 3–4. Normal hypothesis testing may eliminate all 3–5 ranked hypotheses without triggering this rule.

Stop. This is no longer a failed hypothesis — it's a **wrong architecture** signal. Symptoms: each fix reveals new shared state/coupling elsewhere, fixes need "massive refactoring", each fix creates new symptoms. Do **not** attempt fix #4. Question whether the pattern is fundamentally sound, and discuss with the user before continuing.

## Rationalizations to forbid

| Excuse | Reality |
|---|---|
| "Issue is simple, skip the process" | Simple bugs have root causes too. The process is fast for simple bugs. |
| "Emergency, no time" | Systematic debugging is *faster* than guess-and-check thrashing. |
| "Just try changing X first" | The first fix sets the pattern. Reproduce first. |
| "I'll write the test after confirming the fix" | Untested fixes don't stick. Test-first *when a correct seam exists* proves the fix addresses the symptom. |
| "Multiple fixes at once saves time" | Can't isolate what worked; causes new bugs. One variable at a time. |
| "I see the problem, let me fix it" | Seeing the symptom ≠ understanding the root cause. |
| "One more fix attempt" (after 2+ fully-applied fixes) | 3+ shipped fixes that didn't hold = architectural problem. Question the pattern, don't fix again. |
| "A flaky loop is good enough" | A 30s flaky loop is barely better than none. A 2s deterministic loop is a superpower. |

## Red flags — STOP and return to Phase 1

- Proposing a fix before tracing data flow
- "Quick fix for now, investigate later" / "it's probably X"
- Adding multiple changes then running tests
- "Skip the test, I'll manually verify"
- Each fix reveals a new problem in a different place
- User says "stop guessing" / "is that not happening?" / "we're stuck?" — you assumed without verifying
