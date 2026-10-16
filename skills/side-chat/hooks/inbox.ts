import type { CoreEngineInterface } from 'claude-code'

import type { SideChatDelivery, SideChatInbox, SideChatNote, SideChatQuestion } from '../types'

// The plugin's `$.store` shape, taken as a parameter so these functions run over the engine's
// store in the hooks and over an in-memory one in tests.
export type PluginStore = CoreEngineInterface['store']

export type InboxResult = { isDone: true } | { error: string }

export type Applied = { id: string; outcome: string }

const PREFIX = 'inbox:'

// One spelling per plan: Windows paths arrive with either separator, and the engine hands fs
// hooks backslashes, so the key uses forward slashes throughout.
export const canonicalPath = (planPath: string) => planPath.replaceAll('\\', '/')

export const inboxKey = (planPath: string) => PREFIX + canonicalPath(planPath)

// The store only ever holds what these functions wrote, so the cast is the write side's shape.
export const readInbox = async (store: PluginStore, planPath: string): Promise<SideChatInbox> => {
  const held = (await store.get(inboxKey(planPath))) as SideChatInbox | undefined
  return held ?? { questions: [], notes: [], issued: 0 }
}

const writeInbox = (store: PluginStore, planPath: string, inbox: SideChatInbox) =>
  store.set(inboxKey(planPath), inbox)

export const deleteInbox = (store: PluginStore, planPath: string) => store.delete(inboxKey(planPath))

// Ids are `n<k>` / `q<k>` from the entry's `issued` counter, never reused: a chip still showing
// a withdrawn note must not reach the note queued after it.
const nextId = (prefix: 'n' | 'q', inbox: SideChatInbox) => prefix + (inbox.issued + 1)

export const queueNote = async (
  store: PluginStore,
  planPath: string,
  note: { text: string; targetTask: string },
): Promise<SideChatNote> => {
  const inbox = await readInbox(store, planPath)
  const queued = { id: nextId('n', inbox), ...note }
  await writeInbox(store, planPath, { ...inbox, notes: [...inbox.notes, queued], issued: inbox.issued + 1 })
  return queued
}

export const withdrawNote = async (store: PluginStore, planPath: string, id: string): Promise<InboxResult> => {
  const inbox = await readInbox(store, planPath)
  const note = inbox.notes.find(n => n.id === id)
  // Toasted by the pane, so worded as the person sees a note: a steer.
  if (note === undefined) return { error: `no steer ${id} in the inbox of ${canonicalPath(planPath)}` }
  if (note.deliveredAt !== undefined) return { error: `steer ${id} was already delivered and cannot be withdrawn` }
  await writeInbox(store, planPath, { ...inbox, notes: inbox.notes.filter(n => n.id !== id) })
  return { isDone: true }
}

export const addQuestion = async (
  store: PluginStore,
  planPath: string,
  question: Omit<SideChatQuestion, 'id' | 'answer' | 'deliveredAt' | 'outcome'>,
): Promise<SideChatQuestion> => {
  const inbox = await readInbox(store, planPath)
  const added = { id: nextId('q', inbox), ...question }
  await writeInbox(store, planPath, { ...inbox, questions: [...inbox.questions, added], issued: inbox.issued + 1 })
  return added
}

// A changed mind is allowed until the checkpoint delivers the answer. Resolves the answered
// question, which the pane logs to the chat.
export const answerQuestion = async (
  store: PluginStore,
  planPath: string,
  id: string,
  answer: string,
): Promise<SideChatQuestion | { error: string }> => {
  const inbox = await readInbox(store, planPath)
  const question = inbox.questions.find(q => q.id === id)
  if (question === undefined) return { error: `no question ${id} in the inbox of ${canonicalPath(planPath)}` }
  if (question.deliveredAt !== undefined) return { error: `question ${id} was already delivered` }
  const answered = { ...question, answer }
  await writeInbox(store, planPath, { ...inbox, questions: inbox.questions.map(q => (q.id === id ? answered : q)) })
  return answered
}

export const unanswered = (questions: readonly SideChatQuestion[]) =>
  questions.filter(q => q.answer === undefined)

