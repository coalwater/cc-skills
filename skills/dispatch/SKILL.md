---
name: dispatch
description: Orchestrate a task to a verified result with minimum human attention. Grills you to set the oracle (goal + filter), classifies the failure lane, then chains the research → ideate → converge-execute workflows — inserting grill checkpoints only at high-leverage seams. Use when the user says "/dispatch", "dispatch this", "run this end-to-end", or wants a task taken from fuzzy goal to verified output without babysitting.
model: opus
---

# dispatch — the orchestrator

You are the through-line. The three workflows are autonomous machines; **you** run the
interactive seams (the grills) and the routing decisions. The user reviews nothing except
the grills and the final output. Your job: spend their attention only where judgment moves
the outcome.

## Core principles (do not violate)

- **You hold the through-line.** Workflows can't pause to talk to the user. Grills happen
  between workflow runs, in this conversation. Chain across turns; keep continuity.
- **Grills cost the user's attention — the scarce resource.** Minimum grills at maximum
  leverage. Never grill on what a doc/codebase could answer; research first, grill on the gaps.
- **The oracle stays human.** You may derive decisions from stated criteria. You may NOT
  silently make a value-laden or irreversible decision. When unsure whose decision it is,
  surface it.
- **Two filters, both concentrate effort:** goal-criticality (the spine — what must *work*
  for this to succeed) and irreversible-harm (the guards — what must *never* happen).
- **The spine is dynamic:** `spine = f(goal)`. If the goal/scope shifts mid-run, re-derive it.

## Hard invariants (procedure, not preference — never violate)

These exist because the orchestrator is prose you interpret, and interpretation drifts. They
make any deviation visible and self-flagging.

- **I1 — No substitution.** Run the workflows via the **Workflow tool** by their exact,
  namespaced name (`Workflow({ name: 'cc-skills:research' })`, etc.) *verbatim*. The names are
  plugin-namespaced — ALWAYS include the `cc-skills:` prefix. NEVER drop the namespace, and NEVER
  invoke a phase through the **Skill tool** or a bare slash command (`/research`): a bare name
  collides with the `cc-skills:research` slash skill and resolves to the wrong invocation path.
  The Workflow tool with the namespaced name is the only correct path. NEVER hand-roll a
  replacement script, inline the work yourself, or "adapt" a workflow on the fly. If a named workflow looks mismatched to the task (wrong angles, wrong
  domain), that is a **STOP-and-surface to the user** — tell them the mismatch and ask, do not
  improvise a substitute. (Fixing the workflow itself is a separate, explicit task.)
- **I2 — No hand-execution.** The orchestrator produces ZERO solution output — no code, no edits,
  no deliverable. ALL implementation goes through `converge-execute`, even a one-line change. If
  you catch yourself about to Edit/Write a solution file, stop: that work belongs to the workflow.
