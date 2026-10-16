import type { Elements, RenderElement, SessionRepo } from 'claude-code'

import type {
  SideChatActivePlan,
  SideChatChatPending,
  SideChatChatTurn,
  SideChatHeldSteer,
  SideChatNote,
  SideChatPlan,
  SideChatQuestion,
} from '../types'
import { condenseSteer } from './chatStore'
import { isPlanMode } from './planParser'

// The view only: the engine follows `$` into functions of the hooks module's own file alone, so
// chat.tsx reads state and passes the data, the element constructors and the handlers in.

// The last segment of a path or URL, `\`, `/` and scp-style `host:` all separating.
const lastSegment = (path: string) => path.replace(/[\\/]+$/, '').split(/[\\/:]/).at(-1) ?? ''

// The session's stand-in title, since the mod can't read the real one: the origin remote's
// repository name, else the root's folder name, else null outside a repository.
export const repoName = (repo: Pick<SessionRepo, 'root' | 'remote'> | null): string | null => {
  if (repo === null) return null
  const fromRemote = repo.remote === null ? '' : lastSegment(repo.remote).replace(/\.git$/, '')
  if (fromRemote !== '') return fromRemote
  const fromRoot = lastSegment(repo.root)
  return fromRoot === '' ? null : fromRoot
}

// The slim band's text and the session pane's title.
export const chatTitle = (name: string | null) => (name === null ? 'Side chat' : `${name} Side chat`)

// `name` is `repoName`'s, read only in session mode (it is unused in plan mode).
export const paneTitle = (active: SideChatActivePlan | null, name: string | null) =>
  isPlanMode(active) ? `${active.plan.title} Side chat` : chatTitle(name)

// An unplaced pane is said aloud, with the engine's reason. Unasked (a new question) it waits for
// a wider window or a press; asked ([Open], `/side-chat`) it is placed at any width, so only a
// surface that places no panes can refuse it.
export const paneRefusal = (isAsked: boolean, reason: string) =>
  isAsked
    ? `side chat: the pane could not be drawn (${reason})`
    : `side chat: widen the window or press [Open] to see the pane (${reason})`

const BAR_CELLS = 10

// The band's text once a plan has checkpointed, finished or not.
export const bandText = (plan: SideChatPlan, open: { questions: number; notes: number }) => {
  const total = plan.tasks.length
  const done = plan.tasks.filter(t => t.isDone).length
  const next = plan.tasks.find(t => !t.isDone)
  // Inbox notes are "steers" to the person; the store and `checkpoint` keep the name `notes`.
  const steers = open.notes === 0 ? '' : ` · ${open.notes} ${open.notes === 1 ? 'steer' : 'steers'}`
  const counts = (open.questions > 0 ? ` · ${open.questions}Q` : '') + steers
  if (next === undefined) return `${plan.title} ✓ ${done}/${total}${counts}`
  const filled = Math.round((done / total) * BAR_CELLS)
  const bar = '▓'.repeat(filled) + '░'.repeat(BAR_CELLS - filled)
  return `${plan.title} ${bar} ${done}/${total} · T${next.id} running${counts}`
}

// Box, Button, Markdown and Text are on every surface's table; Input is absent on mobile.
export type PaneElements = Pick<Elements['terminal'], 'Box' | 'Button' | 'Markdown' | 'Text'> & {
  Input: Elements['terminal']['Input'] | undefined
}

export type PaneModel = {
  // The plan in plan mode (`isPlanMode`), whose task list is the empty chat's body; undefined in
  // session mode, where the empty chat offers the session ask instead.
  plan: SideChatPlan | undefined
  open: readonly SideChatQuestion[]
  chat: readonly SideChatChatTurn[]
  // Questions taken this session: the ask Input's key, so each submit remounts it empty.
  asked: number
  // The active plan's queued notes (steers, to the person), from its inbox: undelivered ones can
  // still be withdrawn.
  notes: readonly SideChatNote[]
  // Main-thread steers (`heldSteers`): session mode's and released plan steers, submitted as
  // prompts at idle points.
  held: readonly SideChatHeldSteer[]
  // The newest proposal, if still open (`chatStore.openProposal`): its turn index and full text.
  proposal: { index: number; note: string } | undefined
  // The session's ask in flight, if any.
  pending: SideChatChatPending['kind'] | undefined
  // The Pane hook's `bodyColumns` and `scroll.bodyRows`: the chat's width cap and least height.
  bodyColumns: number
  bodyRows: number
}

