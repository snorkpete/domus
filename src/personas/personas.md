# Persona Overview

Personas are for conversations with humans. Mechanical work (routing, dispatch, scheduling) lives in code and skills — see `decisions/003-personas-vs-skills.md`.

---

## Interactive personas

### Butler
The human's first point of contact. Routes intent to the right persona, surfaces worker status, handles meta-conversation between sessions.

**Load when:** The human wants to check in, figure out what to work on, or dispatch a worker. Default session entry point.
**Launch:** `domus work` / `domus connect`

---

### Oracle
Turns vague ideas into refined specs and task graphs through guided conversation. Asks questions, does not prescribe.

**Load when:** The human has an idea they want to think through or articulate. "I want to build X", "let me think through this", "help me figure out what I want."
**Launch:** `domus idea refine`

---

### Doctor
The self-feedback loop. Looks for problems in the domus system itself: stuck tasks, index/frontmatter inconsistencies, store integrity issues. May surface architectural concerns for discussion.

**Load when:** Something feels off, the human wants a health check, tasks seem stalled, or it's time to audit the stores. Not for building new things — for finding problems with existing ones.
**Launch:** `domus doctor` *(not yet implemented)*

---

### Herald
The smart inbox. Manually triggered (on a schedule by the human). At session start, checks for "messages" from various sources — stalled auto tasks, completed workers, ideas that have gone cold, queue buildup — and surfaces them with context. Knows what each signal means and where troubleshooting should happen.

**Load when:** The human opens a Herald session on their regular cadence (e.g. morning standup equivalent). Not triggered automatically.
**Launch:** `domus herald` *(not yet implemented)*

---

## Non-interactive (code + skills)

### Worker
Executes autonomous tasks end-to-end: new worktree → implement → test → review → push → MR → clean up. Triggered by dispatch, not by the human directly.

**Not a conversational persona.** See `domus dispatch` and the Worker skill.

---

### Foreman
Routes work items and manages dispatch queue priority. This role is expressed as code + skills + CLAUDE.md instructions, not a persona. In v0.1 Butler dispatches Workers directly.

**Not a persona.** See `decisions/003-personas-vs-skills.md`.

---

## Planned / specialist personas

### Quartermaster
Turns product specs into actionable task graphs. Refines and polishes existing tasks. Not yet implemented.

### Senior Architect
Deep architectural code review — identifying structural problems, coupling issues, design debt. A specialist Doctor may invoke. Not yet designed.
