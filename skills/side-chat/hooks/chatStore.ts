import type { ModelForkResult, ModelUsage, ProcessRunResult } from 'claude-code'

import type { SideChatChat, SideChatChatPending, SideChatChatTurn } from '../types'
import type { InboxResult, PluginStore } from './inbox'

// The chat history per session: `chat:<session id>` in `$.store`, oldest turn first, plan or not.
// Per session because the fork sees only this session's conversation. Pure: the hooks hand in
// their `storeOf($)`, as with the inbox.

const PREFIX = 'chat:'
// One turn is one line of the history: a question, an answer, or an error line.
const MAX_TURNS = 50
// Session chats kept by the session-start sweep, newest `writtenAt` first.
const MAX_CHATS = 20

const chatKey = (sessionId: string) => PREFIX + sessionId

// The store only ever holds what `writeChat` wrote, so the cast is the write side's shape.
export const readChat = async (store: PluginStore, sessionId: string): Promise<SideChatChatTurn[]> =>
  ((await store.get(chatKey(sessionId))) as SideChatChat | undefined)?.turns ?? []

const writeChat = (store: PluginStore, sessionId: string, turns: SideChatChatTurn[], now: number) =>
  store.set(chatKey(sessionId), { writtenAt: now, turns } satisfies SideChatChat)

export const appendChat = async (store: PluginStore, sessionId: string, turn: SideChatChatTurn, now: number) => {
  const turns = [...(await readChat(store, sessionId)), turn].slice(-MAX_TURNS)
  await writeChat(store, sessionId, turns, now)
}

// Run at session start. A key whose suffix holds a `/` is a canonical plan path, from when chats
// were per plan; session ids are UUIDs. An entry with no numeric `writtenAt` is no shape this
// module writes. Both go, then every session chat past the newest MAX_CHATS. Returns the keys removed.
export const sweepChats = async (store: PluginStore) => {
  const removed: string[] = []
  const kept: { key: string; writtenAt: number }[] = []
  for (const key of await store.keys()) {
    if (!key.startsWith(PREFIX)) continue
    const writtenAt = ((await store.get(key)) as Partial<SideChatChat> | undefined)?.writtenAt
    if (key.slice(PREFIX.length).includes('/') || typeof writtenAt !== 'number') removed.push(key)
    else kept.push({ key, writtenAt })
  }
  kept.sort((a, b) => b.writtenAt - a.writtenAt)
  removed.push(...kept.slice(MAX_CHATS).map(c => c.key))
  for (const key of removed) await store.delete(key)
  return removed
}

// The pane draws a steer proposal at most this many words; the instruction asks for no more.
const STEER_WORDS = 20

const FORK_INSTRUCTION =
  "You are answering the user's side question about the work in progress in this session. " +
  "Answer briefly. Don't propose code edits; this is discussion. " +
  'Answer only from what this conversation already contains. If answering needs code or files not in it, ' +
  'reply with exactly one line, `LOOKUP: <self-contained question>`, and nothing else. A read-only look-up ' +
  'then answers it. The NOTE rule below still applies to steering messages. ' +
  'You cannot act, queue a steer, or message the main thread; you can only propose a steer. ' +
  'Propose one when the message is a steering request (it asks to change the plan or the work), or when ' +
  'the message or this exchange uncovers a bug, a risk, or a change worth making to the plan or the work, ' +
  'even if the user only asked a question. Then say in one sentence that you have proposed a steer below, ' +
  'which the user can confirm with ✓: during an /implement run it is applied at the next task boundary, ' +
  'otherwise it is sent to the main thread as a prompt once it is idle. Then end ' +
  'your reply with exactly one line ' +
  `\`NOTE: <the change, as one imperative sentence of at most ${STEER_WORDS} words>\`. ` +
  'A plain question with nothing actionable gets no such line.'

// Only a final line `NOTE: <text>` with text counts; anything else leaves the reply as it came.
const NOTE_LINE = /^NOTE: (.*\S.*)$/

