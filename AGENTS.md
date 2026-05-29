# AGENTS.md

Project instructions for Codex CLI and Cursor 2.0+. Inherits from `~/.codex/AGENTS.md`. Anything below overrides or extends the global baseline.

---

## Behavioral Guidelines (Karpathy)

**Tradeoff:** Bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- Present multiple interpretations when ambiguity exists.
- Push back when a simpler approach exists.
- Stop and ask when something is unclear.

### 2. Simplicity First

- Minimum code that solves the problem.
- No speculative features, abstractions, or error handling.
- If 200 lines could be 50, rewrite.

### 3. Surgical Changes

- Don't improve adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style.
- Mention unrelated dead code, don't delete it.
- Remove orphans caused by YOUR changes.

### 4. Goal-Driven Execution

- Transform tasks into verifiable goals with tests or success criteria.
- For multi-step tasks, state a brief plan with per-step verification.

---

## Project-Specific Guidelines

<!-- Fill these in. Same content as CLAUDE.md — keep them in sync, or use the install.sh trick of only writing one and symlinking. -->

### Stack & Conventions

- Language(s):
- Package manager:
- Test framework:
- Linter / formatter:
- Build / run commands:

### Architecture Rules

### Style Preferences

### Things Not to Do

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
