/** Title sizes tried in turn, with the most lines each may take below the cover window. */
const STEPS = [
  { size: 50, lines: 2 },
  { size: 40, lines: 3 },
  { size: 34, lines: 3 },
] as const;

/** Splits a title into lines no wider than `max`; a word wider than `max` keeps a line alone. */
function wrap(title: string, max: number, width: (text: string) => number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of title.split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;
    if (current && width(next) > max) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  lines.push(current);
  return lines;
}

/**
 * Lays out a card title on every tale's card: the largest size whose lines all fit, stepping down
 * from 50 px (two lines) to 40 and 34 px (three lines); a title still too long ends its third line
 * with an ellipsis. `width(text, size)` measures text at a size.
 */
export function fitTitle(
  title: string,
  max: number,
  width: (text: string, size: number) => number,
): { size: number; lines: string[] } {
  for (const step of STEPS) {
    const measure = (text: string): number => width(text, step.size);
    const lines = wrap(title, max, measure);
    if (lines.length <= step.lines && lines.every((line) => measure(line) <= max)) {
      return { size: step.size, lines };
    }
  }
  const last = STEPS[STEPS.length - 1];
  const measure = (text: string): number => width(text, last.size);
  const lines = wrap(title, max, measure).slice(0, last.lines);
  let tail = lines[last.lines - 1] ?? "";
  while (tail && measure(`${tail}…`) > max) tail = tail.slice(0, -1).trimEnd();
  lines[lines.length - 1] = `${tail}…`;
  return { size: last.size, lines };
}
