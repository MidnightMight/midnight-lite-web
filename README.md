# midnight-lite.com

Midnight Lite (@midnightlite): projects, videos and build logs for 3D printing, robots, electronics and photography.

Built with [Astro](https://astro.build) as a static site, served by Cloudflare and deployed automatically from `main` on GitHub.

## Editing content (no code needed)

Open **https://www.midnight-lite.com/admin/** and sign in. The editor ([Sveltia CMS](https://github.com/sveltia/sveltia-cms)) lets you:

- write and edit **build log posts** (Markdown, with images),
- add and update **projects** (status, topics, cover, files, featured on Home),
- add **videos** to a series, or list planned ones,
- change the **"Now making" strip**, the **About page**, the **Tools page**, and the site's links, socials and newsletter.

Every save is a commit to `main`; Cloudflare rebuilds the site in about a minute.

**Signing in:** click **Sign In with GitHub** and log in with the GitHub account that owns this repository. Only accounts with write access to the repo can save.
This uses a small login helper, [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth), running as a free Cloudflare Worker. One-time setup:

1. Deploy the Worker: open the sveltia-cms-auth README and click **Deploy to Cloudflare**. Note its URL, e.g. `https://sveltia-cms-auth.<your-subdomain>.workers.dev`.
2. On GitHub: Settings → Developer settings → OAuth Apps → **New OAuth App**.
   Homepage URL `https://www.midnight-lite.com`, Authorization callback URL `<worker URL>/callback`. Create a client secret.
3. In Cloudflare, on the Worker: Settings → Variables and secrets, add `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (secret) and `ALLOWED_DOMAINS` = `www.midnight-lite.com`.
4. In `public/admin/config.yml`, uncomment `base_url` and set it to the Worker URL.

Until then (or as a fallback) choose **Sign In Using Access Token** with a GitHub fine-grained token that has *Contents: Read and write* on this repository only.

Uploaded images go to `public/img/uploads/`.

## Where things live

| What | File(s) |
|---|---|
| Build log posts | `src/content/posts/*.md` (`draft: true` hides a post) |
| Projects | `src/content/projects/*.md` (`order` sorts, `featured` shows on Home) |
| Videos (series, planned) | `src/content/videos/*.md`; uploaded videos are also read from the channel's RSS feed at build time |
| "Now making" strip | `src/data/now.json` |
| About page | `src/data/about.json` |
| Tools page | `src/data/tools.json` |
| Links, socials, newsletter | `src/data/site.json` |
| Content model | `src/content.config.ts` (keep in sync with `public/admin/config.yml`) |
| Pages and layout | `src/pages/`, `src/layouts/Base.astro`, `src/components/` |
| Styles (brand tokens) | `src/styles/global.css` |
| EUC World visualiser (React) | `src/euc/`, page `src/pages/tools/euc-visualiser.astro` |
| Old URL redirects | `public/_redirects` |
| Layout prototype + review PDFs | `design/` (not part of the build) |

## Setup that lives outside the repo

- **Contact:** the Contact page just shows the email address from `src/data/site.json` (`email`). No form backend.
- **Newsletter:** put your Buttondown username in `src/data/site.json` (`buttondown`) or in the editor under *Site settings → Links, socials & newsletter*. While it's empty, the newsletter boxes show a "Subscribe on YouTube" button instead.
- **New videos:** nothing to do; they're read from the YouTube channel feed on every build. A daily scheduled rebuild (Cloudflare deploy hook) picks them up without a commit.

## Local development

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
```

On the home server, the preview at `http://192.168.1.196:8091/` serves `dist/` (run `npm run build` after changes) and the prototype at `/design/`.
