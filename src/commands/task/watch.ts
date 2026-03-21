import { parseFlag } from "../../lib/args.ts";

export function cmdWatch(args: string[]): void {
  const watchBin = Bun.which("watch");
  if (!watchBin) {
    console.error("watch not found — install it with: brew install watch");
    process.exit(1);
  }

  const interval = parseFlag(args, "--interval") ?? "10";
  const passthroughArgs = args.filter(
    (a, i) => a !== "--interval" && args[i - 1] !== "--interval",
  );
  const domusBin = Bun.which("domus") ?? "domus";
  const result = Bun.spawnSync(
    [
      watchBin,
      "-c",
      "-t",
      "-n",
      interval,
      domusBin,
      "task",
      "overview",
      "--interval",
      interval,
      ...passthroughArgs,
    ],
    { stdio: ["inherit", "inherit", "inherit"] },
  );
  process.exit(result.exitCode ?? 0);
}