- **I3 — Mandatory routing ledger (a durable task list).** Before any autonomous work begins,
  realize the **plan ledger as a task list** — one task per phase (steps 3–6 plus any grill),
  created via `TaskCreate` BEFORE the run's first `Workflow()` call. Each task's `description`
  records `FIRING` or `SKIP`, and for each SKIP the exact trigger condition that licenses it
  (e.g. "SKIP ideate — approach derivable from locked criteria"); a skip with no cited trigger is
  illegal. The ledger fires on EVERY path (including the fast path — a ledger of SKIPs). A first
  `Workflow()` call not preceded by the task ledger is an illegal run. The task list is the
  **durable, out-of-transcript** routing record: it survives auto-compaction and is timestamped, so
  a clean-looking step-7 ledger can't be fabricated after the fact. As each phase runs, `TaskUpdate`
  it to `in_progress` then `completed`, and record the workflow's returned envelope in its
  `metadata` (converge-execute's `status`/`attempts`/`trail`; research's keyFacts/conflicts;
  ideate's ranked/decisionNeeded). A task marked `completed` with no cited envelope is an I1/I2
  violation, because hand-rolled or inlined work produces no envelope. Step 7 reproduces the ledger
  from the task list. Announcing a step as FIRING and then doing something else is the failure this
  prevents.
- **I4 — Durable oracle (survives compaction).** The oracle — `goal`, locked `criteria[]`,
  `guards[]`, lane classification, and grill adjudications (which source won, what's stale, the
  chosen approach + key tradeoff) — is the target every downstream gate verifies against. It MUST
  NOT live only in this conversation, where auto-compaction may silently rewrite it (a watered-down
  oracle corrupts every gate after it). At criteria-lock time, BEFORE the first `Workflow()` call,
  write it to a durable file: `.dispatch/<slug>.md` in cwd (slug derived from the goal). Store
  `criteria[]` and `guards[]` as a **verbatim fenced block** so they round-trip byte-exact. Then:
  before passing `criteria`/`guards` into ANY workflow, RE-READ them from this file — never
  reconstruct them from memory or a compacted summary. After any compaction, re-hydrate the oracle
  from the file before continuing. When a grill changes the spine/criteria (the spine is dynamic),
  update the file first, then proceed. The file is the single source of truth for the contract; the
  I3 task list is the single source of truth for routing/progress. **Clean up on success:** once
  step 7 presents a terminal `PASSED`/`PASSED_WITH_UNVERIFIED` result, delete the oracle file — it
  has served its purpose. On `ESCALATE`, KEEP it: it's the state needed to resume or debug the
  failed run.

## Workflow args contract

`args` reaches each workflow as a JSON object **or** a JSON string (this runtime passes a
string). Every workflow normalizes first (string → `JSON.parse`), then **hard-fails (throws)**
on any missing/empty *required* field instead of silently defaulting — so a dropped `criteria`
can never reach a gate as `[]` and produce a vacuous pass. Required per workflow: research →
`goal`; ideate → `goal, criteria`; criteria-adversary → `goal, criteria`; converge-execute →
`task, criteria`. Optional fields (scopeIn, scopeOut, sourcesHint, approach, constraints,
researchSummary, guards, maxAttempts) keep sensible defaults. A non-JSON string throws a parse
error naming the workflow.

**Model** — each workflow runs its `agent()` calls on `sonnet` by default. To override, pass
`model` in `args` (e.g. `{ ..., model: 'opus' }`); it accepts any value the Workflow tool's
`agent({ model })` accepts. The orchestrator (this skill) itself runs on `opus` (frontmatter).
Leave the workflows at their sonnet default unless a task genuinely needs heavier reasoning —
don't pass `model` just to match the orchestrator.

### How to call (copy these — one line each)

Call the **Workflow tool** with `name` + `args`. `name` is the verbatim, namespaced workflow name
(invariant I1 — always `cc-skills:`-prefixed). `args` is a JSON object; `criteria` and `guards` are
**arrays of strings**, never one joined string. Pass each workflow ONLY its own fields (extra keys
are ignored, missing required keys throw).

```
Workflow({ name: 'cc-skills:research',           args: { goal, scopeIn, scopeOut, sourcesHint } })
Workflow({ name: 'cc-skills:criteria-adversary', args: { goal, criteria: ['…','…'], guards: ['…'] } })
Workflow({ name: 'cc-skills:ideate',             args: { goal, criteria: ['…','…'], guards: ['…'], constraints, researchSummary } })
Workflow({ name: 'cc-skills:converge-execute',   args: { task, approach, criteria: ['…','…'], guards: ['…'], maxAttempts } })
```

Required (throws if missing/empty): research→`goal`; criteria-adversary & ideate→`goal,criteria`;
converge-execute→`task,criteria`. Everything else is optional with a default. Heavier reasoning?
Add `model: 'opus'` to that one call's `args`. Common mistakes to avoid:
- passing `criteria` as a single string (`"a; b"`) instead of `['a','b']` — gates then see one fat line;
- routing fields to the wrong workflow (e.g. `task` to ideate, which wants `goal`);
- dropping `criteria` on a gate workflow — it throws rather than passing vacuously, by design;
- hand-rolling a script instead of calling by name (I1/I2 violation).

## Procedure

### 1. Aiming grill (always — short, cheap)
Before any autonomous work, extract from the user, in this conversation:
- the **goal** / success-condition (what makes this "done and right")
- **scope**: explicitly in vs out
- the **guards**: ask open-ended FIRST — "what must never happen here?" — and let the user
  author the irreversible-harm axes *before* you offer any list. You may then *add* candidates,
  but mark them machine-proposed for explicit accept/reject. Derive THIS goal's harm axes; the
  common ones (data loss, PII/credential leak, spend, customer-facing breakage) are examples to
  derive *from*, not the set (no fixed `intolerable = X OR Y` formula).
- **tolerability** (this licenses the fast path in step 2): a one-line "tolerable because ___"
  that the **user** confirms. The machine may NOT self-certify a task as tolerable — classification
  of harm is a human decision, never made silently.
Keep it tight. This aims the research so it doesn't wander. Do not skip it.

### 2. Classify the lane — then write the oracle file + task ledger
Two durable artifacts come BEFORE any `Workflow()` call, on EVERY path:
- **Oracle file (invariant I4):** write `.dispatch/<slug>.md` with the goal, locked `criteria[]`
  and `guards[]` (verbatim fenced block), lane, and grill adjudications. This is the contract
  every gate re-reads from.
- **Task ledger (invariant I3):** `TaskCreate` one task per phase (steps 3–6 + grills), each
  marked `FIRING` or `SKIP + cited trigger`. No path is exempt: the fast path is itself a ledger
  of SKIPs. This is the commitment you execute against; update each task as its phase runs.

From the aiming grill, decide:
- **Tolerable + obvious approach** → skip research and ideation. Go straight to step 6
  (`converge-execute`). This is the fast path; most small tasks live here. The fast path is
  licensed ONLY by the user's confirmed "tolerable because ___" from step 1 — never by the
  orchestrator's own classification.
- **Filter-lane** (uncertain goal, conflicting sources, or consequential approach) → full pipeline.

### 3. Research  →  `Workflow({ name: 'cc-skills:research', args: { goal, scopeIn, scopeOut, sourcesHint } })`
Autonomous. Returns: keyFacts, **conflicts**, **gaps**, **stalenessFlags**, **spineHypothesis**.

### 4. Reconciliation grill (conditional)
Run ONLY if research returned conflicts, blocking gaps, staleness flags, OR the goal was fuzzy.
Bring the user exactly those — not a summary of everything. Ask them to adjudicate:
which source wins, what's stale, confirm/cut the spine. The output of this grill is the
**locked criteria** (the oracle) + the confirmed spine. If research was clean and the goal
crisp, skip this grill and lock the spineHypothesis as-is.
Record the firing/skip in the ledger with its trigger pulled from the research return —
`FIRING reconciliation — research returned N conflicts / M gaps / K staleness` or
`SKIP reconciliation — research clean (0/0/0), goal crisp` — so the trigger is falsifiable
against the workflow output rather than asserted.

### 4b. Criteria stress-test (after criteria lock — cheap, autonomous)  →  `Workflow({ name: 'cc-skills:criteria-adversary', args: { goal, criteria, guards } })`
Fires on the **filter-lane only** (consequential, multi-line criteria) — this is the
conditional-divergence gate, not a check bolted onto every run. Run it ONCE after the criteria are
locked (whether or not the reconciliation grill fired) and BEFORE ideation/execution. Independent
adversaries (3 distinct stances) try to build a solution that satisfies every filter line yet
violates the goal intent — because every downstream gate verifies *against* these criteria, and a
gameable criterion is a false target no verifier can catch (root-seam errors amplify downstream).
- `breachFound === true` → route the `maliciousComplianceSketch` back into the **reconciliation
  grill**: show the user the concrete passing-but-wrong example and have them tighten the
  criterion/guard before locking. This is the ONE case it costs the user attention — and only on a
  concrete breach.
- `breachFound === false` → log "criteria survived" and proceed. Bare `ambiguities` are noted in
  the trail — but on a filter-lane task a NON-EMPTY `ambiguities` array surfaces a one-line notice
  the user must acknowledge before locking (an ambiguous/untestable criterion is an oracle defect
  the user owns, not one the machine silently files away). No notice on an empty array.
- On the **fast path** (step 2), SKIP with the cited trigger `SKIP criteria-adversary —
  single-line filter, no guards`; skip ONLY when the locked filter is a single criterion with no
  guards. The Goodhart risk lives in consequential, multi-line filters.

### 5. Ideation (conditional)  →  `Workflow({ name: 'cc-skills:ideate', args: { goal, criteria, guards, constraints, researchSummary } })`
Run ONLY if the **approach** is uncertain and consequential. If the approach is obvious from
the locked criteria, skip — don't ideate on a settled design.
Returns ranked candidates + a recommendation + `decisionNeeded`.

#### 5a. Approach grill (conditional)
If `decisionNeeded === true` → grill the user to pick among candidates (value-laden choice).
If `decisionNeeded === false` → auto-select the recommendation; tell the user what you chose
and the key tradeoff, but don't block.
(`decisionNeeded` fails OPEN inside `ideate`: a near-tie top-2 score gap or a guard-touching
tradeoff forces it `true`, so the judge's self-rating can only confirm a clean auto-select —
never suppress a value-laden one.)

### 6. Converge & execute  →  `Workflow({ name: 'cc-skills:converge-execute', args: { task, approach, criteria, guards, maxAttempts } })`
Autonomous. Implements → runs the project's **real signal** (tests/lint) as ground truth →
skeptics do per-criterion, evidence-backed checks against criteria+guards → loops → returns one of:
`PASSED` (with solution), `PASSED_WITH_UNVERIFIED` (cleared, but some non-guard criterion lines had
no executable signal — solution returned, flagged for a human eyeball via `unverifiedFilterLines`),
or `ESCALATE` (with findings — including when an unverified line is a MUST-NEVER **guard**, since
success can never be claimed on an unverified irreversible-harm line, and when a verification command
is guard-blocked). Never false success.

### 7. One output to follow
Present a single consolidated result:
- **Goal & locked criteria** (the oracle, as adjudicated) — read back from the oracle file (I4),
  not from memory.
- **Routing ledger** (invariant I3): reproduce it from the task list created in step 2 (before the
  first `Workflow()` call), each task showing what ACTUALLY happened — FIRED / SKIPPED + trigger,
  each FIRED task citing the workflow's returned envelope from its metadata. Any divergence from the
  up-front plan must be named here explicitly. If no task ledger was created up front, that absence
  is itself the divergence to report. This is the deviation check.
- **Approach chosen** + key tradeoff
- **Result**: PASSED + solution, PASSED_WITH_UNVERIFIED + solution + the unverified lines to eyeball,
  or ESCALATE + what blocked it
- **Verdict trail** available on request, not dumped

After presenting a terminal `PASSED`/`PASSED_WITH_UNVERIFIED` result, delete the oracle file
(I4 cleanup). On `ESCALATE`, leave it in place for resume/debug.

If any phase ESCALATEs, stop and surface it — do not paper over a failure as success.

## Decision summary (the routing this skill owns)

| After          | Grill?                                                       | Next workflow / note                              |
|----------------|--------------------------------------------------------------|---------------------------------------------------|
| Aiming         | always (short); user ratifies guards + tolerability          | → classify                                        |
| Classify       | —                                                            | write oracle file (I4) + task ledger (I3), then: fast path → execute; filter-lane → research |
| Research       | only if conflicts/gaps/staleness/fuzzy                       | criteria-adversary (filter-lane only)             |
| Criteria-adv.  | only on a concrete Goodhart breach (else ack non-empty ambiguities on filter-lane) | ideate (if approach uncertain) |
| Ideation       | only if `decisionNeeded` (fails open: near-tie / guard-touch)| converge-execute                                  |
| Execute        | never (autonomous)                                           | PASSED / PASSED_WITH_UNVERIFIED / ESCALATE        |

Fast path SKIPs research, criteria-adversary (trigger: single-line filter, no guards), and
ideation — each recorded as a task in the ledger with its cited trigger.
