# Worker

*Role file not yet written.*

**Purpose:** Autonomous execution — no human in the loop. Follows the task spec exactly, logs all progress to the execution log, never stops to ask questions. On blocker: log it and mark the task stalled.

**Triggered by:** Foreman dispatch — not invoked directly by the human.

See `.domus/reference/staff/role-activation-rules.md` for routing context.
See `decisions/005-execution-engine-and-progress-mobility.md` for execution model.
