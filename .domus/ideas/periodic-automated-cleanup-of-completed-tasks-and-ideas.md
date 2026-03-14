# Idea: Periodic automated cleanup of completed tasks and ideas

**Captured:** 2026-03-14
**Status:** raw

---

## The Idea

Completed and cancelled entries don't need to live in the active store indefinitely — everything is in git history. A periodic cleanup (e.g. daily, weekly, or N days after marking done) deletes done/cancelled entries from the JSONL and .md files, keeping the active store lean. If historical data is ever needed, a domus task history command could retrieve it from git. Key open questions: what trigger (time-based vs manual vs on-exit), what threshold (immediate, N days, never for certain tags), and whether to build the git-retrieval path before or after enabling cleanup.

---

## Why This Is Worth Doing

_To be filled in._

---

## Open Questions / Things to Explore

- _Add open questions here_
