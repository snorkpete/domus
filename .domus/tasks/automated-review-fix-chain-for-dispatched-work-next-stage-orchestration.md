# Task: Automated review-fix chain for dispatched work (next-stage orchestration)

**ID:** automated-review-fix-chain-for-dispatched-work-next-stage-orchestration
**Status:** raw
**Autonomous:** false
**Priority:** normal
**Captured:** 2026-06-25
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Add an automated multi-agent review/fix chain to domus so that a dispatched worker's commit is automatically code-reviewed, and review feedback either loops back through an automated fixer or terminates at human review — all coordinated through the task's markdown file as shared state.

This is a **proposed design with open questions, not a finalized spec.** Capture it faithfully and resolve the open questions before implementation.

### The chain

1. **Dispatch → commit.** A worker executes the task in an isolated worktree and produces a commit (this is the existing worker behavior).
2. **Automated senior review.** A senior-reviewer agent (invokes the senior code-review skill) reviews the commit. It writes its findings into a dedicated "Code Review" section of the task's `task.md`, each comment carrying file + line references. It then sets the task status to one of two values:
   - **needs changes** — actionable review feedback exists.
   - **ready for human review** — the change passes; this is the END of the automated chain (human takes over).
3. **Automated fix (on "needs changes").** A "review-fixer" worker is fired. It knows to read the "Code Review" section of `task.md` to learn what to fix, makes the changes (new commit), then the chain returns to step 2 (re-review).
4. **Termination.** "ready for human review" ends the chain. The human is NOT involved in the review/fix loop itself.

### Coordination principle

**`task.md` is the shared blackboard.** Every agent in the chain reads/writes its state there so the next agent knows where to look — the senior reviewer writes to a specific "Code Review" section with file:line refs; the review-fixer reads exactly that section.

### Triage

A **main orchestrator agent (Opus)** sits between stages and decides which review comments to act on vs. skip before handing work to the review-fixer. Explicit design intent: the HUMAN should NOT be pulled into this triage — the main agent decides autonomously. **(Firm design decision.)**

---

## Acceptance Criteria

_Design-level criteria — to be firmed up during refinement._

- [ ] Worker → commit → automated senior review → status transition is wired end to end.
- [ ] Two terminal/transition statuses exist and drive the chain: "needs changes" (loops to fixer) and "ready for human review" (ends chain).
- [ ] Senior reviewer writes structured comments (file + line) into a designated "Code Review" section of task.md.
- [ ] Review-fixer reads that section and applies fixes as a new commit, then re-review fires.
- [ ] Orchestrator triages reviewer feedback (act vs skip) without human involvement.

---

## Open Questions / To Resolve

- **Loop termination / cycle cap:** how many review→fix cycles before escalating to a human, to avoid an infinite review-fix loop?
- **Orchestrator mechanics:** is the main Opus agent the dispatcher that watches status transitions and fires the next agent? Event-driven vs polling? How does it "sit between stages"?
- **Code Review section format:** exact structure so the review-fixer can parse it reliably (per-comment file:line, severity, status of each comment once addressed?).
- **Triage record:** where in task.md does the orchestrator record which comments it chose to act on vs skip (so the loop is auditable and the fixer only sees in-scope items)?
- **Status taxonomy:** do "needs changes" / "ready for human review" become first-class domus statuses, or task metadata fields? How do they relate to existing statuses?
- **Re-review trigger:** after the fixer commits, who re-invokes the senior reviewer — the fixer, or the orchestrator?
- **Relationship to existing pieces:** how this composes with the existing worker agent, the senior-code-reviewer agent/skill, and the housekeeper close-out skill.
- **Comment resolution tracking:** how addressed-vs-outstanding comments are marked across cycles.
