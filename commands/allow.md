# Auto-Accept Command

Add a new permission rule to the user's global `~/.claude/settings.json` allow list.

Input: `$ARGUMENTS` — whatever the user pastes from the permission prompt. Could be any of these formats:

- Full prompt text: `Do you want to make this edit to settings.json?`
- Tool call format: `Bash(wt new-tab --tabColor "#1e3a5f" ...)`
- Raw command: `wt new-tab --tabColor "#1e3a5f" -d ...`
- Tool + path: `Write(.vscode/settings.json)`
- Description text: `Yes, allow reading from .claude/ during this session`

If empty, prompt the user to paste the blocked action.

Scripts directory: `~/.claude/scripts`

## Extracting the Rule

Parse `$ARGUMENTS` to identify the **tool type** and **pattern**:

1. **Already in rule format** (e.g., `Bash(wt *)`, `Write(*/.vscode/*)`) — use as-is.
2. **Tool call format** (e.g., `Bash(wt new-tab --tabColor ...)`) — extract the tool and command, then generalize.
3. **Mentions a tool action** (e.g., "edit to settings.json", "reading from .claude/", "write to .vscode/settings.json") — map to the correct tool:
   - "edit" → `Edit(<path-pattern>)`
   - "read/reading" → `Read(<path-pattern>)`
   - "write/writing" → `Write(<path-pattern>)`
   - Generalize paths with `*` wildcards (e.g., `.claude/` → `*/.claude/**`, `.vscode/settings.json` → `*/.vscode/*`).
4. **Raw shell command** (e.g., `wt new-tab ...`, `find ... | xargs ...`) — wrap in `Bash(...)`:
   - Identify the base command (first word).
   - If pipes (`|`): `Bash(<cmd> * | *)`.
   - If chaining (`&&`): `Bash(<cmd> * && *)`.
   - Simple: `Bash(<cmd> *)`.
5. **Ambiguous** — ask the user to clarify using `AskUserQuestion`.

## Process

1. Extract and generalize the rule from `$ARGUMENTS` as described above.
2. Show the user the proposed rule and ask for confirmation using `AskUserQuestion`.
3. If confirmed, add the rule:

   ```bash
   powershell.exe -NoProfile -File "$HOME/.claude/scripts/settings-add-rule.ps1" -Rule "<rule>"
   ```

   Returns JSON: `{"added": true/false, "exists": true/false, "rule": "..."}`

4. If `exists` is true, tell the user the rule already exists. Otherwise confirm it was added.
