import type { On, SessionRepo } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { repoName } from './pane'

// The band's slim form and the pane title name the repository (the mod can't read the session's
// title), the `–` button hides the band for the session, and `/side-chat` brings it back.

const PLUGIN = 'side-chat'
const PANE = 'side-chat'
const CHECKPOINT = 'mcp__side-chat__checkpoint'
const ASK = 'mcp__side-chat__ask'
const PLAN_PATH = 'C:/work/plans/fault-export.md'
const REMOTE = 'https://github.com/Mikkelsv/claude-config.git'

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

const repo = (root: string, remote: string | null) => ({ root, remote })

describe('repoName', () => {
  const cases: [string, { root: string; remote: string | null } | null, string | null][] = [
    ['an https remote', repo('C:/Users/mikke/.claude', REMOTE), 'claude-config'],
    ['an scp-style remote', repo('/r', 'git@github.com:Mikkelsv/claude-config.git'), 'claude-config'],
    ['an ssh remote with a port and no .git', repo('/r', 'ssh://mikkel@gerrit.example.com:29418/irma'), 'irma'],
    ['a remote with a trailing slash', repo('/r', 'https://github.com/owner/name/'), 'name'],
    ['a Windows-path remote', repo('/r', 'C:\\repos\\seisx.git'), 'seisx'],
    ['a scp-style remote with no owner', repo('/r', 'host:name.git'), 'name'],
    ['no remote, a Windows root', repo('C:\\Users\\mikke\\Documents\\Code\\irma_gerrit', null), 'irma_gerrit'],
    ['no remote, a posix root with a trailing slash', repo('/home/m/work/seisx/', null), 'seisx'],
    ['an empty remote, so the root', repo('C:/work/toy', ''), 'toy'],
    ['a remote that is only .git, so the root', repo('C:/work/toy', '.git'), 'toy'],
    ['no remote and a bare root', repo('/', null), null],
    ['not in a repository', null, null],
  ]
  for (const [name, input, expected] of cases) test(name, () => expect(repoName(input)).toBe(expected))
})

// The world beneath: a session in a repository answered from `state.repo` (null: none), the plan
// file, pane opens and command registrations recorded, and an engine band drawn as one Text so
// "the plugin drew nothing" is assertable.
const world = (on: On, plan = PLAN) => {
  const opens: unknown[] = []
  const commands: unknown[] = []
  const state: { repo: SessionRepo | null; repoReads: number } = {
    repo: { root: 'C:/Users/mikke/.claude', remote: REMOTE, internal: false, name: null },
    repoReads: 0,
  }
  mock.clock(on, { now: 5000 })
  mock.store(on)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: '3f1c2b9e-7a44-4d1e-9b0a-5c6d7e8f9a01' }))
  on('session.repo', () => {
    state.repoReads++
    return { value: state.repo }
  })
  on('tool.register', ($, e) => ({ value: { tool: `mcp__${PLUGIN}__${e.name}` } }))
  on('command.register', ($, e) => {
    commands.push(e)
    return { value: { command: e.name } }
  })
  on('fs.read', ($, e) => (e.path.replaceAll('\\', '/') === PLAN_PATH ? { value: plan } : { deny: `ENOENT: ${e.path}` }))
  on('fs.exists', ($, e) => ({ value: e.path.replaceAll('\\', '/') === PLAN_PATH }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.open', ($, e) => {
    opens.push(e)
    return { value: { isPlaced: true as const } }
  })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine band</Text>
  })
  return { opens, commands, state }
}

const start = ($: Engine) => $.session.start({ cwd: 'C:/work', surface: 'terminal', isInteractive: true })

const mountBand = ($: Engine) =>
  $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })

// `as never`: the engine's command.run input also wants args/origin/presentation, which the
// engine fills when a person types the command and which the hook does not read.
const sideChat = ($: Engine) => $.command.run({ command: 'side-chat' } as never)

