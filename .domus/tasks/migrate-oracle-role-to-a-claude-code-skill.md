# Task: Migrate Oracle role to a Claude Code skill

**ID:** migrate-oracle-role-to-a-claude-code-skill
**Status:** raw
**Autonomous:** false
**Priority:** normal
**Captured:** 2026-03-23
**Parent:** none
**Depends on:** none
**Idea:** replace-interactive-personas-with-skills-roles-as-skill-descriptions
**Spec refs:** none

---

## What This Task Is

Consolidate the Oracle role file and existing idea-related skills (`capture-idea`, `update-idea`) into a single Oracle skill (`~/.claude/skills/oracle/SKILL.md`). The Oracle skill owns the entire idea domain: ideation sessions, idea capture, and idea updates. Uses progressive disclosure — SKILL.md is an index that routes to reference files based on intent.

First test of the personas-as-skills pattern.

---

## Acceptance Criteria

- [ ] Skill file created at `~/.claude/skills/oracle/SKILL.md` with proper frontmatter (name, description, version)
- [ ] Skill description covers all idea-domain triggers: ideation ("I have an idea", "let me brainstorm", "what if we..."), capture ("capture an idea", "save an idea", "file that as an idea"), update ("update idea", "change idea status")
- [ ] Description also covers agent-initiated captures (agents filing ideas when they encounter unknowns mid-execution)
- [ ] SKILL.md acts as an index — routes to reference files based on matched intent:
  - `references/ideation.md` — Oracle behavioral rules (ask don't prescribe, separate what from how, keep the human talking, don't rush to output)
  - `references/idea-management.md` — capture and update logic (absorbs current `capture-idea` and `update-idea` skill content)
- [ ] All behavioral rules from current `oracle.md` preserved in `references/ideation.md`
- [ ] All capture/update logic from current `capture-idea` and `update-idea` skills preserved in `references/idea-management.md`
- [ ] Oracle entry removed from `role-activation-rules.md` interactive roles table
- [ ] Oracle row removed from `butler.md` routing table (brainstorming/ideation no longer routes to a role file — skill handles it)
- [ ] Oracle mention in `agent-instructions.md` "further reading" updated or removed
- [ ] All changes applied to both `.domus/reference/` and `src/templates/` copies
- [ ] Oracle role file kept temporarily as reference (not deleted) — note at top saying superseded by skill
- [ ] Source of truth lives in `src/templates/skills/oracle/` — installed copy at `~/.claude/skills/oracle/` mirrors it
- [ ] Old `capture-idea` and `update-idea` skill directories removed from `~/.claude/skills/`
- [ ] Validated manually: start a fresh session, test all three trigger paths (ideation, capture, update) activate correctly

---

## Implementation Notes

### Source material
- Current role file: `.domus/reference/staff/roles/oracle.md`
- Current capture skill: `~/.claude/skills/capture-idea/SKILL.md`
- Current update skill: `~/.claude/skills/update-idea/SKILL.md`
- Idea: `.domus/ideas/replace-interactive-personas-with-skills-roles-as-skill-descriptions.md`

### Skill structure
Source of truth in the repo (copied to `~/.claude/skills/oracle/` by `domus init`):
```
src/templates/skills/oracle/
  SKILL.md                        ← index: frontmatter triggers + routing to references
  references/
    ideation.md                   ← Oracle behavioral rules + "when the idea is clear" flow
    idea-management.md            ← capture + update logic (absorbed from old skills)
```

### Key design decisions
- `user-invocable: true` — allow explicit `/oracle` invocation as well as natural language
- Description must be specific enough to activate on ideation/capture/update intent, but not so broad it fires on every question
- Progressive disclosure: SKILL.md stays lean, reference files load on demand
- Agent-initiated captures must work — description should include agent-facing triggers alongside human-facing ones
- **No Oracle content in the `@`-include chain.** The skill handles all activation. `agent-instructions.md` retains only workflow rules that apply to all sessions (task lifecycle, dispatch, etc.) and `@`-includes for roles not yet migrated (Butler, Foreman). Any Oracle references in the chain must be removed, not just commented out.

### What this validates
If this works, the pattern is proven: role files can be replaced by skills with no loss of functionality and simpler activation. The progressive disclosure model (SKILL.md as index + reference files) is the template for Butler and Taskmaster.
