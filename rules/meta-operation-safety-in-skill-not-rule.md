# Operation-Specific Safety Belongs in the Skill, Not an Always-Loaded Rule

Procedural safety/checklist content that applies only during a specific deliberate operation (blanket rename, file split, migration, deploy, release) belongs embedded in the skill that performs that operation — not as an always-loaded `rules/` rule.

## Why

Rules auto-load into every (or every-matching-file) context. A rule relevant only during a rare, deliberate operation pays that token cost continuously for a near-zero hit rate. The skill that runs the operation is the precise, self-contained home for its checklist: it costs nothing in the sessions that never perform the operation, and (for shared-repo skill copies) colleagues get it on invocation.

## How

- Operation is a recognizable, deliberate action with a skill? → embed the checklist in that skill (`<ProjectSpecific>` block if the skill is templated, so it survives `/claude-sync`).
- Directive that changes DEFAULT generation across ordinary editing? → that's a genuine always-loaded or path-scoped rule.
- Test: *"would this fire in a session that isn't doing the operation?"* If no, it's skill content, not a rule.

## Exceptions

- Cross-cutting safety that applies to ordinary edits (not a discrete operation) — stays a rule.

Tier: ask first — it's a placement judgment call.
