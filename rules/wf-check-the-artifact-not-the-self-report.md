# Check the Artifact, Not the Agent's Self-Report

When a sub-agent finishes scoped work, judge it by the artifact it produced — `git diff`, `git status`, the file itself — never by its summary. A summary describes what the agent *intended*; the diff is what it did.

## Why

A scope-restricted agent reports in good faith and still drifts: it edits a file outside its partition, slips from comments into code, or reports "cut 12 comments" having cut 14 and reworded 3. Nothing in the report exposes that, and an orchestrator collating summaries produces a clean-looking roll-up over unreviewed changes. The failure compounds in fan-outs, where no single summary is obviously wrong but the union violates the partition.

This is the delegation-shaped case of `wf-verify-premises-before-acting`: the premise is "the agent did what it says", and it is checkable in one command.

## How

After a scoped fan-out, diff before collating. Confirm the touched-file set is inside the partition, and read the diff for the class of change the agent was *not* authorized to make (code edits in a comment sweep, new files in a rename). For worktree-isolated agents, also verify the base each one actually started from — a stale base makes a correct-looking diff apply to the wrong parent.

Tier: always do — after any scoped or parallel delegation.
