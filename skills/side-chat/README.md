# side-chat

A personal Claude Code mod, present in every session. A band above the prompt offers `[Open]` and `[–]` (hide), and shows `/implement` progress once a plan has checkpointed; `/side-chat` brings a hidden band back. `[Open]` opens the side-chat pane where you ask a fork of the main thread about the session without interrupting it, answer the judgment calls `/implement` posts, and confirm the steers the fork proposes. Beyond its tool results, the mod writes into the main conversation only by submitting a session-mode steer you confirmed, as a visible prompt.

It loads as a plugin from `~/.claude/skills/side-chat/` (`.claude-plugin/plugin.json`, `hooks/hooks.json` → `hooks/register.tsx`). The plan it draws comes from the plan file itself: the `# Plan: <title>` heading, `### Task N: …` headings, the `- [x] Done` box and the `**Result:**` line (`hooks/planParser.ts`).

## Modes

Mode is derived, never toggled. **Plan mode** (`planParser.isPlanMode`) is an `activePlan` with at least one task not done. Everything else, no plan or a finished one, is **session mode**.

| | Session mode | Plan mode |
| --- | --- | --- |
| Pane title | `<repo> Side chat`, or `Side chat` outside a repository | `<plan title> Side chat` |
| Empty chat | `Ask about this session without interrupting it.` | the task list, with Result lines and milestones |
| `[✓]` on a steer | held, then submitted as a prompt (Steers) | queued in the inbox for the next `checkpoint`, else released to the main thread at an idle point (Steers) |

The band's form follows `activePlan`, not the mode, and `[Open] [–]` always sit at its far right (`justifyContent="space-between"`), so they keep their place as the text changes: `<repo> Side chat` before any checkpoint, then `<title> ▓▓▓▓░░░░░░ 3/7 · T4 running · 1Q · 1 steer [Open] [–]`, and `<title> ✓ n/n` once all done. `[Open]`'s key is still `spar`; `[–]`'s is `hide`. Question cards and inbox steer chips also follow `activePlan`, so a finished plan still shows an unanswered question. The band steps aside for a survey (`hasSurvey`).

The mod can't read the session's title, so the repository stands in for it (`pane.repoName` over `$.session.repo()`): the last segment of the `origin` remote without a trailing `.git` (`https://…/name.git`, `git@host:owner/name.git`, a Windows path), else the folder name of the repository root, else nothing outside a repository, where the slim band and the session pane read `Side chat`. It is read from disk once per band drawing or pane open, and only in session mode, since plan mode names the plan instead.

`[–]` hides the band for the session (`bandHidden`): while set, the band hook draws nothing (`next(e)`). The slash command `/side-chat` ("Show the side chat band and open the side chat"), registered at `session.start`, clears it and opens the pane, replying `Side chat shown.`. The flag is session state, so a new session shows the band again.

## Tools

Both are served by `tool.call` hooks on `mcp__side-chat__<name>`. A refusal is a `deny`, which the model reads as an errored tool result, and an errored call stores nothing.

### `checkpoint`

Input: `{ planPath, completedTasks?, applied? }`. `planPath` is required and absolute. `completedTasks` holds parser ids (`"3"`, `"2.1"`). Progress is read from the plan's `Done` boxes, so `completedTasks` is a check against them: every listed id must be a task the plan shows as `- [x] Done`. `applied` is `[{ id, outcome }]`, one entry per note or answer id from earlier deliveries.

Output: JSON `{ notes: [{ id, text, targetTask }], answers: [{ id, task, question, options, defaultOption, loadBearing, answer }] }`. These are the undelivered notes and the answered, undelivered questions. Each is marked delivered and never returned again. Unanswered questions stay behind.

Effect: re-reads and parses the plan, records the `applied` outcomes, makes the plan the active plan (band and pane), then sweeps stale inbox entries.

Refusals: missing `planPath`; `completedTasks must be an array of task id strings`; `cannot read <path>: <error>`; `<path> is not a plan file: <reason>`; `completedTasks names tasks <path> does not show as done: <ids>; tick their "- [x] Done" box before calling checkpoint` (an id that is unticked or not in the plan); `applied names ids not in the inbox of <path>: <ids>`. The `applied` batch is all or nothing.

### `ask`

Input: `{ planPath, task, question, options, defaultOption, loadBearing }`, all required. `options` must be non-empty strings, and `defaultOption` must be one of them.

Output: JSON `{ id }`, returned at once. The caller carries on with `defaultOption`, and the answer arrives in a later `checkpoint` under `answers`, or as a prompt when the main thread is idle (Steers, fallback).

