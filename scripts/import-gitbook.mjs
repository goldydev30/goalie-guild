// Import the GitBook Git Sync export into src/content/pages and public/assets/gitbook.
//
//   git fetch origin gitbook && git worktree add gitbook-export origin/gitbook
//   npm run import:gitbook -- gitbook-export
//
// Each GitBook page keeps its path: foundation/intro/README.md -> foundation/intro/index.md
// (served at /foundation/intro/). The space's root README.md (the GitBook home page) is skipped;
// its contact links live in src/data/sections.ts. Re-running overwrites imported pages.
import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve(process.argv[2] ?? 'gitbook-export');
const outPages = path.resolve('src/content/pages');
const outAssets = path.resolve('public/assets/gitbook');
if (!fs.existsSync(src)) {
  console.error(`No GitBook export at ${src}`);
  process.exit(1);
}

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('.') || e.name === 'node_modules') return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.name.endsWith('.md') ? [p] : [];
  });

// "foundation/intro/README.md" -> "/foundation/intro/"
const routeFor = (rel) => '/' + rel.replace(/(^|\/)README\.md$/i, '$1').replace(/\.md$/, '/').replace(/^\/?/, '');

// GitBook titles carry a coloured-dot emoji ("🔴 Donate"); the site uses plain titles.
const cleanTitle = (t) => t.replace(/^[^\p{L}\p{N}]+/u, '').trim();

const parse = (fileAbs) => {
  let text = fs.readFileSync(fileAbs, 'utf8');
  const fm = {};
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) {
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^(\w+):\s*(.*)$/);
      if (kv) fm[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '');
    }
    text = text.slice(m[0].length);
  }
  const h1 = text.match(/^#\s+(.+)$/m);
  const title = cleanTitle(fm.title || (h1 ? h1[1] : path.basename(fileAbs, '.md')));
  if (h1) text = text.replace(h1[0], '');
  return { fm, text, title };
};

const copied = new Set();
function copyAsset(abs) {
  const name = path.basename(abs);
  if (!copied.has(abs) && fs.existsSync(abs)) {
    fs.mkdirSync(outAssets, { recursive: true });
    fs.copyFileSync(abs, path.join(outAssets, name));
    copied.add(abs);
  }
  return `/assets/gitbook/${encodeURIComponent(name)}`;
}

