# Question the Scope

Before substantive work — adding a new rule, abstraction, feature, or skill — question whether the work is needed at the proposed scope. Default toward less.

## Surface these questions

- **Is this needed now, or pattern-matched from training data / past projects?** Concrete current demand justifies new infrastructure. Hypothetical future demand doesn't.
- **What's the minimum that delivers the user's actual outcome?** The first version is almost always smaller than the proposal.
- **Does this generalize from real demand or speculation?** "Generic" abstractions without a second concrete consumer are speculation.
- **Could the user's need be met without this feature at all?** Existing tooling, rules, or conventions usually cover more than a new addition would.
- **Does this rule / abstraction have real enforcement, or is it theater?** A "mandatory" rule with no gate (commit hook, linter, agent) is aspiration, not rule.

## When to spawn a scope-skeptic agent

When about to commit substantive new infrastructure (new rule, new abstraction, new skill, new agent, multi-file refactor) and a second opinion before shipping is warranted. Spawn the `scope-skeptic` agent — it applies these lenses adversarially. A project-local `.claude/agents/scope-skeptic.md` takes precedence over the global one.

## Why

Claude over-delivers by default. Asked for a rule, it builds three. Asked for a helper, it builds an abstraction layer. Surfacing the scope question explicitly before doing the work is cheaper than cutting after.
