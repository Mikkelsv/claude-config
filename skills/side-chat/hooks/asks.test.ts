import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock, Mounted } from 'claude-code/testing'

// The ask lifecycle's edges: a reload mid-fork, another plan checkpointing mid-fork, and a settle
// that itself fails. chat.test.ts covers the answered and failed arms; lookup.test.ts the look-up,
// including its reload.

const PLUGIN = 'side-chat'
const PANE = 'side-chat'
const CHECKPOINT = 'mcp__side-chat__checkpoint'
const PLAN_PATH = 'C:/work/plans/fault-export.md'
const OTHER_PATH = 'C:/work/plans/other.md'
const SESSION_ID = '3f1c2b9e-7a44-4d1e-9b0a-5c6d7e8f9a01'
const CHAT_KEY = 'chat:' + SESSION_ID
const FORK_DELAY = 1000

const PLAN = `# Plan: fault-export

## Tasks

### Task 1: Parser

- [x] Done

### Task 2: Band

- [ ] Done

## Decisions & Review Items
`

const PANE_PROPS = {
  title: 'fault-export Side chat',
  isFocused: false,
  bodyColumns: 40,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
}

const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

type Turn = { role: string; text: string }

// As chat.test.ts's world, plus `failChatWrites`: while set, a `chat:` store write is refused.
const world = (on: On) => {
  const toasts: string[] = []
  const entries: Record<string, unknown> = {}
  const state = { failChatWrites: false, failFork: false }
  const clock: MockClock = mock.clock(on, { now: 5000 })
  on('store.get', ($, e) => ({ value: entries[e.key] }))
  on('store.set', ($, e) => {
    if (state.failChatWrites && e.key === CHAT_KEY) return { deny: 'disk full' }
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
  const isPlan = (path: string) => [PLAN_PATH, OTHER_PATH].includes(path.replaceAll('\\', '/'))
  on('fs.read', ($, e) => (isPlan(e.path) ? { value: PLAN } : { deny: `ENOENT: ${e.path}` }))
  on('fs.exists', ($, e) => ({ value: isPlan(e.path) }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('model.fork', async () => {
    await clock.sleep(FORK_DELAY)
    if (state.failFork) return { deny: 'fork refused' }
    return { value: { isAnswered: true as const, text: 'An answer.', usage: USAGE } }
  })
  const chat = () => (entries[CHAT_KEY] as { turns: Turn[] } | undefined)?.turns ?? []
  return { toasts, state, clock, chat }
}

const begin = async ($: Engine) => {
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
}

const mountPane = ($: Engine) =>
  $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'Pane' as const, requestId: PANE, props: PANE_PROPS })

// The chat Input takes a fresh key per submitted question, so it is found by its placeholder.
const chatInput = async (ui: Pick<Mounted, 'findAll'>) =>
  (await ui.findAll({ type: 'Input' })).find(i => i.props.placeholder === 'ask or steer…')

const typeChat = async (ui: Pick<Mounted<'terminal' | 'desktop'>, 'findAll' | 'input'>, text: string) =>
  ui.input({ key: (await chatInput(ui))?.key ?? 'no chat Input drawn', text })

test('a fork cut by a reload is cleared with a line naming its kind', async ($, on) => {
  const { clock, chat } = world(on)
  await begin($)
  const ui = await mountPane($)
  await typeChat(ui, 'first?')
  await clock.settle()
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })
  expect(chat().at(-1)).toEqual({ role: 'error', text: 'fork: interrupted (the mod reloaded)' })
})

// The chat and `chatPending` are the session's, not a plan's: another plan checkpointing mid-fork
// keeps the ask, its …thinking line and its answer in the same history.
test('a checkpoint of another plan mid-fork keeps the …thinking line and the answer lands', async ($, on) => {
  const { clock, chat } = world(on)
  await begin($)
  const ui = await mountPane($)
  await typeChat(ui, 'first?')
  await clock.settle()
  expect(await ui.find({ type: 'Text', text: '…thinking' })).toBeDefined()

  await $.tool.call({ tool: CHECKPOINT, planPath: OTHER_PATH })
  expect(await ui.find({ type: 'Text', text: '…thinking' })).toBeDefined()

  await clock.advance(FORK_DELAY)
  await clock.settle()
  expect(chat().at(-1)).toEqual({ role: 'fork', text: 'An answer.', contextTokens: 1, reusedTokens: 0 })
})

// The fork call itself rejecting (not one of its result arms) is caught by startAsk's own catch.
test('a fork call that rejects draws a failed line, and the next ask is taken', async ($, on) => {
  const { clock, toasts, state, chat } = world(on)
  state.failFork = true
  await begin($)
  const ui = await mountPane($)
  await typeChat(ui, 'first?')
  await clock.settle()
  await clock.advance(FORK_DELAY)
  await clock.settle()
  const line = chat().at(-1)
  expect(line?.role).toBe('error')
  expect(line?.text.startsWith('fork: failed: ')).toBe(true)
  expect(line?.text).toContain('fork refused')
  expect(await ui.find({ type: 'Text', text: line?.text ?? '-' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '…thinking' })).toBeUndefined()

  state.failFork = false
  await typeChat(ui, 'second?')
  await clock.settle()
  expect(toasts).toEqual([])
  expect(chat().at(-1)).toEqual({ role: 'you', text: 'second?' })
})

test('an answer that cannot be recorded is toasted, and the next ask is taken', async ($, on) => {
  const { clock, toasts, state } = world(on)
  await begin($)
  const ui = await mountPane($)
  await typeChat(ui, 'first?')
  await clock.settle()
  state.failChatWrites = true
  await clock.advance(FORK_DELAY)
  await clock.settle()
  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toContain('side chat: fork: could not record the answer')
  expect(toasts[0]).toContain('disk full')
  expect(await ui.find({ type: 'Text', text: '…thinking' })).toBeUndefined()

  state.failChatWrites = false
  await typeChat(ui, 'second?')
  await clock.settle()
  expect(toasts).toHaveLength(1)
})
