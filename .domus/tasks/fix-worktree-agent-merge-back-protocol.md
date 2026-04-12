# Task: Fix worktree agent merge-back protocol

**ID:** fix-worktree-agent-merge-back-protocol
**Status:** in-progress
**Branch:** task/fix-worktree-agent-merge-back-protocol
**Autonomous:** true
**Priority:** high
**Captured:** 2026-03-29
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Extract the merge and close-out logic out of Foreman and into a new **Housekeeper** skill. Migrate **Herald** from a role file to a skill. Introduce the **`ready-for-master`** branch as a persistent staging target for Housekeeper merges.

**Background — why the original capture has shrunk:** the task was originally captured around two problems: (1) agents could silently displace work in the main worktree by stashing/switching to merge, and (2) completed branches piled up with no surfacing mechanism. Problem (1) has since been mitigated by Foreman's "Safe merge protocol" (the never-stash / never-switch / leave-for-human rules). What remains is (2) — and a domain-model observation that Foreman is doing two distinct jobs (dispatch/supervise *and* land/cleanup) that should be separate roles.

**Why now:** as concurrency grows, the post-review landing job (sequencing branches, resolving merge order, cleaning up worktrees) becomes substantial enough that it deserves its own role. Splitting it out now is cheap and gives the new role room to grow. Doing the extraction without also adding surfacing would leave the originally-captured pile-up bug unfixed, so both pieces ship together.

**Domain split:**
- **Foreman** — forward direction. Dispatches Workers, supervises execution. Responsibility ends when Worker has committed and parked the branch.
- **Housekeeper** — landing direction. Lands approved branches into `ready-for-master` (a persistent staging branch that tracks the base branch), resolves merge conflicts using commit/task context, removes worktrees, advances tasks to done. Also owns the reverse sync: `ready-for-master` → base branch via ff-merge. Action-only.
- **Herald** — observation. Migrated from role file to skill. Already surfaces stalled tasks, ready work, cold ideas. Grows checks for unmerged work and `ready-for-master` divergence.

The observation/action split mirrors the existing Herald-vs-everyone-else distinction in the staff registry: Herald reports state, other roles mutate it.

**The `ready-for-master` branch:** a persistent branch that always exists, tracking the base branch. Solves the git limitation where the base branch can't be checked out in two worktrees simultaneously. Housekeeper merges feature branches into `ready-for-master` (which is always available for checkout), then at the human's convenience, syncs `ready-for-master` → base branch via ff-merge. The branch should be invisible in history — ff-merges leave no merge commits.

---

## Acceptance Criteria

### Housekeeper skill (partially done — pass 1 created the skill, pass 2 updates it)

- [x] New Housekeeper skill exists at `src/templates/skills/housekeeper/`, following the Oracle skill pattern (`SKILL.md` index + `references/` as needed).
- [x] Housekeeper skill activates on action-verb intents only: "merge it", "land that branch", "close out the task", "sync to master", and similar. Status questions ("any unmerged work?", "what's parked?") are NOT Housekeeper's trigger — they go to Herald.
- [x] Skill activation description is precise enough that "merge it" routes to Housekeeper and not Foreman.
- [x] Housekeeper safe-merge protocol updated: merge target is `ready-for-master`, NOT the base branch directly.
- [x] Housekeeper pre-merge sync: before merging any feature branch, Housekeeper updates `ready-for-master` with latest base branch (usually a no-op, catches direct base-branch commits).
- [x] Housekeeper reverse sync protocol: triggered on "sync to master", "push to master", or similar. Attempts ff-merge of `ready-for-master` → base branch. If ff is not possible, reports divergence to human with details — does NOT force.
- [x] Housekeeper conflict resolution: attempts auto-resolution of merge conflicts. Uses commit messages and task descriptions for context when resolving. Only surfaces conflicts to human when genuine judgment is needed. Never force-pushes or force-resolves.
- [x] Base branch resolution is explicit: protocol says "read base branch from `.domus/config.json`". No ambiguous `<base-branch>` placeholders without explaining where the value comes from.
- [x] `ready-for-master` bootstrap: if the branch doesn't exist when Housekeeper runs, create it from base branch. No CLI changes to `domus init` needed — Housekeeper self-bootstraps.

### Herald skill (new — migrate from role file to skill)

- [x] Herald migrated from role file to skill: `src/templates/skills/herald/` following Oracle pattern (`SKILL.md` index + `references/`).
- [x] Herald skill activates on "what's next?", "what's ready?", "what's going on?", "any outstanding work?", status inquiries, and similar.
- [x] Existing Herald checks 1–5 carried over from role file into skill references.
- [x] Herald Check 6: unmerged work awaiting landing. Enumerates **both** parked worktrees (`git worktree list --porcelain`) and unmerged branches (`git branch --no-merged <base-branch>`). Surfaces each with branch, task ID, worktree path (if present), and a **lifecycle tag**: `running`, `finished`, `blocked`, or `orphaned`. See implementation notes for detection rules. Briefing format extended to include an "Unmerged work" section grouped by tag.
- [x] Herald Check 7: `ready-for-master` divergence. Surfaces "ready-for-master is N commits ahead of base branch" and "base branch has M commits not in ready-for-master." Early warning on divergence before Housekeeper needs to rebase instead of ff-merge.

### Cross-cutting updates (partially done)

