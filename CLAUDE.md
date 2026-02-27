# Global Claude Configuration

## Git-Synced Config

User-level Claude config is a git repo cloned directly as `~/.claude/`:

- **Repository**: <https://github.com/Mikkelsv/claude-config.git>
- **Local path**: `~/.claude/`
- **Setup script**: `setup.ps1` (for fresh machine setup only)

Edit files in `~/.claude/` directly. Commit and push to sync changes across machines. Pull to pick up changes made elsewhere.

### Slash commands

User-level slash commands live in `~/.claude/commands/`. These are available in every project. Check what's there before creating project-level duplicates.
