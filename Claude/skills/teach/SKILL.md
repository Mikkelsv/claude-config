---
name: teach
description: Interactive programming lessons — contextual, codebase-wide, or general topics
---

# Teach

Deliver a focused, interactive programming lesson tailored to a .NET developer with 6 years of experience (Unity/MR background, rusty on web dev and Azure cloud). The user learns best through concrete code examples tied to real patterns.

## Learner Profile

Read `~/claude-config/Claude/skills/teach/learner-profile.md` if it exists for up-to-date learner context. Fall back to these defaults:

- **Experience:** 6 years .NET, strong in Unity/MR, rusty in web dev and Azure
- **Growth areas:** ASP.NET Core, web APIs, Azure services, frontend patterns, cloud architecture
- **Strengths:** C#, game dev patterns, 3D math, systems thinking

## Mode Selection

If the user passed arguments after `/teach`, check if they map to a mode or a topic:

- `contextual` / `context` / `1` -> Mode 1
- `explore` / `codebase` / `2` -> Mode 2
- `random` / `general` / `3` -> Mode 3
- Anything else -> treat as a specific topic request — pick the most fitting mode and teach that topic

If no arguments, present the three options using `AskUserQuestion`:

| Option | Label | Description |
|--------|-------|-------------|
| 1 | Contextual deep-dive | Pick a concept from code you're currently working on and explain the underlying principles |
| 2 | Codebase exploration | Find a teachable pattern in this project (APIs, architecture, DI, middleware, etc.) and explain the broader concept |
| 3 | Random topic | A general programming topic — algorithms, Azure services, security, language features, design patterns, etc. |

## Mode 1 — Contextual Deep-Dive

Teach a concept grounded in code the user is actively working on.

1. **Find recent context.** Check `git diff` (staged + unstaged) and `git log --oneline -5` to identify files the user recently touched.
2. **Pick a teachable concept.** Scan those files for a concept worth explaining — prioritize things the user might not fully understand given their background (e.g., middleware pipelines, DI lifetimes, async/await pitfalls, EF Core query translation, Razor component lifecycle). Avoid trivially obvious things.
3. **Teach it.** Structure the lesson as:
   - **What it is** — one paragraph, plain language
   - **How it works here** — walk through the specific code in this project, referencing file paths and line numbers
   - **The broader principle** — connect to the general concept (design pattern, framework behavior, language feature)
   - **Common pitfalls** — 2-3 mistakes developers make with this concept
   - **Try this** — suggest a small modification or experiment the user could try to deepen understanding

## Mode 2 — Codebase Exploration

Teach a broad concept by finding an example of it in the current project.

1. **Scan the codebase broadly.** Use Glob and Grep to survey the project structure — look at controllers, services, middleware, config, models, tests, CI pipelines, Docker files, etc.
2. **Pick a teachable aspect.** Choose something that illustrates a broadly useful concept. Good candidates:
   - API design patterns (REST conventions, content negotiation, versioning)
   - Architecture patterns (clean architecture, CQRS, mediator, repository)
   - Dependency injection patterns and lifetimes
   - Middleware pipeline and request flow
   - Authentication/authorization patterns
   - Database access patterns (EF Core, Dapper, raw SQL)
   - Error handling strategies
   - Configuration and options pattern
   - Logging and observability
   - Shader techniques and rendering pipelines
   - Build and deployment pipelines
   - Test architecture and patterns
   - Performance patterns (caching, async, batching)
3. **Teach it.** Structure the lesson as:
   - **The concept** — what this pattern/technique is and why it exists
   - **In this project** — show where and how it's used, with file paths and code snippets
   - **Beyond this project** — how the same concept applies in other contexts (web APIs, cloud services, other frameworks)
   - **Level up** — what the "next level" of this concept looks like (e.g., if you found basic DI, explain scoped vs transient vs singleton trade-offs)
   - **Further reading** — 1-2 specific documentation links or search terms

## Mode 3 — Random Topic

Teach a general programming topic not tied to this codebase.

