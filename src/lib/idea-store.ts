import { join } from "node:path";
import {
  type IdeaEntry,
  type IdeaStatus,
  VALID_IDEA_STATUSES,
} from "./idea-types.ts";
import { DOMUS_DIR, readJsonl, writeJsonl } from "./jsonl.ts";

export type { IdeaEntry, IdeaStatus };
export { VALID_IDEA_STATUSES };

// ── Path helpers ──────────────────────────────────────────────────────────────

export function ideasJsonlPath(root: string): string {
  return join(root, DOMUS_DIR, "ideas", "ideas.jsonl");
}

export function ideasDir(root: string): string {
  return join(root, DOMUS_DIR, "ideas");
}

// ── Store helpers ─────────────────────────────────────────────────────────────

export async function readIdeas(root: string): Promise<IdeaEntry[]> {
  return readJsonl<IdeaEntry>(ideasJsonlPath(root));
}

export async function writeIdeas(
  root: string,
  ideas: IdeaEntry[],
): Promise<void> {
  return writeJsonl(ideasJsonlPath(root), ideasDir(root), ideas);
}
