# Role Activation Rules

Thin routing table for Butler. Load individual role files from `.domus/reference/staff/roles/` on demand — do not load all files at once.

| Role | Implementation | Load when |
|------|----------------|-----------|
| Oracle | Persona (takes over session) | Human has an idea to think through or articulate |
| Taskmaster | Persona (takes over session) | A task needs sharpening before a worker can execute it |
| Worker | Persona (non-interactive) | Triggered by dispatch — not loaded directly by Butler |
| Doctor | Persona (takes over session) | Something feels off, health check requested, tasks stalled |
| Butler | Skill | Session setup — loads at session start, handles all routing |
| Herald | Skill | Always present in interactive sessions |
| Foreman | Skill | Task pipeline — dispatch, advancement, manual controls |

Role files: `.domus/reference/staff/roles/<role>.md`
