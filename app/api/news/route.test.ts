import bundledNews from "@/data/news.json";

jest.mock("next/server", () => ({
  NextResponse: {
    json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return {
        status: init?.status ?? 200,
        headers: init?.headers ?? {},
        json: async () => data,
      };
    },
  },
}));

let GET: typeof import("@/app/api/news/route").GET;

describe("GET /api/news", () => {
  beforeAll(async () => {
    ({ GET } = await import("@/app/api/news/route"));
  });

  it("returns the curated file, not a generated feed", async () => {
    const response = await GET({ url: "http://localhost:3000/api/news?limit=5" } as Request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items).toEqual(bundledNews);
    expect(JSON.stringify(body)).not.toContain("news.google.com");
    expect(body.items[0].url).toBe(
      "https://www.windindustrie-in-deutschland.de/energate/bundesnetzagentur-keine-pruefgebuehr-fuer-netzanschluesse-667e27"
    );
  });

  it("returns 400 for an invalid query", async () => {
    const response = await GET({ url: "http://localhost:3000/api/news?limit=200" } as Request);
    expect(response.status).toBe(400);
  });
});
