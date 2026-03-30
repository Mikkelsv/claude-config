# Update Docs When Changing Setup

When modifying files in the config repo that affect the setup (scripts, commands, skills, hooks, settings template), check both `~/claude-config/Claude/README.md` and `~/claude-config/README.md` for sections that reference the changed component and update them to stay accurate.

This includes changes to:
- Scripts (`scripts/*.ps1`) — update the Script Catalog table and any prose mentioning the script
- Commands (`commands/*.md`) — update the Commands section
- Skills (`skills/*/SKILL.md`) — update the Commands section and Script Catalog if skill-local scripts changed
- Rules (`rules/*.md`) — update the Global Rules section
- Hooks or settings template — update the Settings and Permissions / Hooks sections