export type PaneActions = {
  onAnswer: (id: string, answer: string) => Promise<unknown>
  onAsk: (question: string) => Promise<unknown>
  // The ask Input's text on every edit, kept for [Steer]; plain, no redraw.
  onDraft: (text: string) => void
  onSteerTyped: () => Promise<unknown>
  onQueueProposal: (note: string) => Promise<unknown>
  onDismissProposal: (note: string) => Promise<unknown>
  onWithdraw: (noteId: string) => Promise<unknown>
  onWithdrawHeld: (steerId: string) => Promise<unknown>
}

// The least-height parent drawChat's column grows into and centres in: its alignSelf/flexGrow
// need a known parent, and the surface's own container is not ours.
export const drawPane = (els: PaneElements, model: PaneModel, actions: PaneActions): RenderElement => {
  const { Box } = els
  return (
    <Box flexDirection="column" minHeight={model.bodyRows}>
      {drawChat(els, model, actions)}
    </Box>
  )
}

// Drawn dim and left while the ask is in flight; never stored in the history.
const PENDING_TEXT = { fork: '…thinking', lookup: '· Looking it up in the code…' } as const

// The chat column's widest, in cells, as Claude's own transcript reads: a wider pane centres it.
const CHAT_COLUMNS = 100

// Cells the proposal and question cards stand in from each pane edge, when the column is the
// pane's full width; a narrower, centred column is inset already.
const BOX_INSET = 2

// Cells the person's bubble keeps clear on its left, so a long one wraps short of the pane edge.
const BUBBLE_LEFT = 8

// One centred column of at most CHAT_COLUMNS: history, the ask in flight and the queued steers in a
// flexGrow Box, then the open questions, the open proposal and the ask input. The column grows into
// the pane body's least height (drawPane's minHeight), so a short chat puts the questions and input
// on the last rows and a long one pushes them after the history, where the engine scrolls. `↵` is
// the Input's `submitLabel`, drawn by the surface beside the field while it has focus, so its place
// is the surface's.
const drawChat = (els: PaneElements, model: PaneModel, actions: PaneActions) => {
  const { Box, Button, Input, Text } = els
  const isCapped = model.bodyColumns > CHAT_COLUMNS
  const inset = isCapped ? 0 : BOX_INSET
  // A steer's chip is drawn at its `steer` turn; only one whose turn the 50-turn cap pushed out
  // (or that has none) falls to the end of the history, so no steer goes undrawn.
  const refs = new Set(model.chat.flatMap(t => (t.role === 'steer' && t.ref !== undefined ? [t.ref] : [])))
  const strayNotes = model.notes.filter(n => !refs.has(n.id))
  const strayHeld = model.held.filter(
    s => s.questionId === undefined && !refs.has(s.id) && !(s.noteId !== undefined && refs.has(s.noteId)),
  )
  // '100%', not bodyColumns, below the cap: desktop's reported bodyColumns need not match the
  // painted width, and a numeric width drew the column right of centre.
  return (
    <Box flexDirection="column" flexGrow={1} alignSelf="center" width={isCapped ? CHAT_COLUMNS : '100%'}>
      <Box flexDirection="column" flexGrow={1}>
        {model.chat.length > 0
          ? model.chat.map(turn => drawTurn(els, turn, model, actions))
          : model.plan === undefined
            ? <Text>Ask about this session without interrupting it.</Text>
            : drawTasks(els, model.plan)}
        {strayNotes.map(note => drawNote(els, note, actions))}
        {strayHeld.map(steer => drawHeld(els, steer, actions))}
        {model.pending !== undefined && <Text dimColor>{PENDING_TEXT[model.pending]}</Text>}
      </Box>
      {model.open.map((q, index) => drawQuestion(els, q, index === 0, inset, actions))}
      {model.proposal !== undefined && drawProposal(els, model.proposal, inset, actions)}
      {/* Input has no `value` to clear: a fresh key per question or steer taken remounts it empty.
          Input is a leaf with no layout props, and the surfaces size the native field themselves
          (flexGrow and width="100%" on a wrapper were both ignored on desktop), so the wrapper
          only centres the field with [Steer] beside it and spaces them from what is above.
          [Steer] sends the typed text, which `onInput` reports, as the steer itself. */}
      {Input !== undefined && (
        <Box alignSelf="center" flexDirection="row" gap={1} marginTop={1}>
          <Input
            key={`chat:${model.asked}`}
            placeholder="ask or steer…"
            submitLabel="↵"
            onInput={text => actions.onDraft(text)}
            onSubmit={text => actions.onAsk(text)}
          />
          <Button key="steer-typed" label="➤ Steer" onPress={() => actions.onSteerTyped()} />
        </Box>
      )}
    </Box>
  )
}

