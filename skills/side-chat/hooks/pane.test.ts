import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const PLUGIN = 'side-chat'
const PANE = 'side-chat'
const CHECKPOINT = 'mcp__side-chat__checkpoint'
const ASK = 'mcp__side-chat__ask'
const PLAN_PATH = 'C:/work/plans/fault-export.md'
const KEY = 'inbox:' + PLAN_PATH

const PLAN = `# Plan: fault-export

## Tasks

### Task 1: Parser

- [x] Done

**Result:** ALL GOOD · abc1234 · parser lands

### Task 2: Band

- [ ] Done

### Task 3: Store — **milestone**

- [ ] Done

## Decisions & Review Items
`

const QUESTION = {
  planPath: PLAN_PATH,
  task: '3',
  question: 'Reuse ColorMap or a new type?',
  options: ['reuse', 'new'],
  defaultOption: 'reuse',
  loadBearing: true,
}

const BAND_PROPS = {
  hasSurvey: false,
  isWorking: true,
  maxRows: 10,
  bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

const PANE_PROPS = {
  title: 'fault-export Side chat',
  isFocused: false,
  bodyColumns: 40,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
}

type StoredQuestion = { id: string; answer?: string }

type OpenResult = { isPlaced: true } | { isPlaced: false; reason: string }

// The world beneath: a bound session, the plan file, toasts and pane opens recorded (each answered
// with `opened`), and the store answered from `entries` (the test's `$` has no store noun, so the
// map is the readback).
const world = (on: On, opened: OpenResult = { isPlaced: true }) => {
  const toasts: string[] = []
  const opens: unknown[] = []
  const entries: Record<string, unknown> = {}
  mock.clock(on, { now: 5000 })
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
  on('session.id', () => ({ value: '3f1c2b9e-7a44-4d1e-9b0a-5c6d7e8f9a01' }))
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
  on('ui.open', ($, e) => {
    opens.push(e)
    return { value: opened }
  })
  const questions = () => ((entries[KEY] as { questions: StoredQuestion[] } | undefined)?.questions ?? [])
  return { toasts, opens, questions, entries }
}

const begin = async ($: Engine) => {
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
}

// Generic over the surface so the handle keeps `input` where that surface's table has an Input.
const mountPane = <P extends 'terminal' | 'desktop' | 'mobile'>($: Engine, surface: P) =>
  $.ui.mount({ plugin: PLUGIN, surface, component: 'Pane' as const, requestId: PANE, props: PANE_PROPS })

const bandText = async ($: Engine) => {
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
  const text = (await ui.find({ type: 'Text', text: 'fault-export' }))?.text
  await ui.unmount()
  return text
}

test('ask stores the question and returns its id at once, with a toast and a pane open', async ($, on) => {
  const { toasts, opens, questions } = world(on)
  await begin($)

  const ran = await $.tool.call({ tool: ASK, ...QUESTION })
  expect(ran.deny).toBeUndefined()
  const { id } = JSON.parse(String(ran.result))
  expect(questions()).toEqual([
    { id, task: '3', question: QUESTION.question, options: ['reuse', 'new'], defaultOption: 'reuse', loadBearing: true },
  ])
  expect(toasts).toEqual(['side chat: question on T3'])
  expect(opens).toEqual([{ id: PANE, title: 'fault-export Side chat' }])
})

test('ask refuses a defaultOption that is not one of the options, and stores nothing', async ($, on) => {
  const { questions, toasts } = world(on)
  await begin($)
  const ran = await $.tool.call({ tool: ASK, ...QUESTION, defaultOption: 'maybe' })
  expect(ran.deny).toContain('maybe')
  expect(questions()).toEqual([])
  expect(toasts).toEqual([])
})

test('ask refuses a missing field', async ($, on) => {
  const { questions } = world(on)
  await begin($)
  const { loadBearing: _, ...withoutLoadBearing } = QUESTION
  const ran = await $.tool.call({ tool: ASK, ...withoutLoadBearing })
  expect(ran.deny).toContain('loadBearing')
  expect(questions()).toEqual([])
})

for (const [field, bad] of [
  ['options', { options: [] }],
  ['options', { options: ['reuse', 3] }],
  ['task', { task: '' }],
  ['question', { question: '' }],
] as const) {
  test(`ask refuses ${JSON.stringify(bad)}, naming ${field}`, async ($, on) => {
    const { questions, toasts } = world(on)
    await begin($)
    const ran = await $.tool.call({ tool: ASK, ...QUESTION, ...bad })
    expect(ran.deny).toContain(`ask needs ${field}`)
    expect(questions()).toEqual([])
    expect(toasts).toEqual([])
  })
}

test('ask refuses a plan that has not checkpointed in this session', async ($, on) => {
  const { questions } = world(on)
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })
  const ran = await $.tool.call({ tool: ASK, ...QUESTION })
  expect(ran.deny).toContain('checkpoint')
  expect(questions()).toEqual([])
})

