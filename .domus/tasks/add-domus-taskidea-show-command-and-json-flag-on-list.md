# Task: Add domus task/idea show command and --json flag on list

**ID:** add-domus-taskidea-show-command-and-json-flag-on-list
**Status:** done
**Autonomous:** true
**Priority:** normal
**Captured:** 2026-03-14
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Two related additions so Claude never needs to read `.md` or `.jsonl` files directly:

1. **`domus task list --json` / `domus idea list --json`** — outputs the full entry array as JSON, giving machine-readable access to all fields (depends_on, summary, tags, etc.) in one command. Best for session orientation and dependency analysis.

2. **`domus task show <id>` / `domus idea show <id>`** — prints a formatted human-readable detail view for a single entry. Best for focused point-lookup.

---

## Acceptance Criteria

- [ ] `domus task list --json` prints all task entries as a JSON array (full fields)
- [ ] `domus idea list --json` prints all idea entries as a JSON array (full fields)
- [ ] `domus task show <id>` prints a readable detail view for one task; exits non-zero if not found
- [ ] `domus idea show <id>` prints a readable detail view for one idea; exits non-zero if not found

---

## Implementation Notes

`--json` flag: in `cmdList`, detect `hasFlag(args, "--json")` and `JSON.stringify(filtered, null, 2)` instead of the icon-formatted output.

`show` subcommand: find entry by id, print all fields in a readable format (similar to the .md header block). No need to read the .md file — all data is in the JSONL.
