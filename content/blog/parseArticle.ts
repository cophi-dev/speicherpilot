import type { BlogFigureId } from "@/content/blog/figures";

export type Inline =
  | { kind: "text"; text: string; strong: boolean }
  | { kind: "cite"; ids: string[]; strong: boolean };

export type SourceLink = { href: string; text: string };

export type SourceRow = {
  id: string;
  quelle: string;
  stand: string;
  links: SourceLink[];
};

export type Block =
  | { type: "h2"; id: string; text: string }
  | { type: "p"; inlines: Inline[] }
  | { type: "ul"; items: Inline[][] }
  | { type: "ol"; items: Inline[][] }
  | { type: "callout"; title: string; items: Inline[][]; question: Inline[] }
  | { type: "figure"; figure: BlogFigureId }
  | { type: "sources"; intro: string; headers: string[]; rows: SourceRow[]; note: string };

export type ParsedArticle = {
  title: string;
  description: string;
  standLine: string;
  blocks: Block[];
};

const CITE = /\[(Q\d+(?:\s*,\s*Q\d+)*)\]/g;

export function inlineText(items: Inline[]): string {
  return items
    .map((item) => (item.kind === "text" ? item.text : `[${item.ids.join(", ")}]`))
    .join("");
}

function parseCites(input: string, strong: boolean): Inline[] {
  const out: Inline[] = [];
  const pattern = new RegExp(CITE.source, "g");
  let last = 0;
  for (const match of input.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) {
      out.push({ kind: "text", text: input.slice(last, index), strong });
    }
    const ids = match[1].split(/\s*,\s*/);
    out.push({ kind: "cite", ids, strong });
    last = index + match[0].length;
  }
  if (last < input.length) {
    out.push({ kind: "text", text: input.slice(last), strong });
  }
  return out.filter((item) => item.kind === "cite" || item.text.length > 0);
}

export function parseInlines(input: string): Inline[] {
  const source = input.replace(/`([^`]+)`/g, "$1");
  const out: Inline[] = [];
  const bold = /\*\*([^*]+)\*\*/g;
  let last = 0;
  for (const match of source.matchAll(bold)) {
    const index = match.index ?? 0;
    if (index > last) {
      out.push(...parseCites(source.slice(last, index), false));
    }
    out.push(...parseCites(match[1], true));
    last = index + match[0].length;
  }
  if (last < source.length) {
    out.push(...parseCites(source.slice(last), false));
  }
  return out;
}

function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparator(line: string): boolean {
  return /^\|?[\s:-]+\|[\s|:-]*$/.test(line.trim());
}

function sourceLinks(quelle: string, linkCell: string): SourceLink[] {
  const urls = [...linkCell.matchAll(/https?:\/\/[^\s)]+/g)].map((match) => match[0]);
  if (urls.length === 0) {
    throw new Error(`Quelle ohne Link: ${quelle}`);
  }
  if (urls.length === 1) {
    return [{ href: urls[0], text: quelle }];
  }
  if (urls.length === 2 && linkCell.includes(" und ")) {
    const parts = quelle.split(" und ");
    if (parts.length !== 2) {
      throw new Error(`Zwei Links, aber kein „und“ im Quellennamen: ${quelle}`);
    }
    return [
      { href: urls[0], text: parts[0] },
      { href: urls[1], text: parts[1] },
    ];
  }
  const paren = linkCell.match(/\(([^:]+):\s*https?:\/\//);
  if (urls.length === 2 && paren) {
    return [
      { href: urls[0], text: quelle },
      { href: urls[1], text: paren[1].trim() },
    ];
  }
  throw new Error(`Linkspalte nicht lesbar: ${linkCell}`);
}

function parseTable(lines: string[]): { headers: string[]; rows: SourceRow[] } {
  const content = lines.filter((line) => line.trim() && !isSeparator(line));
  const headers = splitRow(content[0] ?? "");
  if (headers.join("|") !== "Nr.|Quelle|Stand|Link") {
    throw new Error(`Unerwartete Tabellenköpfe: ${headers.join(" | ")}`);
  }
  const rows = content.slice(1).map((line) => {
    const cells = splitRow(line);
    if (cells.length !== 4) {
      throw new Error(`Quellenzeile hat ${cells.length} Spalten: ${line}`);
    }
    const [id, quelle, stand, linkCell] = cells;
    if (!/^Q\d+$/.test(id)) {
      throw new Error(`Quellennummer fehlt: ${line}`);
    }
    return { id, quelle, stand, links: sourceLinks(quelle, linkCell) };
  });
  return { headers, rows };
}

function parseCallout(quoted: string[]): Block {
  const body = quoted.map((line) => line.replace(/^>\s?/, ""));
  let index = 0;
  while (index < body.length && body[index].trim() === "") {
    index += 1;
  }
  const titleLine = body[index] ?? "";
  if (!titleLine.startsWith("### ")) {
    throw new Error("Hervorgehobener Kasten ohne Überschrift");
  }
  const title = titleLine.slice(4).trim();
  index += 1;
  const items: Inline[][] = [];
  let question: Inline[] | null = null;
  while (index < body.length) {
    const line = body[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    if (line.startsWith("- ")) {
      items.push(parseInlines(line.slice(2).trim()));
      index += 1;
      continue;
    }
    const paragraph = [line.trim()];
    index += 1;
    while (index < body.length && body[index].trim() !== "" && !body[index].startsWith("- ")) {
      paragraph.push(body[index].trim());
      index += 1;
    }
    question = parseInlines(paragraph.join(" "));
  }
  if (!question || items.length === 0) {
    throw new Error("Hervorgehobener Kasten unvollständig");
  }
  return { type: "callout", title, items, question };
}

function takeParagraph(lines: string[], start: number): { text: string; next: number } {
  const parts: string[] = [];
  let index = start;
  while (index < lines.length && lines[index].trim() !== "") {
    parts.push(lines[index].trim());
    index += 1;
  }
  return { text: parts.join(" "), next: index };
}

export function parseArticleMarkdown(markdown: string): ParsedArticle {
  const lines = markdown
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/<!--[\s\S]*?-->/g, ""));

  let index = 0;
  const skipBlank = () => {
    while (index < lines.length && lines[index].trim() === "") {
      index += 1;
    }
  };
  skipBlank();
  if (!lines[index]?.startsWith("# ")) {
    throw new Error("Artikel ohne Titel");
  }
  const title = lines[index].slice(2).trim();
  index += 1;
  skipBlank();
  const italic = (label: string) => {
    const line = lines[index] ?? "";
    const match = line.match(/^\*(.+)\*$/);
    if (!match) {
      throw new Error(`${label} fehlt`);
    }
    index += 1;
    return match[1];
  };
  const description = italic("Untertitel");
  skipBlank();
  const standLine = italic("Standzeile");

  const blocks: Block[] = [];
  while (index < lines.length) {
    skipBlank();
    if (index >= lines.length) {
      break;
    }
    const line = lines[index];
    if (line.trim() === "---") {
      index += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", id: headingId(line.slice(3).trim()), text: line.slice(3).trim() });
      index += 1;
      continue;
    }
    if (line.startsWith(">")) {
      const quoted: string[] = [];
      while (index < lines.length && lines[index].startsWith(">")) {
        quoted.push(lines[index]);
        index += 1;
      }
      blocks.push(parseCallout(quoted));
      continue;
    }
    if (line.startsWith("- ")) {
      const items: Inline[][] = [];
      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(parseInlines(lines[index].slice(2).trim()));
        index += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: Inline[][] = [];
      while (index < lines.length && /^\d+\.\s/.test(lines[index])) {
        items.push(parseInlines(lines[index].replace(/^\d+\.\s+/, "").trim()));
        index += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }
      const table = parseTable(tableLines);
      const previous = blocks[blocks.length - 1];
      if (!previous || previous.type !== "p") {
        throw new Error("Quellentabelle ohne Einleitung");
      }
      blocks.pop();
      skipBlank();
      let note = "";
      if (index < lines.length && lines[index].trim() !== "" && !lines[index].startsWith("#")) {
        const paragraph = takeParagraph(lines, index);
        note = paragraph.text.replace(/`([^`]+)`/g, "$1");
        index = paragraph.next;
      }
      blocks.push({
        type: "sources",
        intro: inlineText(previous.inlines),
        headers: table.headers,
        rows: table.rows,
        note,
      });
      continue;
    }
    const paragraph = takeParagraph(lines, index);
    blocks.push({ type: "p", inlines: parseInlines(paragraph.text) });
    index = paragraph.next;
  }

  return { title, description, standLine, blocks };
}