test('the band shows the unanswered count, redrawn as questions arrive', async ($, on) => {
  world(on)
  await begin($)
  expect(await bandText($)).toBe('fault-export ▓▓▓░░░░░░░ 1/3 · T2 running')

  const band = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
  await $.tool.call({ tool: ASK, ...QUESTION })
  await $.tool.call({ tool: ASK, ...QUESTION, question: 'Second?' })
  expect((await band.find({ type: 'Text', text: 'fault-export' }))?.text).toBe(
    'fault-export ▓▓▓░░░░░░░ 1/3 · T2 running · 2Q',
  )
})

test('a new question is drawn as a card inside the chat, per the contract, with no tab row; mobile draws its buttons and no Input', async ($, on) => {
  world(on)
  await begin($)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountPane($, surface)
    expect(await ui.findAll({ type: 'Button', text: 'Questions' })).toEqual([])
    expect(await ui.find({ type: 'Text', text: 'T1 ✓ Parser' })).toBeDefined()
    await ui.unmount()
  }

  const { id } = JSON.parse(String((await $.tool.call({ tool: ASK, ...QUESTION })).result))
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountPane($, surface)
    expect(await ui.find({ key: 'tab:chat' })).toBeUndefined()
    expect(await ui.find({ key: 'tab:questions' })).toBeUndefined()
    expect(await ui.find({ key: `question:${id}` })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Q · T3 · load-bearing' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Reuse ColorMap or a new type?' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '▸ proceeding on: reuse' })).toBeDefined()
    expect((await ui.find({ key: `answer:${id}:0` }))?.props.hotkey).toBe('1')
    expect((await ui.find({ key: `answer:${id}:1` }))?.props.hotkey).toBe('2')
    expect(await ui.find({ type: 'Input', key: `other:${id}` })).toBeDefined()
    // The chat stays: its body and its ask input are drawn beside the card.
    expect(await ui.find({ type: 'Text', text: 'T1 ✓ Parser' })).toBeDefined()
    expect((await ui.findAll({ type: 'Input' })).some(i => i.props.placeholder === 'ask or steer…')).toBe(true)
    await ui.unmount()
  }

  const mobile = await mountPane($, 'mobile')
  expect(await mobile.find({ key: `answer:${id}:0` })).toBeDefined()
  expect(await mobile.findAll({ type: 'Input' })).toEqual([])
})

test('the load-bearing chip shows only for a load-bearing question', async ($, on) => {
  world(on)
  await begin($)
  await $.tool.call({ tool: ASK, ...QUESTION, loadBearing: false })
  const ui = await mountPane($, 'desktop')
  expect(await ui.find({ type: 'Text', text: 'Q · T3' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'load-bearing' })).toBeUndefined()
})

