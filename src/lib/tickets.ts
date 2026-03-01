import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

export type Ticket = {
  number: string;
  title: string;
  status: string;
  project: string;
  branch: string;
  filePath: string;
};

export function parseTicketContent(filePath: string, content: string): Ticket {
  let number = "";
  let title = "";

  const headingMatch = content.match(/^# (\d+) [—-] (.+)$/m);
  if (headingMatch) {
    number = headingMatch[1];
    title = headingMatch[2].trim();
  } else {
    const filenameMatch = basename(filePath).match(/^(\d+)-(.+)\.md$/);
    if (filenameMatch) {
      number = filenameMatch[1];
      title = filenameMatch[2].replace(/-/g, " ");
    }
  }

  const statusMatch = content.match(/^\*\*Status:\*\*\s*(.+)$/m);
  const projectMatch = content.match(/^\*\*Project:\*\*\s*(.+)$/m);
  const branchMatch = content.match(/^\*\*Branch:\*\*\s*(.+)$/m);

  return {
    number,
    title,
    status: statusMatch?.[1]?.trim() ?? "unknown",
    project: projectMatch?.[1]?.trim() ?? "unknown",
    branch: branchMatch?.[1]?.trim() ?? "",
    filePath,
  };
}

export async function parseTicket(filePath: string): Promise<Ticket> {
  const content = await readFile(filePath, "utf-8");
  return parseTicketContent(filePath, content);
}

export async function updateTicketStatus(
  ticketFile: string,
  status: string,
): Promise<void> {
  const content = await readFile(ticketFile, "utf-8");
  const updated = content.replace(/^(\*\*Status:\*\*) .+$/m, `$1 ${status}`);
  await writeFile(ticketFile, updated, "utf-8");
}