// A fork's answer turn: a valid NOTE line is cut from the text and kept as the turn's proposal.
// It also keeps what the fork copied: its whole prompt's input tokens, the main thread's transcript
// almost all of it, and the part the prompt cache served.
export const forkTurn = (reply: string, usage: ModelUsage): SideChatChatTurn => {
  const tokens = {
    contextTokens: usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens,
    reusedTokens: usage.cache_read_input_tokens,
  }
  const lines = reply.trimEnd().split('\n')
  const note = NOTE_LINE.exec(lines.at(-1) ?? '')?.[1]?.trim()
  if (note === undefined) return { role: 'fork', text: reply, ...tokens }
  return { role: 'fork', text: lines.slice(0, -1).join('\n').trimEnd(), proposedNote: note, ...tokens }
}

// What the pane shows of a proposal: its first STEER_WORDS words, with `…` when cut. Display only:
// the full text is what gets queued.
export const condenseSteer = (text: string) => {
  const words = text.trim().split(/\s+/)
  return words.length <= STEER_WORDS ? words.join(' ') : `${words.slice(0, STEER_WORDS).join(' ')}…`
}

// Only the newest proposal is ever offered: an older untaken one is superseded, never drawn again.
const newestProposalAt = (turns: readonly SideChatChatTurn[]) =>
  turns.findLastIndex(t => t.proposedNote !== undefined)

const isOpen = (turn: SideChatChatTurn | undefined) =>
  turn !== undefined && turn.isProposalTaken !== true && turn.isProposalDismissed !== true

// The proposal the pane offers, with the turn index that keys its buttons, or undefined.
export const openProposal = (turns: readonly SideChatChatTurn[]) => {
  const at = newestProposalAt(turns)
  const turn = turns[at]
  if (turn?.proposedNote === undefined || !isOpen(turn)) return undefined
  return { index: at, note: turn.proposedNote }
}

// Closes the newest proposal if it is still open with this text, so a stale press can't act twice.
const closeProposal = async (
  store: PluginStore,
  sessionId: string,
  note: string,
  mark: Pick<SideChatChatTurn, 'isProposalTaken' | 'isProposalDismissed'>,
  now: number,
): Promise<InboxResult> => {
  const turns = await readChat(store, sessionId)
  const at = newestProposalAt(turns)
  if (!isOpen(turns[at]) || turns[at]?.proposedNote !== note) {
    return { error: `no open steer "${note}" in this session's chat` }
  }
  await writeChat(
    store,
    sessionId,
    turns.map((t, i) => (i === at ? { ...t, ...mark } : t)),
    now,
  )
  return { isDone: true }
}

export const takeProposal = (store: PluginStore, sessionId: string, note: string, now: number) =>
  closeProposal(store, sessionId, note, { isProposalTaken: true }, now)

export const dismissProposal = (store: PluginStore, sessionId: string, note: string, now: number) =>
  closeProposal(store, sessionId, note, { isProposalDismissed: true }, now)

// The fork sees the main thread's transcript, not this chat's, so each ask carries the side chat
// so far: a Haiku summary of its older part, if one exists, then the rest verbatim.
export type ChatContext = { summary: string | undefined; recent: readonly string[] }

// A skill the user invoked in the side chat, its body already read from disk (`skillBody`).
export type InvokedSkill = { name: string; body: string }

export const forkPrompt = (question: string, context: ChatContext, skill?: InvokedSkill) => {
  const summary = context.summary === undefined ? '' : `\n\nEarlier in this side chat (summary): ${context.summary}`
  const recent = context.recent.length === 0 ? '' : `\n\nSide chat so far:\n${context.recent.join('\n')}`
  const invoked = skill === undefined ? '' : `\n\n${skillInstruction(skill)}`
  return `${FORK_INSTRUCTION}${summary}${recent}${invoked}\n\nQuestion: ${question}`
}

