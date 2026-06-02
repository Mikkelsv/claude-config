# Docs Over Inline

Heavy context — architecture, history, rationale, cross-cutting invariants — lives in `docs/`. Code carries thin pointers, not prose. Write the residual inline comments for the next *reader* navigating fast (LLM or human), not for narration.

## Always do

- **Link, don't inline.** Replace multi-line architecture/history blocks with `// See docs/<file>.md "<section>"`. The reader fetches on demand; the file stays scannable.
- **Why-only.** Keep the non-recoverable why — constraint, invariant, workaround-with-condition. Cut anything that restates *what* the code does; the reader parses code faster than prose.
- **Name identifiers, not concepts.** "the gather kernel" → the actual function name (`module.fn`). Greppable anchors beat description.
- **State invariants as checkable claims** the reader can verify against the code (e.g. `// depthTest=false set below so the rect shows through`).
- **No history/changelog prose.** "Phase 3 introduced… Stage 5 retires…" belongs in commit messages or `docs/`, never inline.

## Why

Higher information density, equally legible to a human and an LLM navigating fast — not cryptic. A comment carries only what neither can cheaply recover from the code: the why, the cross-file links, the invariants. Stale comments are empirically *worse* than no comments (~12pp comprehension hit) and misleading terminology propagates into generated code — keep them accurate (see `cq-comments-track-code`).
