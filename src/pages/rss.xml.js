import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import site from "../data/site.json";

export async function GET(context) {
  const posts = (await getCollection("posts", (p) => !p.data.draft)).sort((a, b) => b.data.date - a.data.date);
  return rss({
    title: "Midnight Lite build log", description: site.description, site: context.site,
    items: posts.map((p) => ({ title: p.data.title, description: p.data.description, pubDate: p.data.date, link: `/blog/${p.id}/` })),
  });
}
