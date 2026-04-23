Write a session handoff summary to project memory so the next session can pick up where this one left off.

## Steps

1. **Gather context** — Review the conversation to identify:
   - What was accomplished (completed tasks, merged branches, fixes applied)
   - What was in progress or left unfinished
   - Key decisions made and their rationale
   - Open questions or design decisions the user mentioned
   - Any blockers or issues encountered (like this session's stale CWD)

2. **Write handoff memory** — Create or update a `project_session-handoff.md` file in the project's memory directory using the standard memory frontmatter format with `type: project`. Structure it as:
   - **What was done** — bullet list of completed work
   - **What was NOT done** — anything in progress or deferred
   - **Key decisions / open questions** — design choices, user preferences mentioned
   - **Blockers** — if the session is ending due to an issue, describe it

3. **Update MEMORY.md** — Add or update a "Session Handoff" pointer in the memory index.

4. **Inform the user** — Tell them the handoff is saved and they can start a new session. If the reason for handoff is a stale working directory, remind them to `cd` to the correct directory first.

## Rules

- Overwrite any existing `project_session-handoff.md` — there should only ever be one active handoff.
- Be concise. The next session needs orientation, not a transcript.
- Include branch names, commit hashes, or stash refs if relevant.
- If there's an active plan file, reference its path so the next session can resume it.