test('the slim band names the repository, and [Open] opens the pane under the same name', async ($, on) => {
  const { opens } = world(on)
  await start($)
  const ui = await mountBand($)
  expect((await ui.find({ type: 'Text', text: 'claude-config Side chat' }))?.text).toBe('claude-config Side chat')
  await ui.press({ key: 'spar' })
  expect(opens).toEqual([{ id: PANE, title: 'claude-config Side chat' }])
})

test('outside a repository the band and the pane title read Side chat', async ($, on) => {
  const { opens, state } = world(on)
  state.repo = null
  await start($)
  const ui = await mountBand($)
  expect((await ui.find({ type: 'Text', text: 'Side chat' }))?.text).toBe('Side chat')
  await ui.press({ key: 'spar' })
  expect(opens).toEqual([{ id: PANE, title: 'Side chat' }])
})

test('a running plan keeps the progress band and titles the pane for the plan', async ($, on) => {
  const { opens } = world(on)
  await start($)
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  const ui = await mountBand($)
  expect((await ui.find({ type: 'Text', text: 'fault-export' }))?.text).toBe('fault-export ▓▓▓▓▓░░░░░ 1/2 · T2 running')
  expect(await ui.find({ type: 'Text', text: 'claude-config Side chat' })).toBeUndefined()
  await ui.press({ key: 'spar' })
  expect(opens).toEqual([{ id: PANE, title: 'fault-export Side chat' }])
})

test('a question on an all-done plan opens the pane unasked under the repository name', async ($, on) => {
  const { opens } = world(on, DONE_PLAN)
  await start($)
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  const question = { planPath: PLAN_PATH, task: '2', question: 'Which?', options: ['a', 'b'], defaultOption: 'a' }
  await $.tool.call({ tool: ASK, ...question, loadBearing: false })
  expect(opens).toEqual([{ id: PANE, title: 'claude-config Side chat' }])
})

test('the band ends with [Open] then [–], and draws no Explain', async ($, on) => {
  world(on)
  await start($)
  const ui = await mountBand($)
  const buttons = await ui.findAll({ type: 'Button' })
  expect(buttons.map(b => [b.key, b.props.label])).toEqual([
    ['spar', 'Open'],
    ['hide', '–'],
  ])
})

test('[–] hides the band for the session, and /side-chat shows it again and opens the pane', async ($, on) => {
  const { opens } = world(on)
  await start($)
  const ui = await mountBand($)
  await ui.press({ key: 'hide' })
  expect(await ui.find({ text: 'engine band' })).toBeDefined()
  expect(await ui.find({ key: 'spar' })).toBeUndefined()
  await ui.unmount()
  const again = await mountBand($)
  expect(await again.find({ key: 'spar' })).toBeUndefined()

  expect((await sideChat($)).text).toBe('Side chat shown.')
  expect(await again.find({ key: 'spar' })).toBeDefined()
  expect(await again.find({ text: 'engine band' })).toBeUndefined()
  expect(opens).toEqual([{ id: PANE, title: 'claude-config Side chat' }])
})

test('/side-chat with the band showing opens the pane and leaves the band as it is', async ($, on) => {
  const { opens } = world(on)
  await start($)
  const ui = await mountBand($)
  expect((await sideChat($)).text).toBe('Side chat shown.')
  expect(await ui.find({ key: 'spar' })).toBeDefined()
  expect(opens).toEqual([{ id: PANE, title: 'claude-config Side chat' }])
})

test('session start registers /side-chat', async ($, on) => {
  const { commands } = world(on)
  await start($)
  // immediate: the side chat is for use while the main thread works, so the command can't wait for idle.
  expect(commands).toEqual([
    { name: 'side-chat', description: 'Show the side chat band and open the side chat', immediate: true },
  ])
})

test('the band reads the repository once per drawing', async ($, on) => {
  const { state } = world(on)
  await start($)
  await mountBand($)
  expect(state.repoReads).toBe(1)
})
