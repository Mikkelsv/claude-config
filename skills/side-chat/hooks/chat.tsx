import { atom, read, update } from 'claude-code'
import type { CoreEngineInterface, On } from 'claude-code'

import type { SideChatChatPending, SideChatChatTurn, SideChatHeldSteer } from '../types'
import {
  appendChat,
  ASK_LABEL,
  dismissProposal,
  forkFailure,
  forkPrompt,
  forkTurn,
  LOOKUP_ARGV,
  LOOKUP_TIMEOUT_MS,
  lookupQuestion,
  openProposal,
  planContext,
  processTurn,
  readChat,
  skillBody,
  skillInvocation,
  skillMissingLine,
  skillPaths,
  takeProposal,
} from './chatStore'
import type { InvokedSkill, SummaryMemo } from './chatStore'
import { holdSteer, NO_HELD_STEERS, nextHeldId, nextToSend, refusedLine, withdrawHeld, withStatus } from './heldSteers'
import {
  answerQuestion,
  canonicalPath,
  queueNote,
  readInbox,
  releaseOldestAnswer,
  releaseOldestNote,
  unanswered,
  withdrawNote,
} from './inbox'
import type { PluginStore } from './inbox'
import { bandText, chatTitle, drawPane, paneRefusal, paneTitle, repoName } from './pane'
import { isPlanMode } from './planParser'

// The band and the pane: their drawing, the questions' answers, the chat's asks and its
// steers, and `/side-chat`. An element's handler is a closure of the hook that draws it, so the
// fork, the look-up process and the presses that start them live beside the hooks that draw them.
// `$` and atoms never cross an import: the atoms below share register.tsx's values through the same
// `plugin`/`key` literals, and `storeOf` is this file's own copy. The chat is the session's
// (`sessionId`); the inbox is the active plan's.
const activePlan = atom({ plugin: 'side-chat', key: 'activePlan' } as const, null)
const inboxVersion = atom({ plugin: 'side-chat', key: 'inboxVersion' } as const, 0)
const chatVersion = atom({ plugin: 'side-chat', key: 'chatVersion' } as const, 0)
const chatAsked = atom({ plugin: 'side-chat', key: 'chatAsked' } as const, 0)
const chatPending = atom(
  { plugin: 'side-chat', key: 'chatPending' } as const,
  null as SideChatChatPending | null,
)
const heldSteers = atom({ plugin: 'side-chat', key: 'heldSteers' } as const, NO_HELD_STEERS)
const mainTurn = atom({ plugin: 'side-chat', key: 'mainTurn' } as const, null as string | null)
const bandHidden = atom({ plugin: 'side-chat', key: 'bandHidden' } as const, false)

// Defined here, not imported: the validator resolves a matcher's constant only within this file.
const PANE = 'side-chat'
const SIDE_CHAT = 'side-chat'

// The hooks scan refuses `$.store` passed as a value; each op must be spelled at its call site.
const storeOf = ($: Pick<CoreEngineInterface, 'store'>): PluginStore => ({
  get: key => $.store.get(key),
  set: (key, value) => $.store.set(key, value),
  delete: key => $.store.delete(key),
  keys: () => $.store.keys(),
})

// Where a steer came from: the fork's proposal ([✓]) or the ask Input's text ([Steer]).
type SteerSource = 'proposal' | 'typed'

const bumpInbox = ($: CoreEngineInterface) => update($, inboxVersion, n => n + 1)

// The store redraws nothing: every history write bumps `chatVersion`, which the Pane hook reads.
const writeTurn = async ($: CoreEngineInterface, sessionId: string, turn: SideChatChatTurn) => {
  await appendChat(storeOf($), sessionId, turn, await $.clock.now())
  await update($, chatVersion, n => n + 1)
}

// Ends the ask in flight with its answer or its failure line. The ask is ended even when the line
// can't be written, so a failed write never leaves `…thinking` refusing every later ask.
const settle = async ($: CoreEngineInterface, sessionId: string, turn: SideChatChatTurn) => {
  try {
    await writeTurn($, sessionId, turn)
  } finally {
    await update($, chatPending, () => null)
  }
}

// A timer's work has no caller to reject to, so its last failure is toasted, never dropped.
const toastFailure = ($: CoreEngineInterface, kind: SideChatChatPending['kind'], error: unknown) =>
  $.ui.toast(`side chat: ${ASK_LABEL[kind]}: could not record the answer: ${String(error)}`)

// Question cards and inbox steer chips are drawn only for a checkpointed plan, so a press on a stale
// one with no plan is said aloud rather than dropped.
const noPlan = async ($: CoreEngineInterface, what: string) => {
  $.ui.toast(`side chat: no plan is running, so ${what}`)
}

