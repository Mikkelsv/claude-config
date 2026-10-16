import { describe, expect, test } from 'claude-code/testing'

import { parsePlan } from './planParser'

const task = (heading: string, done: ' ' | 'x', extra = '') => `### ${heading}

- [${done}] Implement
- [${done}] Refactor
- [${done}] Docs & tests
- [${done}] Done

**Context:** Something.
**Files:** \`hooks/a.ts\`
**Dependencies:** None
**Parallel group:** —
${extra}`

const plan = (...tasks: string[]) => `---
mode: agentic
---

<!-- Task plan — single phase. -->

# Plan: side-chat mod

## Overview

Text.

## Tasks

${tasks.join('\n')}
## Future Considerations

- Later.

## Decisions & Review Items

- *plan-optimizer:* something.
`

describe('parsePlan', () => {
  test('fresh plan: title and every task not done', () => {
    const parsed = parsePlan(
      plan(task('Task 1: Skeleton, load path', ' '), task('Task 2: Inbox store', ' ')),
    )
    expect(parsed).toEqual({
      title: 'side-chat mod',
      tasks: [
        { id: '1', title: 'Skeleton, load path', isDone: false, isMilestone: false },
        { id: '2', title: 'Inbox store', isDone: false, isMilestone: false },
      ],
    })
  })

  test('half-done plan: done flag per task', () => {
    const parsed = parsePlan(
      plan(task('Task 1: One', 'x'), task('Task 2: Two', 'x'), task('Task 3: Three', ' ')),
    )
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.tasks.map(t => t.isDone)).toEqual([true, true, false])
  })

  test('milestone suffix is stripped and flagged', () => {
    const parsed = parsePlan(
      plan(task('Task 5: `/implement` posts questions — **milestone**', ' ')),
    )
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.tasks[0]).toEqual({
      id: '5',
      title: '`/implement` posts questions',
      isDone: false,
      isMilestone: true,
    })
  })

  test('rework id N.1 is its own task', () => {
    const parsed = parsePlan(
      plan(task('Task 2: Two', 'x'), task('Task 2.1: Rework — reuse ColorMap?', ' ')),
    )
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.tasks.map(t => [t.id, t.title])).toEqual([
      ['2', 'Two'],
      ['2.1', 'Rework — reuse ColorMap?'],
    ])
  })

  test('an inserted Rework block between tasks 2 and 3 is counted in place', () => {
    const parsed = parsePlan(
      plan(
        task('Task 2: Two', 'x', '**Result:** ALL GOOD · abc1234 · two landed\n'),
        task('Task 2.1: Rework — reuse ColorMap or a new type?', ' ', '**Result:**\n'),
        task('Task 3: Three', ' '),
      ),
    )
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.tasks.map(t => [t.id, t.title, t.isDone])).toEqual([
      ['2', 'Two', true],
      ['2.1', 'Rework — reuse ColorMap or a new type?', false],
      ['3', 'Three', false],
    ])
    expect(parsed.tasks[1]?.result).toBeUndefined()
  })

  test('result line is read from the task block', () => {
    const parsed = parsePlan(
      plan(
        task('Task 1: One', 'x', '**Result:** pass · abc1234 · parser and band landed\n'),
        task('Task 2: Two', ' '),
      ),
    )
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.tasks[0]?.result).toBe('pass · abc1234 · parser and band landed')
    expect(parsed.tasks[1]?.result).toBeUndefined()
  })

  test('a heading inside a code fence does not end a task block', () => {
    const fenced = '```bash\n# a shell comment\n### Task 9: not a task\n```\n'
    const parsed = parsePlan(plan(task('Task 1: One', ' ', fenced), task('Task 2: Two', 'x')))
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.tasks.map(t => t.id)).toEqual(['1', '2'])
  })

  // Plans edited on Windows can carry CRLF; `- [X] Done` is how some editors tick a box.
  test('CRLF line endings and an upper-case [X] Done parse like LF', () => {
    const lf = plan(task('Task 1: One', 'x', '**Result:** pass · abc1234 · one\n'), task('Task 2: Two', ' '))
    const crlf = lf.replace('- [x] Done', '- [X] Done').replaceAll('\n', '\r\n')
    const parsed = parsePlan(crlf)
    expect(parsed).toEqual(parsePlan(lf))
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.tasks.map(t => t.isDone)).toEqual([true, false])
    expect(parsed.tasks[0]?.result).toBe('pass · abc1234 · one')
  })

  test('a heading inside a ~~~ fence does not end a task block', () => {
    const fenced = '~~~text\n## Not a section\n~~~\n'
    const parsed = parsePlan(plan(task('Task 1: One', ' ', fenced), task('Task 2: Two', 'x')))
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.tasks.map(t => [t.id, t.isDone])).toEqual([
      ['1', false],
      ['2', true],
    ])
  })

  test('malformed: no "# Plan:" title', () => {
    const parsed = parsePlan(plan(task('Task 1: One', ' ')).replace('# Plan: ', '# '))
    expect(parsed).toEqual({ error: expect.stringContaining('# Plan:') })
  })

  test('malformed: no tasks', () => {
    expect(parsePlan(plan())).toEqual({ error: expect.stringContaining('no tasks') })
  })

  test('malformed: a task block missing its Done line', () => {
    const broken = task('Task 2: Two', ' ').replace('- [ ] Done\n', '')
    const parsed = parsePlan(plan(task('Task 1: One', 'x'), broken))
    expect(parsed).toEqual({ error: expect.stringContaining('Task 2') })
  })
})