// Rewrite one link or image target found in the page at `fileAbs`.
function target(raw, fileAbs) {
  let t = raw.trim().replace(/^<|>$/g, '');
  if (/^(https?:|mailto:|tel:|#)/.test(t)) return t;
  const [p, hash = ''] = t.split('#');
  const abs = path.resolve(path.dirname(fileAbs), decodeURIComponent(p));
  if (abs.includes(`${path.sep}.gitbook${path.sep}assets`)) return copyAsset(abs);
  if (p.endsWith('/') || p === '..' || p === '.') {
    const rel = path.relative(src, abs).split(path.sep).join('/');
    return rel ? `/${rel}/` : '/';
  }
  if (p.endsWith('.md')) return routeFor(path.relative(src, abs).split(path.sep).join('/')) + (hash ? `#${hash}` : '');
  // Bare domains GitBook stored as relative links (e.g. "www.liftthemask.com")
  if (/^www\./.test(p)) return `https://${p}`;
  return t;
}

function convert(body, fileAbs) {
  let s = body;
  // GitBook blocks
  s = s.replace(/{%\s*hint[^%]*%}([\s\S]*?){%\s*endhint\s*%}/g, (_, inner) =>
    `<div class="hint">\n\n${inner.trim()}\n\n</div>`);
  s = s.replace(/{%\s*embed\s+url=["“]([^"”]+)["”][^%]*%}(?:((?:(?!{%)[\s\S])*?){%\s*endembed\s*%})?/g, (_, u, cap) => {
    const yt = u.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
    const sp = u.match(/open\.spotify\.com\/(episode|show|track|playlist)\/(\w+)/);
    const el = sp
      ? `<iframe class="spotify" src="https://open.spotify.com/embed/${sp[1]}/${sp[2]}" title="Spotify" loading="lazy" allow="encrypted-media"></iframe>`
      : yt
      ? `<iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" title="Video" allowfullscreen loading="lazy"></iframe>`
      : `<p><a href="${u}">${u}</a></p>`;
    return cap && cap.trim() ? `${el}\n\n${cap.trim()}` : el;
  });
  s = s.replace(/{%\s*content-ref\s+url="([^"]+)"\s*%}[\s\S]*?{%\s*endcontent-ref\s*%}/g, (_, u) => {
    const r = target(u, fileAbs);
    return `- [${r.replace(/\/$/, '').split('/').pop().replace(/-/g, ' ')}](${r})`;
  });
  s = s.replace(/{%\s*file\s+src="([^"]+)"\s*%}(?:([\s\S]*?){%\s*endfile\s*%})?/g, (_, f, cap) =>
    `[${(cap || '').trim() || path.basename(f)}](${target(f, fileAbs)})`);
  s = s.replace(/{%\s*tab\s+title="([^"]+)"\s*%}/g, '\n#### $1\n');
  s = s.replace(/{%\s*(tabs|endtabs|endtab|stepper|endstepper|step|endstep)\s*%}/g, '');
  // Page mentions: [toolkits.md](../toolkits.md "mention") -> [Toolkits](/resources/toolkits/)
  s = s.replace(/\[([^\]]*)\]\(<?([^)>"]+?)>?\s+"mention"\)/g, (_, text, t) => {
    const r = target(t, fileAbs);
    const label = titles.get(r) || text.replace(/\.md$/, '').replace(/-/g, ' ');
    return `[${label}](${r})`;
  });
  // Targets wrapped in <...> (used when the path has spaces)
  s = s.replace(/(!?\[[^\]]*\]\()<([^>]+)>((?:\s+"[^"]*")?\))/g, (_, a, t, b) => a + target(t, fileAbs) + b);
  // GitBook highlight colours: keep the emphasis, drop the inline colour
  s = s.replace(/<mark style="[^"]*">/g, '<mark>');
  s = s.replace(/<table[^>]*data-view="cards"[^>]*>[\s\S]*?<\/table>/g, (t) => cards(t, fileAbs));
  // Links and images: [x](y) and ![x](y "title")
  s = s.replace(/(!?\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g, (_, a, t, b) => a + target(t, fileAbs) + b);
  // HTML src/href (GitBook <figure><img src=...>)
  s = s.replace(/\b(src|href)="([^"]+)"/g, (_, k, t) => `${k}="${target(t, fileAbs)}"`);
  return s.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// GitBook "cards" tables -> a grid of cards. Hidden columns hold the cover image and the card's link.
function cards(table, fileAbs) {
  const heads = [...table.matchAll(/<th(\s[^>]*)?>/g)].map((m) => m[1] || "");
  const coverCol = heads.findIndex((h) => h.includes('data-card-cover'));
  const targetCol = heads.findIndex((h) => h.includes('data-card-target'));
  const rows = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].slice(1).map((r) =>
    [...r[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((c) => c[1].trim()));
  const hrefOf = (cell) => (cell.match(/href="([^"]+)"/) || [])[1];
  const items = rows.map((cells) => {
    const cover = coverCol >= 0 && hrefOf(cells[coverCol] || '');
    const link = targetCol >= 0 && hrefOf(cells[targetCol] || '');
    const body = cells.filter((c, i) => i !== coverCol && i !== targetCol && c).map((c) => `<p>${c}</p>`).join('');
    const img = cover ? `<img src="${target(cover, fileAbs)}" alt="" loading="lazy">` : '';
    const more = link ? `<p><a class="card-link" href="${target(link, fileAbs)}">Visit website</a></p>` : '';
    return `<div class="card">${img}<div class="card-body">${body}${more}</div></div>`;
  });
  return `<div class="cards">\n${items.join('\n')}\n</div>`;
}

const files = walk(src).filter((f) => !/^(SUMMARY|README)\.md$/.test(path.relative(src, f)));
const titles = new Map(files.map((f) => [routeFor(path.relative(src, f).split(path.sep).join('/')), parse(f).title]));

let count = 0;
for (const fileAbs of files) {
  const rel = path.relative(src, fileAbs).split(path.sep).join('/');
  const { fm, text, title } = parse(fileAbs);
  const outRel = rel.replace(/README\.md$/i, 'index.md');
  const out = path.join(outPages, outRel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const front = ['---', `title: ${JSON.stringify(title)}`];
  if (fm.description) front.push(`description: ${JSON.stringify(fm.description)}`);
  if (fm.cover) front.push(`cover: ${JSON.stringify(target(fm.cover, fileAbs))}`);
  front.push('---', '');
  fs.writeFileSync(out, front.join('\n') + '\n' + convert(text, fileAbs));
  count++;
}
console.log(`Imported ${count} pages and ${copied.size} assets.`);
console.log('Check src/data/sections.ts lists any new pages.');

// GitBook keeps original uploads (some are 10 MB+). Shrink anything wider than 1600px
// and re-compress anything still over 500 KB.
const { default: sharp } = await import('sharp');
let shrunk = 0;
for (const name of fs.readdirSync(outAssets)) {
  const file = path.join(outAssets, name);
  if (!/\.(png|jpe?g|webp)$/i.test(name)) continue;
  try {
    const img = sharp(file, { failOn: 'none' });
    const { width } = await img.metadata();
    const big = fs.statSync(file).size > 500_000;
    if (!width || (width <= 1600 && !big)) continue;
    let pipe = img.rotate().resize({ width: 1600, withoutEnlargement: true });
    pipe = /\.png$/i.test(name) ? pipe.png({ palette: true, quality: 85, compressionLevel: 9 }) : pipe.jpeg({ quality: 82, mozjpeg: true });
    const buf = await pipe.toBuffer();
    fs.writeFileSync(file, buf);
    shrunk++;
  } catch (e) {
    console.warn(`Could not resize ${name}: ${e.message}`);
  }
}
console.log(`Resized ${shrunk} large images.`);
