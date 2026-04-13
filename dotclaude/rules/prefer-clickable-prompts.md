# Prefer Clickable Prompts

When asking the user questions, prefer `AskUserQuestion` with 2–3 concrete options over open-ended free-text questions. Include a "Let's discuss" or equivalent escape hatch option for when the user wants to explain something custom.

- Make one option the recommendation when you have a clear preference — explain why in the description.
- Only use free-text questions when the answer is truly unpredictable (e.g., "Describe the user flow you have in mind").
- Keep option labels short (1–5 words). Use descriptions for context and trade-offs.

## Exception: after long text output

When the response contains a lot of text the user should read through (teaching nuggets, explanations, architecture summaries, plan overviews), do **not** use `AskUserQuestion`. The prompt overlay covers the reading area and forces the user to dismiss it before they can read.

Instead, present choices as a plain numbered list with integer selectors:

```
(1) Option A  (2) Option B  (3) Option C
```

The user can reply with just the number. This applies to any follow-up prompt that appears at the end of a long text block.
