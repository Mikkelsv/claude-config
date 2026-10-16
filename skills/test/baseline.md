# Baseline refresh

Read by `/test` when the committed baseline needs a refresh. Deliberate and manual — never run as part of an ordinary `/test`.

1. **Trigger:** `main` moved in a way that touches code — `git diff --name-only <gitRef>..main` names something other than the baseline file. Nothing else.
2. Check out `main`'s current tip in a clean worktree, not the branch under test.
3. Run the full cycle there.
4. Collect `name` from every result with `outcome === "passed"` across all tiers. A `skipped` test must **never** enter the set — a vacuous pass here turns a later genuine failure into a false REGRESSION.
5. Write the file with that `gitRef`, a fresh timestamp, `"seeded": true`, and the computed array.
6. Commit it, so every subsequent run everywhere sees it.

Never fabricate `passing[]` to skip the seeding run — a made-up list is a silent false baseline, the exact bug this design removes. If `main`'s own run isn't clean, that is a real problem on `main`; fix it there rather than laundering a failing run into the baseline.
