# Never Read Generated CSS Output Files

Tailwind CSS output files (e.g., `wwwroot/app.tailwind.css`) are **build artifacts** generated from source files in `Styles/`. Never read these files — they are large, auto-generated, and provide no useful information.

- **Source**: `Styles/app.tailwind.css` (hand-written, safe to read/edit)
- **Output**: `wwwroot/app.tailwind.css` (generated, never read)

To regenerate the output, run `dotnet build` — the build pipeline compiles Tailwind automatically.

When resolving merge conflicts in generated CSS output files, do NOT attempt to read or manually resolve the conflict. Instead:
1. Accept either side (e.g., `git checkout --theirs <file>`)
2. Rebuild with `dotnet build` to regenerate the correct output
3. Stage the regenerated file
