import type { On } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import {
  addQuestion,
  answerQuestion,
  applyOutcomes,
  inboxKey,
  queueNote,
  readInbox,
  releaseOldestNote,
  sweepStale,
  takeUndelivered,
  withdrawNote,
} from './inbox'
import type { PluginStore } from './inbox'

const TOOL = 'mcp__side-chat__checkpoint'
const PLAN_PATH = 'C:/work/plans/fault-export.md'
const PLAN_PATH_BACKSLASH = 'C:\\work\\plans\\fault-export.md'
const GONE_PATH = 'C:/work/plans/finished-long-ago.md'

// An in-memory store with the engine's JSON round-trip, standing for another module instance
// (or an earlier session) writing the same file.
const memoryStore = () => {
  const entries: Record<string, unknown> = {}
  const store: PluginStore = {
    get: async key => entries[key],
    set: async (key, value) => {
      entries[key] = JSON.parse(JSON.stringify(value))
    },
    delete: async key => {
      delete entries[key]
    },
    keys: async () => Object.keys(entries),
  }
  return { store, entries }
}

const QUESTION = {
  task: '3',
  question: 'Reuse ColorMap or a new type?',
  options: ['reuse', 'new'],
  defaultOption: 'reuse',
  loadBearing: true,
}

const block = (heading: string, isDone: boolean) => `### ${heading}

- [${isDone ? 'x' : ' '}] Done

**Dependencies:** None
`

const PLAN = `# Plan: fault-export

## Tasks

${block('Task 1: Parser', true)}
${block('Task 2: Store', false)}
## Decisions & Review Items
`

const DONE_PLAN = PLAN.replaceAll('- [ ] Done', '- [x] Done')

// The world beneath the plugin: a bound session, files from a map (OS spelling normalized), and
// the store answered from `entries`, the same map `memoryStore` writes. Not `mock.store`: the
// test's `$` has no `store` noun, so the map itself is the readback.
const world = (on: On, files: Record<string, string>, entries: Record<string, unknown>) => {
  mock.clock(on, { now: 7000 })
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
  on('tool.register', ($, e) => ({ value: { tool: `mcp__side-chat__${e.name}` } }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('fs.read', ($, e) => {
    const text = files[e.path.replaceAll('\\', '/')]
    return text === undefined ? { deny: `ENOENT: ${e.path}` } : { value: text }
  })
  on('fs.exists', ($, e) => ({ value: files[e.path.replaceAll('\\', '/')] !== undefined }))
}

const start = ($: Engine) => $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })

