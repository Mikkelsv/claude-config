# Todo Capture

**Execute mechanically.** Follow the steps; no need to weigh alternatives or deliberate.

Capture a question, prompt, or to-do item for Claude to surface in future conversation turns.

Input: `$ARGUMENTS` — the text to save as a todo item.

## Behavior

### If `$ARGUMENTS` is provided — Add item

1. Determine the project memory directory. It's always at the path shown in the system prompt under `auto memory` (the `memory/` directory for this project).

2. Read `todo-prompts.md` in that directory. If it doesn't exist yet, create it with this template:

   ```markdown
   ---
   name: Todo prompts
   description: User-captured questions, prompts, and to-do items to surface during conversations
   type: project
   ---

   ```

3. Append the new item as an unchecked markdown task: `- [ ] <text>`

4. Ensure `MEMORY.md` in the same directory has a pointer to `todo-prompts.md`. If not present, add:

   ```
   ## Todo Prompts

   See `todo-prompts.md` for captured questions and to-do items to surface during work.
   ```

5. Acknowledge briefly (one line, e.g., "Got it, noted.") and continue with whatever was happening before. Do NOT derail the conversation.

### If `$ARGUMENTS` is empty — Show items

1. Read `todo-prompts.md` from the project memory directory.
2. If it doesn't exist or has no items, say "No todo items captured yet."
3. Otherwise, display the list. Ask if the user wants to check off, remove, or add items.

### Checking off items

When an item is resolved (either explicitly by the user or because the work was clearly completed), change `- [ ]` to `- [x]`. Do not delete checked items — they serve as a record.
