---
name: ground-truth-investigate
description: Use when you face an open question you must answer to decide or proceed — how a subsystem works, which approach to take, what's affected when the set is unknown, whether an assumption holds. Triggers include "how does X work", "compare approaches", "research X", catching yourself thinking "probably/likely/I assume", or being about to spawn 2+ agents to find something out.
---

# Ground Truth Investigate

The investigation track of **REQUIRED BACKGROUND:** ground-truth. The ground rules (cc-skills block in CLAUDE.md) apply; this skill adds the research procedure. Core stance: **don't guess, investigate — and don't over-investigate; scale effort to the question.**

If requirements themselves are unclear (WHAT to build), use brainstorming first. This skill is for HOW — answering questions you've already framed.

## Quick reference

```
1. [ ] Model the problem + surface assumptions, write specific questions   (Think)
2. [ ] Classify effort tier: quick / focused / deep                        (Scale)
3. [ ] Present plan to user for focused/deep                               (Checkpoint)
4. [ ] Validate decomposition: solvable? complete? non-redundant?          (Triage)
5. [ ] Brief agents: objective, boundaries, output format, tools, effort   (Spawn)
6. [ ] Synthesize with confidence scoring + challenge findings             (Synthesize)
7. [ ] Replan if gaps, or decide with evidence chain                       (Decide)
```

The pattern loops: `Think → Scale → [Checkpoint] → Triage → Spawn → Synthesize → Decide`, with Spawn↔Synthesize replanning when gaps appear.

## 1. Think — questions + problem model

Stop. Don't execute yet. Model the problem first:

```
ENTITIES:    [actors, systems, components involved]
UNKNOWNS:    [what changes, varies, is uncertain]
CONSTRAINTS: [what must always be true]
GOAL:        [the specific outcome the user needs]
```

Then write **specific** questions, not "understand the codebase" → "how is auth implemented here?". **Surface every assumption** (tech stack, user needs, existing implementation, how components interact) — each assumption you'd say "probably" about becomes one research question. Then challenge the list: am I investigating the right questions or just the first ones I thought of? Are any answerable by just reading the code directly (if so, read it — don't spawn an agent)?

## 2. Scale — classify effort tier

| Tier | Questions | Agents | Calls/agent | When |
|---|---|---|---|---|
| **Quick** | 1–3 | 1–2 | ~5 | Locating code, checking a pattern, verifying one fact |
| **Focused** | 3–6 | 3–5 | ~15 | Comparing approaches, understanding a subsystem, validating a design |
| **Deep** | 6–10+ | 5–10 | ~25 | Architecture decisions, cross-cutting concerns, multi-domain research |

**Heuristic:** wrong and nobody notices for a week → Quick. Wastes a day → Focused. Forces a rewrite → Deep. **Budget rule:** if investigation tokens would exceed implementation tokens, stop investigating and learn by doing.

## 3. Checkpoint — align with user (focused + deep only)

Skip for Quick. Otherwise present the plan before spawning:

```
I need to investigate [N] questions before proceeding:
1. [Question] — [agent type], [model]
...
Effort tier: [Focused/Deep] · Estimated agents: [N]
Does this cover the right ground, or should I adjust?
```

If user says "just go": skip future checkpoints this session for this tier.

## 4. Triage — validate decomposition before spawning

- **Solvability:** for each question, is there an agent + tool combo that can actually answer it? If not, reframe or split.
- **Completeness:** does the union of questions cover everything needed to decide? List what's NOT covered; decide if it matters.
- **Non-redundancy:** do any two overlap? Merge, or split by distinct aspect ("how it works" vs "how it's tested").

## 5. Spawn — structured briefings

Every agent gets ALL of: `OBJECTIVE` (one specific question), `BOUNDARIES` (what NOT to touch — explicitly excludes other agents' objectives), `OUTPUT FORMAT`, `TOOL GUIDANCE`, `EFFORT` (~5/~15/~25 calls). Keep briefings to ~5 lines — verbose prompts make agents fixate on instructions instead of investigating.

**Model selection:** Haiku for lookups ("intern, 30 seconds" — find files, grep, list), Sonnet for reading + judgment (analyze patterns, compare approaches, validate assumptions), Opus only for orchestration / weighing trade-offs. **Agent types:** `Explore` for fast read-only codebase search, `general-purpose` for research/web/analysis.

**Waves:** independent questions → Wave 1 (single parallel batch); questions needing Wave 1 findings → Wave 2+. **Cap 3–5 agents per wave** — beyond ~4, coordination gains plateau and error amplification rises sharply.

For the full briefing examples and anti-patterns, and the synthesis template, see `synthesis.md`.

## 6. Synthesize — structured analysis

After each wave, produce a structured synthesis, not a loose summary: per-question **Answer / Confidence (high·med·low) / Evidence / Source count**, plus Cross-Cutting Themes, Contradictions, Remaining Gaps, Recommendation. Full template in `synthesis.md`.

- **Confidence:** High = 2+ independent sources, directly observed → proceed. Medium = single source / inferred → ok for non-critical, triangulate for critical. Low = speculative → investigate or flag.
- **A claim is critical if being wrong forces a rewrite or breaks production.** Critical claims need **2+ genuinely independent sources** (5 articles citing 1 paper = 1 source).
- **Challenge before accepting:** Does it match what I can observe right now? Echo chamber (agreed because same evidence/bias, or truly independent)? What did no agent answer? Test the weakest link. Gaps → spawn targeted delta-queries, not a full re-investigation.

## 7. Decide — evidence-based action

```
Decision: [what you decided]
Because:  [finding 1], [finding 2], [finding 3]
Risk:     [what could still be wrong, and how we'd detect it]
```

Every decision backed by findings. No guessing.

## Stopping rules

- All critical questions answered at medium+ confidence → proceed to Decide.
- Investigation tokens > estimated implementation tokens → start building, learn by doing.
- A whole wave returns nothing new (null-delta) → wrong questions, reformulate.
- 3+ waves without closing gaps → reframe the problem or ask the user.
- Same tool + same args twice in a wave → loop detected, redirect.
- At ~70% of budget: converge, no new threads. At 100%: synthesize what you have, flag gaps, proceed.

**Never stop because you spawned "enough" agents. Stop when you have enough answers.**

## Rationalizations to forbid

| Excuse | Reality |
|---|---|
| "Research everything about X" | Agents overlap, return noise. One specific question + boundaries per agent. |
| "Spawn 10 agents to be safe" | Beyond ~4, error amplification dominates. 1–2 for Quick. |
| "Multiple agents agreed, must be right" | Echo chamber — same training bias. Check for *independent* evidence. |
| "5 articles cite it, that's 5 sources" | Citation chain, not confirmation. Count primary sources. |
| "I'll proceed on this low-confidence finding" | Building on sand. Triangulate or flag. |
| "Stick to the Wave 2 plan despite new info" | Answering the wrong questions well. Replan after each wave. |
