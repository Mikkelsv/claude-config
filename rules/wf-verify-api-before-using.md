# Verify API Before Using

Before calling a library method, type, or property you haven't seen in the current codebase, confirm it exists — grep the codebase, check `.csproj` / `Directory.Packages.props` for package + version, or fetch docs. Don't invent names that "sound right."

## Why

Hallucinated APIs are the top AI failure mode. In .NET especially: Claude confuses EF6 with EF Core, Newtonsoft with `System.Text.Json`, legacy `Microsoft.Azure.*` with modern `Azure.*`, ASP.NET classic with Core. Shapes are similar enough to compile on read-through and fail later.

## How

- Grep the codebase first. If the API is really used, the shape is right there.
- Unfamiliar package? Check `.csproj` for the exact package and major version — APIs differ across majors.
- Uncertain? Say so and fetch docs.

A grep always costs less than debugging a hallucination.
