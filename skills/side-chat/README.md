# side-chat

A personal Claude Code mod, loaded in every session as a plugin from `~/.claude/skills/side-chat/` (`.claude-plugin/plugin.json` → `hooks/hooks.json` → `hooks/register.tsx`).

A band above the prompt shows `[Open]` and `[–]`, plus `/implement` progress once a plan has checkpointed. `[Open]` opens a pane where you ask a fork of the main thread about the session without interrupting it, answer judgment calls `/implement` posts, and confirm steers the fork proposes. The mod writes into the main conversation only through its tool results and through steers you confirmed, submitted as visible prompts.

## Modes

Derived, never toggled. **Plan mode** (`planParser.isPlanMode`): an `activePlan` with a task not done. Otherwise **session mode**. The plan is parsed from its file: `# Plan: <title>`, `### Task N: …`, `- [x] Done`, `**Result:**` (`hooks/planParser.ts`).

| | Session mode | Plan mode |
| --- | --- | --- |
| Title | `<repo> Side chat` (origin remote name, else root folder) | `<plan title> Side chat` |
| Empty pane | prompt to ask | task list with Result lines |
| Confirmed steer | held, submitted as a prompt at the next idle point | queued for the next `checkpoint`; released to the main thread at an idle point if nobody checkpoints |

`[–]` hides the band for the session (`bandHidden`); `/side-chat` clears it and opens the pane.

## Tools

Served by `tool.call` hooks on `mcp__side-chat__<name>`. A refusal is a `deny` (an errored tool result) and stores nothing.

- **`checkpoint`** `{ planPath, completedTasks?, applied? }` → `{ notes, answers }`, each item delivered once. Re-parses the plan and makes it the active plan. Every `completedTasks` id must already be ticked `- [x] Done`. `applied` (`[{ id, outcome }]`) must name ids in the inbox, all or nothing.
- **`ask`** `{ planPath, task, question, options, defaultOption, loadBearing }` → `{ id }` at once; the caller proceeds on `defaultOption`. `defaultOption` must be one of `options`. Refused unless `planPath` is the active plan (checkpoint first). The answer arrives in a later `checkpoint`, or as a prompt when the main thread is idle.

## Data

`$.store` (persists across sessions; plan paths canonicalised `\` → `/`):

| Key | Value |
| --- | --- |
| `inbox:<path>` | `{ questions, notes, issued }` (`SideChatInbox`). Ids `n<k>`/`q<k>` from `issued`, never reused. Deleted by an all-done checkpoint that delivered nothing; swept for missing plan files at `session.start` and each checkpoint |
| `chat:<sessionId>` | `{ writtenAt, turns }` (`SideChatChat`), capped at 50 turns. Only the 20 most recent chats survive the `session.start` sweep |

`$.state` (session only, declared in `types/index.d.ts`): `activePlan`, `inboxVersion`/`chatVersion` (redraw bumps), `chatAsked`, `chatPending` (one ask in flight), `heldSteers`, `mainTurn` (null = idle), `bandHidden`.

## Asks

- The fork sees the main transcript, not this chat, so each ask carries the side chat so far. Past 100 lines, older turns fold into a Haiku summary (≤150 words) plus ~40 recent lines verbatim.
- The fork replies `LOOKUP: <question>` when it needs code. The pane runs a separate `claude -p --model haiku --tools Read,Grep,Glob` process (`chatStore.LOOKUP_ARGV`). It's a process, not a spawned agent, because an agent's report would land in the main conversation. `argv[0]` is plain `claude`: on Windows only the `claude.cmd` shim resolves.
- An ask that is `/<name> [args]` runs a skill. The fork can't call the Skill tool, so the mod reads `SKILL.md` itself (global `$.plugin.root/../<name>` first, then `<cwd>/.claude/skills/<name>`), drops the frontmatter, fills `$ARGUMENTS`, and tells the fork to carry it out with LOOKUP for anything the transcript lacks. An unknown name writes a line and asks nothing. Plugin skills (`a:b`) aren't on disk and go through as plain questions.
- The fork proposes a steer by ending with `NOTE: <imperative, ≤20 words>`; only the newest proposal shows. `[Steer]` sends typed text as a steer directly.
- Busy = `mainTurn` set. An idle point is a matching main-loop `turn.complete`, one steer or answer released per idle point. An aborted turn releases nothing.
- Every ending writes one chat line (answer, engine reason, or `<kind>: failed: …`); a reload marks in-flight asks interrupted and drops unsent steers, each with a line.

## Engine constraints

These shape the file layout:

- **`$` and atoms can't cross an import.** `register.tsx` (tools, `session.start`) and `chat.tsx` (band, Pane, turn hooks) each declare their own atoms over the same literals. `pane.tsx`, `chatStore.ts`, `heldSteers.ts`, `inbox.ts`, `planParser.ts` are pure.
- **`$.store` can't be passed as a value**: `storeOf($)` spells each op at its call site.
- **One unmatched `session.start` per module**, so reload resets live in `register.tsx`.
- **Handlers close over the drawing hook's `$`**, so the fork, look-up, steer pump, band and `/side-chat` handler sit in `chat.tsx`. A `state.set` hook can't bridge files: a module's own writes go beneath its hooks.
- **Awaiting your own `$.prompt.submit` inside a turn hangs**, so steers submit from a `$.clock.after(0, …)` timer (the fork runs from one too, so input dispatch can't abort it).
- **Matcher constants live in the hooks file** (`PANE`, `SIDE_CHAT`, `CHECKPOINT`, `ASK`), or `validate` can't resolve them.
- **A relative `$.fs` path resolves against the plugin's folder**, not the session's: build project paths from `$.session.cwd()`.
- `Input` exposes no value: edits are tracked in `chat.tsx`'s `draft`, and the field is cleared by remounting (`chatAsked` key).
- `$.ui.notify` resolves `no-surface` on desktop, so notifications are toasts. Mobile has no band and no `Input`.

## Develop

```bash
claude plugin test ~/.claude/skills/side-chat
claude plugin validate ~/.claude/skills/side-chat
npx -y -p typescript tsc -p "$TEMP/sc-tsc/tsconfig.json"
```

`tsconfig.json` extends `.claude-plugin/types/`, which the engine writes on first load (gitignored). Until then, type-check with an outside tsconfig: strict, `jsx: react` with factory `h`, `include` naming the bundled `plugin-authoring/types/claude-code.d.ts` plus `hooks/` and `types/`. Test worlds serve files via `fs.read`/`fs.exists` over a map, have no `state`/`store` noun, and must answer `session.id` to draw the Pane or ask. `fixtures/README.md` seeds a toy repo for live runs.
