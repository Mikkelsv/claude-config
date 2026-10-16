export type SideChatTask = {
  id: string
  title: string
  isDone: boolean
  isMilestone: boolean
  result?: string
}

export type SideChatPlan = { title: string; tasks: SideChatTask[] }

export type SideChatParseError = { error: string }

export type SideChatActivePlan = {
  planPath: string
  plan: SideChatPlan
}

// The per-plan mailbox in `$.store`. `deliveredAt` is the checkpoint's clock time; `outcome` is
// what `/implement` reported via `applied` for a delivered note or answer.
export type SideChatNote = {
  id: string
  text: string
  targetTask: string
  deliveredAt?: number
  outcome?: string
}

export type SideChatQuestion = {
  id: string
  task: string
  question: string
  options: string[]
  defaultOption: string
  loadBearing: boolean
  answer?: string
  deliveredAt?: number
  outcome?: string
}

// `issued` counts every id ever handed out for this plan, so a withdrawn id is never reused.
export type SideChatInbox = { questions: SideChatQuestion[]; notes: SideChatNote[]; issued: number }

// What one checkpoint hands `/implement`: undelivered notes, and answered-but-undelivered questions.
export type SideChatDelivery = {
  notes: Pick<SideChatNote, 'id' | 'text' | 'targetTask'>[]
  answers: (Omit<SideChatQuestion, 'answer' | 'deliveredAt' | 'outcome'> & { answer: string })[]
}

// One line of a session's chat history: the person's question or question-card answer, the fork's
// or the look-up process's Markdown answer, or a line naming why no answer came. A fork answer may
// carry the steer its trailing `NOTE:` line proposed; `isProposalTaken` once it was queued,
// `isProposalDismissed` once the person pressed [x] on it.
export type SideChatChatTurn = {
  // `answer`: the person answered an `ask` card; `text` is the answer, `question` and `task` the card's.
  // `steer`: a steer taken here; `ref` is its inbox note id (`n<k>`) or held steer id (`h<k>`), its
  // chip drawn at this place with the status that entry holds now.
  role: 'you' | 'fork' | 'lookup' | 'error' | 'answer' | 'steer'
  text: string
  question?: string
  task?: string
  ref?: string
  proposedNote?: string
  // A fork turn's whole prompt in input tokens, and the part the prompt cache served.
  contextTokens?: number
  reusedTokens?: number
  isProposalTaken?: boolean
  isProposalDismissed?: boolean
}

// A session's chat in `$.store` (`chat:<session id>`). `writtenAt` is the clock time of its last
// write, which the session-start sweep ranks by to keep the newest 20.
export type SideChatChat = { writtenAt: number; turns: SideChatChatTurn[] }

// The one ask in flight, per session: a fork, which becomes `lookup` while the `claude -p`
// process it handed a `LOOKUP:` question to runs.
export type SideChatChatPending = { kind: 'fork' | 'lookup' }

// A steer bound for the main thread as a prompt: one confirmed with [✓] outside an unfinished plan,
// or a plan steer `chat.releaseToMain` took from the inbox while no turn ran. `held` until an idle
// point, `sending` while its `$.prompt.submit` is out, `sent` once that resolved with the prompt.
// `noteId` is the released note's id, so that note's `steer` turn finds its chip here.
// `noteId`: a released plan steer's inbox note. `questionId`: a released answer, whose `answer` chat
// turn is its record, so the pane draws no chip for it.
export type SideChatHeldSteer = {
  id: string
  text: string
  status: 'held' | 'sending' | 'sent'
  noteId?: string
  questionId?: string
}

// `issued` counts every id handed out this session (`h<k>`), so a withdrawn id is never reused.
export type SideChatHeldSteers = { issued: number; steers: SideChatHeldSteer[] }

declare module 'claude-code' {
  interface PluginState {
    'side-chat': {
      activePlan: SideChatActivePlan | null
      // Bumped by every inbox write. `$.store` does not redraw its readers; a `$.state` read does.
      inboxVersion: number
      // Bumped by every chat-history write, for the same reason as `inboxVersion`.
      chatVersion: number
      // Bumped by every question taken; it keys the ask Input, so a submit remounts it empty.
      chatAsked: number
      chatPending: SideChatChatPending | null
      // Session state, not stored: a reload keeps it, and `session.start` drops the unsent ones.
      heldSteers: SideChatHeldSteers
      // The main loop's running turn (`turn.start`'s `turnId`), or null while idle.
      mainTurn: string | null
      // Set by the band's `[–]`, cleared by `/side-chat`; session state, so a new session shows the band.
      bandHidden: boolean
    }
  }
}