// The fork has no Skill tool, so a typed `/<name> [args]` is resolved here: the mod reads the
// SKILL.md and the fork follows it. Names with `:` are plugin skills, not on disk, so not matched.
const SKILL_LINE = /^\/([a-z0-9][a-z0-9-]*)(?:\s+([\s\S]*\S))?\s*$/

export const skillInvocation = (text: string) => {
  const match = SKILL_LINE.exec(text)
  return match === null ? undefined : { name: match[1], args: match[2] ?? '' }
}

// Global first, then the project's: the engine's own precedence for a same-named skill. The project
// path is absolute: a relative `$.fs` path resolves against the plugin's folder, not the session's.
export const skillPaths = (pluginRoot: string, cwd: string, name: string) => [
  `${pluginRoot}/../${name}/SKILL.md`,
  `${cwd}/.claude/skills/${name}/SKILL.md`,
]

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n/

export const skillBody = (markdown: string, args: string) =>
  markdown.replace(FRONTMATTER, '').replaceAll('$ARGUMENTS', args === '' ? '(none)' : args).trim()

export const skillMissingLine = (name: string) => `skill: /${name} not found in the global or project skills folder`

const skillInstruction = (skill: InvokedSkill) =>
  `The user invoked the /${skill.name} skill. Its full instructions follow; carry them out as your reply, ` +
  'in full rather than briefly, overriding "Answer briefly" above. You have no tools: gather from this ' +
  'conversation, and where a step needs files or commands it does not hold, reply with the one LOOKUP line ' +
  'instead. Skip any step that writes, builds or commits, and say which you skipped.\n\n' +
  `<skill name="${skill.name}">\n${skill.body}\n</skill>`

// One turn as the fork reads it, a block of one or more lines.
export const transcriptBlock = (turn: SideChatChatTurn): string => {
  switch (turn.role) {
    case 'you':
      return `You: ${turn.text}`
    case 'fork':
      return `Side chat: ${turn.text}${turn.proposedNote === undefined ? '' : `\n(proposed steer: ${turn.proposedNote})`}`
    case 'lookup':
      return `Side chat (looked up in the code): ${turn.text}`
    case 'error':
      return `(no answer: ${turn.text})`
    case 'answer':
      return `You answered the question on T${turn.task} "${turn.question}": ${turn.text}`
    case 'steer':
      return `Steer taken: ${turn.text}`
  }
}

// Past this many lines of uncovered history, its older part is folded into the summary, leaving
// about RECENT_LINES verbatim: one Haiku call per ~60 lines of chat, not one per ask.
const HISTORY_LINES = 100
const RECENT_LINES = 40

// What the summary covers: the first `turns` turns, whose blocks joined read `covered`. A 50-turn
// cap that dropped the oldest turns, or a reload, no longer matches it, so it is rebuilt once.
export type SummaryMemo = { summary: string; turns: number; covered: string }

export type ContextPlan = {
  context: ChatContext
  // Present when the summary must grow: the Haiku prompt, and the memo its answer makes.
  fold?: { prompt: string; memo: (summary: string) => SummaryMemo; recent: readonly string[] }
  // Every turn verbatim, sent when the fold's summary fails.
  full: readonly string[]
}

const lineCount = (blocks: readonly string[]) => blocks.reduce((n, b) => n + b.split('\n').length, 0)

export const summaryPrompt = (previous: string | undefined, older: readonly string[]) =>
  'Summarize this side conversation about a coding session in at most 150 words, for a model that ' +
  'will keep answering in it: keep decisions, open questions, steers taken and names of files or ' +
  'tasks. Plain prose, no preamble.' +
  (previous === undefined ? '' : `\n\nSummary so far: ${previous}`) +
  `\n\nConversation:\n${older.join('\n')}`

