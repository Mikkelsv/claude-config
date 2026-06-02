# Delegate Investigation to Subagents

Orchestrator runs on Opus (expensive, finite context). Subagents run on Sonnet (cheap, isolated context per `wf-agents-on-sonnet`). For investigations that produce a focused finding — "what does this code do under condition X", "trace the call chain for Y", "what does library Z's API actually say" — spawn a subagent rather than reading inline.

## Spawn a subagent when

- The investigation needs reading multiple files or exploring unfamiliar code.
- The investigation is multi-step web research (fetch + cross-check several sources).
- The orchestrator's reasoning doesn't need access to raw source — it needs the synthesis.

## Read inline when

- The orchestrator needs to write code that directly touches the file.
- Scope is already focused (1–2 files identified by Glob/Grep).
- The question is a direct lookup ("what's at `<path>:<line>`"), not exploration.

## Pattern

Orchestrator hands subagent a self-contained question + tools needed (Read + Grep + Glob; Bash for runnable code; WebSearch + WebFetch for web research). Subagent traces, returns findings + synthesis. Orchestrator reads the report, applies it. Doesn't re-read the source.

## Why

Opus context is finite and reserved for synthesis + decision-making. Reading large or exploratory source inline burns that budget on file storage. Sonnet subagents are cheap context isolation — they read whatever they need, return a focused report, the orchestrator only sees the report.