export type FigureInsert =
  | { kind: "after-list-item"; startsWith: string; figure: BlogFigureId }
  | { kind: "after-paragraph"; startsWith: string; figure: BlogFigureId };

export function insertFigures(blocks: Block[], inserts: readonly FigureInsert[]): Block[] {
  const pending = [...inserts];
  const out: Block[] = [];
  for (const block of blocks) {
    out.push(block);
    const text =
      block.type === "ul" || block.type === "ol"
        ? block.items.map((item) => inlineText(item)).join("\n")
        : block.type === "p"
          ? inlineText(block.inlines)
          : "";
    const hit = pending.findIndex((insert) => {
      if (insert.kind === "after-list-item") {
        return block.type === "ul" && text.includes(insert.startsWith);
      }
      return block.type === "p" && text.startsWith(insert.startsWith);
    });
    if (hit >= 0) {
      out.push({ type: "figure", figure: pending[hit].figure });
      pending.splice(hit, 1);
    }
  }
  if (pending.length > 0) {
    throw new Error(`Grafik ohne Stelle im Text: ${pending.map((insert) => insert.figure).join(", ")}`);
  }
  return out;
}

function pushBlockText(parts: string[], block: Block, linkMode: "all" | "extra") {
  if (block.type === "h2") {
    parts.push(block.text);
  } else if (block.type === "p") {
    parts.push(inlineText(block.inlines));
  } else if (block.type === "ul" || block.type === "ol") {
    for (const item of block.items) {
      parts.push(inlineText(item));
    }
  } else if (block.type === "callout") {
    parts.push(block.title);
    for (const item of block.items) {
      parts.push(inlineText(item));
    }
    parts.push(inlineText(block.question));
  } else if (block.type === "sources") {
    parts.push(block.intro, ...block.headers);
    for (const row of block.rows) {
      parts.push(row.id, row.quelle, row.stand);
      for (const link of row.links) {
        if (linkMode === "all" || !row.quelle.includes(link.text)) {
          parts.push(link.text);
        }
      }
    }
    if (block.note) {
      parts.push(block.note);
    }
  }
}

/** Visible article words, including every source link label. */
export function readableText(article: ParsedArticle): string {
  const parts: string[] = [article.title, article.description, article.standLine];
  for (const block of article.blocks) {
    pushBlockText(parts, block, "all");
  }
  return parts.join("\n");
}

/** Same words a reader meets, without counting a source name twice when it is also the link. */
export function readingText(article: ParsedArticle): string {
  const parts: string[] = [article.title, article.description, article.standLine];
  for (const block of article.blocks) {
    pushBlockText(parts, block, "extra");
  }
  return parts.join("\n");
}

const WORDS_PER_MINUTE = 200;

export function readingMinutesFromText(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
