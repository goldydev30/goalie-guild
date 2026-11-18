// Prefix root-relative href/src in Markdown output with the site's base path,
// so imported pages work both on GitHub Pages (/goalie-guild/) and at the real domain (/).
export function rehypeBase({ base = '' } = {}) {
  const fix = (v) => (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') ? base + v : v);
  const walk = (node) => {
    if (node.type === 'element' && node.properties) {
      for (const k of ['href', 'src']) if (k in node.properties) node.properties[k] = fix(node.properties[k]);
    }
    if (node.type === 'raw' && base) {
      node.value = node.value.replace(/\b(href|src)="\/(?!\/)/g, `$1="${base}/`);
    }
    (node.children || []).forEach(walk);
  };
  return (tree) => walk(tree);
}
