import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

// ── Workspace helpers ─────────────────────────────────────────────────────────

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const DOMUS_DIR = ".domus";

export type DomusConfig = {
  root: string;
  branch: string;
};

/**
 * Read .domus/config.json from the given base directory.
 * Returns null if the file does not exist or cannot be parsed.
 */
export function readDomusConfigSync(baseDir: string): DomusConfig | null {
  const configPath = join(baseDir, DOMUS_DIR, "config.json");
  if (!existsSync(configPath)) return null;
  try {
    const raw = readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as DomusConfig;
  } catch {
    return null;
  }
}

/**
 * Resolve the domus project root directory:
 * 1. DOMUS_ROOT env var (set by dispatch for workers)
 * 2. `root` field from .domus/config.json in cwd
 * 3. Fallback: resolve(cwd)
 */
export function projectRoot(): string {
  if (process.env.DOMUS_ROOT) return process.env.DOMUS_ROOT;
  const cwd = resolve(process.cwd());
  const config = readDomusConfigSync(cwd);
  if (config?.root) return config.root;
  return cwd;
}

/**
 * Read the base branch from config.json, falling back to "main".
 */
export function configBranch(root: string): string {
  const config = readDomusConfigSync(root);
  return config?.branch ?? "main";
}

// ── JSONL I/O ─────────────────────────────────────────────────────────────────

export async function readJsonl<T>(path: string): Promise<T[]> {
  if (!existsSync(path)) return [];
  const content = await readFile(path, "utf-8");
  return content
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}

export async function writeJsonl<T>(
  jsonlPath: string,
  dir: string,
  items: T[],
): Promise<void> {
  await mkdir(dir, { recursive: true });
  const content = items.map((i) => JSON.stringify(i)).join("\n");
  await writeFile(jsonlPath, content.length > 0 ? content + "\n" : "", "utf-8");
}

// ── Markdown helpers ──────────────────────────────────────────────────────────

export async function updateMarkdownStatus(
  filePath: string,
  newStatus: string,
): Promise<void> {
  if (!existsSync(filePath)) return;
  const content = await readFile(filePath, "utf-8");
  const updated = content.replace(
    /^\*\*Status:\*\* .+$/m,
    `**Status:** ${newStatus}`,
  );
  if (updated !== content) {
    await writeFile(filePath, updated, "utf-8");
    return;
  }
  // No **Status:** line present — insert one after the title line
  const withInserted = content.replace(
    /^(# .+\n)/m,
    `$1\n**Status:** ${newStatus}`,
  );
  if (withInserted !== content) {
    await writeFile(filePath, withInserted, "utf-8");
  }
}
