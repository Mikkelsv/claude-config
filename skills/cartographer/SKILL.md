# Cartographer

Wrap `/implement` with research-driven discipline. Atomize phases into
typed tasks before code is written; write a decision-log entry for
every task; investigate when assumptions need verification;
consolidate at phase boundaries; delegate large reads to subagents so
the orchestrator stays in synthesis mode; halt only when an external
SME is genuinely the only source.

## When to use

- Plan has substantial unverified architectural assumptions.
- Past attempts regressed because assumptions weren't checked.
- Visual / runtime artifacts are the primary success criterion (not
  just unit tests).

## Input

`<plan-path>` = path to the plan file. If empty, look in `plans/`.
No plan → ask user.

## Phase 0 — Setup

1. **Read project context:** `CLAUDE.md`, `.claude/rules/`, `docs/`.
2. **Identify topic(s)** from the plan. For each, locate the canonical
   living doc at `docs/<topic>-current.md`. If missing, stub with
   `## Current state`, `## Decision log`, `## Open questions`.
3. **Read all topical research:** every `docs/<topic>-findings*.md`,
   `docs/<topic>-investigation*.md`, and `docs/<topic>-query*.md`.
   Most-recent supersede older. Surface unresolved investigations
   before continuing. If total research exceeds ~500 lines, delegate
   the digest to a subagent — orchestrator reads only the digest.
4. **Branch / worktree** per `git-workflow.md`.
5. **Read pickup memo** at `docs/<topic>-pickup.md` if present. Resume
   in-flight context.
6. **Atomize.** Each plan phase → 3–7 tasks. Per task:
   - **Action** — atomic code change.
   - **Verification** — how to prove it works (test name, probe,
     smoke, screenshot diff).
   - **Reference** — citation to research excerpt (`<file>:<lines>`).
   - **Reversibility** — easy / medium / hard.
   - **Failure mode** — how we'd know it's NOT working at runtime.
7. **Write managing plan + per-phase task plans.** If user-supplied
   plan is task-format with N tasks, restructure as `## Phases` with N
   entries pointing to `plans/<plan-name>-phase-<N>-<slug>.md` task
   plans.
8. **Show atomization to user. Wait for approval.**
9. Find first unchecked phase. Print: "Resuming at Phase N. M/T phases
   done."

## Loop (per phase)

### 1. Pre-check research coverage

For each task, re-read its cited research excerpt:

- **Covered** → ready.
- **Uncovered, reversible** → ready (decision-log is safety net).
- **Uncovered, one-way-door** → investigate (§6). Don't enter the
  phase until resolved. Pause loop only if the §6 fallback (halting
  query) is needed.

**One-way-door triggers:**

- Architectural lock-in (schema migration, public API, monorepo
  split).
- Decision contradicts existing research without strong, citable
  reason.
- Behavior the user explicitly flagged critical.
- Verification harness can't be added in post.

Default: assume reversible. Justify pauses, not proceeds.

### 2. Invoke `/implement`

Invoke `/implement` via the Skill tool with the per-phase task plan.
/implement runs its full Loop and squashes per phase. Returns one
phase commit. Blocker → investigate (§6).

### 3. Verification beyond unit tests

If the phase affects runtime / visual output, run additional
verification (probe, smoke, screenshot diff, diagnostic dump). If the
harness doesn't exist, build it. **No "looks right visually" without
a probe.**

### 4. Decision-log entry (every task)

Each task lists `docs/<topic>-current.md` in **Files:** so /implement
updates it as part of the task. Entry shape:

```text
### Phase X Task Y — <action summary> (commit <sha>)

**Context.** What triggered this. What problem it solves.

**Approach.** What we did. Cite research excerpt: `<file>:<lines>`.

**Decisions.**
- Considered: [option A, option B, option C]
- Picked: B
- Why: <reasoning + citations>
- Reversibility: easy / medium / hard
- How to revisit: <what triggers reconsideration>

**Verification.**
- Test: <name + result>
- Probe / smoke: <output summary or path>

**Open questions.** <anything deferred — becomes an investigation if not resolved later>
```

EVERY task, including obvious choices. Per-phase squash collapses
task commits into one but the entries survive — that's the canonical
history.

