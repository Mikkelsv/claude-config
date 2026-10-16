import type { ModelForkResult, On, ProcessRunResult } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine, FoundElement, MockClock, Mounted } from 'claude-code/testing'

// The chat history's layout, after Claude's own transcript: the person's turns in a right-aligned
// bubble, answers left and unlabelled, look-ups and steers as `· ` activity lines. Only what is drawn
// and where is pinned; colours and spacing are judged by eye on the live surfaces.

const PLUGIN = 'side-chat'
const PANE = 'side-chat'
const CHECKPOINT = 'mcp__side-chat__checkpoint'
const PLAN_PATH = 'C:/work/plans/fault-export.md'
const SESSION_ID = '3f1c2b9e-7a44-4d1e-9b0a-5c6d7e8f9a01'
const CHAT_KEY = 'chat:' + SESSION_ID
const INBOX_KEY = 'inbox:' + PLAN_PATH
const FORK_DELAY = 1000
const PROCESS_DELAY = 7000
const LOOKING = '· Looking it up in the code…'
const LOOKED = '· Looked it up in the code'

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

const ran = (stdout: string): ProcessRunResult => ({
  exitCode: 0,
  stdout,
  stderr: '',
  isStdoutTruncated: false,
  isStderrTruncated: false,
})

type Turn = { role: string; text: string }

// The world beneath: the store from `entries`, the fork after FORK_DELAY and the look-up process
// after PROCESS_DELAY of mocked time.
const world = (on: On) => {
  const entries: Record<string, unknown> = {}
  const state = { forkReply: { isAnswered: true, text: 'It is **idle**.', usage: USAGE } as ModelForkResult }
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
  on('session.cwd', () => ({ value: 'C:/work' }))
  on('tool.register', ($, e) => ({ value: { tool: `mcp__${PLUGIN}__${e.name}` } }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('fs.read', ($, e) => (e.path.replaceAll('\\', '/') === PLAN_PATH ? { value: PLAN } : { deny: `ENOENT: ${e.path}` }))
  on('fs.exists', ($, e) => ({ value: e.path.replaceAll('\\', '/') === PLAN_PATH }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('model.fork', async () => {
    await clock.sleep(FORK_DELAY)
    return { value: state.forkReply }
  })
  on('process.run', async () => {
    await clock.sleep(PROCESS_DELAY)
    return { value: ran('planParser.ts:11 holds it.\n') }
  })
  const chat = () => (entries[CHAT_KEY] as { turns: Turn[] } | undefined)?.turns ?? []
  const seed = (turns: Turn[]) => {
    entries[CHAT_KEY] = { writtenAt: 1, turns }
  }
  return { entries, state, clock, chat, seed }
}

const begin = async ($: Engine) => {
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
}

const mountPane = <P extends 'terminal' | 'desktop' | 'mobile'>($: Engine, surface: P) =>
  $.ui.mount({ plugin: PLUGIN, surface, component: 'Pane' as const, requestId: PANE, props: PANE_PROPS })

const ask = async (ui: Pick<Mounted<'terminal' | 'desktop'>, 'findAll' | 'input'>, clock: MockClock, text: string) => {
  const input = (await ui.findAll({ type: 'Input' })).find(i => i.props.placeholder === 'ask or steer…')
  await ui.input({ key: input?.key ?? 'no chat Input drawn', text })
  await clock.settle()
}

const bubbles = async (ui: Pick<Mounted, 'findAll'>) =>
  (await ui.findAll({ type: 'Box' })).filter(b => b.props.alignSelf === 'flex-end')

const texts = async (ui: Pick<Mounted, 'findAll'>) => (await ui.findAll({ type: 'Text' })).map(t => t.text)

const textIn = (box: FoundElement | undefined) => JSON.stringify(box?.children ?? [])

// The person's turn and the answer around it, on every surface; mobile takes no typing, so draws
// no Input. The surface heads the pane with its own separator, so the pane draws no rule.
test("the person's turn is a right-aligned bubble and the answer left Markdown, unlabelled, on every surface", async ($, on) => {
  const { seed } = world(on)
  seed([
    { role: 'you', text: 'what is the main thread doing?' },
    { role: 'fork', text: 'It is **idle**.' },
  ])
  await begin($)
  for (const surface of ['terminal', 'desktop', 'mobile'] as const) {
    const ui = await mountPane($, surface)
    const [bubble, ...rest] = await bubbles(ui)
    expect(rest).toEqual([])
    expect(textIn(bubble)).toContain('what is the main thread doing?')
    expect(textIn(bubble)).not.toContain('idle')
    expect((await ui.find({ type: 'Markdown' }))?.props.text).toBe('It is **idle**.')
    expect((await texts(ui)).filter(t => t.includes('you:') || t.startsWith('fork'))).toEqual([])
    expect((await texts(ui)).filter(t => t.includes('─'))).toEqual([])
    expect((await ui.findAll({ type: 'Input' })).length > 0).toBe(surface !== 'mobile')
    await ui.unmount()
  }
})

test('a look-up shows an in-flight line, then an activity line over its Markdown answer', async ($, on) => {
  const { clock, chat, state } = world(on)
  state.forkReply = { isAnswered: true, text: 'LOOKUP: where is the regex?', usage: USAGE }
  await begin($)
  const ui = await mountPane($, 'desktop')
  await ask(ui, clock, 'where is the regex?')
  await clock.advance(FORK_DELAY)
  expect(await ui.find({ type: 'Text', text: LOOKING })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'looking it up…' })).toBeUndefined()
  await clock.advance(PROCESS_DELAY)
  expect(await ui.find({ type: 'Text', text: LOOKING })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: LOOKED })).toBeDefined()
  expect((await ui.findAll({ type: 'Markdown' })).map(m => m.props.text)).toEqual(['planParser.ts:11 holds it.'])
  expect((await texts(ui)).filter(t => t.includes('look-up'))).toEqual([])
  // The in-flight line is the pending state's, never a history turn.
  expect(chat()).toEqual([
    { role: 'you', text: 'where is the regex?' },
    { role: 'lookup', text: 'planParser.ts:11 holds it.' },
  ])
})

test('an error turn stays one line prefixed with its kind, outside any bubble', async ($, on) => {
  const { seed } = world(on)
  seed([
    { role: 'you', text: 'why?' },
    { role: 'error', text: 'fork: no answer (empty-reply): the model replied without text' },
  ])
  await begin($)
  const ui = await mountPane($, 'terminal')
  const line = await ui.find({ type: 'Text', text: 'fork: no answer (empty-reply)' })
  expect(line?.text.startsWith('fork: ')).toBe(true)
  expect(textIn((await bubbles(ui))[0])).not.toContain('empty-reply')
})

test('steer chips are activity lines starting with "· "', async ($, on) => {
  const { entries } = world(on)
  await begin($)
  entries[INBOX_KEY] = {
    questions: [],
    notes: [
      { id: 'n1', text: 'add a test', targetTask: '2' },
      { id: 'n2', text: 'skip the cache', targetTask: '2', deliveredAt: 6000, outcome: 'amended Task 2' },
    ],
    issued: 2,
  }
  const ui = await mountPane($, 'terminal')
  const held = await ui.find({ type: 'Text', text: 'steer → T2: add a test' })
  expect(held?.text).toBe('· steer → T2: add a test')
  expect(await ui.find({ key: 'withdraw:n1' })).toBeDefined()
  const sent = await ui.find({ type: 'Text', text: 'steered → T2: skip the cache' })
  expect(sent?.text).toBe('· steered → T2: skip the cache · amended Task 2')
})
