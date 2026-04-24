# Three-Tier Boundaries for Rules

Organize project rules as **always do** / **ask first** / **never do**. State the tier explicitly when capturing a new rule.

## Why

GitHub's 2,500-repo AGENTS.md study found the three-tier structure was the strongest predictor of agent behavior matching intent. The tiers map to what Claude decides in the moment: proceed, pause, or refuse.

## How

- **Always do** — unconditional. *Run the build before declaring done. Use `Result<T>` for expected failures.*
- **Ask first** — meaningful blast radius. *Ask before adding a NuGet package, changing `TargetFramework`, deleting a test.*
- **Never do** — red lines. *Never force-push to main. Never commit real secrets. Never bypass `/commit`.*

If a directive doesn't fit one of the three voices, it's probably a style preference for EditorConfig or a Roslyn analyzer, not the rules folder.

## Exceptions

- Workflow rules about *how Claude thinks* (this one, `wf-fix-root-cause`, `wf-match-existing-pattern`) are about judgment, not action. Three tiers are the default shape, not a straitjacket.
