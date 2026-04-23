# Surface Rule Candidates

Watch for judgment calls during work that *generalize* beyond the current task. When the user confirms a pattern (explicitly or by repetition), surface it as a candidate for a new global or project rule.

## When to watch

During substantive dev work — especially:
- **Refactors and reviews** (`/refactor`, `/audit-architecture`, `/refactor-code`): every simplification or boundary fix is a candidate if it reflects a general preference.
- **Implementation choices** (`/implement`, ad-hoc coding): when you pick Pattern A over Pattern B and the user doesn't push back — that's weak evidence. When they explicitly approve or ask for it twice — that's strong evidence.
- **User corrections**: any time the user says "don't do X" or "always do Y," that's a candidate *now*.
- **Recurring feedback**: if the same nit comes up 2+ times in a session, or across recent sessions (check memory files), surface it.

## What counts as a candidate

Something that:
- Would apply in **multiple files or future tasks**, not just the current one.
- Can be stated as a **terse directive** (1–2 sentences).
- Fits one of three categories: **code-quality**, **architecture**, or **workflow**.

Skip:
- One-off decisions tied to a specific file or bug.
- Style preferences already covered by existing rules or formatter config.
- Speculation ("the user might want X") — wait for signal.

## When to surface

At **natural pause points**, not mid-task:
- After a task completes (before or alongside the teach-on-completion prompt).
- At the end of a refactor/audit report.
- When the user explicitly asks "what did we learn?" or similar.

**Do not interrupt focused work.** Batch multiple candidates into one prompt if they accumulate.

## Coordination with other post-task prompts

- `teach-on-completion.md` fires after substantive dev tasks. If both fire in the same turn, put the teach nugget first, rule candidate second, each with its own numbered selector line. Don't merge them.
- If you've already surfaced a rule candidate this conversation and the user skipped, don't re-surface the same one.

## Format

Append after the task result (and after any teach nugget):

```
---

**Rule candidate** — [category: code-quality | architecture | workflow]

[One-line directive, in rule-voice. Example: "Prefer Result<T> over exceptions for expected failure modes."]

Signal: [where this came up, 1 short sentence — e.g. "You pushed back on three try/catch blocks in Services/ today."]

(1) Draft it (runs /capture-rule)  (2) Skip  (3) Remind next session
```

If (1) — invoke the `capture-rule` skill with the directive as its argument. The skill handles scope (global/project), final wording, and file placement.

If (3) — write the candidate to `~/.claude/projects/<project>/memory/todo-prompts.md` so `todo-surfacing.md` picks it up next session.

## Category cues

- **code-quality** (`cq-` prefix): naming, error handling, control flow, tests, idiomatic usage of a language/framework.
- **architecture** (`arch-` prefix): module boundaries, dependency direction, abstraction level, file organization, data shape.
- **workflow** (`wf-` prefix): how Claude should *behave* — when to ask, when to act, which skill to invoke, formatting of output.
