"use client";

export type OpenverseImage = {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  creator?: string;
  source?: string;
};

export async function searchOpenverse(query: string, limit = 8): Promise<OpenverseImage[]> {
  const url = new URL("https://api.openverse.engineering/v1/images/");
  url.searchParams.set("q", query);
  url.searchParams.set("page_size", String(Math.max(1, Math.min(limit, 20))));
  url.searchParams.set("license_type", "all" );
  url.searchParams.set("mature", "false");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return [];
  const data: any = await res.json();
  const results: OpenverseImage[] = (data?.results || []).map((r: any) => ({
    id: String(r?.id ?? ""),
    title: r?.title ?? "",
    url: r?.url ?? r?.foreign_landing_url ?? "",
    thumbnail: r?.thumbnail ?? r?.url ?? "",
    creator: r?.creator,
    source: r?.source,
  }));
  return results.filter(r => r.url && r.thumbnail);
}
