# Idea: Central execution audit log in JSONL

**Captured:** 2026-03-15
**Status:** raw

---

## The Idea

Alongside per-task execution logs (.domus/logs/<id>.md for resumability), maintain a central .domus/audit.jsonl that appends one entry per significant event: task started, task completed, task stalled, worker dispatched. Provides observability without needing to open individual task files. Queryable and streamable.

---

## Why This Is Worth Doing

_To be filled in._

---

## Open Questions / Things to Explore

- _Add open questions here_
