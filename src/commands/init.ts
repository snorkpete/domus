import { projectRoot } from "../lib/jsonl.ts";
import {
  ensureAuditLog,
  ensureFolderStructure,
  mergeClaudeSettings,
  resolveDomusPermission,
  setBranch,
  writeOwnedFiles,
} from "../lib/update-steps.ts";

export { resolveDomusPermission };

type InitOptions = {
  projectPath?: string;
};

export async function runInit(
  _args: string[],
  options: InitOptions = {},
): Promise<void> {
  const projectPath = options.projectPath ?? projectRoot();
  const created: string[] = [];
  const skipped: string[] = [];

  // Create missing directories
  const createdDirs = await ensureFolderStructure(projectPath);
  for (const d of createdDirs) created.push(d);

  // Create missing seed files (init: skip existing)
  const { created: createdFiles, skipped: skippedFiles } =
    await writeOwnedFiles(projectPath, { overwrite: false });
  created.push(...createdFiles);
  skipped.push(...skippedFiles);

  // Write .domus/config.json (always overwrite — captures current branch at init time)
  await setBranch(projectPath);
  created.push(".domus/config.json");

  // Create .domus/audit.jsonl + .gitignore entry
  const createdAudit = await ensureAuditLog(projectPath);
  created.push(...createdAudit);
  if (!createdAudit.includes(".domus/audit.jsonl")) {
    skipped.push(".domus/audit.jsonl");
  }

  // Merge .claude/settings.json
  const { verb: settingsVerb } = await mergeClaudeSettings(projectPath);

  // Report
  if (created.length > 0) {
    console.log("Created:");
    for (const f of created) {
      console.log(`  + ${f}`);
    }
  }
  if (skipped.length > 0) {
    console.log("Already exists (skipped):");
    for (const f of skipped) {
      console.log(`  · ${f}`);
    }
  }
  console.log(`  + .claude/settings.json ${settingsVerb} (permissions + PATH)`);
}