// The answered card leaves the pane, so the exchange is written to the chat as its record. An idle
// main thread is handed the answer at once (`releaseToMain`); otherwise it waits for a checkpoint
// or the turn's end.
const answerFromPane = async ($: CoreEngineInterface, planPath: string, sessionId: string, id: string, text: string) => {
  const typed = text.trim()
  if (typed === '') {
    $.ui.toast('side chat: type an answer before pressing Enter')
    return
  }
  const answered = await answerQuestion(storeOf($), planPath, id, typed)
  if ('error' in answered) {
    $.ui.toast(`side chat: ${answered.error}`)
    return
  }
  await bumpInbox($)
  await writeTurn($, sessionId, { role: 'answer', text: typed, question: answered.question, task: answered.task })
  await releaseToMain($, sessionId)
}

// A steer (an inbox note) targets the active plan's first not-done task. Only plan mode routes
// here, so the all-done refusal catches a plan that finished between the drawing and the press.
// A proposal is marked taken before the note is queued, so a stale press can't queue it twice; a
// typed steer ([Steer]) has no proposal to mark.
const queueFromPane = async (
  $: CoreEngineInterface,
  planPath: string,
  sessionId: string,
  text: string,
  source: SteerSource,
) => {
  const active = await read($, activePlan)
  if (active === null || canonicalPath(active.planPath) !== canonicalPath(planPath)) {
    $.ui.toast(`side chat: ${planPath} is no longer the active plan`)
    return
  }
  const target = active.plan.tasks.find(t => !t.isDone)
  if (target === undefined) {
    $.ui.toast(`side chat: every task of ${active.plan.title} is done, so there is nothing to steer`)
    return
  }
  if (source === 'proposal' && !(await markProposalTaken($, sessionId, text))) return
  const note = await queueNote(storeOf($), planPath, { text, targetTask: target.id })
  await bumpInbox($)
  await writeTurn($, sessionId, { role: 'steer', text, ref: note.id })
  await releaseToMain($, sessionId)
}

// Acts only while the main thread is idle (`mainTurn` null), when no `/implement` turn will
// checkpoint the active plan's queued steers and answers: the oldest (steers first) leaves the
// inbox for the held steers, tagged with its plan and task so the main thread knows what it was
// for, and is pumped like a session-mode steer. Only when no steer is held or out, so the one
// released is sent at once and the rest stay in the store, which a reload keeps, while held steers
// do not. Not gated on `isPlanMode`: an all-done plan holds an undelivered entry when a press raced
// its final checkpoint or a question was asked after it, and no later checkpoint will come.
const releaseToMain = async ($: CoreEngineInterface, sessionId: string) => {
  if ((await read($, mainTurn)) !== null) return
  const active = await read($, activePlan)
  const isQueueEmpty = (await read($, heldSteers)).steers.every(s => s.status === 'sent')
  if (active !== null && isQueueEmpty) {
    const tag = (task: string) => `[${active.plan.title} T${task}]`
    const note = await releaseOldestNote(storeOf($), active.planPath)
    const answer =
      note === undefined ? await releaseOldestAnswer(storeOf($), active.planPath, await $.clock.now()) : undefined
    if (note !== undefined) {
      await bumpInbox($)
      await update($, heldSteers, held => holdSteer(held, `${tag(note.targetTask)} ${note.text}`, { noteId: note.id }))
    } else if (answer !== undefined) {
      await bumpInbox($)
      const text = `${tag(answer.task)} Answer to ${answer.id}, "${answer.question}": ${answer.answer}`
      await update($, heldSteers, held => holdSteer(held, text, { questionId: answer.id }))
    }
  }
  await pumpSteers($, sessionId)
}

// Submits the oldest held steer if the main thread is idle and none is out. Marked `sending` in the
// same update that picks it, so two idle points can't send it twice. The submit runs from a timer:
// it resolves only as its own turn starts, which a hook inside the ending turn would wait on forever.
const pumpSteers = async ($: CoreEngineInterface, sessionId: string) => {
  if ((await read($, mainTurn)) !== null) return
  let picked: SideChatHeldSteer | undefined
  await update($, heldSteers, held => {
    picked = nextToSend(held)
    return picked === undefined ? held : withStatus(held, picked.id, 'sending')
  })
  const steer = picked
  if (steer === undefined) return
  $.clock.after(0, () => {
    sendSteer($, sessionId, steer).catch(error =>
      $.ui.toast(`side chat: steer: could not record the submit: ${String(error)}`),
    )
  })
}

