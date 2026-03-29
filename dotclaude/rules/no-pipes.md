# Avoid Chained Shell Commands

When running shell commands via Bash, **never chain commands** (`|`, `&&`, `;`) unless it truly cannot be split. Instead:

1. **Prefer dedicated tools** over shell commands entirely: `Glob` instead of `find`/`ls`, `Grep` instead of `grep`/`rg`, `Read` instead of `cat`/`head`/`tail`.
2. **If Bash is necessary**, run each command as a separate Bash tool call so each one matches existing permission rules individually.
3. **Only chain** when the combined command is a single well-known idiom that cannot be practically split (e.g., `dotnet build 2>&1`).

This ensures individual commands are auto-accepted by permission glob patterns like `Bash(git fetch *)`, `Bash(git rebase *)`, etc., rather than requiring a combined chain pattern that triggers a permission prompt.
