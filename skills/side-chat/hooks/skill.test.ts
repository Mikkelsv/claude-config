import type { ModelForkResult, On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock, Mounted } from 'claude-code/testing'

// A `/<skill>` ask: the fork is tool-less and can't invoke the Skill tool, so the mod reads the
// skill's SKILL.md from disk (global skills folder first, then the project's) and hands its body
// to the fork, instead of the fork improvising from the skill's one-line description.

const PLUGIN = 'side-chat'
const PANE = 'side-chat'
const CHECKPOINT = 'mcp__side-chat__checkpoint'
const PLAN_PATH = 'C:/work/plans/fault-export.md'
const SESSION_ID = '3f1c2b9e-7a44-4d1e-9b0a-5c6d7e8f9a01'
const CHAT_KEY = 'chat:' + SESSION_ID
const SESSION_CWD = 'C:/work'
const FORK_DELAY = 1000

const PLAN = `# Plan: fault-export

## Tasks

### Task 1: Parser

- [ ] Done
`

const EXPLAIN = `---
name: explain
description: Read-only orientation to the current branch.
---

# Explain

## Input

> $ARGUMENTS

## Phase 2 — Overview (always shown)

Render the Explanation, What's decided, Architecture fit and File fit.
`

const PROJECT_ONLY = `---
name: setup-data
description: Seed the dev database.
---

Seed it from fixtures/.
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

const norm = (path: string) => path.replaceAll('\\', '/')

const world = (on: On) => {
  const forks: string[] = []
  const reads: string[] = []
  const entries: Record<string, unknown> = {}
  const clock: MockClock = mock.clock(on, { now: 5000 })
  mock.session(on)
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
  // Global skills are siblings of the mod's folder; a project skill sits under the session cwd.
  const file = (path: string) => {
    if (path === PLAN_PATH) return PLAN
    if (path.endsWith('/explain/SKILL.md') && !path.startsWith(SESSION_CWD)) return EXPLAIN
    if (path === `${SESSION_CWD}/.claude/skills/setup-data/SKILL.md`) return PROJECT_ONLY
    return undefined
  }
  on('fs.read', ($, e) => {
    const path = norm(e.path)
    reads.push(path)
    const text = file(path)
    return text === undefined ? { deny: `ENOENT: ${e.path}` } : { value: text }
  })
  on('fs.exists', ($, e) => ({ value: file(norm(e.path)) !== undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('model.fork', async ($, e) => {
    forks.push(e.prompt)
    await clock.sleep(FORK_DELAY)
    return { value: { isAnswered: true, text: 'Overview: …', usage: USAGE } as ModelForkResult }
  })
  const chat = () => (entries[CHAT_KEY] as { turns: Turn[] } | undefined)?.turns ?? []
  return { forks, reads, clock, chat }
}

const ask = async ($: Engine, clock: MockClock, text: string) => {
  await $.session.start({ cwd: SESSION_CWD, surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: CHECKPOINT, planPath: PLAN_PATH })
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'Pane' as const, requestId: PANE, props: PANE_PROPS })
  const input = (await (ui as Pick<Mounted, 'findAll'>).findAll({ type: 'Input' })).find(
    i => i.props.placeholder === 'ask or steer…',
  )
  await ui.input({ key: input?.key ?? 'no chat Input drawn', text })
  await clock.settle()
  await clock.advance(FORK_DELAY)
}

test('a /skill ask hands the fork the skill body with its arguments, not the frontmatter', async ($, on) => {
  const { forks, clock } = world(on)
  await ask($, clock, '/explain the band')
  expect(forks.length).toBe(1)
  expect(forks[0]).toContain('/explain')
  expect(forks[0]).toContain('## Phase 2 — Overview (always shown)')
  expect(forks[0]).toContain('> the band')
  expect(forks[0]).not.toContain('$ARGUMENTS')
  expect(forks[0]).not.toContain('description: Read-only orientation')
})

test('a /skill ask with no arguments says so in place of $ARGUMENTS', async ($, on) => {
  const { forks, clock } = world(on)
  await ask($, clock, '/explain')
  expect(forks[0]).toContain('> (none)')
})

test('a skill only the project has is read from its .claude/skills folder', async ($, on) => {
  const { forks, clock } = world(on)
  await ask($, clock, '/setup-data')
  expect(forks[0]).toContain('Seed it from fixtures/.')
})

test('an unknown /skill writes a line and asks no fork', async ($, on) => {
  const { forks, clock, chat } = world(on)
  await ask($, clock, '/nosuch thing')
  expect(forks.length).toBe(0)
  expect(chat().at(-1)).toEqual({ role: 'error', text: 'skill: /nosuch not found in the global or project skills folder' })
})

test('a plain question reads no skill file', async ($, on) => {
  const { forks, reads, clock } = world(on)
  await ask($, clock, 'what does /explain do?')
  expect(forks.length).toBe(1)
  expect(reads.some(p => p.endsWith('/SKILL.md'))).toBe(false)
  expect(forks[0]).not.toContain('<skill name=')
})