test('pressing an option stores the answer and the card vanishes', async ($, on) => {
  const { questions } = world(on)
  await begin($)
  const { id } = JSON.parse(String((await $.tool.call({ tool: ASK, ...QUESTION })).result))

  const ui = await mountPane($, 'terminal')
  await ui.press({ key: `answer:${id}:1` })
  expect(questions()[0]?.answer).toBe('new')
  expect(await ui.find({ key: `question:${id}` })).toBeUndefined()
  expect(await bandText($)).toBe('fault-export ▓▓▓░░░░░░░ 1/3 · T2 running')
})

// The card vanishes on an answer, so the chat keeps the exchange: the question on the left, the
// answer in the person's bubble.
test('an answered question stays in the chat log, its answer in a bubble', async ($, on) => {
  world(on)
  await begin($)
  const { id } = JSON.parse(String((await $.tool.call({ tool: ASK, ...QUESTION })).result))

  const ui = await mountPane($, 'desktop')
  await ui.press({ key: `answer:${id}:1` })
  expect(await ui.find({ type: 'Text', text: 'Q · T3 · Reuse ColorMap or a new type?' })).toBeDefined()
  const bubble = (await ui.findAll({ type: 'Box' })).find(b => b.props.alignSelf === 'flex-end')
  expect(JSON.stringify(bubble?.children ?? [])).toContain('new')
})

test('an other… answer is logged as typed', async ($, on) => {
  world(on)
  await begin($)
  const { id } = JSON.parse(String((await $.tool.call({ tool: ASK, ...QUESTION })).result))

  const ui = await mountPane($, 'desktop')
  await ui.input({ key: `other:${id}`, text: '  extend ColorMap ' })
  const bubble = (await ui.findAll({ type: 'Box' })).find(b => b.props.alignSelf === 'flex-end')
  expect(JSON.stringify(bubble?.children ?? [])).toContain('extend ColorMap')
})

// The store redraws nothing, so a delivery written elsewhere (another session) leaves the
// question drawn; its press must still be refused by the inbox, not recorded.
test('pressing an option of a question delivered since the pane was drawn toasts and stores nothing', async ($, on) => {
  const { questions, toasts, entries } = world(on)
  await begin($)
  const { id } = JSON.parse(String((await $.tool.call({ tool: ASK, ...QUESTION })).result))
  const ui = await mountPane($, 'terminal')
  toasts.length = 0

  const inbox = entries[KEY] as { questions: StoredQuestion[] }
  const delivered = { ...inbox.questions[0]!, answer: 'reuse', deliveredAt: 6000 } // the one asked above
  entries[KEY] = { ...inbox, questions: [delivered] }
  await ui.press({ key: `answer:${id}:1` })
  expect(toasts).toEqual([`side chat: question ${id} was already delivered`])
  expect(questions()).toEqual([delivered])
  // A refused answer is not logged to the chat as if it had been recorded.
  const chat = entries['chat:3f1c2b9e-7a44-4d1e-9b0a-5c6d7e8f9a01'] as { turns: { role: string }[] } | undefined
  expect((chat?.turns ?? []).filter(t => t.role === 'answer')).toEqual([])
})

test('submitting other… stores the typed answer', async ($, on) => {
  const { questions } = world(on)
  await begin($)
  const { id } = JSON.parse(String((await $.tool.call({ tool: ASK, ...QUESTION })).result))

  const ui = await mountPane($, 'desktop')
  await ui.input({ key: `other:${id}`, text: 'extend ColorMap' })
  expect(questions()[0]?.answer).toBe('extend ColorMap')
  expect(await ui.find({ key: `question:${id}` })).toBeUndefined()
})

