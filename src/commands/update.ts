import { projectRoot } from "../lib/jsonl.ts";
import {
  ensureAuditLog,
  ensureFolderStructure,
  mergeClaudeSettings,
  migrateIdeaSchema,
  migrateTaskSchema,
  writeOwnedFiles,
} from "../lib/update-steps.ts";

type UpdateOptions = {
  projectPath?: string;
};

export async function runUpdate(
  _args: string[],
  options: UpdateOptions = {},
): Promise<void> {
  const projectPath = options.projectPath ?? projectRoot();

  // Ensure folder structure exists
  const createdDirs = await ensureFolderStructure(projectPath);

  // Overwrite managed files (roles, reference, tags) with latest template versions.
  // Seed files (tasks.jsonl, ideas.jsonl) are never overwritten — they contain user data.
  const { created: ownedCreated } = await writeOwnedFiles(projectPath, {
    overwrite: true,
  });

  // Ensure audit log
  const createdAudit = await ensureAuditLog(projectPath);

  // Merge Claude settings
  const { verb: settingsVerb } = await mergeClaudeSettings(projectPath);

  // Migrate task schema
  const taskResult = await migrateTaskSchema(projectPath);

  // Migrate idea schema (no-op for now)
  const ideaResult = await migrateIdeaSchema(projectPath);

  // Report
  const allCreated = [...createdDirs, ...ownedCreated, ...createdAudit];
  if (allCreated.length > 0) {
    console.log("Updated / created:");
    for (const f of allCreated) {
      console.log(`  + ${f}`);
    }
  }

  console.log(`  + .claude/settings.json ${settingsVerb} (permissions + PATH)`);

  if (taskResult.jsonlMigrated > 0 || taskResult.mdMigrated > 0) {
    console.log(
      `  ✓ Tasks migrated: ${taskResult.jsonlMigrated} JSONL record(s), ${taskResult.mdMigrated} markdown file(s)`,
    );
  } else {
    console.log("  · Tasks: already on current schema (no migration needed)");
  }

  if (ideaResult.migrated > 0) {
    console.log(`  ✓ Ideas migrated: ${ideaResult.migrated} record(s)`);
  } else {
    console.log("  · Ideas: already on current schema (no migration needed)");
  }
}
