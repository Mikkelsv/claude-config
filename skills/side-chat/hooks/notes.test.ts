import type { ModelForkResult, On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock, Mounted } from 'claude-code/testing'

const PLUGIN = 'side-chat'
const PANE = 'side-chat'
const CHECKPOINT = 'mcp__side-chat__checkpoint'
const PLAN_PATH = 'C:/work/plans/fault-export.md'
const SESSION_ID = '3f1c2b9e-7a44-4d1e-9b0a-5c6d7e8f9a01'
const CHAT_KEY = 'chat:' + SESSION_ID
const INBOX_KEY = 'inbox:' + PLAN_PATH
const FORK_DELAY = 1000

const block = (heading: string, isDone: boolean) => `### ${heading}

- [${isDone ? 'x' : ' '}] Done
`

const PLAN = `# Plan: fault-export

## Tasks

${block('Task 1: Parser', true)}
${block('Task 2: Band', false)}
${block('Task 3: Store', false)}
## Decisions & Review Items
`

const DONE_PLAN = PLAN.replaceAll('- [ ] Done', '- [x] Done')

const PANE_PROPS = {
  title: 'fault-export Side chat',
  isFocused: false,
  bodyColumns: 40,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
}

const BAND_PROPS = {
  hasSurvey: false,
  isWorking: true,
  maxRows: 10,
  bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

const answered = (text: string): ModelForkResult => ({ isAnswered: true, text, usage: USAGE })

type Note = { id: string; text: string; targetTask: string; deliveredAt?: number; outcome?: string }
type Turn = { role: string; text: string; proposedNote?: string; isProposalTaken?: boolean }

// The world beneath, as chat.test.ts's: plan files from a map, the store answered from `entries`
// (the test's `$` has no store noun) and `$.model.fork` answered after FORK_DELAY with `forkReply`.
const world = (on: On, files: Record<string, string> = { [PLAN_PATH]: PLAN }) => {
  const toasts: string[] = []
  const forks: string[] = []
  const entries: Record<string, unknown> = {}
  const state = { forkReply: answered('Plain answer.') }
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
  on('fs.read', ($, e) => {
    const text = files[e.path.replaceAll('\\', '/')]
    return text === undefined ? { deny: `ENOENT: ${e.path}` } : { value: text }
  })
  on('fs.exists', ($, e) => ({ value: files[e.path.replaceAll('\\', '/')] !== undefined }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('model.fork', async ($, e) => {
    forks.push(e.prompt)
    await clock.sleep(FORK_DELAY)
    return { value: state.forkReply }
  })
  const chat = () => (entries[CHAT_KEY] as { turns: Turn[] } | undefined)?.turns ?? []
  const notes = () => (entries[INBOX_KEY] as { notes: Note[] } | undefined)?.notes ?? []
  return { toasts, forks, entries, state, clock, chat, notes }
}

// Inside a main turn, as an `/implement` run is: an idle main thread is handed queued steers.
const begin = async ($: Engine) => {
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  await $.turn.start({ text: '/implement', turnId: 'implement' })
}

const mountPane = ($: Engine) =>
  $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane' as const, requestId: PANE, props: PANE_PROPS })

// The chat Input takes a fresh key per submitted question, so it is found by its placeholder.
const chatInput = async (ui: Pick<Mounted, 'findAll'>) =>
  (await ui.findAll({ type: 'Input' })).find(i => i.props.placeholder === 'ask or steer…')

const typeChat = async (ui: Pick<Mounted<'terminal' | 'desktop'>, 'findAll' | 'input'>, text: string) =>
  ui.input({ key: (await chatInput(ui))?.key ?? 'no chat Input drawn', text })

const askAndAnswer = async ($: Engine, clock: MockClock, text: string) => {
  const ui = await mountPane($)
  await typeChat(ui, text)
  await clock.settle()
  await clock.advance(FORK_DELAY)
  return ui
}

const bandText = async ($: Engine) => {
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
  const text = (await ui.find({ type: 'Text', text: 'fault-export' }))?.text
  await ui.unmount()
  return text
}

const STEER = 'Worth it: the empty cloud is untested.\nNOTE: add a test for the empty fault cloud'
const NOTE_TEXT = 'add a test for the empty fault cloud'
const STEER_LINE = `Steer: ${NOTE_TEXT}`

const steerLines = async (ui: Pick<Mounted, 'findAll'>) =>
  (await ui.findAll({ type: 'Text' })).map(t => t.text).filter(t => t.startsWith('Steer: '))

// Two steers queued through two proposals: one ask each, ✓ on each.
const queueTwo = async ($: Engine, clock: MockClock, state: { forkReply: ModelForkResult }) => {
  state.forkReply = answered(STEER)
  const ui = await askAndAnswer($, clock, 'skip the cache')
  await ui.press({ key: 'proposal:1' })
  await typeChat(ui, 'and again')
  await clock.settle()
  await clock.advance(FORK_DELAY)
  await ui.press({ key: 'proposal:4' })
  return ui
}

test('the fork instruction asks for a NOTE line of at most 20 words on a steer or an uncovered bug, risk or change', async ($, on) => {
  const { forks, clock } = world(on)
  await begin($)
  await askAndAnswer($, clock, 'why?')
  expect(forks[0]).toContain('NOTE: ')
  expect(forks[0]).toContain('steering request')
  // Not only on explicit steering: a question that uncovers something actionable proposes too.
  expect(forks[0]).toContain('uncovers a bug, a risk, or a change worth making to the plan or the work')
  expect(forks[0]).toContain('even if the user only asked a question')
  expect(forks[0]).toContain('A plain question with nothing actionable gets no such line')
  expect(forks[0]).toContain('one imperative sentence of at most 20 words')
  // The fork only proposes: it must not promise to queue the steer or to act on it itself.
  expect(forks[0]).toContain('You cannot act, queue a steer, or message the main thread')
  expect(forks[0]).toContain('confirm with ✓')
  // Both deliveries, since the instruction can't know the mod's mode: inbox in a plan, prompt otherwise.
  expect(forks[0]).toContain('during an /implement run it is applied at the next task boundary')
  expect(forks[0]).toContain('otherwise it is sent to the main thread as a prompt once it is idle')
})

test('a fork reply ending in a NOTE line is drawn without it, with a steer proposal', async ($, on) => {
  const { clock, chat, state } = world(on)
  state.forkReply = answered(STEER)
  await begin($)
  const ui = await askAndAnswer($, clock, 'also test the empty case')
  expect((await ui.find({ type: 'Markdown' }))?.props.text).toBe('Worth it: the empty cloud is untested.')
  expect(await steerLines(ui)).toEqual([STEER_LINE])
  expect(await ui.find({ key: 'proposal:1' })).toBeDefined()
  expect(chat().at(-1)).toEqual({ role: 'fork', text: 'Worth it: the empty cloud is untested.', proposedNote: NOTE_TEXT, contextTokens: 1, reusedTokens: 0 })
})

test('a fork reply that is only a NOTE line draws a dim placeholder, not an empty Markdown', async ($, on) => {
  const { clock, state } = world(on)
  state.forkReply = answered(`NOTE: ${NOTE_TEXT}`)
  await begin($)
  const ui = await askAndAnswer($, clock, 'also test the empty case')
  expect(await ui.find({ type: 'Markdown' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '(proposed a steer)' })).toBeDefined()
  expect(await ui.find({ key: 'proposal:1' })).toBeDefined()
})

for (const [name, reply] of [
  ['no NOTE line', 'Plain answer.'],
  ['an empty NOTE line', 'Plain answer.\nNOTE:'],
  ['an empty NOTE line with spaces', 'Plain answer.\nNOTE:   '],
  ['a NOTE line mid-answer', 'Plain answer.\nNOTE: add a test\nMore prose after it.'],
  ['a lower-case note line', 'Plain answer.\nnote: add a test'],
] as const) {
  test(`a fork reply with ${name} is drawn as-is, with no proposal`, async ($, on) => {
    const { clock, chat, state } = world(on)
    state.forkReply = answered(reply)
    await begin($)
    const ui = await askAndAnswer($, clock, 'why?')
    expect((await ui.find({ type: 'Markdown' }))?.props.text).toBe(reply)
    expect(await steerLines(ui)).toEqual([])
    expect(chat().at(-1)).toEqual({ role: 'fork', text: reply, contextTokens: 1, reusedTokens: 0 })
  })
}

test('[✓] queues the steer on the first not-done task, drops the proposal and counts it on the band', async ($, on) => {
  const { clock, chat, notes, state } = world(on)
  state.forkReply = answered(STEER)
  await begin($)
  const ui = await askAndAnswer($, clock, 'also test the empty case')
  await ui.press({ key: 'proposal:1' })
  expect(notes()).toEqual([{ id: 'n1', text: NOTE_TEXT, targetTask: '2' }])
  expect(await steerLines(ui)).toEqual([])
  expect(await ui.find({ type: 'Text', text: `· steer → T2: ${NOTE_TEXT}` })).toBeDefined()
  expect(await ui.find({ key: 'withdraw:n1' })).toBeDefined()
  expect(chat().findLast(t => t.role === 'fork')?.isProposalTaken).toBe(true)
  await ui.unmount()

  const again = await mountPane($)
  expect(await steerLines(again)).toEqual([])
  expect(await bandText($)).toBe('fault-export ▓▓▓░░░░░░░ 1/3 · T2 running · 1 steer')
})

test('the band shows open questions and undelivered steers together', async ($, on) => {
  const { clock, state } = world(on)
  state.forkReply = answered(STEER)
  await begin($)
  const ui = await askAndAnswer($, clock, 'also test the empty case')
  await ui.press({ key: 'proposal:1' })
  await $.tool.call({
    tool: 'mcp__side-chat__ask',
    planPath: PLAN_PATH,
    task: '2',
    question: 'Reuse ColorMap?',
    options: ['reuse', 'new'],
    defaultOption: 'reuse',
    loadBearing: false,
  })
  expect(await bandText($)).toBe('fault-export ▓▓▓░░░░░░░ 1/3 · T2 running · 1Q · 1 steer')
})

test('no [→ note] button is drawn, before or after a message', async ($, on) => {
  const { clock } = world(on)
  await begin($)
  const empty = await mountPane($)
  expect(await empty.find({ key: 'to-note' })).toBeUndefined()
  await empty.unmount()
  const ui = await askAndAnswer($, clock, 'rename greet to formatGreeting')
  expect(await ui.find({ key: 'to-note' })).toBeUndefined()
  expect((await ui.findAll({ type: 'Button' })).map(b => b.props.label)).not.toContain('→ note')
})

test('[x] withdraws an undelivered steer, and the band count goes with it', async ($, on) => {
  const { clock, notes, state } = world(on)
  await begin($)
  const ui = await queueTwo($, clock, state)
  expect(await bandText($)).toBe('fault-export ▓▓▓░░░░░░░ 1/3 · T2 running · 2 steers')
  await ui.press({ key: 'withdraw:n1' })
  expect(notes().map(n => n.id)).toEqual(['n2'])
  expect(await ui.find({ key: 'withdraw:n1' })).toBeUndefined()
  expect(await bandText($)).toBe('fault-export ▓▓▓░░░░░░░ 1/3 · T2 running · 1 steer')
})

test('[x] on a steer delivered since the chip was drawn is refused with a toast', async ($, on) => {
  const { clock, notes, entries, toasts, state } = world(on)
  state.forkReply = answered(STEER)
  await begin($)
  const ui = await askAndAnswer($, clock, 'skip the cache')
  await ui.press({ key: 'proposal:1' })
  // Delivered behind the pane's back: no version bump, so the stale chip is still drawn.
  const inbox = entries[INBOX_KEY] as { notes: Note[] }
  inbox.notes = inbox.notes.map(n => ({ ...n, deliveredAt: 6000 }))
  await ui.press({ key: 'withdraw:n1' })
  expect(toasts).toEqual(['side chat: steer n1 was already delivered and cannot be withdrawn'])
  expect(notes()).toHaveLength(1)
})

test('a delivered steer drops its [x], then shows the outcome checkpoint recorded', async ($, on) => {
  const { clock, state } = world(on)
  state.forkReply = answered(STEER)
  await begin($)
  const ui = await askAndAnswer($, clock, 'skip the cache')
  await ui.press({ key: 'proposal:1' })

  const delivered = await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  expect(JSON.parse(String(delivered.result)).notes).toEqual([{ id: 'n1', text: NOTE_TEXT, targetTask: '2' }])
  expect(await ui.find({ type: 'Text', text: `· steered → T2: ${NOTE_TEXT}` })).toBeDefined()
  expect(await ui.find({ key: 'withdraw:n1' })).toBeUndefined()
  expect(await bandText($)).toBe('fault-export ▓▓▓░░░░░░░ 1/3 · T2 running')

  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH, applied: [{ id: 'n1', outcome: 'amended Task 2' }] })
  expect(await ui.find({ type: 'Text', text: `· steered → T2: ${NOTE_TEXT} · amended Task 2` })).toBeDefined()
})

test('a queue press from a pane drawn for a plan no longer active is refused with a toast', async ($, on) => {
  const OTHER_PATH = 'C:/work/plans/other.md'
  const { clock, chat, notes, entries, state, toasts } = world(on, { [PLAN_PATH]: PLAN, [OTHER_PATH]: PLAN })
  state.forkReply = answered(STEER)
  // Another plan checkpoints between the drawing and the press, so the pressed closure is stale.
  const stale = { isArmed: false }
  on('ui.press', async (_, e, next) => {
    if (stale.isArmed) await $.tool.call({ tool: CHECKPOINT, planPath: OTHER_PATH })
    return next(e)
  })
  await begin($)
  const ui = await askAndAnswer($, clock, 'also test the empty case')
  stale.isArmed = true
  await ui.press({ key: 'proposal:1' })
  expect(toasts).toEqual([`side chat: ${PLAN_PATH} is no longer the active plan`])
  expect(notes()).toEqual([])
  expect(entries['inbox:' + OTHER_PATH]).toBeUndefined()
  expect(chat().at(-1)?.isProposalTaken).toBeUndefined()
})

// An all-done plan is session mode: the steer is held for the main thread (held.test.ts), not queued.
test('an all-done plan holds the [✓] steer, queues no inbox note, and the idle session takes it', async ($, on) => {
  const { clock, entries, state, toasts, chat } = world(on, { [PLAN_PATH]: DONE_PLAN })
  const submits: string[] = []
  on('prompt.submit', ($, e) => {
    submits.push(e.text)
    return { text: e.text }
  })
  on('turn.complete', ($, e) => ({ text: e.answer }))
  state.forkReply = answered(STEER)
  await begin($)
  // The `/implement` run that finished the plan has ended, so the session is idle.
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 'implement', reason: 'answer' })
  const ui = await askAndAnswer($, clock, 'also test the empty case')
  await ui.press({ key: 'proposal:1' })
  await clock.settle()
  expect(entries[INBOX_KEY]).toBeUndefined()
  expect(toasts).toEqual([])
  expect(submits).toEqual([NOTE_TEXT])
  expect(await ui.find({ type: 'Text', text: `· steered → sent: ${NOTE_TEXT}` })).toBeDefined()
  expect(chat().findLast(t => t.role === 'fork')?.isProposalTaken).toBe(true)
})

// A steer is part of the conversation: its chip sits where it was taken, not after the history.
test('a queued steer chip sits in the history where it was taken, before later questions', async ($, on) => {
  const { clock, state } = world(on)
  state.forkReply = answered(STEER)
  await begin($)
  const ui = await askAndAnswer($, clock, 'skip the cache')
  await ui.press({ key: 'proposal:1' })
  state.forkReply = answered('Later answer.')
  await typeChat(ui, 'and later')
  await clock.settle()
  await clock.advance(FORK_DELAY)
  const texts = (await ui.findAll({ type: 'Text' })).map(t => t.text)
  const chip = texts.indexOf(`· steer → T2: ${NOTE_TEXT}`)
  expect(chip).toBeGreaterThan(texts.indexOf('skip the cache'))
  expect(chip).toBeLessThan(texts.indexOf('and later'))
})
