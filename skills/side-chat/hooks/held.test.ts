import type { ModelForkResult, On, PromptSubmitResult } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock, Mounted } from 'claude-code/testing'

import { dropOnReload, holdSteer, NO_HELD_STEERS, nextToSend, withdrawHeld, withStatus } from './heldSteers'

// Session-mode steers: with no plan, [✓] holds a steer in `$.state` and submits it as a prompt
// once the main thread is idle, one per idle point. A plan steer no checkpoint took joins the same
// queue (`releaseToMain`); notes.test.ts covers plan-mode steers otherwise.

const PLUGIN = 'side-chat'
const PANE = 'side-chat'
const CHECKPOINT = 'mcp__side-chat__checkpoint'
const SESSION_ID = '3f1c2b9e-7a44-4d1e-9b0a-5c6d7e8f9a01'
const CHAT_KEY = 'chat:' + SESSION_ID
const PLAN_PATH = 'C:/work/plans/fault-export.md'
const FORK_DELAY = 1000
const NOTE_TEXT = 'add a test for the empty fault cloud'
const OTHER_TEXT = 'rename greet to formatGreeting'
const HELD = `· steer → next turn: ${NOTE_TEXT}`
const SENT = `· steered → sent: ${NOTE_TEXT}`

const PLAN = `# Plan: fault-export

## Tasks

### Task 1: Parser

- [x] Done

### Task 2: Band

- [ ] Done

## Decisions & Review Items
`

const PANE_PROPS = {
  title: 'Side chat',
  isFocused: false,
  bodyColumns: 40,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
}

const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

const answered = (text: string): ModelForkResult => ({ isAnswered: true, text, usage: USAGE })

type Turn = { role: string; text: string; isProposalTaken?: boolean }

// The world beneath: the store from `entries`, the fork after FORK_DELAY with `forkReply`, and
// `prompt.submit` answered by `submitWith`, every submitted text recorded in `submits`.
const world = (on: On) => {
  const toasts: string[] = []
  const submits: string[] = []
  const entries: Record<string, unknown> = {}
  const state: {
    forkReply: ModelForkResult
    submitWith: (text: string) => PromptSubmitResult
    isUnanswered: boolean
  } = { forkReply: answered(`Worth it.\nNOTE: ${NOTE_TEXT}`), submitWith: text => ({ text }), isUnanswered: false }
  const clock: MockClock = mock.clock(on, { now: 5000 })
  on('store.get', ($, e) => ({ value: entries[e.key] }))
  on('store.set', ($, e) => {
    entries[e.key] = JSON.parse(JSON.stringify(e.value))
    return { value: undefined }
  })
  on('store.delete', ($, e) => {
    delete entries[e.key]
    return { value: undefined }
  })
  on('store.keys', () => ({ value: Object.keys(entries) }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: SESSION_ID }))
  on('tool.register', ($, e) => ({ value: { tool: `mcp__${PLUGIN}__${e.name}` } }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('fs.read', ($, e) =>
    e.path.replaceAll('\\', '/') === PLAN_PATH ? { value: PLAN } : { deny: `ENOENT: ${e.path}` },
  )
  on('fs.exists', ($, e) => ({ value: e.path.replaceAll('\\', '/') === PLAN_PATH }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('model.fork', async () => {
    await clock.sleep(FORK_DELAY)
    return { value: state.forkReply }
  })
  on('prompt.submit', ($, e, next) => {
    submits.push(e.text)
    return state.isUnanswered ? next(e) : state.submitWith(e.text)
  })
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  const chat = () => (entries[CHAT_KEY] as { turns: Turn[] } | undefined)?.turns ?? []
  return { toasts, submits, entries, state, clock, chat }
}

const start = ($: Engine) => $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })

const mountPane = ($: Engine) =>
  $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'Pane' as const, requestId: PANE, props: PANE_PROPS })

const chatInput = async (ui: Pick<Mounted, 'findAll'>) =>
  (await ui.findAll({ type: 'Input' })).find(i => i.props.placeholder === 'ask or steer…')

const ask = async (clock: MockClock, ui: Pick<Mounted<'terminal'>, 'findAll' | 'input'>, text: string) => {
  await ui.input({ key: (await chatInput(ui))?.key ?? 'no chat Input drawn', text })
  await clock.settle()
  await clock.advance(FORK_DELAY)
}

