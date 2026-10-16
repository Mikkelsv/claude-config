import type { ModelForkResult, On, ProcessRunResult } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock, Mounted } from 'claude-code/testing'

import { sweepChats } from './chatStore'
import type { PluginStore } from './inbox'
import { isPlanMode } from './planParser'

// The side chat without a plan: the slim band, the pane and the chat keyed by session, and the
// `chat:` sweep at session start. chat.test.ts covers the ask flow inside a plan.

const PLUGIN = 'side-chat'
const PANE = 'side-chat'
const CHECKPOINT = 'mcp__side-chat__checkpoint'
const SESSION_ID = '3f1c2b9e-7a44-4d1e-9b0a-5c6d7e8f9a01'
const CHAT_KEY = 'chat:' + SESSION_ID
const PLAN_PATH = 'C:/work/plans/fault-export.md'
const NOW = 5000
const FORK_DELAY = 1000
const PROCESS_DELAY = 7000
const EMPTY_TEXT = 'Ask about this session without interrupting it.'

const PLAN = `# Plan: fault-export

## Tasks

### Task 1: Parser

- [x] Done

### Task 2: Band

- [ ] Done

## Decisions & Review Items
`

const DONE_PLAN = PLAN.replaceAll('- [ ] Done', '- [x] Done')

const BAND_PROPS = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

const PANE_PROPS = {
  title: 'Side chat',
  isFocused: false,
  bodyColumns: 40,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
}

const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

type Turn = { role: string; text: string }
type Entry = { writtenAt: number; turns: Turn[] }

const ran = (stdout: string): ProcessRunResult => ({
  exitCode: 0,
  stdout,
  stderr: '',
  isStdoutTruncated: false,
  isStderrTruncated: false,
})

// The world beneath: a session with SESSION_ID, plan files from a map, the store answered from
// `entries`, the fork after FORK_DELAY and the look-up process after PROCESS_DELAY of mocked time.
const world = (on: On, files: Record<string, string> = {}) => {
  const toasts: string[] = []
  const opens: unknown[] = []
  const entries: Record<string, unknown> = {}
  const state = { forkReply: { isAnswered: true, text: 'It is idle.', usage: USAGE } as ModelForkResult }
  const clock: MockClock = mock.clock(on, { now: NOW })
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
  on('session.cwd', () => ({ value: 'C:/work' }))
  // Not in a repository, so the slim band and pane title read `Side chat` (band.test.tsx names one).
  on('session.repo', () => ({ value: null }))
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
  on('ui.open', ($, e) => {
    opens.push(e)
    return { value: { isPlaced: true as const } }
  })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine band</Text>
  })
  on('model.fork', async () => {
    await clock.sleep(FORK_DELAY)
    return { value: state.forkReply }
  })
  on('process.run', async () => {
    await clock.sleep(PROCESS_DELAY)
    return { value: ran('planParser.ts:11 holds it.\n') }
  })
  const chat = () => (entries[CHAT_KEY] as Entry | undefined)?.turns ?? []
  return { toasts, opens, entries, state, clock, chat }
}

const start = ($: Engine) => $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })

const mountBand = ($: Engine, surface: 'terminal' | 'desktop', props = BAND_PROPS) =>
  $.ui.mount({ plugin: PLUGIN, surface, component: 'AbovePrompt', props })

const mountPane = <P extends 'terminal' | 'desktop' | 'mobile'>($: Engine, surface: P) =>
  $.ui.mount({ plugin: PLUGIN, surface, component: 'Pane' as const, requestId: PANE, props: PANE_PROPS })

const chatInput = async (ui: Pick<Mounted, 'findAll'>) =>
  (await ui.findAll({ type: 'Input' })).find(i => i.props.placeholder === 'ask or steer…')

