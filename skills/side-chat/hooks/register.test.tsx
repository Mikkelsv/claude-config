import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine, Plugin } from 'claude-code/testing'

const PLUGIN = 'side-chat'
const TOOL = 'mcp__side-chat__checkpoint'
const PLAN_PATH = 'C:/work/plans/fault-export.md'

const block = (heading: string, isDone: boolean) => `### ${heading}

- [${isDone ? 'x' : ' '}] Implement
- [${isDone ? 'x' : ' '}] Done

**Dependencies:** None
`

const PLAN = `# Plan: fault-export

## Tasks

${block('Task 1: Parser', true)}
${block('Task 2: Band — **milestone**', false)}
${block('Task 3: Store', false)}
## Decisions & Review Items
`

const DONE_PLAN = PLAN.replaceAll('- [ ] Done', '- [x] Done')

const BAND_PROPS = {
  hasSurvey: false,
  isWorking: true,
  maxRows: 10,
  bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

// The world beneath the plugin: a session that binds, files from a map, pane opens recorded,
// and an engine band drawn as one keyed Text so "the plugin drew nothing" is assertable.
const world = (on: On, files: Record<string, string>) => {
  const opens: unknown[] = []
  mock.clock(on, { now: 5000 })
  mock.store(on)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  // Not in a repository, so the slim band reads `Side chat` (band.test.tsx names a repository).
  on('session.repo', () => ({ value: null }))
  on('tool.register', ($, e) => ({ value: { tool: `mcp__${PLUGIN}__${e.name}` } }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('fs.read', ($, e) => {
    // The engine hands fs hooks the OS spelling (backslashes on Windows).
    const text = files[e.path.replaceAll('\\', '/')]
    return text === undefined ? { deny: `ENOENT: ${e.path}` } : { value: text }
  })
  on('fs.exists', ($, e) => ({ value: files[e.path.replaceAll('\\', '/')] !== undefined }))
  on('ui.open', ($, e) => {
    opens.push(e)
    return { value: { isPlaced: true as const } }
  })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine band</Text>
  })
  return opens
}

// The test's `$` has no state noun, and a test's own hooks may not call `$.state`; an inline
// plugin that reads side-chat's value through a command of its own is the probe. Its
// `$.state.get` key stays a literal: the probe loads as its own module, where `PLUGIN` is not
// in scope, and the scan refuses a non-literal reference.
const PROBE: Plugin = {
  name: 'probe',
  register(on) {
    on('session.start', async ($, e, next) => {
      await $.command.register({ name: 'probe-active', description: 'probe' })
      return next(e)
    })
    on('command.run', { command: 'probe-active' }, async $ => {
      const read = await $.state.get({ plugin: 'side-chat', key: 'activePlan' })
      return { text: JSON.stringify(read.value ?? null) }
    })
  },
}

// `as never`: the engine's command.run input also wants args/origin/presentation, which the
// engine fills when a person types the command and which the probe does not read.
const storedActive = async ($: Engine) =>
  JSON.parse((await $.command.run({ command: 'probe-active' } as never)).text ?? 'undefined')

test('checkpoint parses the plan, stores it as active and returns an empty inbox', { plugins: [PROBE] }, async ($, on) => {
  world(on, { [PLAN_PATH]: PLAN })
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })

  const ran = await $.tool.call({ tool: TOOL, planPath: PLAN_PATH })
  expect(ran.deny).toBeUndefined()
  expect(JSON.parse(String(ran.result))).toEqual({ notes: [], answers: [] })

  const value = await storedActive($)
  expect(value).toEqual({
    planPath: PLAN_PATH,
    plan: {
      title: 'fault-export',
      tasks: [
        { id: '1', title: 'Parser', isDone: true, isMilestone: false },
        { id: '2', title: 'Band', isDone: false, isMilestone: true },
        { id: '3', title: 'Store', isDone: false, isMilestone: false },
      ],
    },
  })
})

test('checkpoint on an unreadable plan is an error naming the reason', { plugins: [PROBE] }, async ($, on) => {
  world(on, {})
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })
  const ran = await $.tool.call({ tool: TOOL, planPath: PLAN_PATH })
  expect(ran.deny).toContain('cannot read')
  expect(ran.deny).toContain(PLAN_PATH)
  expect(await storedActive($)).toBeNull()
})

test('checkpoint on a malformed plan is an error naming the parse failure', { plugins: [PROBE] }, async ($, on) => {
  world(on, { [PLAN_PATH]: '# Not a plan\n' })
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })
  const ran = await $.tool.call({ tool: TOOL, planPath: PLAN_PATH })
  expect(ran.deny).toContain('# Plan:')
  expect(await storedActive($)).toBeNull()
})

test('checkpoint without planPath is an error', async ($, on) => {
  world(on, {})
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })
  const ran = await $.tool.call({ tool: TOOL })
  expect(ran.deny).toContain('planPath')
})

// Ticked-box checks are pinned in inbox.test.ts, which can seed a pending note to show nothing is delivered.
test('checkpoint with completedTasks that is not an array of strings is an error', { plugins: [PROBE] }, async ($, on) => {
  world(on, { [PLAN_PATH]: PLAN })
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })
  const ran = await $.tool.call({ tool: TOOL, planPath: PLAN_PATH, completedTasks: '1' })
  expect(ran.deny).toContain('completedTasks')
  expect(await storedActive($)).toBeNull()
})

// session.test.tsx pins the slim band drawn before any checkpoint.
test('band draws the slim form before a checkpoint, then progress after one, and [Open] opens the pane', async ($, on) => {
  const opens = world(on, { [PLAN_PATH]: PLAN })
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: PLUGIN, surface, component: 'AbovePrompt', props: BAND_PROPS })
    expect((await ui.find({ type: 'Text', text: 'Side chat' }))?.text).toBe('Side chat')
    expect(await ui.find({ type: 'Text', text: 'fault-export' })).toBeUndefined()
    await ui.unmount()
  }

  await $.tool.call({ tool: TOOL, planPath: PLAN_PATH })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: PLUGIN, surface, component: 'AbovePrompt', props: BAND_PROPS })
    expect((await ui.find({ type: 'Text', text: 'fault-export' }))?.text).toBe('fault-export ▓▓▓░░░░░░░ 1/3 · T2 running')
    await ui.press({ key: 'spar' })
    await ui.unmount()
  }
  // [Open] is the person's press, so the engine places the pane at any width.
  const pane = { id: 'side-chat', title: 'fault-export Side chat' }
  expect(opens).toEqual([pane, pane])
})

test('band shows a tick when every task is done', async ($, on) => {
  world(on, { [PLAN_PATH]: DONE_PLAN })
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: TOOL, planPath: PLAN_PATH })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: PLUGIN, surface, component: 'AbovePrompt', props: BAND_PROPS })
    expect((await ui.find({ type: 'Text', text: 'fault-export' }))?.text).toBe('fault-export ✓ 3/3')
    await ui.unmount()
  }
})

test('band yields to a survey', async ($, on) => {
  world(on, { [PLAN_PATH]: PLAN })
  await $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: TOOL, planPath: PLAN_PATH })
  const ui = await $.ui.mount({
    plugin: PLUGIN,
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { ...BAND_PROPS, hasSurvey: true },
  })
  expect(await ui.find({ text: 'engine band' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'fault-export' })).toBeUndefined()
})