// The main thread's turn: `turn.start` marks it busy, its `turn.complete` (no agentId) idle again.
const turnStart = ($: Engine, turnId: string) => $.turn.start({ text: 'work', turnId })
const turnEnd = ($: Engine, turnId: string, agentId?: string) =>
  $.turn.complete({
    answer: '',
    durationMs: 1,
    isAborted: false,
    turnId,
    reason: 'answer',
    ...(agentId === undefined ? {} : { agentId }),
  })

const chipTexts = async (ui: Pick<Mounted, 'findAll'>) =>
  (await ui.findAll({ type: 'Text' })).map(t => t.text).filter(t => t.startsWith('· steer'))

// Asks, then presses [✓] on the proposal the answer carries; the proposal is the 2nd turn written.
const holdOne = async (
  clock: MockClock,
  ui: Pick<Mounted<'terminal'>, 'findAll' | 'input' | 'press'>,
  question: string,
  index: number,
) => {
  await ask(clock, ui, question)
  await ui.press({ key: `proposal:${index}` })
  await clock.settle()
}

describe('heldSteers', () => {
  const three = withStatus(
    withStatus(holdSteer(holdSteer(holdSteer(NO_HELD_STEERS, 'a'), 'b'), 'c'), 'h1', 'sent'),
    'h2',
    'sending',
  )
  test('nothing is picked while one is out, then the oldest held', () => {
    expect(nextToSend(three)).toBeUndefined()
    expect(nextToSend(withStatus(three, 'h2', 'sent'))?.id).toBe('h3')
  })
  test('only a held steer can be withdrawn, and a withdrawn id is never reissued', () => {
    expect(withdrawHeld(three, 'h2')).toEqual({ error: 'steer h2 was already sent and cannot be withdrawn' })
    const withdrawn = withdrawHeld(three, 'h3')
    if ('error' in withdrawn) throw new Error(withdrawn.error)
    expect(holdSteer(withdrawn, 'd').steers.at(-1)?.id).toBe('h4')
  })
  test('a reload keeps sent steers, and says a sending one may have gone', () => {
    expect(dropOnReload(three)).toEqual({
      kept: { issued: 3, steers: [{ id: 'h1', text: 'a', status: 'sent' }] },
      lines: ['steer may have been sent (the mod reloaded): b', 'steer dropped (the mod reloaded): c'],
    })
  })
})

test('with the main thread idle, [✓] submits the steer text as a prompt at once and the chip reads sent', async ($, on) => {
  const { clock, submits, toasts, entries, chat } = world(on)
  await start($)
  const ui = await mountPane($)
  await holdOne(clock, ui, 'also test the empty case', 1)
  expect(submits).toEqual([NOTE_TEXT])
  expect(await chipTexts(ui)).toEqual([SENT])
  expect(await ui.find({ key: 'withdraw-held:h1' })).toBeUndefined()
  expect(chat().findLast(t => t.role === 'fork')?.isProposalTaken).toBe(true)
  expect(Object.keys(entries).filter(k => k.startsWith('inbox:'))).toEqual([])
  expect(toasts).toEqual([])
})

test('while the main thread is busy the steer is held, then submitted when its turn completes', async ($, on) => {
  const { clock, submits } = world(on)
  await start($)
  await turnStart($, 't1')
  const ui = await mountPane($)
  await holdOne(clock, ui, 'also test the empty case', 1)
  expect(submits).toEqual([])
  expect(await chipTexts(ui)).toEqual([HELD])
  expect((await ui.find({ key: 'withdraw-held:h1' }))?.props.label).toBe('x')

  await turnEnd($, 't1')
  await clock.settle()
  expect(submits).toEqual([NOTE_TEXT])
  expect(await chipTexts(ui)).toEqual([SENT])
  expect(await ui.find({ key: 'withdraw-held:h1' })).toBeUndefined()
})

test("a subagent's turn completing is not an idle point", async ($, on) => {
  const { clock, submits } = world(on)
  await start($)
  await turnStart($, 't1')
  const ui = await mountPane($)
  await holdOne(clock, ui, 'also test the empty case', 1)
  await turnEnd($, 'a-turn', 'agent-1')
  await clock.settle()
  expect(submits).toEqual([])
  expect(await chipTexts(ui)).toEqual([HELD])
})

