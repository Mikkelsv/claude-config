# Match Existing Pattern

Before adding a new file, class, or abstraction, find an existing pattern of the same shape in the codebase and follow it. If no good fit exists, name the new pattern and say why it's needed.

## Why

Claude generates code in isolation, producing parallel abstractions — two DTO shapes, two error conventions, two wiring styles. GitHub's 2,500-repo AGENTS.md study flagged this as the top predictor of useful AI output.

## How

- New service? Check how similar services here are structured (DI style, logging, error handling). Follow that.
- New Result type, logger, or folder layout? Search first — the project probably already has one.
- Introducing something genuinely new? Call it out: *"First place we've used X — introducing because Y."*

## Exceptions

- The existing pattern is being deprecated — follow the replacement and note the transition.
