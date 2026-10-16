import type { ModelForkResult, On, ProcessRunResult } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock, Mounted } from 'claude-code/testing'

// The automatic look-up: a fork that replies with exactly one `LOOKUP:` line hands the question to
// an isolated `claude -p` process, whose output is the look-up's answer.

const PLUGIN = 'side-chat'
const PANE = 'side-chat'
const CHECKPOINT = 'mcp__side-chat__checkpoint'
const PLAN_PATH = 'C:/work/plans/fault-export.md'
const SESSION_ID = '3f1c2b9e-7a44-4d1e-9b0a-5c6d7e8f9a01'
const CHAT_KEY = 'chat:' + SESSION_ID
const SESSION_CWD = 'C:/work'
const FORK_DELAY = 1000
const PROCESS_DELAY = 7000
const LOOKING = '· Looking it up in the code…'

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

const LOOKUP_SYSTEM =
  'You are a read-only code lookup. Use Read, Grep and Glob only. Grep first; read only the lines you need; ' +
  "stop as soon as you can answer. Reply in at most 6 lines and cite path:line for every claim. If a few searches don't find it, say so in one line."

const ARGV = [
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
]

const ran = (stdout: string, exitCode = 0, stderr = ''): ProcessRunResult => ({
  exitCode,
  stdout,
  stderr,
  isStdoutTruncated: false,
  isStderrTruncated: false,
})

type Turn = { role: string; text: string }

