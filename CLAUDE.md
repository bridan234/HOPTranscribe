# CLAUDE.md

Project instructions for Claude Code. Inherits from `~/.claude/CLAUDE.md`. Anything below overrides or extends the global baseline.

---

## Behavioral Guidelines (Karpathy)

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

---

## Project-Specific Guidelines

<!-- Fill these in for your project. Examples below — delete/edit as appropriate. -->

### Stack & Conventions

- Language(s): _e.g. TypeScript strict, Python 3.12, .NET 9_
- Package manager: _e.g. pnpm / uv / dotnet_
- Test framework: _e.g. vitest / pytest / xunit_
- Linter / formatter: _e.g. eslint + prettier / ruff + black / dotnet format_
- Build / run commands: _e.g._
  - `pnpm dev`, `pnpm test`, `pnpm build`
  - `uv run pytest`, `uv run ruff check .`

### Architecture Rules

<!-- e.g. -->
- All HTTP endpoints have integration tests.
- Database access goes through `src/db/` — no inline SQL elsewhere.
- Public APIs use the error patterns in `src/utils/errors.ts`.

### Style Preferences

<!-- e.g. -->
- Prefer named exports over default exports.
- No `any` in TypeScript without an inline `// why` comment.
- Functions over classes unless state is genuinely required.

### Things Not to Do

<!-- e.g. -->
- Don't add new dependencies without confirming.
- Don't touch `infra/` without asking.
- Don't auto-format files Claude didn't otherwise change.

---

# C# / .NET Stack Override

Append to `CLAUDE.md` / `AGENTS.md` / `.github/copilot-instructions.md` for C# / .NET projects.

> **Review before using.** These are defensible defaults — not a battle-tested style guide for your specific work. Edit them to match how you actually build .NET projects.

## Tooling

- SDK: target whatever LTS the project pins in `global.json` / `.csproj`. Don't bump silently.
- Format: `dotnet format` (uses `.editorconfig`).
- Test: `xunit` is the modern default; respect `nunit` / `mstest` if the project uses them.
- Test runner: `dotnet test`.
- Build: `dotnet build` / `dotnet publish`. Don't introduce MSBuild voodoo unless asked.

## Language rules

- Nullable reference types **on** (`<Nullable>enable</Nullable>`). Treat warnings as errors when feasible.
- `file-scoped` namespaces for new files (`namespace Foo.Bar;` not `namespace Foo.Bar { ... }`).
- `var` when the right-hand side makes the type obvious; explicit type otherwise.
- `record` for immutable data; `class` for behavior; `struct` only when you've measured.
- `readonly` fields by default. Mutable only when state genuinely needs to change.
- `async`/`await` end-to-end. Don't `.Result` or `.Wait()` in async code paths.
- `IEnumerable<T>` for return types; materialize (`.ToList()`) only at the consumer if needed.
- Pattern matching over `if` chains when it reads cleaner.

## Project / solution conventions

- One class per file. Filename matches the public type.
- Folder layout follows namespace.
- Group `using`s: System, then third-party, then local. `dotnet format` handles it.
- No `#region` blocks unless the team uses them already.

## Dependency injection

- Prefer constructor injection. Avoid the service locator anti-pattern.
- Register services with the right lifetime: `Singleton` for stateless, `Scoped` for request-bound, `Transient` rarely.
- Don't inject `IServiceProvider` unless you genuinely need late resolution.

## Don't

- Don't catch `Exception` and swallow. Catch the specific type, or rethrow with context.
- Don't `throw ex;` — use `throw;` to preserve the stack.
- Don't use `Thread.Sleep` in async code. Use `await Task.Delay`.
- Don't seal everything reflexively, but do seal classes not designed for inheritance.
- Don't add a NuGet package for a one-method utility.

## Test patterns

- Test project per main project: `Foo` ↔ `Foo.Tests`.
- AAA (Arrange / Act / Assert) layout. Blank lines between sections.
- One concept per test method. Method name describes the behavior.
- `[Theory]` + `[InlineData]` for parameterized cases.
- Use `FluentAssertions` for readable asserts — only if the project allows the dependency.
