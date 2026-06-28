import { parseFlag } from "../lib/args.ts";
import { cmdOverview } from "./task/overview.ts";

const USAGE = `
domus health — triage health-check tasks

Usage:
  domus health [options]        Show all health-check tasks (deferred always included)
  domus health watch [options]  Auto-refresh the health view

Options:
  --interval <seconds>  Refresh interval for watch (default: 10)
  --help, -h            Print this help

Notes:
  domus health is pre-scoped to the health-check tag. Additional --tag flags are cumulative.
  Deferred health-check tasks are always included — no flag required.
`.trim();

export async function runHealth(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    return;
  }

  if (args[0] === "watch") {
    runHealthWatch(args.slice(1));
    return;
  }

  await cmdOverview(["--tag", "health-check", "--include-deferred", ...args]);
}

export function runHealthWatch(
  args: string[],
  whichFn: (bin: string) => string | null = (bin) => Bun.which(bin),
): void {
  const watchBin = whichFn("watch");
  if (!watchBin) {
    console.error("watch not found — install it with: brew install watch");
    process.exit(1);
  }

  const interval = parseFlag(args, "--interval") ?? "10";
  const passthroughArgs = args.filter(
    (a, i) => a !== "--interval" && args[i - 1] !== "--interval",
  );
  const domusBin = whichFn("domus") ?? "domus";
  const result = Bun.spawnSync(
    [
      watchBin,
      "-c",
      "-t",
      "-n",
      interval,
      domusBin,
      "health",
      "--interval",
      interval,
      ...passthroughArgs,
    ],
    { stdio: ["inherit", "inherit", "inherit"] },
  );
  process.exit(result.exitCode ?? 0);
}
