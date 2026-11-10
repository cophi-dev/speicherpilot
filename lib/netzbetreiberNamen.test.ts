import fs from "node:fs";
import path from "node:path";

import { containsGridOperatorName, gridOperatorBlocklist, forbiddenConnectionPhrases } from "@/lib/netzbetreiberNamen";

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walk(full, acc);
    } else if (/\.(tsx|ts|md|json|svg)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("netzbetreiberNamen blocklist", () => {
  const roots = [
    path.join(process.cwd(), "content"),
    path.join(process.cwd(), "public/blog"),
    path.join(process.cwd(), "components"),
    path.join(process.cwd(), "lib"),
  ];

  it("scans visible content", () => {
    const files: string[] = [];
    for (const root of roots) {
      if (fs.existsSync(root)) {
        if (fs.statSync(root).isFile()) files.push(root);
        else files.push(...walk(root));
      }
    }
    const hits: string[] = [];
    for (const file of files) {
      if (file.includes("netzbetreiberNamen.ts")) continue;
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      const base = path.basename(file);
      if (
        base === "smardApi.ts" ||
        base === "loadLiveBoard.ts" ||
        base === "germanyBessProjects.ts" ||
        base === "OrtUnbHinweis.tsx" ||
        base === "MethodikNetzKapazitaet.tsx"
      ) {
        continue;
      }
      const text = fs.readFileSync(file, "utf8");
      if (containsGridOperatorName(text)) {
        hits.push(file);
      }
      for (const phrase of forbiddenConnectionPhrases()) {
        if (text.includes(phrase)) hits.push(`${file}:${phrase}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("blocklist non-empty", () => {
    expect(gridOperatorBlocklist().length).toBeGreaterThan(10);
  });
});