describe('inbox functions', () => {
  test('a queued note and an added question are stored as { notes, questions, issued } under one key per plan', async () => {
    const { store, entries } = memoryStore()
    const note = await queueNote(store, PLAN_PATH, { text: 'add empty-cloud test', targetTask: '4' })
    const question = await addQuestion(store, PLAN_PATH_BACKSLASH, QUESTION)

    expect(inboxKey(PLAN_PATH)).toBe(inboxKey(PLAN_PATH_BACKSLASH))
    expect(Object.keys(entries)).toEqual([inboxKey(PLAN_PATH)])
    expect(entries[inboxKey(PLAN_PATH)]).toEqual({
      notes: [{ id: note.id, text: 'add empty-cloud test', targetTask: '4' }],
      questions: [{ id: question.id, ...QUESTION }],
      issued: 2,
    })
    expect(note.id).not.toBe(question.id)
  })

  test('takeUndelivered returns undelivered notes and answered questions only, then marks them', async () => {
    const { store } = memoryStore()
    const note = await queueNote(store, PLAN_PATH, { text: 'steer', targetTask: '2' })
    const answered = await addQuestion(store, PLAN_PATH, QUESTION)
    await addQuestion(store, PLAN_PATH, { ...QUESTION, question: 'Still open?' })
    expect(await answerQuestion(store, PLAN_PATH, answered.id, 'new')).toEqual({ ...answered, answer: 'new' })

    const first = await takeUndelivered(store, PLAN_PATH, 100)
    expect(first).toEqual({
      notes: [{ id: note.id, text: 'steer', targetTask: '2' }],
      answers: [{ id: answered.id, ...QUESTION, answer: 'new' }],
    })
    expect(await takeUndelivered(store, PLAN_PATH, 200)).toEqual({ notes: [], answers: [] })

    const inbox = await readInbox(store, PLAN_PATH)
    expect(inbox.notes[0]?.deliveredAt).toBe(100)
    expect(inbox.questions[0]?.deliveredAt).toBe(100)
    expect(inbox.questions[1]?.deliveredAt).toBeUndefined()
  })

  test('applyOutcomes records outcomes; an unknown id is an error naming it and writes nothing', async () => {
    const { store } = memoryStore()
    const note = await queueNote(store, PLAN_PATH, { text: 'steer', targetTask: '2' })
    const question = await addQuestion(store, PLAN_PATH, QUESTION)
    await answerQuestion(store, PLAN_PATH, question.id, 'reuse')
    await takeUndelivered(store, PLAN_PATH, 100)

    const unknown = await applyOutcomes(store, PLAN_PATH, [
      { id: note.id, outcome: 'amended T3' },
      { id: 'n999', outcome: 'logged' },
    ])
    expect(unknown).toEqual({ error: expect.stringContaining('n999') })
    expect((await readInbox(store, PLAN_PATH)).notes[0]?.outcome).toBeUndefined()

    expect(
      await applyOutcomes(store, PLAN_PATH, [
        { id: note.id, outcome: 'amended T3' },
        { id: question.id, outcome: 'logged, matches default' },
      ]),
    ).toEqual({ isDone: true })
    const inbox = await readInbox(store, PLAN_PATH)
    expect(inbox.notes[0]?.outcome).toBe('amended T3')
    expect(inbox.questions[0]?.outcome).toBe('logged, matches default')
  })

  test('a note can be withdrawn while undelivered, never after', async () => {
    const { store } = memoryStore()
    const early = await queueNote(store, PLAN_PATH, { text: 'withdraw me', targetTask: '2' })
    expect(await withdrawNote(store, PLAN_PATH, early.id)).toEqual({ isDone: true })
    expect((await readInbox(store, PLAN_PATH)).notes).toEqual([])

    const late = await queueNote(store, PLAN_PATH, { text: 'too late', targetTask: '2' })
    await takeUndelivered(store, PLAN_PATH, 100)
    expect(await withdrawNote(store, PLAN_PATH, late.id)).toEqual({ error: expect.stringContaining('delivered') })
    expect((await readInbox(store, PLAN_PATH)).notes).toHaveLength(1)
    expect(await withdrawNote(store, PLAN_PATH, 'n999')).toEqual({ error: expect.stringContaining('n999') })
  })

  // A chip still showing a withdrawn note must not be able to withdraw the note queued after it.
  test('an id is never reused after the highest note is withdrawn', async () => {
    const { store } = memoryStore()
    const first = await queueNote(store, PLAN_PATH, { text: 'withdraw me', targetTask: '2' })
    await withdrawNote(store, PLAN_PATH, first.id)
    const second = await queueNote(store, PLAN_PATH, { text: 'keep me', targetTask: '2' })
    expect(second.id).not.toBe(first.id)
    // Every other write (delivery, outcomes) must carry the counter forward, not reset it.
    await takeUndelivered(store, PLAN_PATH, 100)
    await applyOutcomes(store, PLAN_PATH, [{ id: second.id, outcome: 'logged' }])
    const third = await queueNote(store, PLAN_PATH, { text: 'after delivery', targetTask: '3' })
    expect([first.id, second.id]).not.toContain(third.id)
  })

  test('releaseOldestNote removes and returns one undelivered note, oldest first, keeping the rest', async () => {
    const { store } = memoryStore()
    const delivered = await queueNote(store, PLAN_PATH, { text: 'taken', targetTask: '2' })
    await takeUndelivered(store, PLAN_PATH, 100)
    const first = await queueNote(store, PLAN_PATH, { text: 'first', targetTask: '2' })
    const second = await queueNote(store, PLAN_PATH, { text: 'second', targetTask: '3' })
    const question = await addQuestion(store, PLAN_PATH, QUESTION)

    expect(await releaseOldestNote(store, PLAN_PATH)).toEqual({ id: first.id, text: 'first', targetTask: '2' })
    const inbox = await readInbox(store, PLAN_PATH)
    expect(inbox.notes.map(n => n.id)).toEqual([delivered.id, second.id])
    expect(inbox.questions.map(q => q.id)).toEqual([question.id])
    expect(await releaseOldestNote(store, PLAN_PATH)).toEqual({ id: second.id, text: 'second', targetTask: '3' })
    // Released notes are gone, so a later checkpoint cannot deliver them a second time.
    expect((await takeUndelivered(store, PLAN_PATH, 200)).notes).toEqual([])
    // The counter is carried forward, so a released id is never reissued.
    const next = await queueNote(store, PLAN_PATH, { text: 'after', targetTask: '3' })
    expect([delivered.id, first.id, second.id, question.id]).not.toContain(next.id)
  })

  test('releaseOldestNote with nothing undelivered returns undefined and writes nothing', async () => {
    const { store, entries } = memoryStore()
    expect(await releaseOldestNote(store, PLAN_PATH)).toBeUndefined()
    expect(entries).toEqual({})

    await queueNote(store, PLAN_PATH, { text: 'taken', targetTask: '2' })
    await takeUndelivered(store, PLAN_PATH, 100)
    const before = JSON.stringify(entries)
    expect(await releaseOldestNote(store, PLAN_PATH)).toBeUndefined()
    expect(JSON.stringify(entries)).toBe(before)
  })

  test('an answer is refused for an unknown question and after delivery', async () => {
    const { store } = memoryStore()
    expect(await answerQuestion(store, PLAN_PATH, 'q999', 'x')).toEqual({ error: expect.stringContaining('q999') })
    const question = await addQuestion(store, PLAN_PATH, QUESTION)
    await answerQuestion(store, PLAN_PATH, question.id, 'new')
    await takeUndelivered(store, PLAN_PATH, 100)
    expect(await answerQuestion(store, PLAN_PATH, question.id, 'reuse')).toEqual({
      error: expect.stringContaining('delivered'),
    })
  })

  test('a changed answer before delivery replaces the first and is the one delivered', async () => {
    const { store } = memoryStore()
    const question = await addQuestion(store, PLAN_PATH, QUESTION)
    await answerQuestion(store, PLAN_PATH, question.id, 'reuse')
    expect(await answerQuestion(store, PLAN_PATH, question.id, 'new')).toEqual({ ...question, answer: 'new' })
    expect((await readInbox(store, PLAN_PATH)).questions).toEqual([{ ...question, answer: 'new' }])
    expect((await takeUndelivered(store, PLAN_PATH, 100)).answers).toEqual([
      { id: question.id, ...QUESTION, answer: 'new' },
    ])
  })

  test('sweepStale deletes entries whose plan file is gone and leaves other keys alone', async () => {
    const { store, entries } = memoryStore()
    await queueNote(store, PLAN_PATH, { text: 'keep', targetTask: '2' })
    await queueNote(store, GONE_PATH, { text: 'drop', targetTask: '1' })
    entries['unrelated'] = 1

    const removed = await sweepStale(store, async path => path === PLAN_PATH)
    expect(removed).toEqual([GONE_PATH])
    expect(Object.keys(entries).sort()).toEqual([inboxKey(PLAN_PATH), 'unrelated'].sort())
  })
})