test('several held steers are submitted one per idle point, in order', async ($, on) => {
  const { clock, submits, state } = world(on)
  await start($)
  await turnStart($, 't1')
  const ui = await mountPane($)
  await holdOne(clock, ui, 'also test the empty case', 1)
  state.forkReply = answered(`Also.\nNOTE: ${OTHER_TEXT}`)
  await holdOne(clock, ui, 'and rename it', 4)
  expect(await chipTexts(ui)).toEqual([HELD, `· steer → next turn: ${OTHER_TEXT}`])

  await turnEnd($, 't1')
  await clock.settle()
  expect(submits).toEqual([NOTE_TEXT])
  // The submitted steer's own turn runs; its end is the next idle point.
  await turnStart($, 't2')
  await turnEnd($, 't2')
  await clock.settle()
  expect(submits).toEqual([NOTE_TEXT, OTHER_TEXT])
  expect(await chipTexts(ui)).toEqual([SENT, `· steered → sent: ${OTHER_TEXT}`])
})

test('[x] withdraws a held steer, which is then never submitted', async ($, on) => {
  const { clock, submits } = world(on)
  await start($)
  await turnStart($, 't1')
  const ui = await mountPane($)
  await holdOne(clock, ui, 'also test the empty case', 1)
  await ui.press({ key: 'withdraw-held:h1' })
  expect(await chipTexts(ui)).toEqual([])
  await turnEnd($, 't1')
  await clock.settle()
  expect(submits).toEqual([])
})

test('a reload drops held steers, each with a chat line', async ($, on) => {
  const { clock, submits, chat } = world(on)
  await start($)
  await turnStart($, 't1')
  const ui = await mountPane($)
  await holdOne(clock, ui, 'also test the empty case', 1)
  await start($)
  expect(chat().at(-1)).toEqual({ role: 'error', text: `steer dropped (the mod reloaded): ${NOTE_TEXT}` })
  expect(await chipTexts(ui)).toEqual([])
  await turnEnd($, 't1')
  await clock.settle()
  expect(submits).toEqual([])
})

test('a dropped submit is a chat line naming the reason, and the steer stays held for the next idle point', async ($, on) => {
  const { clock, submits, state, chat } = world(on)
  state.submitWith = () => ({ drop: 'blocked by a prompt hook' })
  await start($)
  const ui = await mountPane($)
  await holdOne(clock, ui, 'also test the empty case', 1)
  expect(submits).toEqual([NOTE_TEXT])
  expect(chat().at(-1)).toEqual({ role: 'error', text: `steer: not sent (blocked by a prompt hook): ${NOTE_TEXT}` })
  expect(await chipTexts(ui)).toEqual([HELD])
  expect(await ui.find({ key: 'withdraw-held:h1' })).toBeDefined()

  state.submitWith = text => ({ text })
  await turnStart($, 't1')
  await turnEnd($, 't1')
  await clock.settle()
  expect(submits).toEqual([NOTE_TEXT, NOTE_TEXT])
  expect(await chipTexts(ui)).toEqual([SENT])
})

// `prompt.submit` has no deny arm (a refusal is a `drop`), and a throwing test hook is only
// skipped, so the rejection is the kit's own: the submit passed on to a bottom nothing answers.
test('a rejected submit is a chat line naming the error, and the steer stays held', async ($, on) => {
  const { clock, state, chat } = world(on)
  state.isUnanswered = true
  await start($)
  const ui = await mountPane($)
  await holdOne(clock, ui, 'also test the empty case', 1)
  const line = chat().at(-1)
  expect(line?.role).toBe('error')
  expect(line?.text).toContain('steer: not sent (')
  expect(line?.text).toContain('no implementation for prompt.submit')
  expect(line?.text.endsWith(`): ${NOTE_TEXT}`)).toBe(true)
  expect(await chipTexts(ui)).toEqual([HELD])
})

const inboxNotes = (entries: Record<string, unknown>) =>
  ((entries['inbox:' + PLAN_PATH] as { notes: { text: string; deliveredAt?: number }[] } | undefined)?.notes ?? [])

// The plan's steer, released to the main thread when no checkpoint took it.
const RELEASED = `[fault-export T2] ${NOTE_TEXT}`

