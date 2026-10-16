import { atom, read, update } from 'claude-code'
import type { CoreEngineInterface, Register } from 'claude-code'

import type { SideChatChatPending } from '../types'
import { registerChat } from './chat'
import { appendChat, interruptedTurn, sweepChats } from './chatStore'
import { dropOnReload, NO_HELD_STEERS } from './heldSteers'
import {
  addQuestion,
  applyOutcomes,
  canonicalPath,
  deleteInbox,
  sweepStale,
  takeUndelivered,
} from './inbox'
import type { Applied, PluginStore } from './inbox'
import { paneRefusal, paneTitle, repoName } from './pane'
import { isPlanMode, parsePlan } from './planParser'
import { ASK_SPEC, CHECKPOINT_SPEC } from './specs'

// `$` is followed only into functions of the file it is used in: this file holds the tools and
// `session.start` (which also resets chat state a reload stranded), chat.tsx the band's and the
// pane's hooks (each file declares its own atoms over the same literals), pane.tsx the view.
const activePlan = atom({ plugin: 'side-chat', key: 'activePlan' } as const, null)
const inboxVersion = atom({ plugin: 'side-chat', key: 'inboxVersion' } as const, 0)
const chatVersion = atom({ plugin: 'side-chat', key: 'chatVersion' } as const, 0)
const chatPending = atom(
  { plugin: 'side-chat', key: 'chatPending' } as const,
  null as SideChatChatPending | null,
)
const heldSteers = atom({ plugin: 'side-chat', key: 'heldSteers' } as const, NO_HELD_STEERS)

const CHECKPOINT = 'mcp__side-chat__checkpoint'
const ASK = 'mcp__side-chat__ask'
const PANE = 'side-chat'

// The hooks scan refuses `$.store` passed as a value; each op must be spelled at its call site.
const storeOf = ($: Pick<CoreEngineInterface, 'store'>): PluginStore => ({
  get: key => $.store.get(key),
  set: (key, value) => $.store.set(key, value),
  delete: key => $.store.delete(key),
  keys: () => $.store.keys(),
})

// Drops the inbox entries of plan files that no longer exist. Chats are the session's, swept by
// `sweepChats` at session start instead.
const sweepGonePlans = ($: CoreEngineInterface) => sweepStale(storeOf($), path => $.fs.exists(path))

// Every inbox write calls this once it lands: the store redraws nothing, a `$.state` write does.
const bumpInbox = ($: CoreEngineInterface) => update($, inboxVersion, n => n + 1)

// A new question opens the pane unasked; chat.tsx opens it asked, for [Open] and `/side-chat`.
// The repository names the session pane only (a question on an all-done plan).
const openPaneUnasked = async ($: CoreEngineInterface) => {
  const active = await read($, activePlan)
  const name = isPlanMode(active) ? null : repoName(await $.session.repo())
  const opened = await $.ui.open({ id: PANE, title: paneTitle(active, name) })
  if (!opened.isPlaced) $.ui.toast(paneRefusal(false, opened.reason))
}

type AskInput = {
  planPath: string
  task: string
  question: string
  options: string[]
  defaultOption: string
  loadBearing: boolean
}

// Every field is required; the first wrong one is named so the model can correct its call.
const checkAsk = (e: Record<string, unknown>): AskInput | { error: string } => {
  for (const field of ['planPath', 'task', 'question', 'defaultOption'] as const) {
    if (typeof e[field] !== 'string' || e[field] === '') return { error: `ask needs ${field}, a non-empty string` }
  }
  // Checked strings by the loop above. Picked field by field: `e` also carries the call's `tool` and
  // `tool_use_id`, which are not stored.
  const { planPath, task, question, defaultOption } = e as Pick<
    AskInput,
    'planPath' | 'task' | 'question' | 'defaultOption'
  >
  const { options, loadBearing } = e
  if (!Array.isArray(options) || options.length === 0 || !options.every(o => typeof o === 'string' && o !== '')) {
    return { error: 'ask needs options, a non-empty array of non-empty strings' }
  }
  if (typeof loadBearing !== 'boolean') return { error: 'ask needs loadBearing, a boolean' }
  if (!options.includes(defaultOption)) {
    return { error: `ask's defaultOption "${defaultOption}" is not one of options: ${options.join(', ')}` }
  }
  return { planPath, task, question, options, defaultOption, loadBearing }
}

