# The Goalie Guild

Website for [The Goalie Guild](https://www.thegoalieguild.com), replacing the old site and the GitBook at thegoalieguild.gitbook.io/home.

Built with [Astro](https://astro.build) as a static site, the same setup as Colony Almanac.

## Run it

```sh
npm install
npm run dev      # http://localhost:4321/goalie-guild/
npm run build    # static output in dist/
```

## Preview site

Every merge to `main` deploys to GitHub Pages at https://goldydev30.github.io/goalie-guild/ (`.github/workflows/deploy.yml`). Internal links go through `src/lib/url.ts`, and links inside Markdown are prefixed by `scripts/rehype-base.mjs`, so everything works under that `/goalie-guild/` path and at the real domain.

## Where things live

| Path | What it is |
| --- | --- |
| `src/styles/tokens.css` | Colours and fonts. Placeholder "Guild Hall" look until the castle design lands. |
| `src/layouts/Base.astro` | Header, navigation and footer shared by every page. |
| `src/pages/index.astro` | **Placeholder** homepage. The medieval castle landing page will replace it. |
| `src/data/sections.ts` | The Guild's areas (Foundation, GGR, Scholarships, Lift The Mask, Library, Donate) and their pages. Nav, the homepage and the castle all read this. |
| `src/content/pages/` | One Markdown file per page, at the same path it had on GitBook. |
| `src/pages/[...slug].astro` | Renders each content page with its section's side navigation. |
| `scripts/import-gitbook.mjs` | Converts the GitBook Git Sync export into `src/content/pages/`. |

## Importing the GitBook

GitBook Git Sync (GitBook → GitHub) writes the space to the `gitbook` branch, under `home/`. To pull it into the site:

```sh
git fetch origin gitbook
git worktree add gitbook-export origin/gitbook
npm run import:gitbook -- gitbook-export/home
git worktree remove gitbook-export
```

The script keeps each page's path (`foundation/intro/mission.md` becomes `/foundation/intro/mission/`), copies only the images pages use from `.gitbook/assets/` to `public/assets/gitbook/` (shrinking anything over 1600px wide or 500 KB), and turns GitBook blocks (hints, YouTube/Spotify embeds, page mentions, card tables, files, tabs) into plain Markdown or HTML, and uses each page's GitBook cover as its banner. Re-running it overwrites the imported pages, so make edits in GitBook until the switch, or stop syncing and edit here.

Because paths match, an old link like `thegoalieguild.gitbook.io/home/foundation/donate` maps to `/foundation/donate/` on the new site.

## Going live on thegoalieguild.com

The domain is registered and its DNS is managed at Bluehost. Nothing below has been done yet.

1. In `.github/workflows/deploy.yml`, set `SITE_URL: https://www.thegoalieguild.com` and `BASE_PATH: /` on the build step, and add `public/CNAME` containing `www.thegoalieguild.com`.
2. In Bluehost → Domains → thegoalieguild.com → DNS, change only the website records:
   - `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (remove the old `@` A record).
   - `CNAME` for `www`: `goldydev30.github.io`.
   - **Leave the MX, mail and TXT records alone** so `info@thegoalieguild.com` keeps working. Don't switch nameservers.
3. In the repo's Settings → Pages, set the custom domain to `www.thegoalieguild.com` and tick Enforce HTTPS once the certificate is issued (can take up to a day).
4. To make old GitBook links land on the new site, point a GitBook custom domain or redirect at it, or unpublish the GitBook once everything is moved.
