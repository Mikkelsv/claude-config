import type { SideChatHeldSteer, SideChatHeldSteers } from '../types'

// Main-thread steers (session mode's, and plan steers and answers `chat.releaseToMain` took from
// the inbox), held in `$.state` (`heldSteers`) until the main thread is idle, then submitted one
// per idle point. Pure: chat.tsx and register.tsx read and write the atom.

export const NO_HELD_STEERS: SideChatHeldSteers = { issued: 0, steers: [] }

export const holdSteer = (
  held: SideChatHeldSteers,
  text: string,
  source: Pick<SideChatHeldSteer, 'noteId' | 'questionId'> = {},
): SideChatHeldSteers => {
  const issued = held.issued + 1
  const steer: SideChatHeldSteer = { id: `h${issued}`, text, status: 'held', ...source }
  return { issued, steers: [...held.steers, steer] }
}

// The id the next `holdSteer` issues: read inside the same `update` that holds the steer, so the
// steer's chat turn names the id it got.
export const nextHeldId = (held: SideChatHeldSteers) => `h${held.issued + 1}`

// The oldest held steer, unless one is already out: one submit at a time keeps them in order.
export const nextToSend = (held: SideChatHeldSteers): SideChatHeldSteer | undefined =>
  held.steers.some(s => s.status === 'sending') ? undefined : held.steers.find(s => s.status === 'held')

export const withStatus = (
  held: SideChatHeldSteers,
  id: string,
  status: SideChatHeldSteer['status'],
): SideChatHeldSteers => ({ ...held, steers: held.steers.map(s => (s.id === id ? { ...s, status } : s)) })

// Only a held steer can be withdrawn: one whose submit is out can't be called back.
export const withdrawHeld = (
  held: SideChatHeldSteers,
  id: string,
): SideChatHeldSteers | { error: string } => {
  const steer = held.steers.find(s => s.id === id)
  if (steer === undefined) return { error: `steer ${id} is no longer held` }
  if (steer.status !== 'held') return { error: `steer ${id} was already sent and cannot be withdrawn` }
  return { ...held, steers: held.steers.filter(s => s.id !== id) }
}

// A reload killed the timers: a held steer will never be sent, and a `sending` one's submit may
// already be queued in the engine, so each says which. Sent ones stay as chips.
export const dropOnReload = (held: SideChatHeldSteers) => ({
  kept: { ...held, steers: held.steers.filter(s => s.status === 'sent') },
  lines: held.steers.flatMap(s => {
    switch (s.status) {
      case 'held':
        return [`steer dropped (the mod reloaded): ${s.text}`]
      case 'sending':
        return [`steer may have been sent (the mod reloaded): ${s.text}`]
      case 'sent':
        return []
    }
  }),
})

export const refusedLine = (text: string, reason: string) => `steer: not sent (${reason}): ${text}`