const ask = async (clock: MockClock, ui: Pick<Mounted<'terminal' | 'desktop'>, 'findAll' | 'input'>, text: string) => {
  await ui.input({ key: (await chatInput(ui))?.key ?? 'no chat Input drawn', text })
  await clock.settle()
  await clock.advance(FORK_DELAY)
}

// An in-memory store with the engine's JSON round-trip, for the pure sweep.
const memoryStore = (entries: Record<string, unknown>): PluginStore => ({
  get: async key => entries[key],
  set: async (key, value) => {
    entries[key] = JSON.parse(JSON.stringify(value))
  },
  delete: async key => {
    delete entries[key]
  },
  keys: async () => Object.keys(entries),
})

const sessionKey = (i: number) => `chat:00000000-0000-4000-8000-${String(i).padStart(12, '0')}`

describe('isPlanMode', () => {
  const plan = (isDone: boolean[]) => ({
    planPath: PLAN_PATH,
    plan: { title: 't', tasks: isDone.map((d, i) => ({ id: String(i + 1), title: 'x', isDone: d, isMilestone: false })) },
  })
  test('no plan is session mode', () => expect(isPlanMode(null)).toBe(false))
  test('a plan with a task not done is plan mode', () => expect(isPlanMode(plan([true, false]))).toBe(true))
  test('an all-done plan is session mode', () => expect(isPlanMode(plan([true, true]))).toBe(false))
})

describe('sweepChats', () => {
  test('deletes plan-keyed chats, and keeps the 20 most recently written session chats', async () => {
    const entries: Record<string, unknown> = { 'chat:C:/work/plans/old.md': [{ role: 'you', text: 'old' }], 'inbox:x': 1 }
    // Written out of key order, so the sweep must sort by writtenAt, not by key.
    for (const i of [5, 0, 21, 3, 1, 2, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) {
      entries[sessionKey(i)] = { writtenAt: 1000 + i, turns: [] }
    }
    const removed = await sweepChats(memoryStore(entries))
    expect(removed.sort()).toEqual(['chat:C:/work/plans/old.md', sessionKey(0), sessionKey(1)].sort())
    expect(Object.keys(entries).filter(k => k.startsWith('chat:'))).toHaveLength(20)
    expect(entries['inbox:x']).toBe(1)
  })

  test('deletes a session-keyed entry that carries no writtenAt, since this mod never wrote it', async () => {
    const entries: Record<string, unknown> = { [sessionKey(1)]: [{ role: 'you', text: 'x' }] }
    expect(await sweepChats(memoryStore(entries))).toEqual([sessionKey(1)])
  })
})

test('with no plan the band draws Side chat with [Open] and [–]', async ($, on) => {
  const { opens } = world(on)
  await start($)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountBand($, surface)
    expect(await ui.find({ text: 'engine band' })).toBeUndefined()
    expect((await ui.find({ type: 'Text', text: 'Side chat' }))?.text).toBe('Side chat')
    expect((await ui.find({ key: 'spar' }))?.props.label).toBe('Open')
    expect((await ui.find({ key: 'hide' }))?.props.label).toBe('–')
    await ui.press({ key: 'spar' })
    await ui.unmount()
  }
  const pane = { id: PANE, title: 'Side chat' }
  expect(opens).toEqual([pane, pane])
})

test('with no plan the band still yields to a survey', async ($, on) => {
  world(on)
  await start($)
  const ui = await mountBand($, 'terminal', { ...BAND_PROPS, hasSurvey: true })
  expect(await ui.find({ text: 'engine band' })).toBeDefined()
  expect(await ui.find({ key: 'spar' })).toBeUndefined()
})

test('a checkpointed plan keeps the progress band and adds [–]', async ($, on) => {
  world(on, { [PLAN_PATH]: PLAN })
  await start($)
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  const ui = await mountBand($, 'terminal')
  expect((await ui.find({ type: 'Text', text: 'fault-export' }))?.text).toBe('fault-export ▓▓▓▓▓░░░░░ 1/2 · T2 running')
  expect(await ui.find({ key: 'spar' })).toBeDefined()
  expect(await ui.find({ key: 'hide' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'Side chat' })).toBeUndefined()
})

