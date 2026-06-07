# Briefings, Synthesis & Anti-Patterns

Reference for ground-truth-investigate. Load when actually spawning agents and synthesizing.

## Agent briefing template

Every agent gets ALL of these:

```
OBJECTIVE:     [One specific question to answer]
BOUNDARIES:    [What NOT to investigate — explicitly excludes other agents' objectives]
OUTPUT FORMAT: [What the findings should look like]
TOOL GUIDANCE: [Which tools to prefer, which to avoid]
EFFORT:        [Approximate tool calls expected: ~5 / ~15 / ~25]
```

**Good briefing:**
```
OBJECTIVE: How does the scheduling service handle timezone conflicts?
BOUNDARIES: Only look at packs/scheduling/. Do NOT investigate notifications or
  calendar sync — other agents cover those.
OUTPUT FORMAT: Describe the conflict resolution logic, list edge cases handled, note gaps.
TOOL GUIDANCE: Start with Grep for "timezone" and "conflict", then Read the relevant files.
EFFORT: ~10 tool calls.
```

**Bad briefing:** `Research the scheduling service.`

## Synthesis template

After each wave, produce this — not a loose summary:

```
## Findings

### [Question 1]
- Answer: [concrete finding]
- Confidence: high / medium / low
- Evidence: [specific files, lines, URLs, search results]
- Source count: [how many independent sources confirm]

### [Question 2]
...

## Cross-Cutting Themes
- [Pattern that emerged across multiple agents' findings]

## Contradictions
- [Agent A found X, but Agent B found Y — needs resolution]

## Remaining Gaps
- [What we still don't know]

## Recommendation
- [Enough to proceed / Need another wave / Need user input]
```

## Confidence scoring

| Level | Meaning | Action |
|---|---|---|
| **High** | 2+ independent sources agree, directly observed in code/docs | Proceed |
| **Medium** | Single source, or inferred from patterns | OK for non-critical; triangulate for critical |
| **Low** | Speculative, based on naming or incomplete evidence | Investigate further or flag to user |

## Evidence triangulation (critical claims)

A claim is **critical** if being wrong would cause a rewrite or break production. For critical claims, require **2+ genuinely independent sources** (5 articles citing 1 paper = 1 source):
- Code inspection + documentation
- Two different code paths confirming the same behavior
- Code + test assertions
- Code + runtime behavior (logs, console)

## Challenge findings before accepting

1. **Verify against reality:** do findings match what I observe in code right now?
2. **Echo chamber check:** did agents agree from the *same* evidence/bias, or independently? Agreement from identical sources is not confirmation.
3. **What's missing:** what did no agent answer? What would a skeptic challenge?
4. **Test the weakest link:** which finding has lowest confidence? What changes if it's wrong?

Gaps → spawn targeted **delta-queries** for the specific gaps, not a full re-investigation.

## Edge cases

- **Pivot:** if a wave reveals the questions were wrong — STOP, reformulate, present revised questions (focused/deep), restart with the corrected wave. Don't force the next planned wave.
- **Contradictions:** check if agents investigated different scopes (apparent, not real). If real, spawn a tie-breaker with both contexts. If unresolvable, escalate to user with both positions.
- **Stuck agent (vague/empty results):** question too broad → narrow + respawn with tighter boundaries. Info doesn't exist → ask user. Wrong tools → respawn with explicit tool guidance.

## Anti-patterns

| Anti-pattern | Why it fails | Instead |
|---|---|---|
| "Research everything about X" | Overlap, noise, wasted tokens | One specific question + boundaries per agent |
| 10 agents for a Quick question | 17x error amplification beyond ~4 | 1–2 agents, ~5 calls each |
| No boundaries between agents | Duplicate work on same files | Explicit BOUNDARIES excluding others' objectives |
| Synthesizing without structure | Miss contradictions, lose info | Use the synthesis template every time |
| Proceeding on low-confidence | Build on sand | Triangulate or flag |
| Rigid wave plan despite new info | Answer the wrong questions well | Replan after each wave |
| Verbose agent prompts | Agents fixate on instructions | 5-line briefings |
| "Multiple agents agreed = right" | Echo chamber, same training bias | Check for independent evidence |
| "5 citations = 5 sources" | Citation chain ≠ confirmation | Count primary sources |

## Meta-prompts (use when stuck)

- "What do I need to know to solve this well?"
- "What am I assuming right now? Would I bet money on it?"
- "Am I guessing or do I have evidence?"
- "Am I investigating the right questions, or the first ones I thought of?"
- "Is more investigation useful, or should I build and learn by doing?"
- "What would a skeptic challenge? If this finding were wrong, what changes?"
