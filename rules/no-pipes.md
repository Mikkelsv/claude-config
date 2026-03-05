# Avoid Piped Shell Commands

When running shell commands via Bash, **never pipe commands together** (`|`) unless the full pipeline is short and cannot be split. Instead:

1. **Prefer dedicated tools** over shell commands entirely: `Glob` instead of `find`/`ls`, `Grep` instead of `grep`/`rg`, `Read` instead of `cat`/`head`/`tail`.
2. **If Bash is necessary**, run each command separately so each one matches existing permission rules individually.
3. **Only pipe** when the pipeline is a single well-known idiom that cannot be practically split (e.g., `dotnet build 2>&1`).

This ensures individual commands are auto-accepted by permission glob patterns like `Bash(ls *)`, `Bash(grep *)`, etc., rather than requiring a combined pipe pattern.
