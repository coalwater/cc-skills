export const meta = {
  name: 'criteria-adversary',
  description: 'One-shot Goodhart check on the locked criteria: try to construct a solution that satisfies every filter line yet violates the goal intent, or flag an ambiguous/untestable/contradictory line. Routes into the reconciliation grill ONLY on a concrete breach.',
  phases: [
    { title: 'Adversary', detail: 'attack the criteria, not any solution' },
  ],
}

// args: { goal, criteria:[], guards:[] } — passed as a JSON object OR string.
// REQUIRED: goal, criteria (throws if missing/empty). OPTIONAL: guards.
const _args = (typeof args === 'string')
  ? (() => { try { return JSON.parse(args) } catch (e) { throw new Error(`[criteria-adversary] args is a string but not valid JSON: ${e.message}`) } })()
  : (args || {})
const _missing = []
if (!_args.goal || String(_args.goal).trim() === '') _missing.push('goal')
if (!Array.isArray(_args.criteria) || _args.criteria.length === 0) _missing.push('criteria')
if (_missing.length) throw new Error(`[criteria-adversary] required field(s) missing/empty: ${_missing.join(', ')}`)
const goal = _args.goal
const criteria = _args.criteria
const guards = _args.guards || []

const filter = [
  ...criteria.map(c => `MUST PASS: ${c}`),
  ...guards.map(g => `MUST NEVER: ${g}`),
]

const BREACH = {
  type: 'object',
  required: ['breachFound', 'maliciousComplianceSketch', 'ambiguities', 'recommendation'],
  properties: {
    breachFound: { type: 'boolean', description: 'true ONLY if you produced a concrete solution sketch that satisfies EVERY filter line yet violates the goal intent' },
    maliciousComplianceSketch: { type: 'string', description: 'the concrete passing-but-wrong solution; empty string if none found' },
    ambiguities: {
      type: 'array',
      description: 'filter lines that are untestable, contradictory, or ambiguous — concrete reasons only, never a vibe',
      items: {
        type: 'object',
        required: ['line', 'problem'],
        properties: {
          line: { type: 'string', description: 'the filter line text' },
          problem: { type: 'string', description: 'why it is untestable / contradictory / ambiguous, concretely' },
        },
      },
    },
    recommendation: { type: 'string', description: 'the specific criterion/guard to add or tighten before locking' },
  },
}

// A3-4: 3 INDEPENDENT stances, not one self-grading agent. A single agent rating its own
// "no breach" is exactly the self-certification the rest of the system avoids; a breach rated
// false by one stance is caught by another. breachFound is now a quorum-of-one (ANY stance).
const STANCES = [
  'LITERALIST: satisfy each filter line by its narrowest possible literal reading while abandoning the goal\'s spirit.',
  'METRIC-GAMER: maximize whatever each line literally measures (the proxy) while gutting the outcome the proxy stands for.',
  'SCOPE-SHRINKER: satisfy every line on a degenerate / trivial subset (empty case, one happy-path instance) and ignore the rest.',
]

phase('Adversary')
const results = (await parallel(STANCES.map((stance, i) => () =>
  agent(
    `You are a Goodhart adversary attacking the ACCEPTANCE CRITERIA — not any solution.\n\n` +
    `GOAL (the true intent):\n${goal}\n\n` +
    `LOCKED FILTER:\n${filter.map((f, n) => `${n + 1}. ${f}`).join('\n')}\n\n` +
    `Your stance — ${stance}\n\n` +
    `From this stance, construct ONE concrete solution sketch that satisfies EVERY filter line yet clearly violates the goal's intent (malicious compliance). If you genuinely cannot from this stance, say so honestly. ` +
    `Separately, flag any filter line that is untestable, contradictory, or ambiguous — but only with a concrete reason, never a vibe. ` +
    `Set breachFound=true ONLY if you actually produced a passing-but-wrong sketch; bare worries are ambiguities, not a breach.`,
    { label: `adversary:${i}`, phase: 'Adversary', schema: BREACH }
  )
))).filter(Boolean)

const breacher = results.find(r => r.breachFound)
const breachFound = !!breacher
const _seen = new Set()
const ambiguities = results.flatMap(r => r.ambiguities || []).filter(a => {
  const k = `${a.line || ''}|${a.problem || ''}`
  if (_seen.has(k)) return false
  _seen.add(k); return true
})
const recommendation = breacher
  ? breacher.recommendation
  : (results.map(r => r.recommendation).filter(Boolean)[0] || 'criteria survived all adversary stances; no tightening required')

return {
  breachFound,
  maliciousComplianceSketch: breacher ? breacher.maliciousComplianceSketch : '',
  ambiguities,
  recommendation,
  filter,
}
