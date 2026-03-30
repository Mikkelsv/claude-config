# Global Claude Configuration

## Git-Synced Config

User-level Claude config is a git repo at `~/claude-config/`:

- **Repository**: <https://github.com/Mikkelsv/claude-config.git>
- **Local path**: `~/claude-config/`
- **Junction**: `~/.claude/` → `~/claude-config/dotclaude/`
- **Setup script**: `Claude/setup.ps1` (for fresh machine setup only)

The repo has two directories:
- `dotclaude/` — maps to `~/.claude/` via junction. Rules, commands, skill shells, settings.
- `Claude/` — freely editable. Scripts, templates, full skill implementations.

Edit files through the real paths in `~/claude-config/`, not through `~/.claude/`. Use `/claude-push` to commit and sync. Use `/claude-sync` in projects to pull and sync skills.

### Slash commands

User-level slash commands live in `~/.claude/commands/`. These are available in every project. Check what's there before creating project-level duplicates.
