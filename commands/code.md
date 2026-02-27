# Open VS Code

Open a VS Code instance and a new Claude Code terminal at the current working directory, both with a distinct color theme. Then exit the current session.

Scripts directory: `~/.claude/scripts`

## Color Palette

Pick one color at random from the palette below:

| Name       | Hex       |
|------------|-----------|
| Forest     | `#2d4a22` |
| Ocean      | `#1e3a5f` |
| Plum       | `#4a2545` |
| Rust       | `#5c3a1e` |
| Slate      | `#2e4045` |
| Wine       | `#4a1c2e` |
| Olive      | `#3d3d1e` |
| Indigo     | `#2b2d5e` |

## Process

1. Pick a random color from the palette.
2. **Open VS Code + apply color** (run in background — takes ~5s for delayed color write):

   ```bash
   powershell.exe -NoProfile -File "$HOME/.claude/scripts/launch-vscode.ps1" -Path "<cwd>" -Color "#<hex>"
   ```

3. **Open new Claude terminal**:

   ```bash
   powershell.exe -NoProfile -File "$HOME/.claude/scripts/launch-claude-tab.ps1" -Path "<cwd>" -Color "#<hex>"
   ```

4. **Exit**: Tell the user the new Claude instance is launching, then exit the current session with `/exit`.
