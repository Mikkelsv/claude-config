export const CHECKPOINT_SPEC = {
  name: 'checkpoint',
  description:
    'Call at every /implement task boundary (and once before the first task) with the absolute ' +
    'path of the plan file being implemented. Re-reads the plan to update the progress band and ' +
    'returns the steering notes and question answers queued since the last call, as JSON ' +
    '{ notes: [{ id, text, targetTask }], answers: [{ id, task, question, options, defaultOption, ' +
    'loadBearing, answer }] }. Each is delivered once; report what it led to via applied on the ' +
    'next call. An applied id the inbox does not hold is an error.',
  inputSchema: {
    type: 'object',
    properties: {
      planPath: { type: 'string', description: 'Absolute path of the plan markdown file.' },
      completedTasks: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Ids of the tasks that just finished (e.g. ["3"], or every id of a parallel group). Each ' +
          'must already be ticked "- [x] Done" in the plan file; an unticked or unknown id is an error.',
      },
      applied: {
        type: 'array',
        items: {
          type: 'object',
          properties: { id: { type: 'string' }, outcome: { type: 'string' } },
          required: ['id', 'outcome'],
        },
        description: 'What the previous delivery led to, one entry per note or answer id.',
      },
    },
    required: ['planPath'],
  },
  isDeferred: false,
} as const

export const ASK_SPEC = {
  name: 'ask',
  description:
    'Post a judgment call about the plan being implemented to the user, without waiting. Call ' +
    'checkpoint for the plan first. Returns { id } at once: continue in the same turn on ' +
    'defaultOption as if it were the answer. The user answers in the side-chat pane; the ' +
    'answer arrives in a later checkpoint result under answers, matched by this id, or, if you ' +
    'are idle by then, as a prompt "[<plan> T<task>] Answer to <id>, ...". Report it via applied ' +
    'on the next checkpoint either way.',
  inputSchema: {
    type: 'object',
    properties: {
      planPath: { type: 'string', description: 'Absolute path of the plan markdown file, as passed to checkpoint.' },
      task: { type: 'string', description: 'Id of the task the question is about (e.g. "3" or "3.1").' },
      question: { type: 'string', description: 'The judgment call, as one short question.' },
      options: {
        type: 'array',
        items: { type: 'string' },
        description: 'The plausible answers, each a word or short phrase.',
      },
      defaultOption: { type: 'string', description: 'The option you proceed on now; must be one of options.' },
      loadBearing: {
        type: 'boolean',
        description: 'True when a different answer would change data shape, a persisted format or a public API.',
      },
    },
    required: ['planPath', 'task', 'question', 'options', 'defaultOption', 'loadBearing'],
  },
  isDeferred: false,
} as const
