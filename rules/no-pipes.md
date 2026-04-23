# Avoid Chained Shell Commands

When running shell commands via Bash, **never chain commands** (`|`, `&&`, `;`) unless it truly cannot be split. Instead:

1. **Prefer dedicated tools** over shell commands entirely: `Glob` instead of `find`/`ls`, `Grep` instead of `grep`/`rg`, `Read` instead of `cat`/`head`/`tail`.
2. **If Bash is necessary**, run each command as a separate Bash tool call so each one matches existing permission rules individually.
3. **Never use `cd <path> && git ...`** — always use **`git -C <path>`** instead. The `-C` flag runs any git subcommand in the given directory without chaining. This applies to every git command: `status`, `log`, `fetch`, `rebase`, `push`, `diff`, `stash`, `checkout`, `branch`, etc. The `Bash(git *)` permission pattern auto-accepts `git -C` commands but cannot match `cd && git` chains reliably.
4. **Only chain** when the combined command is a single well-known idiom that cannot be practically split (e.g., `dotnet build 2>&1`).

This ensures individual commands are auto-accepted by permission glob patterns like `Bash(git *)`, rather than requiring a combined chain pattern that triggers a permission prompt.
