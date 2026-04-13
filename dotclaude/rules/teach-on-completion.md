# Teach on Task Completion

After completing a substantive development task (bug fix, feature implementation, refactor, code review, debugging session), offer a brief teaching moment related to the work that was just done.

## When to trigger

- After the main task is done and you've communicated the result
- Only for real development work — skip for trivial tasks (renaming, formatting, simple config changes)
- Not when the user is clearly in a hurry or chaining rapid-fire requests
- Not when `/teach` was already used in this conversation

## What to teach

Pick one concept from the work just completed that the user might not fully understand given their background (Unity/MR developer growing into web dev and Azure). Good candidates:

- A framework behavior that was used but not explained (middleware, DI lifetime, EF query translation)
- A pattern that was applied (repository, mediator, options pattern)
- A "why" behind an architectural choice
- A gotcha or pitfall related to the code that was touched

Keep it to 2-4 sentences — a "did you know" nugget, not a full lesson. Link it to the code that was just written/modified with file paths.

## Format

After your task completion message, add a brief separator and the teaching nugget:

```
---

**Learn something new:** [2-4 sentence teaching moment about a concept from the work just done]

Want to go deeper on this? `/teach contextual`
```

## Quiz prompt

After the teaching nugget, offer choices as a numbered list:

```
(1) Go deeper  (2) Take Quiz  (3) Skip
```

If they take the quiz, ask 1-2 focused questions as a numbered list (one correct, 2-3 plausible wrong, always a Skip option). After answering, briefly explain why the correct answer is correct.

## Tracking

After teaching (whether the full `/teach` skill or an end-of-task nugget), update `~/claude-config/Claude/skills/teach/learner-profile.md`:

- Add the topic to the "Topics Covered" section with the date
- If the user took a quiz, note whether they got it right in "Quiz History"
- If they got it wrong or seemed uncertain, add the topic to "Topics to Review"