// The world beneath: `$.model.fork` answers `forkReply` after FORK_DELAY, `$.process.run` answers
// `processReply` (or refuses with `processDeny`) after PROCESS_DELAY, both of mocked time.
const world = (on: On) => {
  const toasts: string[] = []
  const forks: string[] = []
  const runs: { argv: readonly string[]; init: unknown }[] = []
  const spawns: unknown[] = []
  const entries: Record<string, unknown> = {}
  const state = {
    forkReply: { isAnswered: true, text: 'LOOKUP: where is the milestone regex?', usage: USAGE } as ModelForkResult,
    processReply: ran('planParser.ts:11 holds `MILESTONE`.\n'),
    processDeny: undefined as string | undefined,
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
  on('session.cwd', () => ({ value: SESSION_CWD }))
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
  on('model.fork', async ($, e) => {
    forks.push(e.prompt)
    await clock.sleep(FORK_DELAY)
    return { value: state.forkReply }
  })
  on('process.run', async ($, e) => {
    runs.push({ argv: e.argv, init: e.init })
    await clock.sleep(PROCESS_DELAY)
    return state.processDeny === undefined ? { value: state.processReply } : { deny: state.processDeny }
  })
  on('agent.spawn', ($, e) => {
    spawns.push(e)
    return { deny: 'the look-up must not spawn an agent' }
  })
  const chat = () => (entries[CHAT_KEY] as { turns: Turn[] } | undefined)?.turns ?? []
  return { toasts, forks, runs, spawns, state, clock, session, chat }
}

const begin = async ($: Engine) => {
  await $.session.start({ cwd: SESSION_CWD, surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
}

const mountPane = <P extends 'terminal' | 'desktop'>($: Engine, surface: P) =>
  $.ui.mount({ plugin: PLUGIN, surface, component: 'Pane' as const, requestId: PANE, props: PANE_PROPS })

const chatInput = async (ui: Pick<Mounted, 'findAll'>) =>
  (await ui.findAll({ type: 'Input' })).find(i => i.props.placeholder === 'ask or steer…')

// Submits a question and lets the fork answer; a LOOKUP reply's process is then in flight.
const askUntilForked = async ($: Engine, clock: MockClock, surface: 'terminal' | 'desktop' = 'terminal') => {
  const ui = await mountPane($, surface)
  await ui.input({ key: (await chatInput(ui))?.key ?? 'no chat Input drawn', text: 'where is the milestone regex?' })
  await clock.settle()
  await clock.advance(FORK_DELAY)
  return ui
}

const lookUp = async ($: Engine, clock: MockClock, surface: 'terminal' | 'desktop' = 'terminal') => {
  const ui = await askUntilForked($, clock, surface)
  await clock.advance(PROCESS_DELAY)
  return ui
}

test('the fork instruction asks for one LOOKUP line when the answer is not in the conversation', async ($, on) => {
  const { clock, forks } = world(on)
  await begin($)
  await askUntilForked($, clock)
  expect(forks[0]).toContain('Answer only from what this conversation already contains.')
  expect(forks[0]).toContain(
    'If answering needs code or files not in it, reply with exactly one line, `LOOKUP: <self-contained question>`, and nothing else.',
  )
  expect(forks[0]).toContain('NOTE:')
})

test('a LOOKUP reply draws the looking-it-up line, then runs claude -p with the exact argv and stdin', async ($, on) => {
  const { clock, runs, chat } = world(on)
  await begin($)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await askUntilForked($, clock, surface)
    // The in-flight line is the pending state's, not a history turn.
    expect(chat().at(-1)).toEqual({ role: 'you', text: 'where is the milestone regex?' })
    expect(await ui.find({ type: 'Text', text: LOOKING })).toBeDefined()
    await clock.advance(PROCESS_DELAY)
    await ui.unmount()
  }
  expect(runs).toHaveLength(2)
  expect(runs[0]?.argv).toEqual(ARGV)
  expect(runs[0]?.init).toEqual({ stdin: 'where is the milestone regex?', cwd: SESSION_CWD, timeoutMs: 300000 })
})

test("exit 0 with output draws the process's answer as a look-up entry", async ($, on) => {
  const { clock, chat } = world(on)
  await begin($)
  const ui = await lookUp($, clock)
  expect(chat().at(-1)).toEqual({ role: 'lookup', text: 'planParser.ts:11 holds `MILESTONE`.' })
  expect((await ui.findAll({ type: 'Markdown' })).at(-1)?.props.text).toBe('planParser.ts:11 holds `MILESTONE`.')
  expect(await ui.find({ type: 'Text', text: '· Looked it up in the code' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: LOOKING })).toBeUndefined()
})

// A real `claude -p` failure opens stderr with settings warnings and ends with the cause; a
// budget stop prints its cause on stdout. So the last line names it, never the first.
const WARNINGS = 'Permission allow rule (settings.json): Write(a) is not matched\n'.repeat(3)

test('a non-zero exit with empty stdout draws the exit code and the last stderr line', async ($, on) => {
  const { clock, chat, state } = world(on)
  state.processReply = ran('', 1, `${WARNINGS}[claude-code:unrecognized_model] no-such-model\n\n`)
  await begin($)
  const ui = await lookUp($, clock)
  const line = 'look-up: failed (exit 1): [claude-code:unrecognized_model] no-such-model'
  expect(chat().at(-1)).toEqual({ role: 'error', text: line })
  expect(await ui.find({ type: 'Text', text: line })).toBeDefined()
})

test('a non-zero exit with stdout draws its last line, not the stderr warnings', async ($, on) => {
  const { clock, chat, state } = world(on)
  state.processReply = ran('Error: Exceeded USD budget (0.25)\n', 1, WARNINGS)
  await begin($)
  await lookUp($, clock)
  expect(chat().at(-1)).toEqual({ role: 'error', text: 'look-up: failed (exit 1): Error: Exceeded USD budget (0.25)' })
})

test('exit 0 with empty output draws an empty-reply line', async ($, on) => {
  const { clock, chat, state } = world(on)
  state.processReply = ran('  \n')
  await begin($)
  await lookUp($, clock)
  expect(chat().at(-1)).toEqual({ role: 'error', text: 'look-up: no answer (empty-reply)' })
})

test('a rejected run draws a failed line with the reason, and the next ask is taken', async ($, on) => {
  const { clock, chat, state, toasts } = world(on)
  state.processDeny = 'timed out after 300000 ms'
  await begin($)
  const ui = await lookUp($, clock)
  const line = chat().at(-1)
  expect(line?.role).toBe('error')
  expect(line?.text.startsWith('look-up: failed: ')).toBe(true)
  expect(line?.text).toContain('timed out after 300000 ms')
  expect(await ui.find({ type: 'Text', text: LOOKING })).toBeUndefined()
  await ui.input({ key: (await chatInput(ui))?.key ?? 'no chat Input drawn', text: 'again?' })
  await clock.settle()
  expect(toasts).toEqual([])
})

test('the look-up spawns no agent, draws no [look it up] button and appends no main-conversation row', async ($, on) => {
  const { clock, spawns, session } = world(on)
  await begin($)
  const ui = await lookUp($, clock)
  expect(spawns).toEqual([])
  expect(await ui.find({ key: 'lookup' })).toBeUndefined()
  expect(session.appended()).toEqual([])
})

for (const [shape, text] of [
  ['a LOOKUP line with more text', 'LOOKUP: where is it?\nI think planParser.ts.'],
  ['a LOOKUP line after text', 'Not sure.\nLOOKUP: where is it?'],
  ['an empty LOOKUP line', 'LOOKUP:   '],
  ['a lower-case lookup line', 'lookup: where is it?'],
] as const) {
  test(`a fork reply that is ${shape} is shown as a normal answer and runs nothing`, async ($, on) => {
    const { clock, chat, runs, state } = world(on)
    state.forkReply = { isAnswered: true, text, usage: USAGE }
    await begin($)
    const ui = await lookUp($, clock)
    expect(runs).toEqual([])
    expect(chat().at(-1)).toEqual({ role: 'fork', text, contextTokens: 1, reusedTokens: 0 })
    expect((await ui.findAll({ type: 'Markdown' })).at(-1)?.props.text).toBe(text)
  })
}

test('a look-up cut by a reload is cleared with a look-up line', async ($, on) => {
  const { clock, chat } = world(on)
  await begin($)
  await askUntilForked($, clock)
  await $.session.start({ cwd: SESSION_CWD, surface: 'terminal', isInteractive: true })
  expect(chat().at(-1)).toEqual({ role: 'error', text: 'look-up: interrupted (the mod reloaded)' })
})