// The ask input's greys on desktop's dark theme, so the bubble reads as the same material. Raw
// hex, not theme keys: no key names these greys (`subtle` filled far brighter), so a light theme
// gets the dark bubble too, and BUBBLE_TEXT is fixed light so a light theme's dark foreground
// never lands on the dark fill.
const BUBBLE_FILL = '#2b2b2b'
const BUBBLE_BORDER = '#454545'
const BUBBLE_TEXT = '#e6e6e6'

// The person's words, right-aligned and sized to their text; `round` is Box's only rounded corner.
const drawBubble = ({ Box, Text }: PaneElements, text: string) => (
  <Box
    alignSelf="flex-end"
    marginLeft={BUBBLE_LEFT}
    borderStyle="round"
    borderColor={BUBBLE_BORDER}
    backgroundColor={BUBBLE_FILL}
    paddingX={1}
    marginTop={1}
  >
    <Text color={BUBBLE_TEXT}>{text}</Text>
  </Box>
)

// 950, 48k, 48.2k: one decimal past a thousand, dropped when it is .0.
const formatTokens = (n: number) => (n < 1000 ? String(n) : `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`)

// Under a fork answer: the fork runs over the main thread's own transcript, so this is the context
// it copied, and how much of it the prompt cache served rather than the fork paying for afresh.
const contextLine = (context: number, reused: number) =>
  `· Context copied from main thread · ${formatTokens(context)} tokens, ` +
  `${reused === 0 ? 'none' : formatTokens(reused)} reused from cache`

// Laid out after Claude's own transcript: the person's turns in a bubble, every other turn left
// and unlabelled. Mobile draws the same; nothing here needs an Input.
const drawTurn = (els: PaneElements, turn: SideChatChatTurn, model: PaneModel, actions: PaneActions) => {
  const { Box, Markdown, Text } = els
  switch (turn.role) {
    case 'steer': {
      // The chip shows what its entry holds now: a released note is found by its held steer's
      // `noteId`. None found (withdrawn, or its plan's inbox swept) draws nothing.
      const note = model.notes.find(n => n.id === turn.ref)
      if (note !== undefined) return drawNote(els, note, actions)
      const held = model.held.find(s => s.id === turn.ref || (s.noteId !== undefined && s.noteId === turn.ref))
      return held === undefined ? null : drawHeld(els, held, actions)
    }
    case 'you':
      return drawBubble(els, turn.text)
    case 'answer':
      // The card is gone once answered, so this pair is the person's record that they did.
      return (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>{`Q · T${turn.task} · ${turn.question}`}</Text>
          {drawBubble(els, turn.text)}
        </Box>
      )
    case 'error':
      // The text opens with its kind (`fork:`, `look-up:`), so the line names its source.
      return <Text color="red">{turn.text}</Text>
    case 'lookup':
      return (
        <Box flexDirection="column">
          <Text dimColor>· Looked it up in the code</Text>
          <Markdown text={turn.text} />
        </Box>
      )
    case 'fork': {
      // A reply that was only its NOTE line has no text left once the line is cut.
      const answer = turn.text.trim() === '' ? <Text dimColor>(proposed a steer)</Text> : <Markdown text={turn.text} />
      if (turn.contextTokens === undefined) return answer
      return (
        <Box flexDirection="column">
          {answer}
          <Text dimColor>{contextLine(turn.contextTokens, turn.reusedTokens ?? 0)}</Text>
        </Box>
      )
    }
  }
}

// The fork's inferred steer, condensed: nothing is queued until the person presses [✓], and the
// full text is what [✓] queues. Keyed by turn index, so a superseded proposal's key is never drawn.
const drawProposal = (
  { Box, Button, Text }: PaneElements,
  proposal: { index: number; note: string },
  inset: number,
  actions: PaneActions,
) => (
  <Box flexDirection="row" gap={1} marginX={inset}>
    <Text>{`Steer: ${condenseSteer(proposal.note)}`}</Text>
    <Button key={`proposal:${proposal.index}`} label="✓" onPress={() => actions.onQueueProposal(proposal.note)} />
    <Button key={`dismiss:${proposal.index}`} label="x" onPress={() => actions.onDismissProposal(proposal.note)} />
  </Box>
)

