# No Async Void

Use `async Task`, never `async void`. Only exception: UI event handlers the framework requires to be void — and then wrap the real work in an `async Task` method and `await` it inside the handler.

## Why

`async void` exceptions bypass the Task machinery: process crash in server code, swallowed silently on the client. No way to await, no way to observe. Claude produces it when asked to "just make this async."