- [x] `src/templates/reference/staff/roles/foreman.md` updated: "Merge and Close" section removed; top description amended so Foreman no longer claims close-out responsibility.
- [x] `src/templates/reference/staff/staff.md` updated: Housekeeper entry added. Herald entry updated to note skill implementation.
- [x] `src/templates/reference/staff/role-activation-rules.md` reviewed: Housekeeper and Herald are both skill-activated (like Oracle).
- [x] `src/templates/reference/agent-instructions.md` swept for any references to Foreman handling merge/close-out; updated for consistency.
- [x] `src/templates/reference/staff/roles/herald.md` — old role file removed or replaced with a pointer to the Herald skill (to avoid confusion about which is authoritative).
- [x] `src/templates/reference/staff/staff.md` — Herald entry updated to reflect skill implementation (currently says role file).
- [ ] Manual test: in a session with at least one parked worktree, asking "any outstanding work?" surfaces it via Herald, and asking "merge it" lands it via Housekeeper.

**Out of scope:**
- No new `domus` CLI commands. Skill + git only. (CLI surface for housekeeper status is captured as a separate idea.)
- No Worker role file changes. Worker already doesn't merge.
- No new ADR. This refactors an existing decision (ADR 005 / Foreman protocol); commit message + updated role files are sufficient.
- **No "awaiting review" vs "approved for merge" distinction.** That requires a new lifecycle state and is already on the v0.1+ roadmap via ADR 005's `ready-for-senior-review` / `ready-for-manual-review` statuses (currently skipped by `advance` in v0.0). When that lands, Herald's Check 6 can grow a fifth tag (`approved`) for free — the surfacing scaffolding from this task will already be in place.
- No drafter detection. Drafter is not currently templated into Domus (per `staff.md`); add when drafter ships.
- No `domus init` changes for `ready-for-master` — Housekeeper self-bootstraps the branch if missing.

---

## Implementation Notes

### Pass 1 (done — commit 394cb40)

Created Housekeeper skill, lifted safe-merge protocol from Foreman, added Herald Check 6, updated Foreman/staff/agent-instructions.

### Pass 2 (this dispatch)

**Files to create:**
- `src/templates/skills/herald/SKILL.md` — index with frontmatter `name: herald`, description covering status/briefing intents, and a routing table pointing at reference files.
- `src/templates/skills/herald/references/briefing.md` — all checks (1–7) from the existing `herald.md` role file, plus the new Check 7 (ready-for-master divergence). Carry over the briefing format and tone sections.
- `src/templates/skills/housekeeper/references/sync.md` — reverse sync protocol (`ready-for-master` → base branch via ff-merge).

**Files to update:**
- `src/templates/skills/housekeeper/SKILL.md` — add routing entry for sync intent ("sync to master", "push to master").
- `src/templates/skills/housekeeper/references/safe-merge.md` — major update:
  - Merge target changes from `<base-branch>` to `ready-for-master`.
  - Add pre-merge sync step: update `ready-for-master` with latest base branch before merging feature branch.
  - Add `ready-for-master` bootstrap: if branch doesn't exist, create from base branch.
  - Add explicit base branch resolution: "Read from `.domus/config.json`. If no config exists, default to `main`."
  - Add conflict resolution guidance: attempt auto-resolution using commit/task descriptions for context. Only surface conflicts requiring human judgment. Never force.
  - The main-worktree safety check changes: Housekeeper now checks out `ready-for-master` in the worktree (not base branch), so the "main worktree is on base branch" case is no longer a blocker — that's the whole point of `ready-for-master`.
- `src/templates/reference/staff/roles/herald.md` — replace contents with a pointer: "Herald is now a skill. See `src/templates/skills/herald/SKILL.md`." Or remove entirely if the template sync mechanism handles this.
- `src/templates/reference/staff/staff.md` — update Herald entry to say skill implementation instead of role file.
- `src/templates/reference/staff/role-activation-rules.md` — update Herald entry: no longer "Always-present role", now skill-activated like Oracle.

**Herald Check 7 — ready-for-master divergence:**

```
# Commits on ready-for-master not on base branch:
git -C <root> rev-list <base-branch>..ready-for-master --count

# Commits on base branch not on ready-for-master:
git -C <root> rev-list ready-for-master..<base-branch> --count
```

If the second count is > 0, base branch has diverged — surface it as a warning since the next sync will require a rebase rather than ff-merge.

If `ready-for-master` doesn't exist, skip this check (Housekeeper will bootstrap it on first merge).

**Housekeeper pre-merge sync:**

Before merging any feature branch into `ready-for-master`:

```
git -C <worktree-path> checkout ready-for-master
git -C <worktree-path> merge <base-branch> --ff-only
```

If ff-only fails (base branch diverged), attempt a rebase:

```
git -C <worktree-path> rebase <base-branch>
```

If rebase has conflicts, report to human. Don't proceed with the feature merge until `ready-for-master` is caught up.

**Housekeeper conflict resolution strategy:**

When merging a feature branch into `ready-for-master` and conflicts arise:
1. Read the conflicting regions.
2. Look up the task description (via task ID from branch name) and commit messages on both sides for intent.
3. If the resolution is clear (e.g., both sides added to different parts of the same file, or one side is strictly additive), resolve automatically.
4. If the resolution requires judgment (e.g., both sides changed the same logic, semantic conflict), surface to human with: the conflicting files, the relevant commit messages, and what each side was trying to do.
5. Never `git merge --force` or `git checkout --theirs/--ours` without human approval.

**Commit scope:** single commit on top of pass 1 (same branch). Both passes land together when merged.

**Risks:**
- Herald skill migration touches a file that's already been updated by pass 1 (the role file got Check 6 added). Pass 2 needs to move that content into the skill, not lose it.
- The `ready-for-master` concept is new to the codebase. Other role files (worker, foreman) should not need to know about it — only Housekeeper and Herald do. Verify no leakage.
- Skill activation for Herald needs to be precise: "what's next?" should route to Herald, not Butler or Taskmaster. Test in fresh session.
