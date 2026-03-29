# Task: Create doctor skill for domus store validation

**ID:** create-doctor-skill-for-domus-store-validation
**Status:** raw
**Autonomous:** false
**Priority:** normal
**Captured:** 2026-03-25
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Skill that validates a single project's domus store: JSONL/MD frontmatter sync, open task status accuracy vs git log, schema integrity (field names, required fields present). Returns a concise report. Process: list tasks/ideas via --json, spot-read MD headers, cross-ref open tasks against git log, flag any drift. Runs as background subagent since it mostly returns all-ok. Skill lives in .claude/skills/doctor/SKILL.md.

---

## Acceptance Criteria

- [ ] Orphan detection: finds .md files with no jsonl entry, creates entry from frontmatter
- [ ] Ghost detection: finds jsonl entries with no .md file on disk, flags for removal
- [ ] Status sync: detects .md vs jsonl status mismatches, updates jsonl to match .md
- [ ] Invalid status detection: flags .md files with status not in VALID_STATUSES
- [ ] Field consistency: compares priority, parent, depends_on, autonomous, captured date between .md and jsonl
- [ ] Tags preservation: preserves jsonl-only tags during sync (tags not in .md frontmatter)
- [ ] `--dry-run` mode: shows what would change without applying fixes
- [ ] Idempotent: running twice produces no changes on second run
- [ ] Output format: summary counts by category + per-item details (like git fsck / npm doctor)
- [ ] Applies to both tasks and ideas stores

---

## Implementation Notes

### Checks in order

1. **Orphan detection** — Scan `.domus/tasks/*.md` (and ideas), check each has a matching jsonl entry by ID. If missing, parse frontmatter and create entry.
2. **Ghost detection** — Scan jsonl entries, check each `file` path exists on disk. Flag missing files.
3. **Status sync** — For matched pairs, compare `**Status:**` in .md against `status` in jsonl. .md is authoritative.
4. **Invalid status detection** — Validate .md status against `VALID_STATUSES` from `src/lib/task-types.ts`. Invalid status = error requiring manual fix (doctor can't guess intent).
5. **Field consistency** — Compare: priority, parent_id, depends_on, autonomous, date_captured. .md authoritative.
6. **Tags preservation** — Tags exist only in jsonl (design gap). During any jsonl rebuild/update, carry forward existing tags. Flag the asymmetry as a warning.

### Design decisions

- **Authority**: .md frontmatter is source of truth for all fields except tags.
- **Tags gap**: Tags live only in jsonl, not in .md frontmatter. This is a design smell — consider adding a `**Tags:**` field to .md frontmatter in a separate task. Doctor should warn about this gap.
- **Non-destructive by default**: Ghost entries flagged, not auto-removed (could be a rename in progress).
- **Invalid statuses are errors, not auto-fixes**: Doctor can't know if "open" should be "raw" or "ready" — requires human judgment.

### Real-world failure modes (observed 2026-03-28 in everycent)

| Issue | Count | Root cause |
|-------|-------|------------|
| .md exists, no jsonl entry | 38 | `domus task add` wrote both .md and jsonl correctly, but jsonl wasn't staged in the git commit — only the .md files were. A follow-up commit then overwrote the working tree jsonl back to the old 6-entry version. Root cause: selective `git add` missing the jsonl file. |
| .md has invalid status "open" | 3 | Manual .md edits bypassed CLI validation |
| jsonl status stale (raw vs done/cancelled) | 2 | Status updated in .md but jsonl not synced |
| jsonl tags would be lost on naive rebuild | 1 | Tags only in jsonl, not in .md frontmatter |

### Related

- Valid statuses: `src/lib/task-types.ts` (VALID_STATUSES)
- State transitions: `src/lib/state-engine.ts`
- Task store: `src/lib/task-store.ts`
- Related idea: `domus-as-the-sole-gateway-to-index-and-taskidea-data`
- Related task: `create-doctor-persona`
