# Settling — the render is not synchronous with your call

Read by `/verify` before screenshot or multi-click checks.

Two timing traps make a live check read the *previous* state and report it as current.

- **Before a screenshot**, interpose a double-rAF plus a short settle (~120 ms). A capture taken immediately after an action lags one action behind, so the image shows the pre-action frame and looks like the change never landed. When a screenshot and a DOM or state read disagree, trust the read and re-capture — the pixels are the stale side.
- **Between clicks**, never batch synchronous multi-clicks in unattended verification. Re-query the DOM and wait ~1.5–2 s per click: the element resolved before the first click may have been re-rendered out from under you, so the second lands on a detached node and silently does nothing. Then verify the *state* consequence, not just the DOM — markup can update while the underlying scene or model has not.

Both are instances of one rule: the frame you can observe is not necessarily the frame after your action.
