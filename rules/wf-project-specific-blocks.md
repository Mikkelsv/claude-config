# ProjectSpecific Blocks

When authoring skills, templates, or any markdown that projects may duplicate or scaffold (workflow skills, project skill templates), design with `<ProjectSpecific>` blocks in mind. Projects layer their own additions inside these blocks so customizations survive `/claude-sync` and `mirror-skill.ps1` updates.

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

Without anchored blocks, project additions get overwritten on every template re-sync — forcing the user to re-apply manual edits or skip the skill entirely. With the convention, additions layer cleanly. `/claude-sync` re-inserts blocks after the same heading; orphans (anchor heading deleted) land under a `## Project additions` section so nothing is silently lost.

See `skills/claude-sync/SKILL.md` Step 3.4 for the full re-insertion algorithm; `scripts/mirror-skill.ps1` for non-template duplicates.
