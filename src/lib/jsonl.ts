import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// ── Workspace helpers ─────────────────────────────────────────────────────────

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function projectRoot(): string {
  return process.env.DOMUS_ROOT ?? resolve(process.cwd());
}

export const DOMUS_DIR = ".domus";

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
