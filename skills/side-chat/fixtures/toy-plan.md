<!-- side-chat fixture. A 3-task plan for exercising /implement with the mod loaded. Task 2 is ambiguous on purpose. -->

# Plan: toy notes

## Overview

Grow `notes.txt` in a scratch repo in three small steps, so the band and the question flow can be watched end to end.

## Tasks

### Task 1: Add a title line

- [ ] Implement
- [ ] Refactor
- [ ] Docs & tests
- [ ] Done

**Context:** `notes.txt` starts empty and needs a heading.
**Files:** `notes.txt`
**Acceptance:** The first line of `notes.txt` is `# Notes`.
**Verify:** human: read `notes.txt`.
**Test:** human: read `notes.txt`.
**Dependencies:** None
**Parallel group:** —
**Result:**

### Task 2: Add a function that formats the greeting

- [ ] Implement
- [ ] Refactor
- [ ] Docs & tests
- [ ] Done

**Context:** The notes need a small pseudo-code function that formats a greeting for a name. It could be called `formatGreeting` or `greet`; either fits.
**Files:** `notes.txt`
**Acceptance:** `notes.txt` holds one function, taking a name and returning `Hello, <name>!`.
**Verify:** human: read `notes.txt`.
**Test:** human: read `notes.txt`.
**Dependencies:** Task 1
**Parallel group:** —
**Result:**

### Task 3: Add a usage line

- [ ] Implement
- [ ] Refactor
- [ ] Docs & tests
- [ ] Done

**Context:** Show the Task 2 function in use.
**Files:** `notes.txt`
**Acceptance:** The last line of `notes.txt` calls the Task 2 function with `world`.
**Verify:** human: read `notes.txt`.
**Test:** human: read `notes.txt`.
**Dependencies:** Task 2
**Parallel group:** —
**Result:**

## Decisions & Review Items

Items logged during the implementation loop for user review.
