# Blanket Rename Safety

When doing a substring/token rename across many files (PowerShell `.Replace`, sed-style), guard before running and re-verify after. Every bullet below caused a real break in one rename effort.

- **Exclude vendor/generated paths**: `node_modules`, `bin`, `obj`, `dist`, `build`, `out`, worktrees, and other-project subtrees. A recursive sweep that reaches them corrupts third-party code.
- **Don't clobber language built-ins**: e.g. an `oldname`→`newname` sweep can rename a JS `.slice(0)` call to `.newname(0)` — silent runtime break (build stays clean). Grep the word as a member call first; confirm no stdlib hits.
- **Doubling-collapse can hit valid code.** Fixing doubled-word comments by collapsing `X X`→`X` also matches `X X` where it is a real two-token construct (e.g. a discriminated-union pattern `| Some (Name name) ->` — case + binding). The collapse silently drops the binding. Scope a doubling-collapse to *specific comment phrases* (`X X uniforms`, `X X (TSL)`) that can't appear in code, never the bare `X X`. Always rebuild after.
- **UI-chrome vs domain token.** A word like "panel" may live in BOTH the domain AND UI chrome (component names, accessibility labels, doc prose). Exclude UI files AND scan doc prose; don't rename the chrome.
- **Grammar agreement.** Renaming a consonant-initial noun to a vowel-initial one ("panel"→"intersection") leaves "a <noun>" wrong. Grep `\ba <newterm>\b` → "an".
- **Build green != verified across cross-language seams**: function-name strings passed across an interop boundary (`InvokeVoid("name")`, JS bridge calls, IPC channel names, JSON keys) aren't type-checked. Verify both sides + a runtime smoke check after any rename crossing that seam.
- **Verify the WRITE landed intact**: script-based writes have silently corrupted files (e.g. every lowercase `u`→`p` was applied universally instead of token-scoped) — invisible to the build for languages with no static check. After any bulk/script rewrite, grep the touched files for a should-not-exist token AND rebuild before trusting. For a handful of edits, prefer the Edit tool over a script.

Tier: always do — for any multi-file mechanical rename.
