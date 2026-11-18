import { defineConfig } from 'astro/config';
import { rehypeBase } from './scripts/rehype-base.mjs';

// Preview build is served from GitHub Pages as a project site
// (https://goldydev30.github.io/goalie-guild/). When thegoalieguild.com
// points here, set SITE_URL=https://www.thegoalieguild.com and BASE_PATH=/
// in .github/workflows/deploy.yml and add public/CNAME.
const site = process.env.SITE_URL ?? 'https://goldydev30.github.io';
const base = process.env.BASE_PATH ?? '/goalie-guild';
const prefix = base.replace(/\/$/, '');

export default defineConfig({
  site,
  base,
  // GitBook's landing page lived at /home
  redirects: { '/home': `${prefix}/` },
  markdown: {
    // Imported Markdown uses root-relative links (/foundation/donate/); add the base path.
    rehypePlugins: [[rehypeBase, { base: prefix }]],
  },
});
