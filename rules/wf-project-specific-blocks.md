# ProjectSpecific Blocks

When authoring a global skill that a shared repo may fork (per `meta-project-local-skill-copies`), design with `<ProjectSpecific>` blocks in mind. A fork layers its additions inside these blocks so they survive `/claude-sync` and `mirror-skill.ps1` refreshes.

**Prefer a project rule over a block where you can.** Global wins on same-named skills, so a block added to a fork never reaches the fork's own author — only colleagues see it. See `meta-skill-tiers`.

## How to apply

- Use **stable, descriptive headings** — projects anchor `<ProjectSpecific>` blocks to the most recent heading above them.
- Don't bake project-specific examples into the global text. Leave a heading + a brief cue where projects can add anchored notes.
- When restructuring an existing skill, prefer keeping anchor headings intact (or note in the changelog that they moved) — moved/renamed headings turn project blocks into orphans.

Block format:

```markdown
## Step 3: Architecture

<ProjectSpecific>
Custom project guidance.
</ProjectSpecific>
```

The block opens with `<ProjectSpecific>` and closes with `</ProjectSpecific>`, each on its own line. Content between is preserved verbatim across syncs.

## Why

Without anchored blocks, a fork's additions get overwritten every time it is refreshed from global — forcing the user to re-apply manual edits or skip the refresh entirely. With the convention, additions layer cleanly. `/claude-sync` re-inserts blocks after the same heading; orphans (anchor heading deleted) land under a `## Project additions` section so nothing is silently lost.

See `skills/claude-sync/SKILL.md` for the re-insertion algorithm and `scripts/mirror-skill.ps1` for the implementation.
