"use client";

export type SearchResult = {
  title: string;
  snippet: string;
  url: string;
  image?: string;
};

async function duckDuckGo(query: string): Promise<SearchResult[]> {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("skip_disambig", "1");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return [];
  const data: any = await res.json();

  const out: SearchResult[] = [];
  if (data?.AbstractURL && data?.AbstractText) {
    out.push({
      title: data.Heading || "DuckDuckGo",
      snippet: data.AbstractText,
      url: data.AbstractURL,
      image: data.Image ? `https://duckduckgo.com${data.Image}` : undefined,
    });
  }
  if (Array.isArray(data?.RelatedTopics)) {
    for (const t of data.RelatedTopics) {
      if (t?.FirstURL && t?.Text) {
        out.push({ title: t.Text.split(" - ")[0] || "Result", snippet: t.Text, url: t.FirstURL });
      } else if (Array.isArray(t?.Topics)) {
        for (const sub of t.Topics) {
          if (sub?.FirstURL && sub?.Text) {
            out.push({ title: sub.Text.split(" - ")[0] || "Result", snippet: sub.Text, url: sub.FirstURL });
          }
        }
      }
    }
  }
  return out;
}

async function wikipedia(query: string): Promise<SearchResult[]> {
  const base = "https://en.wikipedia.org/w/api.php";
  const searchParams = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    format: "json",
    origin: "*",
  });
  const searchRes = await fetch(`${base}?${searchParams.toString()}`, { cache: "no-store" });
  if (!searchRes.ok) return [];
  const searchData: any = await searchRes.json();
  const pages: any[] = searchData?.query?.search ?? [];
  const topIds = pages.slice(0, 5).map((p) => p.pageid).join("|");
  if (!topIds) return [];

  const pageParams = new URLSearchParams({
    action: "query",
    pageids: String(topIds),
    prop: "info|pageimages|extracts",
    inprop: "url",
    pithumbsize: "240",
    exintro: "1",
    explaintext: "1",
    format: "json",
    origin: "*",
  });
  const infoRes = await fetch(`${base}?${pageParams.toString()}`, { cache: "no-store" });
  if (!infoRes.ok) return [];
  const infoData: any = await infoRes.json();
  const pagesMap = infoData?.query?.pages ?? {};
  const results: SearchResult[] = Object.values<any>(pagesMap).map((p) => ({
    title: p.title,
    snippet: (p.extract || "").slice(0, 240) + ((p.extract || "").length > 240 ? "…" : ""),
    url: p.fullurl,
    image: p.thumbnail?.source,
  }));
  return results;
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  const [a, b] = await Promise.all([duckDuckGo(query).catch(() => []), wikipedia(query).catch(() => [])]);
  const seen = new Set<string>();
  return [...a, ...b].filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)));
}
