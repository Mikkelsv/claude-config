import type { ModelForkResult, On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine, FoundElement, MockClock, Mounted } from 'claude-code/testing'

// The chat's bottom: the ask input, and the steer proposal drawn right above it.
// notes.test.ts covers queueing, the chips and the band.

const PLUGIN = 'side-chat'
const PANE = 'side-chat'
const CHECKPOINT = 'mcp__side-chat__checkpoint'
const PLAN_PATH = 'C:/work/plans/fault-export.md'
const SESSION_ID = '3f1c2b9e-7a44-4d1e-9b0a-5c6d7e8f9a01'
const CHAT_KEY = 'chat:' + SESSION_ID
const INBOX_KEY = 'inbox:' + PLAN_PATH
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

const answered = (text: string): ModelForkResult => ({ isAnswered: true, text, usage: USAGE })

type Turn = { role: string; text: string; proposedNote?: string; isProposalTaken?: boolean; isProposalDismissed?: boolean }

// As notes.test.ts's world: plan from a constant, the store from `entries`, the fork from `forkReply`.
const world = (on: On) => {
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
  on('fs.read', ($, e) =>
    e.path.replaceAll('\\', '/') === PLAN_PATH ? { value: PLAN } : { deny: `ENOENT: ${e.path}` },
  )
  on('fs.exists', ($, e) => ({ value: e.path.replaceAll('\\', '/') === PLAN_PATH }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('model.fork', async () => {
    await clock.sleep(FORK_DELAY)
    return { value: state.forkReply }
  })
  const chat = () => (entries[CHAT_KEY] as { turns: Turn[] } | undefined)?.turns ?? []
  const notes = () => (entries[INBOX_KEY] as { notes: { text: string }[] } | undefined)?.notes ?? []
  return { state, clock, chat, notes }
}

// Inside a main turn, as an `/implement` run is: an idle main thread is handed queued steers.
const begin = async ($: Engine) => {
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  await $.turn.start({ text: '/implement', turnId: 'implement' })
}

const mountPane = <P extends 'terminal' | 'desktop' | 'mobile'>($: Engine, surface: P) =>
  $.ui.mount({ plugin: PLUGIN, surface, component: 'Pane' as const, requestId: PANE, props: PANE_PROPS })

const chatInput = async (ui: Pick<Mounted, 'findAll'>) =>
  (await ui.findAll({ type: 'Input' })).find(i => i.props.placeholder === 'ask or steer…')

const ask = async ($: Engine, clock: MockClock, ui: Pick<Mounted<'terminal' | 'desktop'>, 'findAll' | 'input'>, text: string) => {
  await ui.input({ key: (await chatInput(ui))?.key ?? 'no chat Input drawn', text })
  await clock.settle()
  await clock.advance(FORK_DELAY)
}

const isElement = (c: unknown): c is FoundElement =>
  typeof c === 'object' && c !== null && typeof (c as { type?: unknown }).type === 'string'

// The drawing's leaves (everything but Box) in document order, as `type:shown` tags. Nested
// children come back as render descriptions, not FoundElements, so text is read from either shape.
const childrenOf = (el: FoundElement): unknown[] =>
  [el.children ?? (el.props.children as unknown[] | undefined) ?? []].flat()

const shown = (el: FoundElement) => {
  if (el.type === 'Input') return String(el.props.placeholder)
  if (el.type === 'Button') return String(el.props.label)
  return typeof el.text === 'string' ? el.text : childrenOf(el).filter(c => typeof c === 'string').join('')
}

const leaves = async (ui: Pick<Mounted, 'find'>) => {
  const out: string[] = []
  const walk = (el: FoundElement) => {
    if (el.type !== 'Box') out.push(`${el.type}:${shown(el)}`)
    for (const c of childrenOf(el)) if (isElement(c)) walk(c)
  }
  const root = await ui.find({ type: 'Box' })
  if (root !== undefined) walk(root)
  return out
}

const steerLines = async (ui: Pick<Mounted, 'findAll'>) =>
  (await ui.findAll({ type: 'Text' })).map(t => t.text).filter(t => t.startsWith('Steer: '))

const NOTE_TEXT = 'add a test for the empty fault cloud'
const STEER = `Worth it.\nNOTE: ${NOTE_TEXT}`

// The ask box is the Box whose own child is the ask Input.
const isAskBox = (b: FoundElement) =>
  childrenOf(b).some(c => isElement(c) && c.type === 'Input' && c.props.placeholder === 'ask or steer…')

// The surfaces size and place a native Input themselves, so only its place is pinned here; how it
// sits is judged by eye on the live surfaces.
test('the ask box is last: the unlabelled Input, then [Steer], with no hint', async ($, on) => {
  world(on)
  await begin($)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountPane($, surface)
    const input = await chatInput(ui)
    expect(input?.props.label).toBeUndefined()
    expect(input?.props.submitLabel).toBe('↵')
    const boxes = (await ui.findAll({ type: 'Box' })).filter(isAskBox)
    expect(boxes).toHaveLength(1)
    expect(childrenOf(boxes[0] as FoundElement).filter(isElement).map(c => c.type)).toEqual(['Input', 'Button'])
    expect((await leaves(ui)).slice(-2)).toEqual(['Input:ask or steer…', 'Button:➤ Steer'])
    expect(await ui.find({ type: 'Text', text: 'enter to ask' })).toBeUndefined()
    await ui.unmount()
  }
})

// [Steer] takes what is typed as the steer itself: no fork, no proposal to confirm.
test('[Steer] queues the typed text on the first not-done task, asks no fork, and clears the input', async ($, on) => {
  const { clock, chat, notes } = world(on)
  await begin($)
  const ui = await mountPane($, 'desktop')
  const before = (await chatInput(ui))?.key
  await ui.input({ key: before ?? 'no chat Input drawn', text: NOTE_TEXT, kind: 'change' })
  await ui.press({ key: 'steer-typed' })
  await clock.settle()
  expect(notes().map(n => n.text)).toEqual([NOTE_TEXT])
  expect(chat()).toEqual([{ role: 'steer', text: NOTE_TEXT, ref: 'n1' }])
  expect(await ui.find({ type: 'Text', text: `· steer → T2: ${NOTE_TEXT}` })).toBeDefined()
  expect((await chatInput(ui))?.key).not.toBe(before)
})

test('[Steer] with nothing typed queues nothing', async ($, on) => {
  const { clock, notes } = world(on)
  await begin($)
  const ui = await mountPane($, 'terminal')
  await ui.press({ key: 'steer-typed' })
  await clock.settle()
  expect(notes()).toEqual([])
})

test('a submitted question is not kept as the [Steer] text', async ($, on) => {
  const { clock, notes } = world(on)
  await begin($)
  const ui = await mountPane($, 'terminal')
  const key = (await chatInput(ui))?.key ?? 'no chat Input drawn'
  await ui.input({ key, text: 'why?', kind: 'change' })
  await ask($, clock, ui, 'why?')
  await ui.press({ key: 'steer-typed' })
  await clock.settle()
  expect(notes()).toEqual([])
})

test('a proposal is drawn directly above the input as Steer: with ✓ and x, not in the history; mobile draws it with no input', async ($, on) => {
  const { state, clock } = world(on)
  state.forkReply = answered(STEER)
  await begin($)
  const first = await mountPane($, 'terminal')
  await ask($, clock, first, 'also test the empty case')
  await first.unmount()
  for (const surface of ['terminal', 'desktop', 'mobile'] as const) {
    const ui = await mountPane($, surface)
    expect(await steerLines(ui)).toEqual([`Steer: ${NOTE_TEXT}`])
    expect(await ui.find({ key: 'proposal:1' })).toBeDefined()
    expect(await ui.find({ key: 'dismiss:1' })).toBeDefined()
    if (surface === 'mobile') {
      expect(await ui.findAll({ type: 'Input' })).toEqual([])
      expect(await ui.find({ key: 'steer-typed' })).toBeUndefined()
      expect(await ui.find({ type: 'Text', text: 'enter to ask' })).toBeUndefined()
    } else {
      expect((await leaves(ui)).slice(-5)).toEqual([
        `Text:Steer: ${NOTE_TEXT}`,
        'Button:✓',
        'Button:x',
        'Input:ask or steer…',
        'Button:➤ Steer',
      ])
    }
    await ui.unmount()
  }
})

test('[x] dismisses the proposal for good and queues nothing', async ($, on) => {
  const { state, clock, chat, notes } = world(on)
  state.forkReply = answered(STEER)
  await begin($)
  const ui = await mountPane($, 'terminal')
  await ask($, clock, ui, 'also test the empty case')
  await ui.press({ key: 'dismiss:1' })
  expect(await steerLines(ui)).toEqual([])
  expect(chat().at(-1)?.isProposalDismissed).toBe(true)
  expect(notes()).toEqual([])
  await ui.unmount()
  const again = await mountPane($, 'terminal')
  expect(await steerLines(again)).toEqual([])
})

test('a newer proposal supersedes an older one, which never comes back', async ($, on) => {
  const { state, clock, notes } = world(on)
  state.forkReply = answered('First.\nNOTE: rename greet')
  await begin($)
  const ui = await mountPane($, 'terminal')
  await ask($, clock, ui, 'rename it')
  state.forkReply = answered(STEER)
  await ask($, clock, ui, 'also test the empty case')
  expect(await steerLines(ui)).toEqual([`Steer: ${NOTE_TEXT}`])
  expect(await ui.find({ key: 'proposal:1' })).toBeUndefined()
  expect(await ui.find({ key: 'proposal:3' })).toBeDefined()

  await ui.press({ key: 'dismiss:3' })
  expect(await steerLines(ui)).toEqual([])
  expect(notes()).toEqual([])
})

test('a NOTE line over 20 words is drawn as 20 words and …, and ✓ queues it whole', async ($, on) => {
  const { state, clock, notes } = world(on)
  const words = Array.from({ length: 30 }, (_, i) => `w${i + 1}`)
  state.forkReply = answered(`Long.\nNOTE: ${words.join(' ')}`)
  await begin($)
  const ui = await mountPane($, 'desktop')
  await ask($, clock, ui, 'steer it')
  expect(await steerLines(ui)).toEqual([`Steer: ${words.slice(0, 20).join(' ')}…`])
  await ui.press({ key: 'proposal:1' })
  expect(notes().map(n => n.text)).toEqual([words.join(' ')])
})
