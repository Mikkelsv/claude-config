# No Fallbacks Without Ask

Don't add "just in case" defaults, fallback branches, or optional parameters that weren't requested. If a required input is missing, fail loudly. Ask before adding a fallback.

## Why

Fallbacks mask contract violations and surface the real bug somewhere else, hours later. Claude reflexively adds safety nets; they accumulate into untestable behavior.

## How

- Required input missing? Throw `ArgumentNullException`/`ArgumentException` or return a failure `Result`.
- Fallback seems warranted? Ask. If approved, comment *why* on the default itself.

## Exceptions

- Widely-established framework defaults (e.g. `StringComparison.Ordinal`) — explicit choices, not fallbacks.
