# Auto-Build and Serve

After any code change, run `/build` — it compiles and brings up the dev server via `preview_start`. **Default assumption: every iteration warrants a build + running server.** Don't tell the user to run it themselves; don't stop at "build passed" without bringing the app up. For UI checks, drive the dev server via `preview_*` tools yourself afterward.

## Why

Type checks and tests verify code correctness, not feature correctness. The user usually wants to see the change actually running in the app or browser. "Tests pass" isn't enough confirmation for UI, runtime, or integration changes — and almost every iteration touches one of those.

## Exceptions

- **Committing to main right after a build was tested** — the prior build still covers it; don't rebuild on the commit itself.
- **No build config** (`.claude/launch.json` missing) — skip silently.
- **Pure non-runnable changes** — `.md`, `.gitignore`, license, comments-only edits. Skip build.
- **User says "don't build" / "I'll run it"** — respect for the session.
