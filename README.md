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

**Signing in:** choose **Sign In Using Access Token** and paste a GitHub fine-grained token with *Contents: Read and write* on this repository only (GitHub → Settings → Developer settings → Fine-grained tokens). The editor keeps it in your browser.
"Sign In with GitHub" needs a small OAuth helper (e.g. [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) on Cloudflare Workers) and `base_url` set in `public/admin/config.yml`.

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
| Contact form backend | `functions/api/contact.js` (Cloudflare Pages Function) |
| Old URL redirects | `public/_redirects` |
| Layout prototype + review PDFs | `design/` (not part of the build) |

## Setup that lives outside the repo

- **Contact form:** set `RESEND_API_KEY`, `CONTACT_TO` (and optionally `CONTACT_FROM`) as secrets in the Cloudflare project. Until then the form says it couldn't send and points to the email address.
- **Newsletter:** put your Buttondown username in `src/data/site.json` (`buttondown`) or in the editor under *Site settings → Links, socials & newsletter*.
- **New videos:** nothing to do; they're read from the YouTube channel feed on every build. A daily scheduled rebuild (Cloudflare deploy hook) picks them up without a commit.

## Local development

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
```

On the home server, the preview at `http://192.168.1.196:8091/` serves `dist/` (run `npm run build` after changes) and the prototype at `/design/`.
