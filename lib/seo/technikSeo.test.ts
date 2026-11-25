/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import sitemap from "@/app/sitemap";
import { getBlogPosts } from "@/content/blog/posts";
import {
  articleJsonLd,
  datasetJsonLd,
  organizationJsonLd,
  parseJsonLd,
  personJsonLd,
  siteGraphJsonLd,
  webSiteJsonLd,
} from "@/lib/seo/jsonLd";
import { collectIndexableRoutes, indexableOriginPaths } from "@/lib/seo/indexableRoutes";
import {
  FLEET_MONAT_DOCUMENT_TITLE,
  HOME_DOCUMENT_TITLE,
  TAG_TODAY_DOCUMENT_TITLE,
  tagDocumentTitle,
} from "@/lib/seo/pageTitles";
import { llmsFullTxtBody, llmsTxtBody } from "@/lib/seo/llmsContent";

const CANONICAL_FILES = [
  "app/page.tsx",
  "app/methodik/page.tsx",
  "app/beitraege/page.tsx",
  "app/kompromiss/page.tsx",
  "app/tag/[datum]/page.tsx",
  "app/monat/[monat]/page.tsx",
  "app/beitraege/[slug]/page.tsx",
] as const;

describe("Technik-SEO-Paket", () => {
  jest.setTimeout(120_000);

  it("parses JSON-LD graphs with Pflichtfelder", () => {
    const graph = parseJsonLd(siteGraphJsonLd()) as {
      "@graph": Array<Record<string, unknown>>;
    };
    expect(graph["@graph"]).toHaveLength(3);
    const types = graph["@graph"].map((node) => node["@type"]);
    expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite", "Person"]));

    const person = parseJsonLd(personJsonLd()) as Record<string, unknown>;
    expect(person.name).toBe("Phillipp Zarindast");
    expect(person.sameAs).toEqual(
      expect.arrayContaining([
        "https://www.linkedin.com/in/phillipp-zarindast",
        "https://x.com/pphhiillliipppp",
      ]),
    );

    const org = parseJsonLd(organizationJsonLd()) as Record<string, unknown>;
    expect(org.name).toBe("SpeicherPilot");

    const website = parseJsonLd(webSiteJsonLd()) as Record<string, unknown>;
    expect(website.inLanguage).toBe("de-DE");

    const dataset = parseJsonLd(
      datasetJsonLd({
        path: "/tag/2026-10-24",
        name: "Tag",
        description: "Beschreibung",
        temporalCoverage: "2026-10-24",
      }),
    ) as Record<string, unknown>;
    expect(dataset["@type"]).toBe("Dataset");
    expect(dataset.temporalCoverage).toBe("2026-10-24");
    expect(dataset.spatialCoverage).toMatchObject({ name: "Deutschland" });
    expect(Array.isArray(dataset.isBasedOn)).toBe(true);
    expect((dataset.isBasedOn as unknown[]).length).toBeGreaterThanOrEqual(3);

    const post = getBlogPosts()[0]!;
    const article = parseJsonLd(articleJsonLd(post)) as Record<string, unknown>;
    expect(article["@type"]).toBe("Article");
    expect(article.datePublished).toBe(post.published);
    expect(article.dateModified).toBe(post.published);
    expect(article.author).toMatchObject({ name: "Phillipp Zarindast" });
  });

  it("listet alle indexierbaren Routen in der Sitemap", async () => {
    const paths = await indexableOriginPaths();
    expect(paths).toContain("/");
    expect(paths).toContain("/methodik");
    expect(paths).toContain("/beitraege");
    expect(paths).toContain("/kompromiss");
    expect(paths).toContain("/jahr");
    expect(paths).toContain("/netzbetreiber");
    expect(paths).not.toContain("/tag");
    expect(paths).not.toContain("/simulator");
    expect(paths).not.toContain("/vision");

    for (const post of getBlogPosts()) {
      expect(paths).toContain(`/beitraege/${post.slug}`);
    }

    const sitemapPaths = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    expect(sitemapPaths.sort()).toEqual(paths.sort());

    const routes = await collectIndexableRoutes(new Date("2026-11-16T12:00:00.000Z"));
    expect(routes.every((route) => route.lastModified instanceof Date)).toBe(true);
    expect(routes.some((route) => route.path.startsWith("/tag/"))).toBe(true);
    expect(routes.some((route) => route.path.startsWith("/monat/"))).toBe(true);
  });

  it("setzt Canonicals in den Metadaten der Kernrouten", () => {
    for (const file of CANONICAL_FILES) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toMatch(/alternates:\s*\{\s*canonical/);
    }
  });

  it("setzt die Owner-Titel für Start, Tag (heute) und Flotten-Monat", () => {
    expect(HOME_DOCUMENT_TITLE).toBe(
      "Großspeicher und Restlastspitze in Deutschland, Szenarien täglich gerechnet | SpeicherPilot",
    );
    expect(TAG_TODAY_DOCUMENT_TITLE).toBe(
      "Restlast, Day-Ahead-Preis und Batteriespeicher heute | SpeicherPilot",
    );
    expect(FLEET_MONAT_DOCUMENT_TITLE).toBe(
      "Batteriespeicher-Flotte im Monat: Restlastspitze je Fahrweise | SpeicherPilot",
    );
    expect(tagDocumentTitle("2026-10-24", false)).toMatch(/24\.10\.2026/);

    const home = readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");
    expect(home).toContain("HOME_DOCUMENT_TITLE");
    expect(home).not.toMatch(/force-dynamic/);

    const forbidden = ["netzdienlich", "Netzanschlussprüfung"];
    for (const text of [llmsTxtBody(), llmsFullTxtBody(), home]) {
      for (const word of forbidden) {
        expect(text).not.toContain(word);
      }
    }
  });
});