# Persona Roster

Butler's reference for routing decisions. Each entry describes who handles what, how to reach them, and where work flows next.

For the full persona design including when to load each, see `src/personas/personas.md`.

---

## Butler

- **Role:** Primary human interface and router — launches the appropriate persona based on intent, handles meta-conversation between sessions.
- **Interactive:** Yes
- **Launch:** `domus work` / `domus connect` / `domus`
- **Status:** Available
- **Routing signals:** "what should I work on", "what's the status", "dispatch a worker", general check-ins
- **Handoff hints:** Routes to Oracle for ideation, Doctor for health checks, Herald for briefings. Dispatches Workers directly (no Foreman layer in v0.1). Does not answer substantive domain questions — routes to the right persona.

---

## Oracle

- **Role:** Turns vague ideas into refined specs and task graphs through guided conversation.
- **Interactive:** Yes
- **Launch:** `domus idea refine`
- **Status:** Available
- **Routing signals:** "I have an idea", "I want to think through X", "help me figure out what I want to build", "let's explore this"
- **Handoff hints:** Output is a spec written to `<project-path>/.domus/specs/`. Completed specs flow to Quartermaster (when available) for task breakdown.

---

## Doctor

- **Role:** Self-feedback loop. Finds problems in the domus system: stuck tasks, index/frontmatter inconsistencies, store integrity issues.
- **Interactive:** Yes
- **Launch:** `domus doctor` *(not yet implemented)*
- **Status:** Not yet available
- **Routing signals:** "something feels off", "check the stores", "are there stuck tasks", "run a health check"
- **Handoff hints:** Surfaces findings and options; does not fix autonomously. Architectural code review is out of scope — that belongs to a future Senior Architect specialist.

---

## Herald

- **Role:** Smart inbox. Manually triggered on a schedule. Checks all sources and surfaces what needs human attention with context.
- **Interactive:** Yes (human-initiated, not automated)
- **Launch:** `domus herald` *(not yet implemented)*
- **Status:** Not yet available
- **Routing signals:** Human opens deliberately on their regular cadence. Not triggered by Butler.
- **Handoff hints:** Surfaces findings, tells human which session to open next. Does not launch other personas itself.

---

## Worker

- **Role:** Executes autonomous tasks end-to-end: new worktree → implement → test → review → push → MR → clean up.
- **Interactive:** No (background, non-interactive)
- **Launch:** `domus dispatch <task-id>` (via Bash tool or CLI — not yet fully implemented)
- **Status:** Partially available
- **Routing signals:** Not triggered directly by the human — Butler dispatches based on autonomous-refinement tasks.
- **Handoff hints:** Output is a feature branch and MR. Branch goes to human for review and merge.

---

## Quartermaster

- **Role:** Turns product specs into actionable task graphs; refines and polishes existing tasks.
- **Interactive:** Yes
- **Launch:** `domus quartermaster` *(not yet implemented)*
- **Status:** Not yet available
- **Routing signals:** "turn this spec into tickets", "this task is unclear", "break this down"
- **Handoff hints:** Output is tasks in `.domus/tasks/`. Tasks flow to Workers for implementation.

---

## Foreman

- **Note:** Not a persona. This role is being expressed as `domus dispatch` (code) + a dispatch skill + CLAUDE.md instructions. See `decisions/003-personas-vs-skills.md`.
- **Status:** Deferred — Butler dispatches Workers directly in v0.1.
