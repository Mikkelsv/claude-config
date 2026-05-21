# Surface Rule Candidates

Watch for judgment calls during work that *generalize* beyond the current task. **Always log via `/rule-candidate`**, then briefly report what was added at the end of the response. Never prompt the user about candidates — capture is cheap, triage happens later via `/rule-review`.

## When to log

- Refactors / audits — every simplification, boundary fix, or anti-pattern flag reflecting a general preference.
- User corrections — explicit "don't do X" / "always do Y" is the strongest signal.
- Recurring feedback — same nit comes up 2+ times in a session or across recent sessions.

## When NOT

- One-off decisions tied to a specific file or bug.
- Style preferences already covered by formatter / analyzer / EditorConfig.
- Speculation with no concrete trigger.

## How

Invoke `/rule-candidate "<directive>"` to write a standalone file at `<project>/.claude/rules/candidates/<slug>.md` (gitignored). No confirmation needed.

After the task result (and any teach nugget), append:

```text
---

**Rule candidates added** (N total pending)

- `<slug>` — [directive, one line]

Run `/rule-review` to triage.
```

`N` = total files in `<project>/.claude/rules/candidates/`. Omit the section if nothing was added this turn. Don't repeat candidates already reported earlier in the conversation.
