# Map tiles on Cloudflare R2, and the usage guard

The route planner's base map can come from a PMTiles file in R2 (`tiles.midnight-lite.com`) instead of
OpenStreetMap's tile servers. The page uses it when the build sets `PUBLIC_TILES_URL`, and falls back to OSM tiles
whenever the file doesn't answer, so pausing R2 never breaks the map.

## Setup (once)

1. Cloudflare dashboard → My Profile → API Tokens → Create token → Custom token with
   **Account · Workers R2 Storage · Edit** and **Account · Account Analytics · Read**. Save it on the NUC in
   `~/.config/r2-guard.env` (chmod 600):
   ```
   CLOUDFLARE_API_TOKEN=...
   CLOUDFLARE_ACCOUNT_ID=...
   R2_BUCKET=midnight-lite-tiles
   R2_DOMAIN=tiles.midnight-lite.com
   ```
2. Bucket, upload and CORS (with the token in the environment, `set -a; . ~/.config/r2-guard.env`):
   ```
   npx wrangler r2 bucket create midnight-lite-tiles
   npx wrangler r2 object put midnight-lite-tiles/seq-20261023.pmtiles --file /srv/pmd-route/tiles/seq-20261023.pmtiles --remote
   npx wrangler r2 bucket cors set midnight-lite-tiles --file tools/r2-guard/cors.json
   ```
3. Dashboard → R2 → the bucket → Settings → Custom Domains → connect `tiles.midnight-lite.com`.
4. Dashboard → midnight-lite.com → Security → WAF → Rate limiting rules: hostname equals `tiles.midnight-lite.com`,
   e.g. 600 requests per 10 seconds per IP → Block for 10 s (one rule is free; stops scrapers, not people panning).
5. Cloudflare Pages → Settings → Variables: `PUBLIC_TILES_URL=https://tiles.midnight-lite.com/seq-20261023.pmtiles`,
   then redeploy.

## The guard

`r2_guard.py` runs hourly from cron on the NUC (installed as `~/.local/bin/r2-guard`, log in
`~/.local/state/r2-guard.log`). It warns at 70 % of the free tier, turns the custom domain off at 90 % (the map
switches to OSM tiles) and turns it back on at the start of the next month. `r2-guard --status` shows this
month's usage; `--dry-run` checks without changing anything. Add `NOTIFY_URL=` to the env file for a phone
notification (any URL that accepts a plain-text POST, such as an ntfy topic).

New tiles: build a new `.pmtiles` (see tools/pmd-graph/README.md), upload under a new name, and change
`PUBLIC_TILES_URL`.
