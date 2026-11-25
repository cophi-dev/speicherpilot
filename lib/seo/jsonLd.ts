import type { BlogPost } from "@/content/blog/posts";
import { getPublicSiteOrigin } from "@/lib/publicSiteUrl";
import {
  GERMANY_SPATIAL_COVERAGE,
  NEP_CITATION,
  SPEICHERPILOT_DATA_CITATIONS,
} from "@/lib/seo/dataSources";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/siteOg";

const PERSON_ID = "#phillipp-zarindast";
const ORG_ID = "#speicherpilot-org";

export function personJsonLd() {
  const origin = getPublicSiteOrigin();
  return {
    "@type": "Person",
    "@id": `${origin}${PERSON_ID}`,
    name: "Phillipp Zarindast",
    url: `${origin}/impressum`,
    sameAs: [
      "https://www.linkedin.com/in/phillipp-zarindast",
      "https://x.com/pphhiillliipppp",
    ],
  };
}

export function organizationJsonLd() {
  const origin = getPublicSiteOrigin();
  return {
    "@type": "Organization",
    "@id": `${origin}${ORG_ID}`,
    name: SITE_NAME,
    url: origin,
    logo: `${origin}/og/speicherpilot-og.png`,
    description: SITE_DESCRIPTION,
    founder: { "@id": `${origin}${PERSON_ID}` },
  };
}

export function webSiteJsonLd() {
  const origin = getPublicSiteOrigin();
  return {
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    name: SITE_NAME,
    url: origin,
    description: SITE_DESCRIPTION,
    publisher: { "@id": `${origin}${ORG_ID}` },
    inLanguage: "de-DE",
  };
}

type DataCitation = (typeof SPEICHERPILOT_DATA_CITATIONS)[number] | typeof NEP_CITATION;

function dataCitations(includeNep: boolean) {
  const rows: DataCitation[] = [...SPEICHERPILOT_DATA_CITATIONS];
  if (includeNep) {
    rows.push(NEP_CITATION);
  }
  return rows.map((row) => ({
    "@type": "CreativeWork",
    name: row.name,
    url: row.url,
    description: row.credit,
  }));
}

export function datasetJsonLd(opts: {
  path: string;
  name: string;
  description: string;
  temporalCoverage: string;
  includeNep?: boolean;
  license?: string;
  keywords?: string[];
  distribution?: Array<{ name: string; contentUrl: string; encodingFormat: string }>;
}) {
  const origin = getPublicSiteOrigin();
  const citations = dataCitations(opts.includeNep ?? false);
  const extra: Record<string, unknown> = {};
  if (opts.license) {
    extra.license = opts.license;
    extra.isAccessibleForFree = true;
  }
  if (opts.keywords?.length) {
    extra.keywords = opts.keywords;
  }
  if (opts.distribution?.length) {
    extra.distribution = opts.distribution.map((item) => ({
      "@type": "DataDownload",
      name: item.name,
      contentUrl: item.contentUrl.startsWith("http") ? item.contentUrl : `${origin}${item.contentUrl}`,
      encodingFormat: item.encodingFormat,
    }));
  }
  return {
    "@type": "Dataset",
    "@id": `${origin}${opts.path}#dataset`,
    name: opts.name,
    description: opts.description,
    url: `${origin}${opts.path}`,
    temporalCoverage: opts.temporalCoverage,
    spatialCoverage: GERMANY_SPATIAL_COVERAGE,
    creator: {
      "@type": "Organization",
      "@id": `${origin}${ORG_ID}`,
    },
    isBasedOn: citations,
    citation: citations.map((item) => item.url),
    ...extra,
  };
}

export function articleJsonLd(post: BlogPost) {
  const origin = getPublicSiteOrigin();
  const path = `/beitraege/${post.slug}`;
  const published = post.published;
  const authorName = post.author ?? "Phillipp Zarindast";
  const article: Record<string, unknown> = {
    "@type": "Article",
    "@id": `${origin}${path}#article`,
    headline: post.title,
    description: post.description,
    url: `${origin}${path}`,
    datePublished: published,
    dateModified: published,
    inLanguage: "de-DE",
    author: {
      "@type": "Person",
      "@id": `${origin}${PERSON_ID}`,
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${origin}${ORG_ID}`,
    },
    mainEntityOfPage: `${origin}${path}`,
  };
  if (post.ogImagePath) {
    article.image = `${origin}${post.ogImagePath}`;
  }
  if (post.kind === "netz-updates") {
    article.articleSection = "Netz-Updates";
  }
  return article;
}

export function siteGraphJsonLd(extra: Record<string, unknown>[] = []) {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationJsonLd(), webSiteJsonLd(), personJsonLd(), ...extra],
  };
}

export function parseJsonLd(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}