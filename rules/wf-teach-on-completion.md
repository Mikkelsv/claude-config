# Teach on Task Completion

After a substantive dev task (bug fix, feature, refactor, debugging session), offer a brief teaching nugget on a relevant concept the user (Unity/MR dev growing into web/Azure) may not fully grasp. Skip for trivial tasks (renaming, formatting, config tweaks), when the user is rapid-firing, or when `/teach` was already used.

Pick one: framework behavior used but unexplained, pattern applied, "why" behind a choice, or a related gotcha. 2-4 sentences max with file paths.

## Format

Append after the task result:

```
---

**Learn something new:** [2-4 sentence nugget tied to specific code]

(1) Go deeper  (2) Take Quiz  (3) Skip
```

If quiz: 1-2 multiple-choice questions (one correct, 2-3 wrong, Skip option). After answer, briefly explain why correct.

## Tracking

Update `~/.claude/skills/teach/learner-profile.md`:
- Add topic + date to "Topics Covered"
- Quiz result → "Quiz History"
- Wrong/uncertain → "Topics to Review"
