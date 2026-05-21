# Auto-Build and Serve

When code changes need verification (build success, runtime check, browser UI), **run the build/serve yourself** — don't tell the user to run `dotnet build`, `npm run dev`, `/build`, etc.

The `build` skill handles the mechanics (port cleanup, build, `preview_start`). Invoke it, or run the equivalent commands directly. For UI checks, drive the dev server via `preview_*` tools yourself.

## Exceptions

- No build config (`.claude/launch.json` missing) — skip silently.
- User says "I'll run it" / "don't build" — respect for the session.
