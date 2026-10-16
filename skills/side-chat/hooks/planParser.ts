import type { SideChatActivePlan, SideChatParseError, SideChatPlan, SideChatTask } from '../types'

// Plan mode: a plan has checkpointed and a task is still not done. Anything else is session mode.
// Mode routes steers and picks the pane's title and empty state; the band shows progress whenever
// a plan has checkpointed, finished or not.
export const isPlanMode = (active: SideChatActivePlan | null): active is SideChatActivePlan =>
  active !== null && active.plan.tasks.some(t => !t.isDone)

// Keys on implement/plan-template.md's fixed shape: `# Plan:` title, `### Task <id>: <title>`
// headings and a `- [ ] Done` / `- [x] Done` checkbox per block, plus the optional `**Result:**`
// line `/implement` writes at its checkpoint.
const TITLE = /^# Plan:\s*(.+?)\s*$/
const TASK = /^### Task (\d+(?:\.\d+)*):\s*(.+?)\s*$/
const BLOCK_END = /^#{1,3} /
const DONE = /^- \[([ xX])\] Done\s*$/
const RESULT = /^\*\*Result:\*\*\s*(.+?)\s*$/
const MILESTONE = /\s+—\s+\*\*milestone\*\*$/
const FENCE = /^\s*(```|~~~)/

type Block = { id: string; heading: string; lines: string[] }

export const parsePlan = (markdown: string): SideChatPlan | SideChatParseError => {
  let title: string | undefined
  const blocks: Block[] = []
  let current: Block | undefined
  let isInFence = false

  for (const line of markdown.split(/\r?\n/)) {
    if (FENCE.test(line)) isInFence = !isInFence
    // Headings inside a code fence are content, so they neither open nor close a task block.
    const task = isInFence ? null : TASK.exec(line)
    if (task) {
      current = { id: task[1]!, heading: task[2]!, lines: [] }
      blocks.push(current)
      continue
    }
    if (!isInFence && BLOCK_END.test(line)) {
      current = undefined
      const plan = TITLE.exec(line)
      if (plan && title === undefined) title = plan[1]!
      continue
    }
    current?.lines.push(line)
  }

  if (title === undefined) return { error: 'no "# Plan: <title>" heading' }
  if (blocks.length === 0) return { error: 'no tasks: no "### Task <id>: <title>" headings' }

  const tasks: SideChatTask[] = []
  for (const block of blocks) {
    const done = block.lines.map(l => DONE.exec(l)).find(m => m !== null)
    if (!done) return { error: `Task ${block.id} has no "- [ ] Done" / "- [x] Done" line` }
    const result = block.lines.map(l => RESULT.exec(l)).find(m => m !== null)
    const isMilestone = MILESTONE.test(block.heading)
    tasks.push({
      id: block.id,
      title: block.heading.replace(MILESTONE, ''),
      isDone: done[1] !== ' ',
      isMilestone,
      ...(result ? { result: result[1]! } : {}),
    })
  }
  return { title, tasks }
}
