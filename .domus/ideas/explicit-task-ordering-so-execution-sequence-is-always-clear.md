# Idea: explicit task ordering so execution sequence is always clear

**Captured:** 2026-03-16
**Status:** raw

---

## The Idea

Tasks need an explicit ordering mechanism so any session can see not just what's open but in what sequence things will be tackled — removing ambiguity about what's next without relying on memory or conversation history.

---

## Why This Is Worth Doing

Right now the execution order lives in memory (or a memory file). A new session has no way to know the intended sequence without being told. Dependencies handle some of this but not all — two tasks can both be unblocked but have an intended order that `depends_on` doesn't capture. Without explicit ordering, every session has to re-derive "what's next" from context.

---

## Open Questions / Things to Explore

- Is this a field on the task (`sequence: 3`) or a separate ordering file?
- Does it replace the memory entry we currently use, or complement it?
- How does it interact with `depends_on` — should ordering be inferred from dependencies where possible?
- How does the overview surface the order — numbered rows, a separate "Next up" section?
- What happens to ordering when new tasks are inserted mid-sequence?