Effect: stores the question, which the pane draws as a card in the chat, toasts `side chat: question on T<task>` and opens the pane unasked.

Refusals: the first bad field, named; and `call checkpoint for <path> before asking about it` when `planPath` isn't the active plan, because band and pane draw only the active plan.

## Store

`$.store` persists across sessions. Inbox keys use the canonical plan path (`\` → `/`); chat keys use `$.session.id()`.

| Key | Value |
| --- | --- |
| `inbox:<path>` | `{ questions, notes, issued }` (`SideChatInbox`) |
| `chat:<sessionId>` | `{ writtenAt, turns }` (`SideChatChat`), plan or not: `turns` is `SideChatChatTurn[]` (`{ role: 'you' \| 'fork' \| 'lookup' \| 'error' \| 'answer' \| 'steer', text, question?, task?, ref?, proposedNote?, contextTokens?, reusedTokens?, isProposalTaken?, isProposalDismissed? }`; an `answer` turn carries the answered card's `question` and `task`, a `steer` turn the `ref` of its inbox note or held steer, a `fork` turn its prompt's input tokens and the part the cache served), oldest first, capped at 50; `writtenAt` is the last write's clock time |

- Ids are `n<k>` / `q<k>` from the `issued` counter, so a withdrawn id is never reused.
- Lifecycle: a note (a steer) is queued, then withdrawable until delivered, then delivered (`deliveredAt`), then given an `outcome` by `applied`. A question is asked, can be answered and re-answered until delivered, then delivered, then given an `outcome`.
- Inbox cleanup: an all-done `checkpoint` that delivered nothing deletes the inbox key. A non-empty final delivery keeps it, since it may insert a task whose checkpoint reports `applied`. Inbox keys are also swept for plan files that no longer exist, at `session.start` and at every `checkpoint`.
- Chat cleanup, at `session.start` only (`chatStore.sweepChats`): a `chat:` key whose suffix holds a `/` (an old per-plan chat) or whose entry has no numeric `writtenAt` is deleted, then every session chat past the 20 most recently written. The current session's chat isn't exempt. Plans never touch chats.

## Session state

`$.state` keys, declared in `types/index.d.ts`:

| Key | Holds |
| --- | --- |
| `activePlan` | `{ planPath, plan }` from the last checkpoint, or `null` |
| `inboxVersion` | bumped by every inbox write; band and pane read it so the write redraws them |
| `chatVersion` | the same, for chat-history writes |
| `chatAsked` | bumped by every typed ask; keys the chat Input (`chat:<n>`) so a submit remounts it empty, since `Input` has no `value` to clear |
| `chatPending` | the session's one ask in flight, `{ kind }` (`fork`, then `lookup` while the process runs), or `null` |
| `heldSteers` | `{ issued, steers }`: session-mode steers (`hooks/heldSteers.ts`), each `held`, `sending` or `sent`, ids `h<k>` |
| `mainTurn` | the main loop's running `turnId` (set by `turn.start`, cleared by a main-loop `turn.complete`), or `null` while idle |
| `bandHidden` | set by the band's `[–]`, cleared by `/side-chat`; while set the band draws nothing |

## Surfaces

| Surface | Band | Pane |
| --- | --- | --- |
| Desktop | yes | full |
| CLI terminal | yes | full |
| VS Code | the types say `AbovePrompt` is raised on terminal and desktop only, so likely none (pending a live check) | full |
| Mobile | not raised, per the types | history, steers, the steer proposal and buttons; no `Input`, so no input box and no `[other…]` |

Degradations are always said aloud:

- An unasked open that waits undrawn toasts `side chat: widen the window or press [Open] to see the pane (<reason>)`.
- An `[Open]` press or a `/side-chat` that still isn't placed toasts `side chat: the pane could not be drawn (<reason>)`.
- Notifications are toasts, since `$.ui.notify` resolves `no-surface` on desktop.

## Asks

The pane has no tabs: it is the chat, one centred column, `100` cells wide (`pane.CHAT_COLUMNS`) when `bodyColumns` exceeds that, else `'100%'`, so a wide pane reads like Claude's own transcript; on mobile too. Below the cap it is `'100%'` rather than `bodyColumns` because desktop's reported `bodyColumns` need not match the painted width, and a numeric width drew the column right of centre. The pane's root takes `minHeight` = the Pane hook's `scroll.bodyRows`, and the history sits in a `flexGrow` Box, so a short chat puts the question cards and the ask input on the body's last rows and a long one pushes them after the history, where the engine scrolls. Each unanswered question is a card between the history and the proposal, built to be spotted: a round border and bold header in the theme's `permission` colour, `paddingX={2}`, `paddingY={1}`, `marginY={1}` and `gap={1}` between its header, question, default line, option buttons and `[other…]` field. Only the oldest card's options take hotkeys `1`..`9`; nothing else in the chat does. An answer removes the card and writes an `answer` turn to the chat (`answerFromPane`): a dim `Q · T<task> · <question>` line over the answer in the person's bubble, so the exchange stays on record. The ask box is the last thing in the column: the native `Input`, with no label, border or hint, placeholder `ask or steer…`, then a `[➤ Steer]` button (key `steer-typed`; the glyph is in the label, since Button takes no icon), in a bare row Box that only centres them (`alignSelf="center"`, `gap={1}`) and spaces it `marginTop={1}`. The surfaces size that field themselves (no layout prop reaches an `Input`; `flexGrow` and `width="100%"` were both ignored on desktop), hence the wrapper. A full-width, growing field would need a `Client`-drawn editor, which VS Code doesn't draw. An open steer proposal sits directly above it; it and the question cards are inset two cells from the pane edges only while the column is the pane's full width, since a centred column is inset already. The `↵` beside the field is the Input's `submitLabel`, drawn by the surface while the field has focus. A fork (`$.model.fork`, on the main thread's model) runs from a `$.clock.after(0, …)` timer, so the input's dispatch can't abort it. One ask runs at a time; another is refused with `side chat: wait for the answer in progress`.

The history reads like Claude's own transcript: each question sits right-aligned in a grey bubble matching the ask input (`borderStyle="round"`, the only rounded corner Box has; raw `#2b2b2b` fill and `#454545` border, since no theme key names those greys and `subtle` filled far brighter, so a light theme gets the dark bubble too, with fixed `#e6e6e6` text so it stays readable there; `paddingX={1}`) sized to its text, with `marginLeft={8}` bounding how far a long question reaches, and answers sit left as unlabelled Markdown. Under each fork answer a dim `· Context copied from main thread · <n> tokens, <m> reused from cache` line (`none` when the cache had lapsed): the fork answers over the main thread's own transcript, so `n` is its whole prompt (`input_tokens` + `cache_read_input_tokens` + `cache_creation_input_tokens`) and `m` the cached part. Look-ups, `…thinking` and steer chips are dim activity lines. A steer chip sits in the history at its `steer` turn, written when the steer is taken, showing what its note or held steer holds now (a released note is found by its held steer's `noteId`); only a steer whose turn the 50-turn cap pushed out falls to the end; error lines are red, opening with their kind.

### Context

The fork sees the main thread's transcript, not this chat's, so every ask carries the side chat so far (`chatStore.planContext`, `forkPrompt`): each earlier turn as a short block (`You: …`, `Side chat: …`, answered cards, steers taken), read before the new question is written. Past 100 lines of history not yet summarized, its older part is folded by `$.model.complete({ model: 'haiku' })` into a running summary of at most 150 words, leaving about 40 recent lines verbatim; the fork gets `Earlier in this side chat (summary): …` then `Side chat so far:`. The summary is module state per session (`chat.summaries`), keyed by the exact turns it covers, so a 50-turn cap that drops old turns or a reload rebuilds it once. A failed summary sends every turn verbatim and writes `summary: failed (<reason>); sent the full history`.

### Look-up

The fork answers only from what the conversation holds. When it needs code or files, it replies with exactly one line, `LOOKUP: <self-contained question>`. The pane then draws a dim `· Looking it up in the code…` (the pending state's line, never stored) and runs `$.process.run(chatStore.LOOKUP_ARGV, { stdin: <question>, cwd: <session cwd>, timeoutMs: 300000 })`:

```text
claude -p --model haiku --tools Read,Grep,Glob --permission-mode dontAsk --safe-mode
  --no-session-persistence --max-budget-usd 0.25 --output-format text --system-prompt <LOOKUP_SYSTEM>
```

- It is a process, not a spawned agent, because a plugin-spawned agent hands its report back into the main conversation, interrupting the main thread and growing its context.
- `argv[0]` is plain `claude`: on Windows it resolves to the npm `claude.cmd` shim, while `claude.exe` is refused.
- On a non-zero exit, the line shows the last non-empty output line, stdout first, then stderr. Stderr opens with settings warnings, and a budget overrun prints its error on stdout.

### Endings

Every way an ask can end draws one line:

- an answer: the fork's as plain Markdown, the look-up's under a dim `· Looked it up in the code`;
- the engine's reason word (`nothing-to-fork`, `api-error`, `empty-reply`, `aborted`);
- `look-up: failed (exit <n>): <last output line>`, `look-up: no answer (empty-reply)`, or `look-up: failed: <reason>` for a timeout or a command that could not start;
- `<kind>: failed: <error>` for any other throw (the fork call, or a history write);
- `<kind>: interrupted (the mod reloaded)`, written at the next `session.start`;
- a toast when even the failure line can't be written.

## Steers

The fork proposes a steer on an explicit steering request, or when the message or exchange uncovers a bug, a risk or a worthwhile change, even on a plain question. It ends its reply with `NOTE: <one imperative sentence, at most 20 words>`, and is told it cannot act, queue or message the main thread.

- The proposal is drawn directly above the ask input as `Steer: <first 20 words>` (`…` when cut), with `[✓]` (take the full text) and `[x]` (dismiss for good). Nothing happens without a press.
- `[Steer]` beside the input takes the typed text as the steer itself, with no fork and no proposal, and routes it as `[✓]` would (plan mode or session mode below); the input then remounts empty. The `Input` keeps no readable value, so its `onInput` edits are kept in `chat.tsx`'s module-level `draft`, cleared by a submitted question; empty, `[Steer]` toasts `side chat: type a steer before pressing Steer`.
- Only the newest proposal is offered; an older untaken one is superseded and never drawn again.

**Plan mode:** `[✓]` queues the steer against the plan's first not-done task, for `/implement` at its next `checkpoint`. Chips: `· steer → T<n>: <text> [x]` (withdraw while undelivered), then `· steered → T<n>: <text> · <outcome>`; a steer the fallback below releases leaves these chips and shows as session-mode chips, `[<plan title> T<n>] <text>`. The band counts undelivered ones (`· 1 steer`). Steers are the inbox's `notes`: the store and `checkpoint` keep that name.

Fallback, for a plan nobody is checkpointing: at every idle point (the `[✓]` press if the main thread is already idle, else each main-loop `turn.complete`), `releaseToMain` moves the active plan's oldest undelivered steer out of the inbox (`inbox.releaseOldestNote`) into `heldSteers` as `[<plan title> T<n>] <text>`, and it goes on as a session-mode steer below. One per idle point, and only while no steer is held or out: the rest stay in the store, which a reload keeps, where held steers are dropped. An `/implement` run is one main turn, so its own checkpoints take a steer first; only one still queued when the turn ends is released, and leaving the inbox means no later checkpoint delivers it twice. An interrupted turn (`isAborted`, Esc on a run) releases nothing, so its steers wait for the next run's checkpoint.

Answers take the same fallback, at the answer press as well as each idle point, after any steers: `inbox.releaseOldestAnswer` marks the oldest undelivered answer delivered rather than removing it, so a later `applied` for its id is still known, and holds it as `[<plan title> T<n>] Answer to <id>, "<question>": <answer>` with its `questionId`. The `answer` chat turn is its record, so it draws no chip.

**Session mode:** `[✓]` holds the steer in `heldSteers`. It is submitted with `$.prompt.submit({ text })` (the steer text is the whole prompt, nothing hidden beside it) once the main thread is idle: at once if it is, else at the next main-loop `turn.complete`, one per idle point, in order.

- Chips: `· steer → next turn: <text> [x]` (withdraw), `· steer → sending: <text>` (no `[x]`: a submitted prompt can't be withdrawn), then `· steered → sent: <text>`.
- Busy means `mainTurn` is set. `turn.start` is raised for the main loop only; a `turn.complete` without `agentId` whose `turnId` matches, or arrives while `mainTurn` is `null` (the mod loaded mid-turn), is an idle point.
- A `{ drop: <reason> }` or a rejected submit writes `steer: not sent (<reason>): <text>`, and the steer goes back to held for the next idle point. `prompt.submit` has no deny arm.
- A reload clears unsent steers at `session.start`, each with a chat line: `steer dropped (the mod reloaded): <text>` for a held one, `steer may have been sent (the mod reloaded): <text>` for a sending one. Sent chips stay.

## Engine constraints

These shape the file layout:

- **`$` can't cross an import**, and nor can atoms. So `register.tsx` (tools, `session.start`) and `chat.tsx` (the band and Pane hooks, `turn.start`/`turn.complete`, and their handlers) each declare their own atoms over the same `plugin`/`key` literals, and their own `storeOf`. `pane.tsx`, `chatStore.ts`, `heldSteers.ts`, `inbox.ts` and `planParser.ts` are pure: they take data and closures.
- **`$.store` may not be passed as a value**: `storeOf($)` spells each op at its call site.
- **One unmatched `session.start` per module**, so the reload resets (an ask in flight, held steers) live in `register.tsx`.
- **Handlers close over the drawing hook's `$`**, so the fork, the look-up process and the steer pump sit in `chat.tsx`, and so does the band, whose `[–]` writes `bandHidden`. The `/side-chat` `command.run` hook is there too, beside `openPane` and that atom; `register.tsx` only registers the command, since its `session.start` is the module's one. A `state.set` hook can't bridge the files, because a module's own writes go beneath all of its hooks.
- **A hook awaiting its own `$.prompt.submit` inside a turn hangs** (`submit` resolves as its own turn starts), so steers are submitted from a `$.clock.after(0, …)` timer.
- **Matcher constants must be in the hooks file** (`PANE`, `SIDE_CHAT`, `CHECKPOINT`, `ASK`), or `validate` can't resolve them.

## Develop

```bash
claude plugin test ~/.claude/skills/side-chat
claude plugin validate ~/.claude/skills/side-chat
npx -y -p typescript tsc -p "$TEMP/sc-tsc/tsconfig.json"
```

`tsconfig.json` here extends `.claude-plugin/types/`, which the engine writes on first load (gitignored). Until it exists, type-check with an outside tsconfig: strict, `jsx: react` with factory `h`, and `include` naming the bundled `plugin-authoring/types/claude-code.d.ts` plus this mod's `hooks/` and `types/`.

Test-kit facts are recorded in the tests' comments: files come from `fs.read`/`fs.exists` hooks over a map, and the test's `$` has no `state`/`store` noun. Every world that draws the Pane or asks must answer `session.id`. `fixtures/README.md` seeds a toy repo for live runs.

## Pending live checks

Done live on desktop, before the mod was always on: the band drew, its open button (then labelled `spar`) opened the pane, the chat input cleared after Enter, the fork answered mid-turn, and the mod auto-loaded from the skills folder.

Pending:

- A fresh desktop session with no plan: the slim `<repo> Side chat … [Open] [–]` band shows the repository's name, buttons at the far right, `[Open]` opens a pane titled `<repo> Side chat` on the empty state, and a question gets a fork answer.
- `[–]` hides the band live, `/side-chat` appears in the typeahead with its description, and running it brings the band back and opens the pane; a new session shows the band again.
- The repository name in a Gerrit checkout (`ssh://…:29418/<name>`) and in a worktree, whose root is the main working tree's.
- The ask input on desktop and the terminal: the bare native field reads as the input without its old border, `›` label and `enter to ask` hint, centred one row below the proposal or history.
- The chat layout against the UI Contract mockup and Claude's own transcript on desktop and the terminal: right-aligned round-bordered bubbles, left answers, and the question card's `permission` border standing out on both light and dark themes, and the dark bubble's fixed light text readable on a light theme.
- A held steer with no plan: press `[✓]` while the main thread works; it is submitted as a prompt only after the turn ends. Also confirm `$.model.fork` raises no `turn.start`/`turn.complete`: the types call it one tool-less completion, and `turn.start` follows `prompt.submit`, which a fork skips. If it raised both, a mid-turn fork would make a false idle point, and `releaseToMain` would move plan steers out of the inbox during an `/implement` run, past its checkpoints.
- The plan-mode steer fallback: with a plan but no `/implement` running, press `[✓]` while the main thread works; at the turn's end the `T<n>` chip goes, a `· steer → next turn: [<plan title> T<n>] <text>` chip appears and is submitted, and no later `checkpoint` delivers it. During an `/implement` run, a steer taken mid-run is delivered at its next checkpoint, not released.
- `[Steer]` on desktop and the terminal: type a steer and press it without Enter; expect the steer chip, an empty field, and no `…thinking`. Also that the native field reports edits through `onInput` on desktop, which the test kit only simulates.
- The look-up runs isolated on desktop: `$.process` is documented CLI only. Ask a question needing code; expect `· Looking it up in the code…`, then `· Looked it up in the code` over the answer, and no new row in the main transcript.
- One full toy `/implement` run on desktop, end to end.
- The band in a fresh CLI session (skills-folder auto-load there too; if it fails, move to `CLAUDE_CODE_PLUGIN_DIRS`).
- `[Open]` opens the pane in a CLI window narrower than 110 columns.
- Whether the band draws in VS Code.
- A toy run in a session without the mod: one `side-chat not loaded — no inbox` line.
- A queued plan-mode steer survives a session restart and is delivered at the next checkpoint.
