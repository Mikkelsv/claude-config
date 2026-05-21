# Avoid Chained Shell Commands

When running shell commands via Bash **or PowerShell**, **never chain commands** (`|`, `&&`, `;`, `if ($?) { ... }`) unless it truly cannot be split. Instead:

1. **Prefer dedicated tools** over shell commands entirely: `Glob` instead of `find`/`ls`, `Grep` instead of `grep`/`rg`, `Read` instead of `cat`/`head`/`tail`.
2. **If Bash/PowerShell is necessary**, run each command as a separate tool call so each one matches existing permission rules individually.
3. **Never use `cd <path> && git ...`** — always use **`git -C <path>`** instead. The `-C` flag runs any git subcommand in the given directory without chaining. This applies to every git command: `status`, `log`, `fetch`, `rebase`, `push`, `diff`, `stash`, `checkout`, `branch`, etc. The `Bash(git *)` / `PowerShell(git *)` permission patterns auto-accept `git -C` commands but cannot match `cd && git` chains reliably.
4. **No decorative tails on single commands.** Don't append `; if ($?) { Write-Output 'OK' }` (PowerShell) or `&& echo OK` (Bash) to single invocations — the tool already surfaces the exit code, and the tail narrows what an "Always allow" rule will match. Bare `git -C <path> mv a b` beats `git -C <path> mv a b; if ($?) { Write-Output 'OK' }`.
5. **Only chain** when the combined command is a single well-known idiom that cannot be practically split (e.g., `dotnet build 2>&1`).

This ensures individual commands are auto-accepted by permission glob patterns like `Bash(git *)` / `PowerShell(git *)`, rather than requiring a combined chain pattern that triggers a permission prompt. Clean commands also mean broader, more reusable rules when the user clicks "Always allow."
