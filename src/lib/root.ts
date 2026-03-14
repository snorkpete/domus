import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function stripRoot(args: string[]): { root: string | null; rest: string[] } {
  const idx = args.indexOf("--root");
  if (idx === -1) return { root: null, rest: args };
  const raw = args[idx + 1];
  if (!raw) {
    console.error("--root requires a path argument");
    process.exit(1);
  }
  const expanded = raw.startsWith("~") ? raw.replace("~", process.env.HOME ?? "") : raw;
  const abs = resolve(expanded);
  if (!existsSync(abs)) {
    console.error(`--root path does not exist: ${abs}`);
    process.exit(1);
  }
  return { root: abs, rest: [...args.slice(0, idx), ...args.slice(idx + 2)] };
}
