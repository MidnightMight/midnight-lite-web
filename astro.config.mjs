// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

// Static site. Cloudflare builds it from GitHub (`npm run build` -> dist/).
export default defineConfig({
  site: "https://www.midnight-lite.com",
  integrations: [react(), sitemap({ filter: (page) => !page.includes("/admin") })],
});
