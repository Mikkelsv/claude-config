import type { ModelForkResult, On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock, Mounted } from 'claude-code/testing'

const PLUGIN = 'side-chat'
const PANE = 'side-chat'
const CHECKPOINT = 'mcp__side-chat__checkpoint'
const PLAN_PATH = 'C:/work/plans/fault-export.md'
const SESSION_ID = '3f1c2b9e-7a44-4d1e-9b0a-5c6d7e8f9a01'
const CHAT_KEY = 'chat:' + SESSION_ID
const FORK_DELAY = 1000

const block = (heading: string, isDone: boolean) => `### ${heading}

- [${isDone ? 'x' : ' '}] Done
`

const PLAN = `# Plan: fault-export

## Tasks

${block('Task 1: Parser', true)}
${block('Task 2: Band', false)}
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

const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

type Turn = { role: string; text: string }

// The world beneath: a bound session, plan files from a map, the store answered from `entries`
// (the test's `$` has no store noun), and `$.model.fork` answered after FORK_DELAY of mocked time
// with whatever `forkReply` holds. The look-up's process is lookup.test.ts's.
const world = (on: On, files: Record<string, string> = { [PLAN_PATH]: PLAN }) => {
  const toasts: string[] = []
  const forks: string[] = []
  const entries: Record<string, unknown> = {}
  const state = {
    forkReply: { isAnswered: true, text: 'Task 2 **measured** it.', usage: USAGE } as ModelForkResult,
  }
  const clock: MockClock = mock.clock(on, { now: 5000 })
  const session = mock.session(on)
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
  on('model.fork', async ($, e) => {
    forks.push(e.prompt)
    await clock.sleep(FORK_DELAY)
    return { value: state.forkReply }
  })
  const chat = () => (entries[CHAT_KEY] as { turns: Turn[] } | undefined)?.turns ?? []
  return { toasts, forks, entries, state, clock, session, chat }
}

const begin = async ($: Engine) => {
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
}

const mountPane = <P extends 'terminal' | 'desktop' | 'mobile'>($: Engine, surface: P) =>
  $.ui.mount({ plugin: PLUGIN, surface, component: 'Pane' as const, requestId: PANE, props: PANE_PROPS })

// The chat Input takes a fresh key per submitted question, so it is found by its placeholder.
const chatInput = async (ui: Pick<Mounted, 'findAll'>) =>
  (await ui.findAll({ type: 'Input' })).find(i => i.props.placeholder === 'ask or steer…')

const typeChat = async (ui: Pick<Mounted<'terminal' | 'desktop'>, 'findAll' | 'input'>, text: string) =>
  ui.input({ key: (await chatInput(ui))?.key ?? 'no chat Input drawn', text })

// One whole chat round: submit, let the timer start the fork, let the fork answer.
const askAndAnswer = async ($: Engine, clock: MockClock, surface: 'terminal' | 'desktop', text: string) => {
  const ui = await mountPane($, surface)
  await typeChat(ui, text)
  await clock.settle()
  await clock.advance(FORK_DELAY)
  return ui
}

test('an empty chat shows the task list, the ask input and no [look it up]', async ($, on) => {
  world(on)
  await begin($)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountPane($, surface)
    expect(await ui.find({ type: 'Text', text: 'T1 ✓ Parser' })).toBeDefined()
    expect(await chatInput(ui)).toBeDefined()
    expect(await ui.find({ key: 'lookup' })).toBeUndefined()
    await ui.unmount()
  }
})

test('a submitted question shows …thinking, then the fork answer as Markdown', async ($, on) => {
  const { forks, clock, entries } = world(on)
  await begin($)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountPane($, surface)
    await typeChat(ui, 'why skip the cache?')
    await clock.settle()
    expect((await ui.find({ type: 'Text', text: 'why skip the cache?' }))?.text).toBe('why skip the cache?')
    expect(await ui.find({ type: 'Text', text: '…thinking' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'T1 ✓ Parser' })).toBeUndefined()

    await clock.advance(FORK_DELAY)
    expect((await ui.find({ type: 'Markdown' }))?.props.text).toBe('Task 2 **measured** it.')
    expect(await ui.find({ type: 'Text', text: '…thinking' })).toBeUndefined()
    await ui.unmount()
    // Each surface's round is its own: clear the history so the next starts from the same place.
    delete entries[CHAT_KEY]
  }
  expect(forks).toHaveLength(2)
  expect(forks[0]).toContain("You are answering the user's side question about the work in progress")
  expect(forks[0]).toContain("Don't propose code edits")
  expect(forks[0]).toContain('why skip the cache?')
})

// The Input has no `value` prop to clear, so a fresh key is what remounts it empty after Enter.
test('a submitted question redraws the ask Input under a fresh key, so the field is empty', async ($, on) => {
  const { clock } = world(on)
  await begin($)
  const ui = await mountPane($, 'terminal')
  const before = (await chatInput(ui))?.key
  await typeChat(ui, 'first?')
  await clock.settle()
  const after = (await chatInput(ui))?.key ?? 'no chat Input drawn'
  expect(after).not.toBe(before)
  await clock.advance(FORK_DELAY)
  await typeChat(ui, 'second?')
  await clock.settle()
  expect((await chatInput(ui))?.key).not.toBe(after)
})

// At the 50-turn cap a question pushes the oldest out, so a key counted from the history repeats.
test('a question asked into a full history still redraws the ask Input under a fresh key', async ($, on) => {
  const { clock, entries } = world(on)
  entries[CHAT_KEY] = {
    writtenAt: 1,
    turns: Array.from({ length: 50 }, (_, i) => ({ role: i % 2 === 0 ? 'you' : 'fork', text: `old ${i}` })),
  }
  await begin($)
  const ui = await mountPane($, 'terminal')
  const before = (await chatInput(ui))?.key
  await typeChat(ui, 'newest?')
  await clock.settle()
  await clock.advance(FORK_DELAY)
  expect((await chatInput(ui))?.key).not.toBe(before)
})

test('the history persists per session in the store, stamped with its last write', async ($, on) => {
  const { clock, chat, entries } = world(on)
  await begin($)
  await askAndAnswer($, clock, 'terminal', 'why skip the cache?')
  expect(chat()).toEqual([
    { role: 'you', text: 'why skip the cache?' },
    { role: 'fork', text: 'Task 2 **measured** it.', contextTokens: 1, reusedTokens: 0 },
  ])
  expect((entries[CHAT_KEY] as { writtenAt: number }).writtenAt).toBe(5000 + FORK_DELAY)
  expect(entries['chat:' + PLAN_PATH]).toBeUndefined()
})

test('the history keeps the last 50 turns', async ($, on) => {
  const { clock, chat, entries } = world(on)
  entries[CHAT_KEY] = { writtenAt: 1, turns: Array.from({ length: 49 }, (_, i) => ({ role: 'you', text: `old ${i}` })) }
  await begin($)
  await askAndAnswer($, clock, 'terminal', 'newest?')
  expect(chat()).toHaveLength(50)
  expect(chat()[0]).toEqual({ role: 'you', text: 'old 1' })
  expect(chat().at(-1)).toEqual({ role: 'fork', text: 'Task 2 **measured** it.', contextTokens: 1, reusedTokens: 0 })
})

for (const [arm, reply, words] of [
  ['nothing-to-fork', { isAnswered: false, reason: 'nothing-to-fork' }, ['nothing-to-fork']],
  [
    'api-error',
    { isAnswered: false, reason: 'api-error', status: 529, error: 'overloaded', usage: USAGE },
    ['api-error', '529', 'overloaded'],
  ],
  ['empty-reply', { isAnswered: false, reason: 'empty-reply', usage: USAGE }, ['empty-reply']],
  ['aborted', { isAnswered: false, reason: 'aborted', usage: USAGE }, ['aborted']],
] as const) {
  test(`a fork that ends ${arm} draws one line naming it`, async ($, on) => {
    const { clock, chat, state } = world(on)
    state.forkReply = reply as ModelForkResult
    await begin($)
    const ui = await askAndAnswer($, clock, 'desktop', 'why?')
    const line = chat().at(-1)
    expect(line?.role).toBe('error')
    for (const word of words) expect(line?.text).toContain(word)
    expect(await ui.find({ type: 'Text', text: line?.text ?? '-' })).toBeDefined()
    expect(await ui.find({ type: 'Markdown' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: '…thinking' })).toBeUndefined()
  })
}

test('an empty question is refused with a toast and asks nothing', async ($, on) => {
  const { toasts, forks, clock, chat } = world(on)
  await begin($)
  const ui = await mountPane($, 'terminal')
  await typeChat(ui, '   ')
  await clock.settle()
  expect(forks).toEqual([])
  expect(chat()).toEqual([])
  expect(toasts).toEqual(['side chat: type a question before pressing Enter'])
})

test('a second question while one is pending is refused with a toast', async ($, on) => {
  const { toasts, forks, clock, chat } = world(on)
  await begin($)
  const ui = await mountPane($, 'terminal')
  await typeChat(ui, 'first?')
  await clock.settle()
  await typeChat(ui, 'second?')
  await clock.settle()
  expect(toasts).toEqual(['side chat: wait for the answer in progress'])
  await clock.advance(FORK_DELAY)
  expect(forks).toHaveLength(1)
  expect(chat().map(t => t.text)).toEqual(['first?', 'Task 2 **measured** it.'])
})

// A reload re-runs `register` and fires `session.start` again; `$.state` survives it, the timer and
// the call in flight do not. The kit's clock keeps the old fork's timer, so this test never advances
// past it: what it pins is that the stale ask is cleared aloud and a new one is taken.
test('an ask interrupted by a reload is cleared with a line, and a new ask is taken', async ($, on) => {
  const { toasts, forks, clock, chat } = world(on)
  await begin($)
  const ui = await mountPane($, 'terminal')
  await typeChat(ui, 'first?')
  await clock.settle()
  expect(await ui.find({ type: 'Text', text: '…thinking' })).toBeDefined()

  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })
  const line = 'fork: interrupted (the mod reloaded)'
  expect(chat().at(-1)).toEqual({ role: 'error', text: line })
  expect(await ui.find({ type: 'Text', text: line })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '…thinking' })).toBeUndefined()

  await typeChat(ui, 'second?')
  await clock.settle()
  expect(toasts).toEqual([])
  expect(forks).toHaveLength(2)
  expect(chat().at(-1)).toEqual({ role: 'you', text: 'second?' })
})

test('a session start with no ask in flight draws no line', async ($, on) => {
  const { chat } = world(on)
  await begin($)
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })
  expect(chat()).toEqual([])
})

test('chatting appends no row to the main conversation', async ($, on) => {
  const { clock, session } = world(on)
  await begin($)
  await askAndAnswer($, clock, 'terminal', 'why skip the cache?')
  expect(session.appended()).toEqual([])
})

test('mobile draws the history and no Input', async ($, on) => {
  const { clock } = world(on)
  await begin($)
  await askAndAnswer($, clock, 'desktop', 'why?')
  const ui = await mountPane($, 'mobile')
  expect((await ui.find({ type: 'Text', text: 'why?' }))?.text).toBe('why?')
  expect(await ui.find({ type: 'Markdown' })).toBeDefined()
  expect(await ui.findAll({ type: 'Input' })).toEqual([])
})

// The chat outlives its plan now (session.test.tsx pins the sweep): a finished plan keeps it.
test('an all-done checkpoint deletes the inbox but keeps the session chat', async ($, on) => {
  const { entries } = world(on, { [PLAN_PATH]: DONE_PLAN })
  entries[CHAT_KEY] = { writtenAt: 1, turns: [{ role: 'you', text: 'done now' }] }
  await begin($)
  expect(entries[CHAT_KEY]).toEqual({ writtenAt: 1, turns: [{ role: 'you', text: 'done now' }] })
})

// The fork sees the main thread's transcript, not this chat's: each ask carries the side chat so far.
test('each ask carries the side chat so far, and the first ask none', async ($, on) => {
  const { forks, clock } = world(on)
  await begin($)
  const ui = await askAndAnswer($, clock, 'desktop', 'why skip the cache?')
  await typeChat(ui, 'and the parser?')
  await clock.settle()
  await clock.advance(FORK_DELAY)
  expect(forks[0]).not.toContain('Side chat so far')
  expect(forks[1]).toContain('Side chat so far')
  expect(forks[1]).toContain('You: why skip the cache?')
  expect(forks[1]).toContain('Side chat: Task 2 **measured** it.')
  // The question asked now is the Question, not part of the history.
  expect(forks[1]).not.toContain('You: and the parser?')
  expect(forks[1]).toContain('Question: and the parser?')
})

// Thirty 4-line answers: 150 lines of history, past the 100-line point where Haiku summarizes.
const longHistory = () =>
  Array.from({ length: 30 }, (_, i) => ({ role: 'fork', text: `answer ${i + 1}\nline b\nline c\nline d` }))

const SUMMARY = 'Earlier they discussed answers 1 to 20.'

test('past 100 lines the older history is summarized by Haiku, and the recent part is sent verbatim', async ($, on) => {
  const { forks, clock, entries } = world(on)
  const completes: { model: string; prompt: string }[] = []
  on('model.complete', ($, e) => {
    completes.push({ model: e.model, prompt: String(e.prompt) })
    return { value: { isAnswered: true, text: SUMMARY, usage: USAGE } }
  })
  await begin($)
  entries[CHAT_KEY] = { writtenAt: 4000, turns: longHistory() }
  const ui = await askAndAnswer($, clock, 'desktop', 'where are we?')
  expect(completes).toHaveLength(1)
  expect(completes[0]?.model).toBe('haiku')
  expect(completes[0]?.prompt).toContain('answer 1\n')
  expect(forks[0]).toContain(SUMMARY)
  expect(forks[0]).toContain('answer 30')
  expect(forks[0]).not.toContain('answer 1\n')

  // A short follow-up stays under the line point, so the summary is reused, not remade.
  await typeChat(ui, 'and next?')
  await clock.settle()
  await clock.advance(FORK_DELAY)
  expect(completes).toHaveLength(1)
  expect(forks[1]).toContain(SUMMARY)
  expect(forks[1]).toContain('You: where are we?')
})

test('a failed summary sends the full history and says so in the chat', async ($, on) => {
  const { forks, clock, entries, chat } = world(on)
  on('model.complete', () => ({ value: { isAnswered: false, reason: 'empty-reply', usage: USAGE } }))
  await begin($)
  entries[CHAT_KEY] = { writtenAt: 4000, turns: longHistory() }
  await askAndAnswer($, clock, 'desktop', 'where are we?')
  expect(forks[0]).toContain('answer 1\n')
  expect(forks[0]).toContain('answer 30')
  expect(chat().some(t => t.role === 'error' && t.text.startsWith('summary: failed'))).toBe(true)
})

// The fork answers over the main thread's own transcript; the line says how much it copied and
// how much the prompt cache served.
test('a fork answer carries a dim line with the context it copied and the tokens the cache served', async ($, on) => {
  const { clock, state, chat } = world(on)
  state.forkReply = {
    isAnswered: true,
    text: 'Task 2 **measured** it.',
    usage: { input_tokens: 200, output_tokens: 30, cache_read_input_tokens: 48000, cache_creation_input_tokens: 0 },
  }
  await begin($)
  const ui = await askAndAnswer($, clock, 'desktop', 'why skip the cache?')
  const line = await ui.find({ type: 'Text', text: 'Context copied from main thread' })
  expect(line?.text).toBe('· Context copied from main thread · 48.2k tokens, 48k reused from cache')
  expect(line?.props.dimColor).toBe(true)
  // Stored on the turn, so a later drawing shows it too.
  expect(chat().at(-1)).toMatchObject({ role: 'fork', contextTokens: 48200, reusedTokens: 48000 })
})

test('a fork whose cache had lapsed says none was reused', async ($, on) => {
  const { clock, state } = world(on)
  state.forkReply = {
    isAnswered: true,
    text: 'Fresh.',
    usage: { input_tokens: 950, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  }
  await begin($)
  const ui = await askAndAnswer($, clock, 'terminal', 'why?')
  expect((await ui.find({ type: 'Text', text: 'Context copied' }))?.text).toBe(
    '· Context copied from main thread · 950 tokens, none reused from cache',
  )
})
