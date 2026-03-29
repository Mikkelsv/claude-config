# Global Claude Configuration

## Git-Synced Config

User-level Claude config is a git repo at `~/Documents/Code/claude-config/`:

- **Repository**: <https://github.com/Mikkelsv/claude-config.git>
- **Local path**: `~/Documents/Code/claude-config/`
- **Junction**: `~/.claude/` → `~/Documents/Code/claude-config/dotclaude/`
- **Setup script**: `Claude/setup.ps1` (for fresh machine setup only)

The repo has two directories:
- `dotclaude/` — maps to `~/.claude/` via junction. Rules, commands, skill shells, settings.
- `Claude/` — freely editable. Scripts, templates, full skill implementations.

Edit files through the real paths in `~/Documents/Code/claude-config/`, not through `~/.claude/`. Use `/claude-push` to commit and sync. Use `/claude-pull` to pick up changes.

### Slash commands

User-level slash commands live in `~/.claude/commands/`. These are available in every project. Check what's there before creating project-level duplicates.
