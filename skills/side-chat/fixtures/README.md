# side-chat fixtures

`toy-plan.md` is the instrument for live toy runs of the mod: three tasks that edit `notes.txt`, with Task 2 deliberately ambiguous (`formatGreeting` or `greet`) so `/implement` has a judgment call to post.

## Run it

Create the scratch repo and copy the plan in, one command per line (Git Bash):

```bash
git init "$TEMP/pc-toy"
mkdir "$TEMP/pc-toy/plans"
touch "$TEMP/pc-toy/notes.txt"
cp ~/.claude/skills/side-chat/fixtures/toy-plan.md "$TEMP/pc-toy/plans/toy-plan.md"
git -C "$TEMP/pc-toy" add .
git -C "$TEMP/pc-toy" commit -m "Seed toy plan"
```

Then open a Claude Code session in `$TEMP/pc-toy` and run:

```text
/implement plans/toy-plan.md
```

With the mod loaded, the band goes `0/3` → `1/3` → `2/3` → `3/3`. Without it, `/implement` prints `side-chat not loaded — no inbox` once in Phase 0 and runs as normal.

Delete `$TEMP/pc-toy` between runs: the run deletes its plan file at Cleanup.