If understanding shifted, also update `## Current state` and mark
superseded sections:

```text
> **Corrigendum (date):** prior version said X; superseded by Phase X Task Y.
```

≥ 3 corrigenda on one topic → whole-doc restructure (§ below).

### 5. Phase boundary

After /implement returns:

1. **Consolidation pass.** Re-read living doc end-to-end. Look for
   contradictions, superseded sections without corrigenda, stale
   rationale. Apply corrigenda. Unresolvable contradiction →
   investigation (§6). For docs > 500 lines, delegate the pass to a
   subagent that returns a corrigenda diff — orchestrator applies the
   diff.
2. **Parallel verification fanout** (single message, multiple Agent
   calls):
   - **`/audit-architecture`** if changes are structural.
   - **Citation-validator Haiku fanout.** Per `<file>:<lines>` added
     or touched this phase: "fetch the cited lines; does the actual
     code match the doc's description? MATCH / DRIFT / FILE-MISSING +
     one-sentence reason." Per `wf-agents-on-sonnet.md`, Haiku is
     right for this per-item mechanical check — the orchestrator
     collects boolean-ish results, never re-reads the cited source.
3. **Append fanout results** to the phase's decision-log entry's
   `**Verification.**` subsection. Drift or critical findings → §6.
4. **Update pickup memo. Mark phase done.** Cumulative review (§6
   rhythm-driven trigger) when ≥ 5 tasks since last review, OR ≥ 3
   unresolved investigations on the topic, OR a major phase boundary
   just landed.

### 6. Investigation

When an assumption needs verification, pick a mode by **context cost**
— the orchestrator's window is finite, so bias toward delegating
large reads to subagents that return focused synthesis.

#### Inline theorycraft (cheapest; default for design choices)

For "should we A or B with no fact lookup needed". Reason through
alternatives in the decision-log entry's `Considered / Picked / Why`
block. No separate artifact, no extra reads. Most tasks resolve their
open questions inline.

#### Investigation artifact (delegated; default when evidence is needed)

For "how does X actually work — let me check". Three sub-modes, all
produce `docs/<topic>-investigation-<N>.md`:

- **Subagent** (preferred for code-tracing). Spawn a Sonnet agent
  (per `wf-agents-on-sonnet.md`) with the tools the question needs
  (Read + Grep + Glob; Bash for runnable code; WebSearch + WebFetch
  for hybrid questions). Hand it a self-contained prompt: question,
  current hypothesis, files / paths to trace, expected output shape
  (Findings + Synthesis). The agent returns a focused report; commit
  it into the artifact. **Orchestrator never re-reads the source
  files** — the report is the synthesis input.
- **Web research** (preferred for external knowledge). `WebSearch` +
  `WebFetch` on official docs, recent blog posts (last 2 years),
  GitHub issues. Cross-check 2+ sources. For hybrid (web + code)
  questions, use the subagent mode and let the agent do both.
- **Source-trace inline** (rare — only for ≤ 2 files / ≤ 200 lines).
  Read the files yourself, write findings. Anything bigger pollutes
  the orchestrator's context and should be a subagent.

Artifact shape:

```text
# Investigation — <topic>: <one-line question>

## Question
<the falsifiable thing we want to know>

## Hypothesis
<what we currently believe>

## Method
<subagent prompt + tools / web sources / files traced>

## Findings
<verbatim subagent report, excerpted source quotes, web citations>

## Synthesis
<what changes in <topic>-current.md as a result>
```

Commit the artifact + synthesis (corrigenda applied to `current.md`)
together. No separate findings round-trip.

**Fallback: halting external query.** When only an external SME or a
closed-source reference we don't have access to can answer, write
`docs/<topic>-query-<N>.md` as a self-contained spec — paste excerpts
inline rather than linking, cite reference paths not local repo paths.
Strip local refs (`docs/...`, `plans/...`, commit SHAs without
context, phase / task numbers). Commit. **Pause loop. Notify user.**
Reply lands at `docs/<topic>-findings-<N>.md`; save verbatim,
synthesize into `current.md` with corrigenda, run a Haiku PRESENT /
MISSING fanout per operative claim, close the query with
`> **Resolved by findings-<N> on <date>**`, resume at the phase that
triggered the pause.

