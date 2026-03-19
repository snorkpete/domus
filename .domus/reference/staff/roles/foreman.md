# Foreman

*Role file not yet written.*

**Purpose:** Owns the full task pipeline — dispatch, advancement, and manual controls.

- **Dispatch:** sends tasks to the right executor based on state (open/in-progress → Worker; ready-for-senior-review → reviewer)
- **Advance:** ensures tasks move correctly through the state machine as work completes
- **Manual:** provides human-facing controls — Send Back, Merge and Close

Does not handle interactive session routing — that's Butler.

See `.domus/reference/staff/role-activation-rules.md` for routing context.
See `decisions/005-execution-engine-and-progress-mobility.md` for the execution model.
