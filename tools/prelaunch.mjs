// Lists everything that still needs replacing before the site goes live.
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const data = JSON.parse(read('src/content.json'));
const raw = JSON.stringify(data);
const fleet = read('src/fleet.config.js');
const html = read('index.html');
const issues = [];
const count = (text, re) => (text.match(re) || []).length;
const where = '(src/content.json, or the admin panel)';

if (data.site.name === 'REFUGIO') issues.push(`Site name is still the placeholder REFUGIO ${where}`);
if (/example\.com/.test(data.site.email)) issues.push(`Email is still hello@example.com ${where}`);
let marked = 0;
(function walk(v) {
  if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === 'object') {
    if (v.sample === true) marked += 1;
    Object.values(v).forEach(walk);
  }
})(data);
if (marked) issues.push(`${marked} entries are still marked as samples ${where}`);
const links = data.sites.filter((s) => !s.url || s.url === '#').length;
if (links) issues.push(`${links} website projects have no real link ${where}`);
const generated = fs.readdirSync(new URL('../public/photos', import.meta.url)).filter((f) => /^ph-\d+\.jpg$/.test(f)).length;
if (generated) issues.push(`${generated} generated placeholder photos are still in public/photos`);
const models = count(fleet, /src: null/g);
if (models > 0) issues.push(`${models} of 3 vehicles are still code-built placeholders (src/fleet.config.js)`);
if (/NC-SA/.test(raw)) issues.push('The car model is licensed non-commercial (CC BY-NC-SA). Get permission or replace it before using this site to win paid work');
if (Object.values(data.rooms).some((r) => /^art\//.test(r.image))) issues.push(`Character rooms use third-party artwork: get permission from each artist, or replace it ${where}`);
const drawn = Object.values(data.rooms).reduce((n, r) => n + (r.posters ?? []).filter((p) => !p.image).length, 0);
if (drawn) issues.push(`${drawn} room posters are still drawn from templates. Add your poster images ${where}`);
if (/content="og\.jpg"/.test(html)) issues.push('og:image needs a full address on your domain (index.html)');
if (/<title>REFUGIO/.test(html)) issues.push('Page title still uses the placeholder name (index.html)');

if (issues.length) {
  console.log(`\n${issues.length} things to fix before launch:\n`);
  issues.forEach((i) => console.log(`  - ${i}`));
  console.log('');
  process.exitCode = 1;
} else {
  console.log('No placeholders found.');
}
