export const meta = {
  name: 'ideate',
  description: 'Autonomous ideation phase: fan out diverse, independent approach-generators (distinct stances), then a judge ranks them against the criteria and flags whether the approach choice needs human adjudication.',
  phases: [
    { title: 'Generate', detail: 'blind, diverse approach generators' },
    { title: 'Judge', detail: 'rank vs criteria, recommend, flag if the decision is value-laden' },
  ],
}

// args: { goal, criteria:[], guards:[], constraints, researchSummary } — passed as a JSON object OR string.
// REQUIRED: goal, criteria (throws if missing/empty). OPTIONAL: guards, constraints, researchSummary.
const _args = (typeof args === 'string')
  ? (() => { try { return JSON.parse(args) } catch (e) { throw new Error(`[ideate] args is a string but not valid JSON: ${e.message}`) } })()
  : (args || {})
const _missing = []
if (!_args.goal || String(_args.goal).trim() === '') _missing.push('goal')
if (!Array.isArray(_args.criteria) || _args.criteria.length === 0) _missing.push('criteria')
if (_missing.length) throw new Error(`[ideate] required field(s) missing/empty: ${_missing.join(', ')}`)
const goal = _args.goal
const criteria = _args.criteria
const guards = _args.guards || []  // never-cross lines — used to fail decisionNeeded OPEN
const constraints = _args.constraints || 'none stated'
const researchSummary = _args.researchSummary || 'none provided'
// Agent model: default sonnet for this workflow; caller may override via args.model.
// (agent() supports `model` but has no reasoning-effort option, so effort is not set here.)
const model = _args.model || 'sonnet'

const IDEA = {
  type: 'object',
  required: ['stance', 'approach', 'pros', 'cons', 'risk'],
  properties: {
    stance: { type: 'string' },
    approach: { type: 'string', description: 'the proposed approach, concrete enough to evaluate' },
    pros: { type: 'array', items: { type: 'string' } },
    cons: { type: 'array', items: { type: 'string' } },
    risk: { type: 'string', description: 'the main way this approach fails' },
  },
}

const JUDGMENT = {
  type: 'object',
  required: ['ranked', 'recommendation', 'keyTradeoff', 'decisionNeeded', 'decisionReason'],
  properties: {
    ranked: {
      type: 'array',
      items: {
        type: 'object',
        required: ['approach', 'score', 'rationale'],
        properties: { approach: { type: 'string' }, score: { type: 'number' }, rationale: { type: 'string' } },
      },
    },
    recommendation: { type: 'string', description: 'the approach to take if no human input' },
    keyTradeoff: { type: 'string', description: 'the one tradeoff that separates the top approaches' },
    decisionNeeded: { type: 'boolean', description: 'true if the choice is value-laden/irreversible and a human should decide; false if cleanly derivable from criteria' },
    decisionReason: { type: 'string' },
  },
}

// Diverse stances — divergence is the point. Each generator is blind to the others.
const STANCES = [
  'SIMPLEST: the least-moving-parts approach that could possibly satisfy the criteria.',
  'NO-CONSTRAINTS: ignore current limits — what is the ideal design if nothing held you back? Then note what it would take.',
  'INVERT: solve the opposite problem, or eliminate the need for the feature entirely.',
  'SCALE: design as if this must handle 1000x load / data / users from day one.',
  'STEAL: borrow a proven pattern from a different domain and adapt it.',
]

phase('Generate')
const ideas = (await parallel(STANCES.map((stance, i) => () =>
  agent(
    `GOAL:\n${goal}\n\nACCEPTANCE CRITERIA:\n${criteria.map((c, n) => `${n + 1}. ${c}`).join('\n') || '(none yet)'}\n` +
    `CONSTRAINTS: ${constraints}\n\nRESEARCH SUMMARY:\n${researchSummary}\n\n` +
    `Your stance — ${stance}\n\nGenerate ONE concrete approach from this stance only. Commit to the stance even if it feels extreme — diversity is the job. Give pros, cons, and the main failure mode.`,
    { label: `idea#${i}`, phase: 'Generate', schema: IDEA, model }
  )
))).filter(Boolean)

phase('Judge')
const judgment = await agent(
  `GOAL:\n${goal}\nACCEPTANCE CRITERIA:\n${criteria.map((c, n) => `${n + 1}. ${c}`).join('\n') || '(none yet)'}\nCONSTRAINTS: ${constraints}\n\n` +
  `Candidate approaches from ${ideas.length} independent generators:\n${JSON.stringify(ideas, null, 2)}\n\n` +
  `Rank them against the criteria. Recommend one. Name the single key tradeoff that separates the top options. ` +
  (guards.length ? `GUARDS (never-cross lines): ${guards.join('; ')}\nIf the chosen approach trades off against any guard, that is value-laden — set decisionNeeded=true.\n\n` : '') +
  `Then decide DECISION-NEEDED: set true ONLY if the choice is value-laden, irreversible, or not cleanly derivable from the criteria (a human should pick). Set false if the criteria make one approach clearly correct.`,
  { label: 'judge', phase: 'Judge', schema: JUDGMENT, model }
)

// A3-1 fix: decisionNeeded fails OPEN. The judge's self-rating can only CONFIRM a clean
// auto-select — structural signals (near-tie, guard-touching tradeoff) can force it true,
// never the reverse. We never flip a true to false.
const ranked = (judgment.ranked || []).slice().sort((a, b) => (b.score || 0) - (a.score || 0))
const topScore = ranked[0] ? (ranked[0].score || 0) : 0
const gap = ranked.length >= 2 ? Math.abs(topScore - (ranked[1].score || 0)) : Infinity
const nearTie = gap !== Infinity && gap / Math.max(Math.abs(topScore), 1) < 0.1
const guardWords = guards.flatMap(g => String(g).toLowerCase().match(/[a-z]{5,}/g) || [])
const decisionBlob = `${judgment.keyTradeoff || ''} ${ranked.slice(0, 2).map(r => r.approach).join(' ')}`.toLowerCase()
const touchesGuard = guardWords.length > 0 && guardWords.some(w => decisionBlob.includes(w))
const decisionNeeded = !!judgment.decisionNeeded || nearTie || touchesGuard
const decisionReason = judgment.decisionNeeded
  ? judgment.decisionReason
  : ([nearTie && `near-tie: top-2 score gap ${gap === Infinity ? 'n/a' : gap.toFixed(2)} within 10% of top`, touchesGuard && 'top approach trades off against a guard'].filter(Boolean).join('; ') || judgment.decisionReason)

return { goal, candidates: ideas, ...judgment, decisionNeeded, decisionReason }
