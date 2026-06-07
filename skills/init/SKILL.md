---
name: init
description: Initialize or update cc-skills configuration in CLAUDE.md. Use when the user runs /cc-skills:init or asks to set up or reinitialize cc-skills.
---

Read `skills/init/templates/claude-template.md` to get the block content.

Then determine the target file:
- If the user specifies a path, use that
- Otherwise default to `~/.claude/CLAUDE.md`

**If the file does not exist:** create it and write the block.

**If the file exists but has no cc-skills block:** append the block at the end.

**If the file exists and already has a cc-skills block** (between `<!-- cc-skills start -->` and `<!-- cc-skills end -->`): replace everything between those two markers (inclusive) with the current template content.

Never touch anything outside the markers.
