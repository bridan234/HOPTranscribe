---
name: karpathy-guidelines
description: Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria.
---

# Karpathy behavioral guidelines

**Tradeoff:** Bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- Present multiple interpretations when ambiguity exists.
- Push back when a simpler approach exists.
- Stop and ask when something is unclear.

## 2. Simplicity First

- Minimum code that solves the problem.
- No speculative features, abstractions, or error handling.
- If 200 lines could be 50, rewrite.

## 3. Surgical Changes

- Don't improve adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style.
- Mention unrelated dead code, don't delete it.
- Remove orphans caused by YOUR changes.

## 4. Goal-Driven Execution

Transform tasks into verifiable goals. For multi-step tasks, state a brief plan with per-step verification.