// The buttons sit at the far right in both forms, so they keep their place when progress appears.
test('the band spreads its text left and [Open] [–] right, with or without a plan', async ($, on) => {
  world(on, { [PLAN_PATH]: PLAN })
  await start($)
  for (const isPlan of [false, true]) {
    if (isPlan) await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
    const ui = await mountBand($, 'desktop')
    const row = (await ui.findAll({ type: 'Box' })).find(b => b.props.justifyContent === 'space-between')
    expect(row?.props.flexDirection ?? 'row').toBe('row')
    const parts = (row?.children ?? []).filter(c => typeof c === 'object')
    expect(parts).toHaveLength(2)
    expect(JSON.stringify(parts[0])).toContain(isPlan ? 'fault-export' : 'Side chat')
    expect(JSON.stringify(parts[0])).not.toContain('"spar"')
    expect(JSON.stringify(parts[1])).toContain('"spar"')
    expect(JSON.stringify(parts[1])).toContain('"hide"')
    await ui.unmount()
  }
})

// Mode is derived: an all-done plan keeps its ✓ band but the pane is the session's.
test('an all-done plan keeps its ✓ band, and [Open] opens the session pane', async ($, on) => {
  const { opens } = world(on, { [PLAN_PATH]: DONE_PLAN })
  await start($)
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  const ui = await mountBand($, 'terminal')
  expect((await ui.find({ type: 'Text', text: 'fault-export' }))?.text).toBe('fault-export ✓ 2/2')
  await ui.press({ key: 'spar' })
  expect(opens).toEqual([{ id: PANE, title: 'Side chat' }])
  const pane = await mountPane($, 'terminal')
  expect(await pane.find({ type: 'Text', text: EMPTY_TEXT })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: 'T1 ✓ Parser' })).toBeUndefined()
})

test('with no plan the empty chat offers the session ask and the input, and no button but [Steer]', async ($, on) => {
  world(on)
  await start($)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountPane($, surface)
    expect((await ui.findAll({ type: 'Button' })).map(b => b.props.label)).toEqual(['➤ Steer'])
    expect(await ui.find({ type: 'Text', text: EMPTY_TEXT })).toBeDefined()
    expect(await chatInput(ui)).toBeDefined()
    await ui.unmount()
  }
})

test('with no plan a question is answered by the fork and stored under the session id', async ($, on) => {
  const { clock, chat, entries } = world(on)
  await start($)
  const ui = await mountPane($, 'terminal')
  await ui.input({ key: (await chatInput(ui))?.key ?? 'no chat Input drawn', text: 'what is it doing?' })
  await clock.settle()
  expect(await ui.find({ type: 'Text', text: '…thinking' })).toBeDefined()
  await clock.advance(FORK_DELAY)
  expect((await ui.find({ type: 'Markdown' }))?.props.text).toBe('It is idle.')
  expect(chat()).toEqual([
    { role: 'you', text: 'what is it doing?' },
    { role: 'fork', text: 'It is idle.', contextTokens: 1, reusedTokens: 0 },
  ])
  expect((entries[CHAT_KEY] as Entry).writtenAt).toBe(NOW + FORK_DELAY)
  expect(Object.keys(entries).filter(k => k.startsWith('chat:'))).toEqual([CHAT_KEY])
})

test('with no plan a LOOKUP reply runs the look-up and draws its answer', async ($, on) => {
  const { clock, chat, state } = world(on)
  state.forkReply = { isAnswered: true, text: 'LOOKUP: where is the regex?', usage: USAGE }
  await start($)
  const ui = await mountPane($, 'terminal')
  await ask(clock, ui, 'where is the regex?')
  expect(await ui.find({ type: 'Text', text: '· Looking it up in the code…' })).toBeDefined()
  await clock.advance(PROCESS_DELAY)
  expect(chat().at(-1)).toEqual({ role: 'lookup', text: 'planParser.ts:11 holds it.' })
})

