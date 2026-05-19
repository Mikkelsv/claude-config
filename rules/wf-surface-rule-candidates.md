# Surface Rule Candidates

Watch for judgment calls during work that *generalize* beyond the current task. **Always log via `/rule-candidate` first**, then surface to the user.

## When to watch

- **Refactors / audits** — every simplification, boundary fix, or anti-pattern flag that reflects a general preference.
- **User corrections** — explicit "don't do X" / "always do Y" is the strongest signal.
- **Recurring feedback** — same nit comes up 2+ times in a session or across recent sessions.

## When NOT

- One-off decisions tied to a specific file or bug.
- Style preferences already covered by formatter / analyzer / EditorConfig.
- Speculation — wait for signal (per `wf-question-the-scope`).

## Always log first

Before surfacing the candidate to the user, invoke `/rule-candidate "<directive>"` to write it as a standalone file at `<project>/.claude/rules/candidates/<slug>.md` (gitignored). The candidate is recorded regardless of what the user decides next. Promotion to actual rules happens via `/rule-review` (which `git mv`s the file to the chosen destination).

## Then surface

At natural pause points (post-task, end of audit/refactor, on user "what did we learn?"). Don't interrupt focused work. Batch multiple candidates into one prompt if they accumulate. Don't re-surface a candidate already prompted in this conversation.

Format (after the task result, after any teach nugget):

```text
---

**Rule candidate** — [arch | cq | wf | meta]

[Directive, in rule-voice. One line.]

Signal: [where this came up, 1 short sentence]

(1) Promote now  (2) Keep pending  (3) Discard from pending
```

(1) → invoke `/capture-rule` immediately. (2) → leave entry in pending file for `/rule-review`. (3) → remove the entry.

## Category cues

`arch-` (module structure, deps) · `cq-` (idiom, error handling, naming) · `wf-` (how Claude behaves) · `meta-` (config / file placement / tooling)