// Undelivered: withdrawable. Delivered: the outcome `/implement` reported, once it has.
const drawNote = ({ Box, Button, Text }: PaneElements, note: SideChatNote, actions: PaneActions) => {
  if (note.deliveredAt !== undefined) {
    const outcome = note.outcome === undefined ? '' : ` · ${note.outcome}`
    return <Text dimColor>{`· steered → T${note.targetTask}: ${note.text}${outcome}`}</Text>
  }
  return (
    <Box flexDirection="row" gap={1}>
      <Text dimColor>{`· steer → T${note.targetTask}: ${note.text}`}</Text>
      <Button key={`withdraw:${note.id}`} label="x" onPress={() => actions.onWithdraw(note.id)} />
    </Box>
  )
}

// A main-thread steer (session mode's, or a released plan steer): withdrawable only while held,
// since a submitted prompt can't be called back.
const drawHeld = ({ Box, Button, Text }: PaneElements, steer: SideChatHeldSteer, actions: PaneActions) => {
  switch (steer.status) {
    case 'held':
      return (
        <Box flexDirection="row" gap={1}>
          <Text dimColor>{`· steer → next turn: ${steer.text}`}</Text>
          <Button key={`withdraw-held:${steer.id}`} label="x" onPress={() => actions.onWithdrawHeld(steer.id)} />
        </Box>
      )
    case 'sending':
      return <Text dimColor>{`· steer → sending: ${steer.text}`}</Text>
    case 'sent':
      return <Text dimColor>{`· steered → sent: ${steer.text}`}</Text>
  }
}

// The empty chat's body in plan mode: the plan's task list with each task's Result line; a milestone (full
// `/test` gate) is marked dim.
const drawTasks = ({ Box, Text }: PaneElements, plan: SideChatPlan) => (
  <Box flexDirection="column">
    {plan.tasks.map(task => (
      <Box flexDirection="column">
        <Text dimColor={task.isDone}>
          {`T${task.id} ${task.isDone ? '✓' : '·'} ${task.title}`}
          {task.isMilestone && <Text dimColor> · milestone</Text>}
        </Text>
        {task.result !== undefined && <Text dimColor>{`   ${task.result}`}</Text>}
      </Box>
    ))}
  </Box>
)

// A card in the chat, made to be spotted: a `permission`-coloured round border (the theme's colour
// for Claude's own asks), padded inside and spaced from the history and the input. Hotkeys go to
// the oldest question only: one digit per site, and of two clashing the later wins.
const drawQuestion = (
  els: PaneElements,
  q: SideChatQuestion,
  hasHotkeys: boolean,
  inset: number,
  actions: PaneActions,
) => {
  const { Box, Button, Input, Text } = els
  return (
    <Box
      key={`question:${q.id}`}
      flexDirection="column"
      borderStyle="round"
      borderColor="permission"
      paddingX={2}
      paddingY={1}
      marginX={inset}
      marginY={1}
      gap={1}
    >
      <Text bold color="permission">{`Q · T${q.task}${q.loadBearing ? ' · load-bearing' : ''}`}</Text>
      <Text bold>{q.question}</Text>
      <Text dimColor>{`▸ proceeding on: ${q.defaultOption}`}</Text>
      <Box flexDirection="row" flexWrap="wrap" gap={1}>
        {q.options.map((option, i) => {
          const hotkey = hasHotkeys && i < 9 ? String(i + 1) : undefined
          return (
            <Button
              key={`answer:${q.id}:${i}`}
              label={hotkey === undefined ? option : `${hotkey} ${option}`}
              {...(hotkey === undefined ? {} : { hotkey })}
              variant={option === q.defaultOption ? 'primary' : 'secondary'}
              onPress={() => actions.onAnswer(q.id, option)}
            />
          )
        })}
      </Box>
      {Input !== undefined && (
        <Input
          key={`other:${q.id}`}
          placeholder="other…"
          submitLabel="answer"
          onSubmit={text => actions.onAnswer(q.id, text)}
        />
      )}
    </Box>
  )
}