#### Investigation triggers

**Interrupt-driven** (something surfaced an unverified assumption):

- §1 Pre-check hits a one-way-door not covered by research.
- /refactor-code (within /implement) returns Rethink.
- Task verification produces unexpected output.
- §5 phase boundary: citation drift or /audit-architecture critical
  findings.
- Open question in §4 needs evidence we don't have.

**Rhythm-driven** (scheduled checkpoints):

- **Cumulative review** every 5 tasks / phase boundary / on user
  request. Broader scope: trace cumulative direction across the last
  batch, name divergence points if any, recommend corrigenda or
  whole-doc restructure. Saved as `docs/<topic>-review-<N>.md`. Same
  context-cost rules as the artifact modes — delegate the trace to a
  subagent when scope is wide.
- **Mandatory closing artifact** at session pause / loop break /
  final audit. Default mode: investigation artifact summarising what
  this session resolved and where to validate next. Cumulative-review
  variant when the session was clean; tactical when it surfaced
  concrete issues. Halting external query only if a one-way-door
  surfaced that genuinely requires external input.

## Whole-doc restructure

Triggered when: (a) findings reveal a fundamentally different mental
model, (b) ≥ 3 corrigenda accumulate, or (c) a cumulative review
reveals systemic divergence. **Notify user before proceeding.** Archive
`<topic>-current.md` → `<topic>-current-prev-<date>.md`, rewrite from
scratch keeping section structure, preserve decision-log entries (may
re-group). For docs > 500 lines, delegate the rewrite to a subagent
that returns the new draft. Commit `[DOCS] Restructure
<topic>-current.md` + rationale.

## Banned victory language

Never write "this time it works", "should fix it", "this is the right
approach", or "cleaner / better / production-faithful" without
citation. Use "Passes test X", "Probe shows Y matches expected Z",
"Awaiting visual confirmation", or "Reference `<file>:<lines>`
confirms; pending runtime verification".

## Session pickup memo

At pause / loop break / session end, write `docs/<topic>-pickup.md`:

```text
# Session pickup — <topic>

**Last commit**: <sha> — <summary>
**Branch**: <branch>
**Plan**: <path> (phase N of T done; tasks M/M completed in current phase)

## In-flight
<what was just landing>

## Next phase / task
<phase X task Y, with research citations>

## Open investigations
- `<topic>-investigation-K.md` — <one-line summary, status>
- `<topic>-query-K.md` — <awaiting external reply since <date>>

## Notes for next session
<anything not obvious from reading commits>
```

The mandatory closing artifact (§6) is generated alongside this memo
on every pause; the memo lists it under Open investigations.

## Final audit

After all phases committed:

1. **`/audit-branch`** — runs architecture audit + refactor trio (code,
   docs, tests) in one pass. Prefer **Defer to plan** for major
   architectural rework rather than burying it at the tail.
2. **Orphaned-context audit.** Scan transcript for insights not yet in
   living docs. Each → `<topic>-current.md` or investigation.
3. **Citation validator (full pass)** across every living doc touched.
   Same Haiku-fanout pattern as §5.2.
4. **Consolidation pass** on every living doc touched. Same delegate
   rule as §5.1 (subagent for docs > 500 lines).
5. If step 1 changed code: `/test` then `/commit "[REFAC] Apply Final
   Audit fixes"`.
6. Rule candidates → batched per `wf-surface-rule-candidates.md`.
7. **Mandatory closing artifact** per §6.

## Cleanup

Delete per-phase task plans + the managing plan. Preserve
`<topic>-current.md`, `<topic>-current-prev-*.md`,
`<topic>-investigation-*.md`, `<topic>-findings-*.md`,
`<topic>-query-*.md`, `<topic>-review-*.md`, `<topic>-pickup.md` —
institutional memory.

## Report

Branch + N phase commits. Phases completed / paused / investigated /
cumulative reviewed. Living docs touched + corrigenda applied.
Investigations + external queries written, findings synthesized.
Whole-doc restructures (if any). `/audit-architecture` verdict +
actions. Open investigations and queries pending (with paths).