1. **Pick a topic.** Choose something valuable for a .NET developer growing into web and cloud. Rotate across these categories to keep variety — **do not repeat a category the user saw recently** (check conversation history):
   - **Algorithms & data structures** — trees, graphs, hash maps internals, sorting trade-offs, Big-O analysis
   - **Azure services** — App Service, Functions, Blob Storage, Service Bus, CosmosDB, Key Vault, Managed Identity, AKS
   - **Web fundamentals** — HTTP/2, CORS, cookies vs tokens, CSP headers, WebSockets, SSE
   - **Security** — OWASP top 10, JWT internals, OAuth2 flows, certificate pinning, secret management
   - **Design patterns** — beyond the basics: CQRS, event sourcing, saga pattern, outbox pattern, circuit breaker
   - **Language deep-dives** — C# spans, ref structs, source generators, interceptors, collection expressions
   - **DevOps & infrastructure** — Docker multi-stage builds, GitHub Actions, Terraform basics, zero-downtime deploys
   - **Database concepts** — indexing strategies, query plans, isolation levels, event stores, read replicas
   - **Frontend for backend devs** — Blazor vs React mental models, CSS layout, state management, hydration
   - **Performance** — memory allocation, GC tuning, benchmarking with BenchmarkDotNet, profiling tools
2. **Teach it.** Structure the lesson as:
   - **What & why** — what this concept is and why a developer should care
   - **How it works** — the mechanics, explained with concrete examples and code snippets where applicable
   - **Real-world scenario** — a practical situation where this knowledge matters
   - **Pitfalls** — common mistakes or misconceptions
   - **Hands-on challenge** — a small exercise or thing to try (can be a code snippet to write, an Azure resource to explore, or a thought experiment)
   - **Connection to your stack** — how this relates to .NET / C# / Azure specifically

## Teaching Style

- **Be concrete.** Always include code snippets or real examples. Never teach purely in the abstract.
- **Respect experience.** The user has 6 years of .NET — don't explain what a class is. Pitch at the level of "experienced developer learning a new domain."
- **Use analogies to Unity/MR** when they help — e.g., comparing middleware pipeline to Unity's update loop, or comparing DI to Unity's GetComponent pattern.
- **Keep it focused.** One concept per lesson, explored thoroughly. Don't try to cover everything.
- **Be honest about trade-offs.** Don't present one approach as the only way — mention alternatives and when you'd pick each.
- **Length:** Aim for a lesson that takes 3-5 minutes to read. Enough to learn something real, not so much it becomes overwhelming.

## After the Lesson — Quiz

After delivering the lesson, offer a quiz using plain text (not AskUserQuestion — the UI is hard to read for quiz flows):

```
**Quiz:** Want to test your understanding? (1) Take Quiz  (2) Skip
```

Wait for the user to reply with a number or keyword.

### If they take the quiz

Ask 1-2 questions about the concept just taught. Format each as plain text with numbered options:

```
**Q1:** [Question text]
  1. [Option A]
  2. [Option B]
  3. [Option C]
  4. Skip
```

Use 3 concrete answer options — one correct, two plausible-but-wrong. Always include a Skip option.

After each answer:
- If correct: confirm briefly and explain *why* it's right — reinforce the principle.
- If wrong: explain the correct answer without being condescending. Connect back to the lesson.

### After the quiz (or skip)

Ask if the user wants to go deeper on this topic, try a different mode, or get back to work.

## Learner Profile Updates

After every teaching interaction (both `/teach` invocations and end-of-task nuggets from the `teach-on-completion` rule), update `~/claude-config/Claude/skills/teach/learner-profile.md`:

1. **Topics Covered** — add the topic keyword and date.
2. **Quiz History** — if a quiz was taken, note the topic and result (correct/incorrect/skipped).
3. **Topics to Review** — add topics where the user got a quiz wrong, seemed uncertain, or said they'd like to revisit.
4. **Topic Selection** — when picking new topics, check the profile to:
   - Avoid repeating recently covered topics (unless the user asks)
   - Occasionally revisit "Topics to Review" items
   - Ensure variety across categories