test('an empty other… answer is refused with a toast and stores nothing', async ($, on) => {
  const { questions, toasts } = world(on)
  await begin($)
  const { id } = JSON.parse(String((await $.tool.call({ tool: ASK, ...QUESTION })).result))
  toasts.length = 0

  const ui = await mountPane($, 'desktop')
  await ui.input({ key: `other:${id}`, text: '   ' })
  expect(toasts).toEqual(['side chat: type an answer before pressing Enter'])
  expect(questions()[0]?.answer).toBeUndefined()
  expect(await ui.find({ key: `question:${id}` })).toBeDefined()
})

// Two clashing hotkeys in one site leave only the later working, so only the oldest gets digits.
test('only the oldest open question gets option hotkeys', async ($, on) => {
  world(on)
  await begin($)
  const first = JSON.parse(String((await $.tool.call({ tool: ASK, ...QUESTION })).result)).id
  const second = JSON.parse(String((await $.tool.call({ tool: ASK, ...QUESTION, question: 'Second?' })).result)).id

  const ui = await mountPane($, 'terminal')
  expect((await ui.find({ key: `answer:${first}:0` }))?.props.hotkey).toBe('1')
  const later = await ui.find({ key: `answer:${second}:0` })
  expect(later?.props.hotkey).toBeUndefined()
  expect(later?.props.label).toBe('reuse')
})

test('ask accepts the active plan in its backslash spelling', async ($, on) => {
  const { questions } = world(on)
  await begin($)
  const ran = await $.tool.call({ tool: ASK, ...QUESTION, planPath: PLAN_PATH.replaceAll('/', '\\') })
  expect(ran.deny).toBeUndefined()
  expect(questions()).toHaveLength(1)
})

test('the empty chat lists the tasks with results and milestones above an open question', async ($, on) => {
  world(on)
  await begin($)
  await $.tool.call({ tool: ASK, ...QUESTION })

  const ui = await mountPane($, 'terminal')
  expect(await ui.find({ type: 'Text', text: 'T1 ✓ Parser' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'ALL GOOD · abc1234 · parser lands' })).toBeDefined()
  // `find` matches a substring, so the exact text pins that a plain task carries no milestone suffix.
  expect((await ui.find({ type: 'Text', text: 'T2 · Band' }))?.text).toBe('T2 · Band')
  const milestone = await ui.find({ type: 'Text', text: 'T3 · Store' })
  expect(milestone?.text).toBe('T3 · Store · milestone')
  expect(await ui.find({ type: 'Text', text: 'Reuse ColorMap or a new type?' })).toBeDefined()
})

test('mobile answers by button and logs the exchange to the chat', async ($, on) => {
  const { questions } = world(on)
  await begin($)
  const { id } = JSON.parse(String((await $.tool.call({ tool: ASK, ...QUESTION })).result))

  const ui = await mountPane($, 'mobile')
  await ui.press({ key: `answer:${id}:0` })
  expect(questions()[0]?.answer).toBe('reuse')
  expect(await ui.find({ key: `question:${id}` })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'Q · T3 · Reuse ColorMap or a new type?' })).toBeDefined()
  const bubble = (await ui.findAll({ type: 'Box' })).find(b => b.props.alignSelf === 'flex-end')
  expect(JSON.stringify(bubble?.children ?? [])).toContain('reuse')
})

const WAITING = 'opened unasked below 144 columns (now 100)'

test('a question whose pane waits undrawn says so, naming the reason', async ($, on) => {
  const { toasts } = world(on, { isPlaced: false, reason: WAITING })
  await begin($)
  await $.tool.call({ tool: ASK, ...QUESTION })
  expect(toasts).toEqual([
    'side chat: question on T3',
    `side chat: widen the window or press [Open] to see the pane (${WAITING})`,
  ])
})

test('[Open] on a surface that places no pane says so, naming the reason', async ($, on) => {
  const reason = 'the attached desktop places no panes'
  const { toasts } = world(on, { isPlaced: false, reason })
  await begin($)
  const band = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
  await band.press({ key: 'spar' })
  expect(toasts).toEqual([`side chat: the pane could not be drawn (${reason})`])
})
