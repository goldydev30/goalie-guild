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
  s = s.replace(/{%\s*embed\s+url="([^"]+)"\s*%}(?:([\s\S]*?){%\s*endembed\s*%})?/g, (_, u, cap) => {
    const yt = u.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
    const el = yt
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
  // Links and images: [x](y) and ![x](y "title")
  s = s.replace(/(!?\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g, (_, a, t, b) => a + target(t, fileAbs) + b);
  // HTML src/href (GitBook <figure><img src=...>)
  s = s.replace(/\b(src|href)="([^"]+)"/g, (_, k, t) => `${k}="${target(t, fileAbs)}"`);
  return s.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

let count = 0;
for (const fileAbs of walk(src)) {
  const rel = path.relative(src, fileAbs).split(path.sep).join('/');
  if (rel === 'SUMMARY.md' || rel === 'README.md') continue;
  let text = fs.readFileSync(fileAbs, 'utf8');
  let fm = {};
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) {
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^(\w+):\s*(.*)$/);
      if (kv) fm[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '');
    }
    text = text.slice(m[0].length);
  }
  const h1 = text.match(/^#\s+(.+)$/m);
  const title = fm.title || (h1 ? h1[1].trim() : path.basename(rel, '.md'));
  if (h1) text = text.replace(h1[0], '');
  const outRel = rel.replace(/README\.md$/i, 'index.md');
  const out = path.join(outPages, outRel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const front = ['---', `title: ${JSON.stringify(title)}`];
  if (fm.description) front.push(`description: ${JSON.stringify(fm.description)}`);
  front.push('---', '');
  fs.writeFileSync(out, front.join('\n') + '\n' + convert(text, fileAbs));
  count++;
}
console.log(`Imported ${count} pages and ${copied.size} assets.`);
console.log('Check src/data/sections.ts lists any new pages.');
