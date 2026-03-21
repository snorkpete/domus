import { cmdAdd } from "./add.ts";
import { cmdAdvance } from "./advance.ts";
import { cmdCancel } from "./cancel.ts";
import { cmdDefer } from "./defer.ts";
import { cmdList } from "./list.ts";
import { cmdLog } from "./log.ts";
import { cmdOverview } from "./overview.ts";
import { cmdReady } from "./ready.ts";
import { cmdReopen } from "./reopen.ts";
import { cmdShow } from "./show.ts";
import { cmdStart } from "./start.ts";
import { cmdStatus } from "./status.ts";
import { cmdUpdate } from "./update.ts";
import { cmdWatch } from "./watch.ts";

const TASK_USAGE = `
domus task — task management

Usage:
  domus task add --title <title> [options]
  domus task advance <id> [--note <text>]
  domus task cancel <id> [--note <text>]
  domus task defer <id> [--note <text>]
  domus task reopen <id>
  domus task status <id> <status> [--outcome <text>]
  domus task update <id> [options]
  domus task show <id>
  domus task start <id> --branch <branch>
  domus task log <id> <message>
  domus task overview [--include-done]
  domus task ready
  domus task list [--status <status>] [--json]
  domus task watch [--interval <seconds>] [--include-done]

Subcommands:
  add       Create a new task (writes to .domus/tasks/)
  advance   Move task to its next status
  cancel    Cancel a task (from any active state)
  defer     Defer a task (from any active state)
  reopen    Reopen a cancelled or deferred task (→ raw)
  status    Set task status directly (Doctor power tool)
  update    Update metadata fields
  show      Print full detail for a single task
  start     Mark task in-progress, record branch, create execution log
  log       Append a timestamped entry to the execution log
  overview  Compact watch-friendly overview grouped by status
  ready     Show what's ready to work on (grouped by readiness)
  list      List all tasks (--json for machine-readable output)
  watch     Live-refresh overview via watch(1)
`.trim();

export async function runTask(args: string[]): Promise<void> {
  const sub = args[0];

  switch (sub) {
    case "add":
      await cmdAdd(args.slice(1));
      break;
    case "advance":
      await cmdAdvance(args.slice(1));
      break;
    case "cancel":
      await cmdCancel(args.slice(1));
      break;
    case "defer":
      await cmdDefer(args.slice(1));
      break;
    case "reopen":
      await cmdReopen(args.slice(1));
      break;
    case "status":
      await cmdStatus(args.slice(1));
      break;
    case "update":
      await cmdUpdate(args.slice(1));
      break;
    case "show":
      await cmdShow(args.slice(1));
      break;
    case "start":
      await cmdStart(args.slice(1));
      break;
    case "log":
      await cmdLog(args.slice(1));
      break;
    case "overview":
      await cmdOverview(args.slice(1));
      break;
    case "ready":
      await cmdReady(args.slice(1));
      break;
    case "list":
      await cmdList(args.slice(1));
      break;
    case "watch":
      cmdWatch(args.slice(1));
      break;
    case "--help":
    case "-h":
    case undefined:
      console.log(TASK_USAGE);
      break;
    default:
      console.error(`Unknown task subcommand: ${sub}`);
      console.error("Run `domus task --help` for usage.");
      process.exit(1);
  }
}
