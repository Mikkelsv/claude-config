# Migrate off the retired template tier

Read by `/claude-sync` Step 3.1b when `.claude/local/config-version.json` has a `skills` map. That map only ever recorded template-scaffolded skills.

**Resolve redirector stubs first.** If a project `SKILL.md` is a thin stub whose body just points at another path (e.g. a capital-`C` `Claude/skills/<name>/SKILL.md`, the pre-v1.1.0 layout), the real content is there. Classify and migrate *that* file — migrating a redirector accomplishes nothing and leaves the real copy orphaned. Offer to collapse the stale layout while you're here.

For each entry in the `skills` map, the named skill now exists globally. Classify its project copy and route:

- **Mechanical scaffold** — nothing beyond placeholder fills and `<ProjectSpecific>` blocks → **safe to delete.** The global skill takes over.
- **Carries hand-written content outside `<ProjectSpecific>`** → **stop and show it.** Report `projectOnlyLines` and the headings it sits under, exactly as 3.5 does for fork drift, and let the user decide: harvest it up to global first, keep the copy as a fork, or delete anyway. Never delete silently — that content is indistinguishable from stale drift to a diff, so the user is the only safeguard.
- **Shared repo whose colleagues lack `~/.claude/`** → **keep it, re-register under `forks`.** It stops being a templated skill and becomes an ordinary fork; drift handling from 3.2 onward then applies.

**Pair the config with the deletion.** Global wins on a same-named skill (`meta-skill-tiers`), so deleting the copy first only drops colleague coverage; still write the config in the same change. Gather what the global skill needs first (`/build`: build command, preview server; `/test`: build command, tier table, baseline path, optional drift mapping), write it per the schema in `meta-skill-tiers.md`, then remove the copy.

**Check `.gitignore` covers `.claude/local/`** (it holds `config-version.json`). Offer to add it.

Finally, drop the `skills` map from the version file on the 3.6 stamp. Keep `forks`.