// Unanswered questions stay behind: only an answer is something `/implement` can act on.
export const takeUndelivered = async (
  store: PluginStore,
  planPath: string,
  now: number,
): Promise<SideChatDelivery> => {
  const inbox = await readInbox(store, planPath)
  const notes = inbox.notes.filter(n => n.deliveredAt === undefined)
  const answered = inbox.questions.filter(q => q.answer !== undefined && q.deliveredAt === undefined)
  if (notes.length === 0 && answered.length === 0) return { notes: [], answers: [] }

  const isTaken = (id: string) => notes.some(n => n.id === id) || answered.some(q => q.id === id)
  await writeInbox(store, planPath, {
    ...inbox,
    notes: inbox.notes.map(n => (isTaken(n.id) ? { ...n, deliveredAt: now } : n)),
    questions: inbox.questions.map(q => (isTaken(q.id) ? { ...q, deliveredAt: now } : q)),
  })
  return {
    notes: notes.map(({ id, text, targetTask }) => ({ id, text, targetTask })),
    answers: answered.map(({ id, task, question, options, defaultOption, loadBearing, answer }) => ({
      id,
      task,
      question,
      options,
      defaultOption,
      loadBearing,
      answer: answer!, // filtered on `answer !== undefined` above
    })),
  }
}

// The fallback for a plan nobody is checkpointing: removes the oldest undelivered note and
// returns it, so the main thread can be handed it and no later checkpoint delivers it twice. One
// at a time: the rest stay in the store, which a reload keeps, until their own idle point.
export const releaseOldestNote = async (
  store: PluginStore,
  planPath: string,
): Promise<SideChatNote | undefined> => {
  const inbox = await readInbox(store, planPath)
  const released = inbox.notes.find(n => n.deliveredAt === undefined)
  if (released === undefined) return undefined
  await writeInbox(store, planPath, { ...inbox, notes: inbox.notes.filter(n => n.id !== released.id) })
  return released
}

// As `releaseOldestNote` for answers, but marked delivered rather than removed: the question stays
// in the inbox, so the model's `applied` for its id is still known at the next checkpoint.
export const releaseOldestAnswer = async (
  store: PluginStore,
  planPath: string,
  now: number,
): Promise<SideChatQuestion | undefined> => {
  const inbox = await readInbox(store, planPath)
  const released = inbox.questions.find(q => q.answer !== undefined && q.deliveredAt === undefined)
  if (released === undefined) return undefined
  await writeInbox(store, planPath, {
    ...inbox,
    questions: inbox.questions.map(q => (q.id === released.id ? { ...q, deliveredAt: now } : q)),
  })
  return released
}

// All or nothing: one unknown id refuses the whole batch, so a typo can't half-record it.
export const applyOutcomes = async (
  store: PluginStore,
  planPath: string,
  applied: readonly Applied[],
): Promise<InboxResult> => {
  if (applied.length === 0) return { isDone: true }
  const inbox = await readInbox(store, planPath)
  const known = new Set([...inbox.notes.map(n => n.id), ...inbox.questions.map(q => q.id)])
  const unknown = applied.filter(a => !known.has(a.id)).map(a => a.id)
  if (unknown.length > 0) {
    return { error: `applied names ids not in the inbox of ${canonicalPath(planPath)}: ${unknown.join(', ')}` }
  }
  const outcomeOf = new Map(applied.map(a => [a.id, a.outcome]))
  const withOutcome = <T extends { id: string }>(item: T): T => {
    const outcome = outcomeOf.get(item.id)
    return outcome === undefined ? item : { ...item, outcome }
  }
  await writeInbox(store, planPath, {
    ...inbox,
    notes: inbox.notes.map(withOutcome),
    questions: inbox.questions.map(withOutcome),
  })
  return { isDone: true }
}

// Deletes every entry whose plan file is gone (`/implement`'s Cleanup removes it); returns the
// paths removed. Keys outside the inbox prefix are not this function's.
export const sweepStale = async (store: PluginStore, exists: (path: string) => Promise<boolean>) => {
  const removed: string[] = []
  for (const key of await store.keys()) {
    if (!key.startsWith(PREFIX)) continue
    const path = key.slice(PREFIX.length)
    if (await exists(path)) continue
    await store.delete(key)
    removed.push(path)
  }
  return removed
}
