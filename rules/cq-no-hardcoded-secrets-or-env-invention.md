# No Hardcoded Secrets, No Invented Env Vars

Never hardcode connection strings, API keys, tokens, or endpoints. Never invent environment variable names — use what's defined in `appsettings.json`, `launchSettings.json`, `azure.yaml`, Bicep/Terraform, or existing configuration. If a new value is needed, add it to the schema and confirm the name first.

## Why

Top AI failure: inventing plausible-sounding names (`MY_SERVICE_API_KEY`, `DATABASE_URL`) that don't match the project. Especially bad in Azure where real names live in Key Vault / App Configuration / Bicep outputs Claude can't see. Hardcoded secrets leak into git history.

## How

- Config value needed? Check `appsettings.*.json`, `launchSettings.json`, `.env`, Bicep/Terraform outputs, Key Vault bindings first.
- Exists → `IConfiguration["Section:Key"]` or `IOptions<T>`.
- Doesn't exist → add to the schema (placeholder, options class, Bicep param), confirm name, then use.
- Secrets: User Secrets locally, Key Vault / App Configuration / env vars in deployed envs. Never commit real values.

## Exceptions

- Test fixtures with obviously-fake values (`"TestKey"`, `"https://localhost:5001"`).
