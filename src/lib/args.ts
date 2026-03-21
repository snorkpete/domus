// ── CLI argument helpers ──────────────────────────────────────────────────────

export function parseFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

export function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

export function toKebabCase(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function uniqueId(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export function validateEnum<T extends string>(
  value: string,
  valid: T[],
  label: string,
): T {
  if (valid.includes(value as T)) return value as T;
  console.error(
    `Invalid ${label}: ${value}. Must be one of: ${valid.join(", ")}`,
  );
  process.exit(1);
}