// The steer text is the prompt, with nothing hidden beside it. A drop or a rejection puts it back
// to held for the next idle point, with a line naming why.
const sendSteer = async ($: CoreEngineInterface, sessionId: string, steer: SideChatHeldSteer) => {
  let refusal: string | undefined
  try {
    refusal = (await $.prompt.submit({ text: steer.text })).drop
  } catch (error) {
    refusal = String(error)
  }
  await update($, heldSteers, held => withStatus(held, steer.id, refusal === undefined ? 'sent' : 'held'))
  if (refusal !== undefined) await writeTurn($, sessionId, { role: 'error', text: refusedLine(steer.text, refusal) })
}

// Session mode's [✓] or [Steer]: a proposal is marked taken first, as in plan mode, then the
// steer is held and pumped.
const holdFromPane = async ($: CoreEngineInterface, sessionId: string, text: string, source: SteerSource) => {
  if (source === 'proposal' && !(await markProposalTaken($, sessionId, text))) return
  let ref = ''
  await update($, heldSteers, held => {
    ref = nextHeldId(held)
    return holdSteer(held, text)
  })
  await writeTurn($, sessionId, { role: 'steer', text, ref })
  await pumpSteers($, sessionId)
}

// False, said aloud, when the proposal is gone (taken, dismissed or superseded since the drawing).
const markProposalTaken = async ($: CoreEngineInterface, sessionId: string, text: string) => {
  const taken = await takeProposal(storeOf($), sessionId, text, await $.clock.now())
  if ('error' in taken) {
    $.ui.toast(`side chat: ${taken.error}`)
    return false
  }
  await update($, chatVersion, n => n + 1)
  return true
}

// What the ask Input holds now, for [Steer]: the Input reports edits but keeps no readable value.
// Module state, not `$.state`: a keystroke must not redraw the pane, and a reload losing a draft
// the field itself also loses is harmless.
let draft = ''

// [Steer]: the typed text is the steer, routed as [✓] routes a proposal, and the Input remounts
// empty as after an ask.
const steerTyped = async ($: CoreEngineInterface, sessionId: string) => {
  const text = draft.trim()
  if (text === '') {
    $.ui.toast('side chat: type a steer before pressing Steer')
    return
  }
  draft = ''
  await update($, chatAsked, n => n + 1)
  const active = await read($, activePlan)
  await (isPlanMode(active)
    ? queueFromPane($, active.planPath, sessionId, text, 'typed')
    : holdFromPane($, sessionId, text, 'typed'))
}

const withdrawHeldFromPane = async ($: CoreEngineInterface, id: string) => {
  let error: string | undefined
  await update($, heldSteers, held => {
    const next = withdrawHeld(held, id)
    error = 'error' in next ? next.error : undefined
    return 'error' in next ? held : next
  })
  if (error !== undefined) $.ui.toast(`side chat: ${error}`)
}

// Dismissed for good: the mark lives on the chat turn, so no redraw offers it again.
const dismissFromPane = async ($: CoreEngineInterface, sessionId: string, text: string) => {
  const dismissed = await dismissProposal(storeOf($), sessionId, text, await $.clock.now())
  if ('error' in dismissed) {
    $.ui.toast(`side chat: ${dismissed.error}`)
    return
  }
  await update($, chatVersion, n => n + 1)
}

const withdrawFromPane = async ($: CoreEngineInterface, planPath: string, id: string) => {
  const withdrawn = await withdrawNote(storeOf($), planPath, id)
  if ('error' in withdrawn) {
    $.ui.toast(`side chat: ${withdrawn.error}`)
    return
  }
  await bumpInbox($)
}

// One ask at a time: a second while one is in flight is refused aloud, never queued.
const isBusy = async ($: CoreEngineInterface) => {
  if ((await read($, chatPending)) === null) return false
  $.ui.toast('side chat: wait for the answer in progress')
  return true
}

// A fork or a look-up process can outlast the ui.input dispatch its handler runs in, and that
// dispatch's abort would cut it (`aborted`). So the handler only records the ask and starts a
// `$.clock.after` timer; the calls run from the timer, outside the dispatch, and write the answer
// when they resolve. `chatPending` is held until then, switching to `lookup` while the process runs.
const startAsk = async (
  $: CoreEngineInterface,
  sessionId: string,
  run: (toLookup: () => Promise<void>) => Promise<void>,
) => {
  let kind: SideChatChatPending['kind'] = 'fork'
  const toLookup = async () => {
    kind = 'lookup'
    await update($, chatPending, () => ({ kind: 'lookup' }))
  }
  await update($, chatPending, () => ({ kind }))
  $.clock.after(0, () => {
    run(toLookup)
      .catch(error => settle($, sessionId, { role: 'error', text: `${ASK_LABEL[kind]}: failed: ${String(error)}` }))
      .catch(error => toastFailure($, kind, error))
  })
}