test('with no plan the history keeps the last 50 turns', async ($, on) => {
  const { clock, chat, entries } = world(on)
  entries[CHAT_KEY] = { writtenAt: 1, turns: Array.from({ length: 49 }, (_, i) => ({ role: 'you', text: `old ${i}` })) }
  await start($)
  await ask(clock, await mountPane($, 'terminal'), 'newest?')
  expect(chat()).toHaveLength(50)
  expect(chat()[0]).toEqual({ role: 'you', text: 'old 1' })
})

test('with no plan an ask cut by a reload is cleared with a line under the session id', async ($, on) => {
  const { clock, chat } = world(on)
  await start($)
  const ui = await mountPane($, 'terminal')
  await ui.input({ key: (await chatInput(ui))?.key ?? 'no chat Input drawn', text: 'first?' })
  await clock.settle()
  await start($)
  expect(chat().at(-1)).toEqual({ role: 'error', text: 'fork: interrupted (the mod reloaded)' })
  expect(await ui.find({ type: 'Text', text: '…thinking' })).toBeUndefined()
})

// held.test.ts covers the held steer itself: busy, withdraw, reload and refusals.
test('with no plan [✓] on a proposal holds a steer, not an inbox note, and the idle session takes it', async ($, on) => {
  const { clock, toasts, state, entries } = world(on)
  const submits: string[] = []
  on('prompt.submit', ($, e) => {
    submits.push(e.text)
    return { text: e.text }
  })
  state.forkReply = { isAnswered: true, text: 'Worth it.\nNOTE: add a test', usage: USAGE }
  await start($)
  const ui = await mountPane($, 'terminal')
  await ask(clock, ui, 'also test it')
  await ui.press({ key: 'proposal:1' })
  await clock.settle()
  expect(toasts).toEqual([])
  expect(submits).toEqual(['add a test'])
  expect(await ui.find({ type: 'Text', text: '· steered → sent: add a test' })).toBeDefined()
  expect(Object.keys(entries).filter(k => k.startsWith('inbox:'))).toEqual([])
})

test('session start drops plan-keyed chats even when the plan file exists, and keeps session chats', async ($, on) => {
  const { entries } = world(on, { [PLAN_PATH]: PLAN })
  entries['chat:' + PLAN_PATH] = [{ role: 'you', text: 'old' }]
  entries[CHAT_KEY] = { writtenAt: 1, turns: [{ role: 'you', text: 'kept' }] }
  await start($)
  expect(entries['chat:' + PLAN_PATH]).toBeUndefined()
  expect(entries[CHAT_KEY]).toEqual({ writtenAt: 1, turns: [{ role: 'you', text: 'kept' }] })
})

test('session start keeps only the 20 most recently written session chats', async ($, on) => {
  const { entries } = world(on)
  for (let i = 0; i < 22; i++) entries[sessionKey(i)] = { writtenAt: 100 + i, turns: [] }
  await start($)
  expect(entries[sessionKey(0)]).toBeUndefined()
  expect(entries[sessionKey(1)]).toBeUndefined()
  expect(entries[sessionKey(2)]).toBeDefined()
  expect(Object.keys(entries).filter(k => k.startsWith('chat:'))).toHaveLength(20)
})

test('neither the plan-file sweep nor an all-done checkpoint touches the session chat', async ($, on) => {
  const files: Record<string, string> = { [PLAN_PATH]: DONE_PLAN }
  const { entries } = world(on, files)
  entries[CHAT_KEY] = { writtenAt: 1, turns: [{ role: 'you', text: 'stays' }] }
  await start($)
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  delete files[PLAN_PATH]
  await start($)
  expect(entries[CHAT_KEY]).toEqual({ writtenAt: 1, turns: [{ role: 'you', text: 'stays' }] })
})
