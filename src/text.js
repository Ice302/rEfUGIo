// Wording that is written into a section's layout, rather than kept in a content list, can
// still be changed from the admin panel. Changes are stored in content.json under `text`,
// keyed by where the words appear (a section id, or 'hud', 'route', 'case', 'rooms') and by
// the original words. Placeholder text in form fields is keyed as '@placeholder ' + words.
import data, { text } from './content.js';

const originals = new WeakMap();
const holders = new WeakMap();

// Words that come from the content lists are edited there, so they are left out here.
const listed = new Set();
(function collect(v) {
  if (typeof v === 'string') listed.add(v.trim());
  else if (Array.isArray(v)) v.forEach(collect);
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => k !== 'text' && collect(x));
})(data);

const worded = (s) => /[A-Za-z]{2,}/.test(s);

function nodes(root) {
  const out = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = n.parentElement;
      if (!p || p.closest('svg, script, style, [data-live], [aria-hidden="true"].sr-skip')) return NodeFilter.FILTER_REJECT;
      const words = (originals.get(n) ?? n.nodeValue).trim();
      if (!worded(words) || listed.has(words)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  while (walk.nextNode()) out.push(walk.currentNode);
  return out;
}

// Replaces the words in place and keeps the spacing around them.
function set(node, words) {
  const raw = originals.get(node) ?? node.nodeValue;
  if (!originals.has(node)) originals.set(node, raw);
  const lead = raw.match(/^\s*/)[0];
  const tail = raw.match(/\s*$/)[0];
  node.nodeValue = lead + words + tail;
}

export function applyText(root, scope) {
  if (!root) return;
  holders.set(root, scope);
  const map = text?.[scope] ?? {};
  nodes(root).forEach((n) => {
    const key = (originals.get(n) ?? n.nodeValue).trim();
    if (map[key] !== undefined) set(n, map[key]);
  });
  root.querySelectorAll('[placeholder]').forEach((f) => {
    const key = f.dataset.placeholder ?? f.getAttribute('placeholder');
    f.dataset.placeholder = key;
    const v = map[`@placeholder ${key}`];
    if (v !== undefined) f.setAttribute('placeholder', v);
  });
}

// Every editable piece of wording on the page, for the admin panel.
export function inventory(roots) {
  const seen = new Set();
  const out = [];
  roots.forEach(([root, scope]) => {
    if (!root) return;
    nodes(root).forEach((n) => {
      const original = (originals.get(n) ?? n.nodeValue).trim();
      const id = `${scope}\u0000${original}`;
      if (seen.has(id)) return;
      seen.add(id);
      out.push({ scope, original, current: n.nodeValue.trim(), tag: n.parentElement.tagName.toLowerCase() });
    });
    root.querySelectorAll('[placeholder]').forEach((f) => {
      const original = f.dataset.placeholder ?? f.getAttribute('placeholder');
      out.push({ scope, original: `@placeholder ${original}`, current: f.getAttribute('placeholder'), tag: 'placeholder' });
    });
  });
  return out;
}

// Which scope and words sit under a point on the page, so the admin can jump to that field.
export function wordsAt(el) {
  let root = el;
  while (root && !holders.has(root)) root = root.parentElement;
  if (!root) return null;
  const n = [...el.childNodes].find((c) => c.nodeType === 3 && worded(c.nodeValue));
  if (!n) return null;
  return { scope: holders.get(root), original: (originals.get(n) ?? n.nodeValue).trim() };
}