// The fork lacked the answer: an isolated `claude -p` process looks it up, so nothing it does
// reaches the main conversation. A rejection (timeout, or the command could not start) is a line.
// The in-flight line is `chatPending`'s (`lookup`), so the history keeps only the answer.
const lookUp = async ($: CoreEngineInterface, sessionId: string, question: string, toLookup: () => Promise<void>) => {
  await toLookup()
  let turn: SideChatChatTurn
  try {
    const run = await $.process.run(LOOKUP_ARGV, {
      stdin: question,
      cwd: await $.session.cwd(),
      timeoutMs: LOOKUP_TIMEOUT_MS,
    })
    turn = processTurn(run)
  } catch (error) {
    turn = { role: 'error', text: `look-up: failed: ${String(error)}` }
  }
  await settle($, sessionId, turn)
}

// Each session's running summary of its older side chat (`planContext`). Module state: a reload
// loses it, and the next long ask rebuilds it with one Haiku call.
const summaries = new Map<string, SummaryMemo>()

// The side chat so far for the fork. Past the line point the older part is folded into the summary
// by Haiku; a failed summary sends every turn verbatim instead, with a line saying so.
const chatContext = async ($: CoreEngineInterface, sessionId: string, prior: readonly SideChatChatTurn[]) => {
  const plan = planContext(prior, summaries.get(sessionId))
  if (plan.fold === undefined) return plan.context
  const reply = await $.model.complete({ model: 'haiku', prompt: plan.fold.prompt })
  if (reply.isAnswered) {
    summaries.set(sessionId, plan.fold.memo(reply.text))
    return { summary: reply.text, recent: plan.fold.recent }
  }
  await writeTurn($, sessionId, { role: 'error', text: `summary: failed (${reply.reason}); sent the full history` })
  return { summary: undefined, recent: plan.full }
}

// The first SKILL.md that exists among `skillPaths`, or undefined when neither does.
const readSkill = async ($: CoreEngineInterface, name: string, args: string): Promise<InvokedSkill | undefined> => {
  for (const path of skillPaths($.plugin.root, await $.session.cwd(), name)) {
    if (await $.fs.exists(path)) return { name, body: skillBody(await $.fs.read(path), args) }
  }
  return undefined
}

const askFork = async ($: CoreEngineInterface, sessionId: string, text: string) => {
  // A submitted question is asked, never kept for [Steer].
  draft = ''
  const question = text.trim()
  if (question === '') {
    $.ui.toast('side chat: type a question before pressing Enter')
    return
  }
  if (await isBusy($)) return
  // Read before the question is written, so the history is what came before it.
  const prior = await readChat(storeOf($), sessionId)
  await writeTurn($, sessionId, { role: 'you', text: question })
  // Not a count of 'you' turns: at the 50-turn cap a question can push one out and repeat the count.
  await update($, chatAsked, n => n + 1)
  const invocation = skillInvocation(question)
  const skill = invocation === undefined ? undefined : await readSkill($, invocation.name, invocation.args)
  if (invocation !== undefined && skill === undefined) {
    await writeTurn($, sessionId, { role: 'error', text: skillMissingLine(invocation.name) })
    return
  }
  await startAsk($, sessionId, async toLookup => {
    const context = await chatContext($, sessionId, prior)
    const reply = await $.model.fork({ prompt: forkPrompt(question, context, skill) })
    const lookup = reply.isAnswered ? lookupQuestion(reply.text) : undefined
    if (lookup !== undefined) {
      await lookUp($, sessionId, lookup, toLookup)
      return
    }
    const turn: SideChatChatTurn = reply.isAnswered
      ? forkTurn(reply.text, reply.usage)
      : { role: 'error', text: forkFailure(reply) }
    await settle($, sessionId, turn)
  })
}

// register.tsx keeps its own copy for the `ask` tool; only the message is shared (`paneRefusal`).
// The repository names the session pane only, so plan mode never reads it.
const openPane = async ($: CoreEngineInterface, isAsked: boolean) => {
  const active = await read($, activePlan)
  const name = isPlanMode(active) ? null : repoName(await $.session.repo())
  const opened = await $.ui.open({ id: PANE, title: paneTitle(active, name) })
  if (!opened.isPlaced) $.ui.toast(paneRefusal(isAsked, opened.reason))
}