export const register: Register = on => {
  registerChat(on)

  on('session.start', async ($, e, next) => {
    // A reload fires this again with `$.state` kept but chat.tsx's timer and call gone, so a
    // `chatPending` left over can never settle: it would show `…thinking` and refuse every ask.
    // Lives here, not in chat.tsx: the engine takes one unmatched `session.start` per module.
    const pending = await read($, chatPending)
    if (pending !== null) {
      await appendChat(storeOf($), await $.session.id(), interruptedTurn(pending.kind), await $.clock.now())
      await update($, chatVersion, n => n + 1)
      await update($, chatPending, () => null)
    }
    // Held steers survive in `$.state`, but the timers that would send them died with the old module.
    const { kept, lines } = dropOnReload(await read($, heldSteers))
    if (lines.length > 0) {
      const sessionId = await $.session.id()
      for (const text of lines) await appendChat(storeOf($), sessionId, { role: 'error', text }, await $.clock.now())
      await update($, chatVersion, n => n + 1)
      await update($, heldSteers, () => kept)
    }
    await sweepGonePlans($)
    await sweepChats(storeOf($))
    await $.tool.register(CHECKPOINT_SPEC)
    await $.tool.register(ASK_SPEC)
    // Served by chat.tsx's `command.run` hook, beside the band it shows again. Immediate: it is
    // used while the main thread works, so it must not wait for the turn to end.
    await $.command.register({
      name: 'side-chat',
      description: 'Show the side chat band and open the side chat',
      immediate: true,
    })
    return next(e)
  })

  // Pull: notes and answers leave the store here, at a task boundary, unless
  // `chat.releaseToMain` hands them to an idle main thread first.
  on('tool.call', { tool: CHECKPOINT }, async ($, e) => {
    const {
      planPath,
      completedTasks = [],
      applied = [],
    } = e as { planPath?: unknown; completedTasks?: unknown; applied?: Applied[] }
    if (typeof planPath !== 'string' || planPath === '') {
      return { deny: 'side chat: checkpoint needs planPath, the absolute path of the plan file' }
    }
    if (!Array.isArray(completedTasks) || !completedTasks.every(id => typeof id === 'string')) {
      return { deny: 'side chat: completedTasks must be an array of task id strings' }
    }
    let markdown: string
    try {
      markdown = await $.fs.read(planPath)
    } catch (error) {
      return { deny: `side chat: cannot read ${planPath}: ${String(error)}` }
    }
    const parsed = parsePlan(markdown)
    if ('error' in parsed) {
      return { deny: `side chat: ${planPath} is not a plan file: ${parsed.error}` }
    }
    // The band counts Done boxes, so a finished task left unticked would show as still running.
    const unticked = completedTasks.filter(id => !parsed.tasks.some(t => t.id === id && t.isDone))
    if (unticked.length > 0) {
      return {
        deny:
          `side chat: completedTasks names tasks ${planPath} does not show as done: ` +
          `${unticked.join(', ')}; tick their "- [x] Done" box before calling checkpoint`,
      }
    }
    const recorded = await applyOutcomes(storeOf($), planPath, applied)
    if ('error' in recorded) return { deny: `side chat: ${recorded.error}` }

    await update($, activePlan, () => ({ planPath, plan: parsed }))
    const delivery = await takeUndelivered(storeOf($), planPath, await $.clock.now())
    // Kept after a non-empty delivery: it may insert a task, whose checkpoint then reports `applied` ids.
    const isEmpty = delivery.notes.length === 0 && delivery.answers.length === 0
    if (isEmpty && parsed.tasks.every(t => t.isDone)) await deleteInbox(storeOf($), planPath)
    await sweepGonePlans($)
    await bumpInbox($)
    return { result: JSON.stringify(delivery) }
  })

  // Push: stores the question and answers at once; the model carries on with defaultOption.
  on('tool.call', { tool: ASK }, async ($, e) => {
    const checked = checkAsk(e as Record<string, unknown>)
    if ('error' in checked) return { deny: `side chat: ${checked.error}` }
    const { planPath, ...question } = checked
    // The band and pane draw the active plan only, so a question on any other would sit unseen.
    const active = await read($, activePlan)
    if (active === null || canonicalPath(active.planPath) !== canonicalPath(planPath)) {
      return { deny: `side chat: call checkpoint for ${planPath} before asking about it` }
    }
    const added = await addQuestion(storeOf($), planPath, question)
    await bumpInbox($)
    $.ui.toast(`side chat: question on T${question.task}`)
    await openPaneUnasked($)
    return { result: JSON.stringify({ id: added.id }) }
  })
}
