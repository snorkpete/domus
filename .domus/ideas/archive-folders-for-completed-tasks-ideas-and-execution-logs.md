# Idea: Archive folders for completed tasks, ideas, and execution logs

**Captured:** 2026-03-20
**Status:** raw

---

## The Idea

Create `archive/` subdirectories within `.domus/tasks/`, `.domus/ideas/`, and `.domus/execution-logs/`. Periodically move done/cancelled/abandoned files there as part of doctor hygiene work — not automated on status change.

Key constraints:
- **Not triggered on cancel/close** — we sometimes reopen things and don't want to deal with moving files back.
- **Manual/doctor-driven** — move older completed items at appropriate times, not every time a status changes.
- **No CLI changes** — no new domus commands needed. Doctor reviews the folders and moves files directly.
- **Simpler than deletion** — archived files stay in the repo, easier to find than digging through git history.

---

## Why This Is Worth Doing

Volume is growing. Active task/idea folders are cluttered with completed work that's rarely referenced. Moving to archive keeps the working directories lean while keeping old items accessible without git archaeology.

---

## Open Questions / Things to Explore

- Should archive preserve the same flat structure, or organize by date/milestone?
- Does the JSONL index need updating when files move, or does it just track the canonical status?
- Execution logs: same archive cadence as tasks, or different?
- What threshold for archiving? Immediate after doctor review, N days after completion, or age-based?
- Should very old archived items eventually be deleted entirely (everything is in git history), or does archive suffice?
- If historical data is needed, is browsing `archive/` enough or would a `domus task history` retrieval command add value?
