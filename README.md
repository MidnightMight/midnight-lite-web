# midnight-lite.com

Midnight Lite (@midnightlite): projects, videos and build logs for 3D printing, robots, electronics and photography.

Built with [Astro](https://astro.build) as a static site, served by Cloudflare and deployed automatically from `main` on GitHub.

## Editing content (no code needed)

Open **https://www.midnight-lite.com/admin/** and sign in. The editor ([Sveltia CMS](https://github.com/sveltia/sveltia-cms)) lets you:

- write and edit **build log posts** (Markdown, with images),
- add and update **projects** (status, topics, cover, files, featured on Home),
- add **videos** to a series, or list planned ones,
- change the **"Now making" strip**, the **About page**, the **Tools page**, and the site's links, socials and newsletter.

Every save is a commit; Cloudflare rebuilds the site in about a minute.
The editor saves to the branch it's opened from: `www.midnight-lite.com/admin/` edits `main` (the live site), `<branch>.midnight-lite-web.pages.dev/admin/` edits that branch (its preview only).

**Signing in:** choose **Sign In Using Access Token** and paste a GitHub fine-grained personal access token:
GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → *Generate new token*,
*Only select repositories* → `midnight-lite-web`, *Repository permissions* → **Contents: Read and write**.
The editor keeps the token in that browser, so only sign in on your own devices. When the token expires, make a new one and sign in again.

("Sign In with GitHub" would need an OAuth helper such as [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) and `base_url` in `public/admin/config.yml`; not needed for a single editor.)

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
