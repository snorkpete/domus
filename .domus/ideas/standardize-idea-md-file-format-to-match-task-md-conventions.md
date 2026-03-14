# Idea: Standardize idea MD file format to match task MD conventions

**Captured:** 2026-03-14
**Status:** raw

---

## The Idea

Idea MD files currently use an old ad-hoc format (`**Date:**`, `**Project:**` headers) with no structured frontmatter beyond that. Task MDs have a richer set of fields (`**Status:**`, `**Refinement:**`, `**Priority:**`, `**Captured:**`, `**Depends on:**`, etc.) that the CLI keeps in sync atomically. The question is whether idea MDs should adopt the same structure.

Note: newly created idea MDs (post current CLI version) already include `**Status:** raw` — so partial convergence has already happened organically.

---

## Why This Is Worth Doing

- The doctor skill can only cross-check task status (JSONL vs MD) reliably because tasks have a `**Status:**` field. Ideas don't get the same validation today.
- Inconsistent formats mean different mental models when reading idea vs task files.
- If the idea CLI already syncs `**Status:**` on `idea status` calls, the remaining gap is cosmetic (field names, field set) — a small migration.

---

## Open Questions / Things to Explore

- Does `domus idea status <id>` already update `**Status:**` in the MD file, or only in the JSONL? (Partially answered: new files get `**Status:** raw` — but does `idea status` keep it updated?)
- What fields make sense for ideas that don't apply to tasks, and vice versa? (e.g. ideas don't have `Refinement` or `Depends on` — but could have `Effort` or `Confidence`)
- Should we migrate existing idea MDs in-place, or only apply the new format to newly created ones?
- If we update the format, does the CLI need a migration command, or is a one-off edit sufficient?