describe('checkpoint over the store', () => {
  test('delivers the pending inbox once and marks it delivered', async ($, on) => {
    const { store, entries } = memoryStore()
    const note = await queueNote(store, PLAN_PATH, { text: 'steer', targetTask: '2' })
    world(on, { [PLAN_PATH]: PLAN }, entries)
    await start($)

    const ran = await $.tool.call({ tool: TOOL, planPath: PLAN_PATH_BACKSLASH })
    expect(ran.deny).toBeUndefined()
    expect(JSON.parse(String(ran.result))).toEqual({
      notes: [{ id: note.id, text: 'steer', targetTask: '2' }],
      answers: [],
    })
    const again = await $.tool.call({ tool: TOOL, planPath: PLAN_PATH })
    expect(JSON.parse(String(again.result))).toEqual({ notes: [], answers: [] })
    expect(entries[inboxKey(PLAN_PATH)]).toEqual({
      notes: [{ id: note.id, text: 'steer', targetTask: '2', deliveredAt: 7000 }],
      questions: [],
      issued: 1,
    })
  })

  test('applied records outcomes, and an unknown id is an error naming it', async ($, on) => {
    const { store, entries } = memoryStore()
    const note = await queueNote(store, PLAN_PATH, { text: 'steer', targetTask: '2' })
    await takeUndelivered(store, PLAN_PATH, 100)
    world(on, { [PLAN_PATH]: PLAN }, entries)
    await start($)

    const bad = await $.tool.call({ tool: TOOL, planPath: PLAN_PATH, applied: [{ id: 'n42', outcome: 'x' }] })
    expect(bad.deny).toContain('n42')

    const good = await $.tool.call({
      tool: TOOL,
      planPath: PLAN_PATH,
      applied: [{ id: note.id, outcome: 'inserted Task 2.1' }],
    })
    expect(good.deny).toBeUndefined()
    expect(entries[inboxKey(PLAN_PATH)]).toEqual({
      notes: [{ id: note.id, text: 'steer', targetTask: '2', deliveredAt: 100, outcome: 'inserted Task 2.1' }],
      questions: [],
      issued: 1,
    })
  })

  test('completedTasks all ticked in the plan is accepted and delivers', async ($, on) => {
    const { store, entries } = memoryStore()
    const note = await queueNote(store, PLAN_PATH, { text: 'steer', targetTask: '2' })
    world(on, { [PLAN_PATH]: PLAN }, entries)
    await start($)
    const ran = await $.tool.call({ tool: TOOL, planPath: PLAN_PATH, completedTasks: ['1'] })
    expect(ran.deny).toBeUndefined()
    expect(JSON.parse(String(ran.result)).notes.map((n: { id: string }) => n.id)).toEqual([note.id])
  })

  // A refused call stores nothing: the note stays undelivered and the next good call delivers it.
  for (const [name, completedTasks, named] of [
    ['an id whose box is not ticked', ['1', '2'], '2'],
    ['an id not in the plan', ['7'], '7'],
  ] as const) {
    test(`completedTasks naming ${name} is denied and delivers nothing`, async ($, on) => {
      const { store, entries } = memoryStore()
      const note = await queueNote(store, PLAN_PATH, { text: 'steer', targetTask: '2' })
      world(on, { [PLAN_PATH]: PLAN }, entries)
      await start($)
      const before = JSON.stringify(entries[inboxKey(PLAN_PATH)])

      const ran = await $.tool.call({ tool: TOOL, planPath: PLAN_PATH, completedTasks: [...completedTasks] })
      expect(ran.deny).toContain(named)
      expect(ran.deny).toContain('- [x] Done')
      expect(ran.result).toBeUndefined()
      expect(JSON.stringify(entries[inboxKey(PLAN_PATH)])).toBe(before)

      const next = await $.tool.call({ tool: TOOL, planPath: PLAN_PATH })
      expect(JSON.parse(String(next.result)).notes.map((n: { id: string }) => n.id)).toEqual([note.id])
    })
  }

  test('a checkpoint that finds every task done with nothing pending deletes the entry', async ($, on) => {
    const { store, entries } = memoryStore()
    await queueNote(store, PLAN_PATH, { text: 'already seen', targetTask: '2' })
    await takeUndelivered(store, PLAN_PATH, 100)
    world(on, { [PLAN_PATH]: DONE_PLAN }, entries)
    await start($)

    const ran = await $.tool.call({ tool: TOOL, planPath: PLAN_PATH })
    expect(JSON.parse(String(ran.result))).toEqual({ notes: [], answers: [] })
    expect(entries[inboxKey(PLAN_PATH)]).toBeUndefined()
  })

  // A last-boundary delivery can insert a task, so the plan isn't finished and its next
  // checkpoint reports `applied` ids the entry must still hold.
  test('an all-done checkpoint that delivers something keeps the entry for the applied report', async ($, on) => {
    const { store, entries } = memoryStore()
    const note = await queueNote(store, PLAN_PATH, { text: 'last word', targetTask: '2' })
    const files: Record<string, string> = { [PLAN_PATH]: DONE_PLAN }
    world(on, files, entries)
    await start($)

    const ran = await $.tool.call({ tool: TOOL, planPath: PLAN_PATH })
    expect(JSON.parse(String(ran.result)).notes).toEqual([{ id: note.id, text: 'last word', targetTask: '2' }])
    expect(entries[inboxKey(PLAN_PATH)]).toBeDefined()

    files[PLAN_PATH] = DONE_PLAN.replace('## Decisions', `${block('Task 2.1: Last word', false)}\n## Decisions`)
    const applied = await $.tool.call({
      tool: TOOL,
      planPath: PLAN_PATH,
      applied: [{ id: note.id, outcome: 'inserted Task 2.1' }],
    })
    expect(applied.deny).toBeUndefined()
    const kept = entries[inboxKey(PLAN_PATH)] as { notes: { outcome?: string }[] }
    expect(kept.notes[0]?.outcome).toBe('inserted Task 2.1')

    files[PLAN_PATH] = DONE_PLAN.replace('## Decisions', `${block('Task 2.1: Last word', true)}\n## Decisions`)
    const last = await $.tool.call({ tool: TOOL, planPath: PLAN_PATH })
    expect(JSON.parse(String(last.result))).toEqual({ notes: [], answers: [] })
    expect(entries[inboxKey(PLAN_PATH)]).toBeUndefined()
  })

  test('session.start and checkpoint delete the entries of plan files that no longer exist', async ($, on) => {
    const { store, entries } = memoryStore()
    await queueNote(store, PLAN_PATH, { text: 'keep', targetTask: '2' })
    await queueNote(store, GONE_PATH, { text: 'drop', targetTask: '1' })
    const files: Record<string, string> = { [PLAN_PATH]: PLAN }
    world(on, files, entries)

    await start($)
    expect(entries[inboxKey(GONE_PATH)]).toBeUndefined()
    expect(entries[inboxKey(PLAN_PATH)]).toBeDefined()

    // A plan deleted mid-session (by /implement's Cleanup) goes at the next checkpoint of any plan.
    const OTHER = 'C:/work/plans/other.md'
    files[OTHER] = PLAN
    delete files[PLAN_PATH]
    await $.tool.call({ tool: TOOL, planPath: OTHER })
    expect(entries[inboxKey(PLAN_PATH)]).toBeUndefined()
  })

  // The inbox lives only in $.store. One module instance (this file's import of ./inbox)
  // writes it; the plugin's own registration, a separate instance in a fresh engine, delivers it;
  // a second session.start reads the delivered marks back instead of re-delivering.
  test('the inbox survives a module reload and a new session', async ($, on) => {
    const { store, entries } = memoryStore()
    const note = await queueNote(store, PLAN_PATH, { text: 'from last session', targetTask: '2' })
    const question = await addQuestion(store, PLAN_PATH, QUESTION)
    await answerQuestion(store, PLAN_PATH, question.id, 'new')
    world(on, { [PLAN_PATH]: PLAN }, entries)

    await start($)
    const ran = await $.tool.call({ tool: TOOL, planPath: PLAN_PATH })
    const delivered = JSON.parse(String(ran.result))
    expect(delivered.notes.map((n: { id: string }) => n.id)).toEqual([note.id])
    expect(delivered.answers.map((a: { id: string }) => a.id)).toEqual([question.id])

    await start($)
    const after = await $.tool.call({ tool: TOOL, planPath: PLAN_PATH })
    expect(JSON.parse(String(after.result))).toEqual({ notes: [], answers: [] })
    const kept = entries[inboxKey(PLAN_PATH)] as { notes: { deliveredAt?: number }[] }
    expect(kept.notes[0]?.deliveredAt).toBe(7000)
  })
})