export const planContext = (prior: readonly SideChatChatTurn[], memo: SummaryMemo | undefined): ContextPlan => {
  const blocks = prior.map(transcriptBlock)
  const base = memo !== undefined && blocks.slice(0, memo.turns).join('\n') === memo.covered ? memo : undefined
  const start = base?.turns ?? 0
  const uncovered = blocks.slice(start)
  const context: ChatContext = { summary: base?.summary, recent: uncovered }
  if (lineCount(uncovered) <= HISTORY_LINES) return { context, full: blocks }
  // Keep the newest turns that fit RECENT_LINES (at least one), fold the rest.
  let keep = 1
  while (keep < uncovered.length && lineCount(uncovered.slice(-(keep + 1))) <= RECENT_LINES) keep++
  const older = uncovered.slice(0, -keep)
  const recent = uncovered.slice(-keep)
  const turns = start + older.length
  return {
    context,
    fold: {
      prompt: summaryPrompt(base?.summary, older),
      memo: summary => ({ summary, turns, covered: blocks.slice(0, turns).join('\n') }),
      recent,
    },
    full: blocks,
  }
}

// One line per failure arm, each naming the engine's own reason word so it can be looked up.
export const forkFailure = (reply: Exclude<ModelForkResult, { isAnswered: true }>): string => {
  switch (reply.reason) {
    case 'nothing-to-fork':
      return 'fork: no answer (nothing-to-fork): this session has no reply to fork from yet'
    case 'api-error':
      return `fork: no answer (api-error, status ${reply.status ?? 'none'}, ${reply.error})`
    case 'empty-reply':
      return 'fork: no answer (empty-reply): the model replied without text'
    case 'aborted':
      return 'fork: no answer (aborted): the call was cut before a reply came'
  }
}

// How each ask kind names itself at the head of its lines.
export const ASK_LABEL = { fork: 'fork', lookup: 'look-up' } as const

// Drawn for an ask a reload cut: its timer and its call died with the old module.
export const interruptedTurn = (kind: SideChatChatPending['kind']): SideChatChatTurn => ({
  role: 'error',
  text: `${ASK_LABEL[kind]}: interrupted (the mod reloaded)`,
})

// A fork reply that is exactly one line `LOOKUP: <question>` hands the question to the look-up;
// anything else is an answer.
const LOOKUP_LINE = /^LOOKUP: (.*\S.*)$/

export const lookupQuestion = (reply: string) => {
  const text = reply.trim()
  return text.includes('\n') ? undefined : LOOKUP_LINE.exec(text)?.[1]?.trim()
}

// The look-up is its own `claude -p` process, not a spawned agent: a plugin-spawned agent hands its
// report back into the main conversation. `claude` resolves to the CLI's shim on PATH (no shell).
const LOOKUP_SYSTEM =
  'You are a read-only code lookup. Use Read, Grep and Glob only. Grep first; read only the lines you need; ' +
  "stop as soon as you can answer. Reply in at most 6 lines and cite path:line for every claim. If a few searches don't find it, say so in one line."

export const LOOKUP_ARGV = [
  'claude',
  '-p',
  '--model',
  'haiku',
  '--tools',
  'Read,Grep,Glob',
  '--permission-mode',
  'dontAsk',
  '--safe-mode',
  '--no-session-persistence',
  '--max-budget-usd',
  '0.25',
  '--output-format',
  'text',
  '--system-prompt',
  LOOKUP_SYSTEM,
] as const

export const LOOKUP_TIMEOUT_MS = 5 * 60 * 1000

const lastLine = (text: string) => text.split('\n').map(l => l.trim()).filter(l => l !== '').at(-1)

// Exit code first: a failed run's stdout is not an answer. The cause is the output's last line
// (stdout for a budget stop, else stderr), since stderr opens with settings warnings.
export const processTurn = (run: ProcessRunResult): SideChatChatTurn => {
  if (run.exitCode !== 0) {
    const cause = lastLine(run.stdout) ?? lastLine(run.stderr) ?? 'no output'
    return { role: 'error', text: `look-up: failed (exit ${run.exitCode}): ${cause}` }
  }
  const answer = run.stdout.trim()
  if (answer === '') return { role: 'error', text: 'look-up: no answer (empty-reply)' }
  return { role: 'lookup', text: answer }
}
