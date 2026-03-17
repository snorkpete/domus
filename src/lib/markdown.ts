function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Updates a `**Label:** value` line in markdown content.
 */
export function updateBoldField(content: string, label: string, value: string): string {
  return content.replace(
    new RegExp(`^\\*\\*${escapeRegex(label)}:\\*\\* .+$`, "m"),
    `**${label}:** ${value}`,
  );
}

/**
 * Updates a `# Prefix: Title` heading line in markdown content.
 */
export function updateMarkdownTitle(content: string, prefix: string, value: string): string {
  return content.replace(
    new RegExp(`^# ${escapeRegex(prefix)}: .+$`, "m"),
    `# ${prefix}: ${value}`,
  );
}

/**
 * Updates the body of a section delimited by `## Heading\n\n` and `\n\n---`.
 */
export function updateSection(content: string, heading: string, value: string): string {
  return content.replace(
    new RegExp(`(## ${escapeRegex(heading)}\\n\\n)[\\s\\S]*?(\\n\\n---)`),
    `$1${value}$2`,
  );
}