// Reads `inboxVersion` first, so the drawing that calls this is redrawn by every inbox write.
const readOpenCounts = async ($: CoreEngineInterface, planPath: string) => {
  await read($, inboxVersion)
  const inbox = await readInbox(storeOf($), planPath)
  return {
    questions: unanswered(inbox.questions).length,
    notes: inbox.notes.filter(n => n.deliveredAt === undefined).length,
  }
}

export const registerChat = (on: On) => {
  // The main-loop busy signal: `turn.start` is raised for the main loop only, and a main-loop
  // `turn.complete` has no `agentId`. Observe-only; both live here, beside the pump they wake.
  on('turn.start', async ($, e, next) => {
    await update($, mainTurn, () => e.turnId)
    return next(e)
  })

  // Another turn id is some other loop's end (a newer turn.start overwrote it); null means the
  // mod loaded mid-turn and never saw its start, so this end is still an idle point. An
  // interrupted turn (Esc on an `/implement` run) releases no plan steer: it waits for the next
  // run's checkpoint instead of restarting the thread the person just stopped.
  on('turn.complete', async ($, e, next) => {
    const running = await read($, mainTurn)
    if (e.agentId === undefined && (running === null || running === e.turnId)) {
      await update($, mainTurn, () => null)
      const sessionId = await $.session.id()
      await (e.isAborted ? pumpSteers($, sessionId) : releaseToMain($, sessionId))
    }
    return next(e)
  })

  // `/side-chat`: shows a band `[–]` hid, and opens the pane. Registered in register.tsx's
  // `session.start`, served here beside `openPane` and `bandHidden`.
  on('command.run', { command: SIDE_CHAT }, async $ => {
    await update($, bandHidden, () => false)
    await openPane($, true)
    return { text: 'Side chat shown.' }
  })

  // Present in every session until `[–]` hides it: progress once a plan has checkpointed (finished
  // or not), the slim `<repo> Side chat` form before that. The buttons sit at the far right, so they
  // keep their place whichever text is on the left. `spar` predates `Open` and stays the handle.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, bandHidden))) return next(e)
    const active = await read($, activePlan)
    const text =
      active === null
        ? chatTitle(repoName(await $.session.repo()))
        : bandText(active.plan, await readOpenCounts($, active.planPath))

    const { Box, Button, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" justifyContent="space-between">
        <Text>{text}</Text>
        <Box flexDirection="row">
          <Button key="spar" label="Open" onPress={() => openPane($, true)} />
          <Text> </Text>
          <Button key="hide" label="–" onPress={() => update($, bandHidden, () => true)} />
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Markdown, Text } = $.ui.resolve(e)
    const active = await read($, activePlan)
    const planPath = active?.planPath
    const sessionId = await $.session.id()
    // Each version is read before its store, so the read subscribes this drawing to every write.
    await read($, inboxVersion)
    const inbox = planPath === undefined ? undefined : await readInbox(storeOf($), planPath)
    await read($, chatVersion)
    const chat = await readChat(storeOf($), sessionId)
    const pending = await read($, chatPending)
    const asked = await read($, chatAsked)
    // The ask Input and `[other…]` are Inputs, which the mobile table lacks.
    const Input = e.surface === 'mobile' ? undefined : $.ui.resolve(e).Input
    return drawPane(
      { Box, Button, Markdown, Text, Input },
      {
        plan: isPlanMode(active) ? active.plan : undefined,
        open: inbox === undefined ? [] : unanswered(inbox.questions),
        chat,
        asked,
        notes: inbox?.notes ?? [],
        held: (await read($, heldSteers)).steers,
        proposal: openProposal(chat),
        pending: pending?.kind,
        bodyColumns: e.props.bodyColumns,
        bodyRows: e.props.scroll.bodyRows,
      },
      {
        onAnswer: (id, text) =>
          planPath === undefined
            ? noPlan($, 'there is no question to answer')
            : answerFromPane($, planPath, sessionId, id, text),
        onAsk: text => askFork($, sessionId, text),
        onDraft: text => {
          draft = text
        },
        onSteerTyped: () => steerTyped($, sessionId),
        // Plan mode queues the steer for the next checkpoint (released to the main thread if it is
        // idle); session mode (no plan, or a finished one) holds it for the main thread.
        onQueueProposal: note =>
          isPlanMode(active)
            ? queueFromPane($, active.planPath, sessionId, note, 'proposal')
            : holdFromPane($, sessionId, note, 'proposal'),
        onDismissProposal: note => dismissFromPane($, sessionId, note),
        onWithdraw: id =>
          planPath === undefined ? noPlan($, 'there is no steer to withdraw') : withdrawFromPane($, planPath, id),
        onWithdrawHeld: id => withdrawHeldFromPane($, id),
      },
    )
  })
}
