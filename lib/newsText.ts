const decodeCodePoint = (code: number, fallback: string) =>
  Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : fallback;

/** One pass. `&amp;nbsp;` becomes `&nbsp;` here and a space on the next pass. */
function decodeNewsEntitiesOnce(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (entity, digits: string) => decodeCodePoint(Number(digits), entity))
    .replace(/&#x([0-9a-f]+);/gi, (entity, digits: string) => decodeCodePoint(Number.parseInt(digits, 16), entity));
}

/** Decode entities until a pass changes nothing. Google News escapes `&nbsp;` twice. */
export function decodeNewsText(value: string): string {
  let current = value;
  for (let pass = 0; pass < 4; pass += 1) {
    const next = decodeNewsEntitiesOnce(current);
    if (next === current) {
      break;
    }
    current = next;
  }
  return current.replace(/\u00a0/g, " ");
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, " ");

/** Text that can be rendered. A literal `&nbsp;` in stored JSON does not survive. */
export function plainNewsText(value: string): string {
  return stripHtml(decodeNewsText(value))
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
