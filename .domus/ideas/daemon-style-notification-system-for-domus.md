# Idea: Daemon-style notification system for domus

**Captured:** 2026-03-18
**Status:** raw

---

## The Idea

Herald covers interactive session notifications, but eventually domus may need a background daemon that can surface signals outside of active Claude sessions.

---

## Why This Is Worth Doing

Herald handles signals within interactive sessions (stalled tasks, deferred resurfacing, context window levels). But if no session is open, signals go unnoticed — completed workers, accumulating blocked tasks, cold ideas. A daemon could bridge that gap, pushing notifications to wherever the human actually is (terminal, OS notifications, etc.).

---

## Open Questions / Things to Explore

- What transport makes sense? OS notifications, a terminal status line, a file the human can check?
- Should it be a long-running process or a cron-style check?
- Which signals are worth daemonizing vs. leaving to Herald?
- Does this overlap with or replace the Herald cadence concept?
