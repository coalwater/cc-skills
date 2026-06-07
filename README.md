# cc-skills

A collection of skills I actually use, stripped to the bare minimum.

## Install

### From GitHub

```sh
claude marketplace add coalwater/cc-skills
claude plugin install cc-skills
```

### Local

```sh
claude marketplace add directory /path/to/cc-skills
claude plugin install cc-skills
```

## Initialize

After installing, run `/cc-skills:init` inside Claude Code. It will write a managed block into `~/.claude/CLAUDE.md` with the workflow defaults this plugin assumes. Safe to re-run — only the managed block is touched.

## Status line (optional)

The init skill can also install a status line that shows model, context usage, session burn, and git state on every prompt.

**Dependencies:**

- [`jq`](https://jqlang.org) — JSON parsing
- [`ccburn`](https://www.npmjs.com/package/ccburn) — Claude Code usage tracking

```sh
brew install jq
npm install -g ccburn
```

Run `/cc-skills:init` and confirm when asked to install the status line.