test('in plan mode, while the main thread works, [✓] queues the inbox note and submits nothing', async ($, on) => {
  const { clock, submits, entries } = world(on)
  await start($)
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  await turnStart($, 't1')
  const ui = await mountPane($)
  await holdOne(clock, ui, 'also test the empty case', 1)
  expect(submits).toEqual([])
  expect(inboxNotes(entries).map(n => n.text)).toEqual([NOTE_TEXT])
  expect(await chipTexts(ui)).toEqual([`· steer → T2: ${NOTE_TEXT}`])
})

test('in plan mode a steer no checkpoint took is submitted when the main turn ends', async ($, on) => {
  const { clock, submits, entries } = world(on)
  await start($)
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  await turnStart($, 't1')
  const ui = await mountPane($)
  await holdOne(clock, ui, 'also test the empty case', 1)

  await turnEnd($, 't1')
  await clock.settle()
  expect(submits).toEqual([RELEASED])
  // Out of the inbox, so a later checkpoint can't deliver it a second time.
  expect(inboxNotes(entries)).toEqual([])
  expect(await chipTexts(ui)).toEqual([`· steered → sent: ${RELEASED}`])
})

test('in plan mode with the main thread idle, [✓] submits the steer at once', async ($, on) => {
  const { clock, submits, entries } = world(on)
  await start($)
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  const ui = await mountPane($)
  await holdOne(clock, ui, 'also test the empty case', 1)
  expect(submits).toEqual([RELEASED])
  expect(inboxNotes(entries)).toEqual([])
})

test('in plan mode a steer a checkpoint took is not submitted again at the turn end', async ($, on) => {
  const { clock, submits, entries } = world(on)
  await start($)
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  await turnStart($, 't1')
  const ui = await mountPane($)
  await holdOne(clock, ui, 'also test the empty case', 1)
  const delivered = JSON.parse(String((await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })).result))
  expect(delivered.notes.map((n: { text: string }) => n.text)).toEqual([NOTE_TEXT])

  await turnEnd($, 't1')
  await clock.settle()
  expect(submits).toEqual([])
  expect(inboxNotes(entries)).toHaveLength(1)
  expect(inboxNotes(entries)[0]?.deliveredAt).toBeDefined()
})

test('in plan mode several steers no checkpoint took are submitted one per idle point, in order', async ($, on) => {
  const { clock, submits, state, entries } = world(on)
  await start($)
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  await turnStart($, 't1')
  const ui = await mountPane($)
  await holdOne(clock, ui, 'also test the empty case', 1)
  state.forkReply = answered(`Also.\nNOTE: ${OTHER_TEXT}`)
  await holdOne(clock, ui, 'and rename it', 4)
  expect(inboxNotes(entries).map(n => n.text)).toEqual([NOTE_TEXT, OTHER_TEXT])

  await turnEnd($, 't1')
  await clock.settle()
  // One leaves the inbox per idle point: the rest stay in the store, which a reload keeps.
  expect(inboxNotes(entries).map(n => n.text)).toEqual([OTHER_TEXT])
  expect(submits).toEqual([RELEASED])
  await turnStart($, 't2')
  await turnEnd($, 't2')
  await clock.settle()
  expect(inboxNotes(entries)).toEqual([])
  expect(submits).toEqual([RELEASED, `[fault-export T2] ${OTHER_TEXT}`])
})

// Esc on an `/implement` run is no idle point for its steers: they wait for the next run's checkpoint.
test('in plan mode an aborted main turn releases no steer', async ($, on) => {
  const { clock, submits, entries } = world(on)
  await start($)
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  await turnStart($, 't1')
  const ui = await mountPane($)
  await holdOne(clock, ui, 'also test the empty case', 1)

  await $.turn.complete({ answer: '', durationMs: 1, isAborted: true, turnId: 't1', reason: 'aborted' })
  await clock.settle()
  expect(submits).toEqual([])
  expect(inboxNotes(entries).map(n => n.text)).toEqual([NOTE_TEXT])
  expect(await chipTexts(ui)).toEqual([`· steer → T2: ${NOTE_TEXT}`])
})

test('in plan mode [x] withdraws a queued steer, which is then never submitted at the turn end', async ($, on) => {
  const { clock, submits, entries } = world(on)
  await start($)
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  await turnStart($, 't1')
  const ui = await mountPane($)
  await holdOne(clock, ui, 'also test the empty case', 1)
  expect(inboxNotes(entries).map(n => n.text)).toEqual([NOTE_TEXT])

  await ui.press({ key: 'withdraw:n1' })
  expect(inboxNotes(entries)).toEqual([])
  expect(await chipTexts(ui)).toEqual([])
  await turnEnd($, 't1')
  await clock.settle()
  expect(submits).toEqual([])
})

// An answer no checkpoint took is released like a steer: marked delivered in the inbox, so `applied`
// still knows its id, and submitted to the idle main thread.
const ASK = 'mcp__side-chat__ask'
const ANSWER_RELEASED = '[fault-export T2] Answer to q1, "Ship the exporter?": Not yet'

const askOne = ($: Engine) =>
  $.tool.call({
    tool: ASK,
    planPath: PLAN_PATH,
    task: '2',
    question: 'Ship the exporter?',
    options: ['Ship it', 'Not yet'],
    defaultOption: 'Ship it',
    loadBearing: false,
  })

const checkpointWith = async ($: Engine, applied: { id: string; outcome: string }[] = []) =>
  $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH, applied })

test('in plan mode with the main thread idle, an answer is submitted at once and no checkpoint delivers it again', async ($, on) => {
  const { clock, submits, toasts } = world(on)
  await start($)
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  await askOne($)
  const ui = await mountPane($)
  await ui.press({ key: 'answer:q1:1' })
  await clock.settle()
  expect(submits).toEqual([ANSWER_RELEASED])
  // The answer turn is its record: no steer chip is drawn for it.
  expect(await chipTexts(ui)).toEqual([])

  const later = await checkpointWith($, [{ id: 'q1', outcome: 'kept the exporter back' }])
  expect(later.deny).toBeUndefined()
  expect(JSON.parse(String(later.result))).toEqual({ notes: [], answers: [] })
  expect(toasts).toEqual(['side chat: question on T2'])
})

test('in plan mode an answer given while the main thread works is submitted when its turn ends', async ($, on) => {
  const { clock, submits } = world(on)
  await start($)
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  await turnStart($, 't1')
  await askOne($)
  const ui = await mountPane($)
  await ui.press({ key: 'answer:q1:1' })
  await clock.settle()
  expect(submits).toEqual([])

  await turnEnd($, 't1')
  await clock.settle()
  expect(submits).toEqual([ANSWER_RELEASED])
})

test('in plan mode an answer a checkpoint took is not submitted at the turn end', async ($, on) => {
  const { clock, submits } = world(on)
  await start($)
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  await turnStart($, 't1')
  await askOne($)
  const ui = await mountPane($)
  await ui.press({ key: 'answer:q1:1' })
  await clock.settle()
  const delivered = JSON.parse(String((await checkpointWith($)).result))
  expect(delivered.answers.map((a: { answer: string }) => a.answer)).toEqual(['Not yet'])

  await turnEnd($, 't1')
  await clock.settle()
  expect(submits).toEqual([])
})

test('with no plan, [Steer] on the typed text submits it as a prompt at once when the main thread is idle', async ($, on) => {
  const { clock, submits } = world(on)
  await start($)
  const ui = await mountPane($)
  const key = (await chatInput(ui))?.key ?? 'no chat Input drawn'
  await ui.input({ key, text: `  ${NOTE_TEXT} `, kind: 'change' })
  await ui.press({ key: 'steer-typed' })
  await clock.settle()
  expect(submits).toEqual([NOTE_TEXT])
  expect(await chipTexts(ui)).toEqual([SENT])
})

test('with no plan a held steer chip sits in the history where it was taken, before later questions', async ($, on) => {
  const { clock, state } = world(on)
  await start($)
  await turnStart($, 't1')
  const ui = await mountPane($)
  await holdOne(clock, ui, 'also test the empty case', 1)
  state.forkReply = answered('Later answer.')
  await ask(clock, ui, 'and later')
  const texts = (await ui.findAll({ type: 'Text' })).map(t => t.text)
  const chip = texts.indexOf(HELD)
  expect(chip).toBeGreaterThan(texts.indexOf('also test the empty case'))
  expect(chip).toBeLessThan(texts.indexOf('and later'))
})
