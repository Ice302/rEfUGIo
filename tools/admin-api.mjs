// The admin panel's back end. It only exists while `npm run dev` is running, and it only
// answers requests from this computer, made by the admin page itself. It reads and writes
// src/content.json (keeping a dated copy of every previous version in .admin-backups/) and
// saves uploaded images into a few folders under public/.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, 'src/content.json');
const BACKUPS = path.join(ROOT, '.admin-backups');
const FOLDERS = ['work', 'photos', 'sites', 'posters', 'art'];
const TYPES = { '.jpg': 1, '.jpeg': 1, '.png': 1, '.webp': 1, '.avif': 1, '.gif': 1 };
const MAX_UPLOAD = 25 * 1024 * 1024;
const KEEP = 40;

const local = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
// A page on another site can send requests to localhost too. The custom header forces the
// browser to ask first, which it will not do for another origin, and the fetch metadata
// headers say where the request came from.
const trusted = (req) => req.headers['x-refugio-admin'] === '1' && (!req.headers['sec-fetch-site'] || req.headers['sec-fetch-site'] === 'same-origin');

const send = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function backup() {
  fs.mkdirSync(BACKUPS, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(CONTENT, path.join(BACKUPS, `content-${stamp}.json`));
  const old = fs.readdirSync(BACKUPS).filter((f) => f.startsWith('content-')).sort();
  old.slice(0, Math.max(0, old.length - KEEP)).forEach((f) => fs.unlinkSync(path.join(BACKUPS, f)));
}

const clean = (name) =>
  path
    .basename(name)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export function adminApi() {
  return {
    name: 'refugio-admin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__admin', async (req, res) => {
        if (!local(req) || !trusted(req)) return send(res, 403, { error: 'The admin panel only works from this computer.' });
        const url = new URL(req.url, 'http://x');
        try {
          if (url.pathname === '/content' && req.method === 'GET') {
            return send(res, 200, JSON.parse(fs.readFileSync(CONTENT, 'utf8')));
          }
          if (url.pathname === '/content' && req.method === 'PUT') {
            const data = JSON.parse((await readBody(req, 4 * 1024 * 1024)).toString('utf8'));
            if (!data || typeof data !== 'object' || !data.site || !Array.isArray(data.units)) return send(res, 400, { error: 'That does not look like the site content.' });
            backup();
            const tmp = `${CONTENT}.tmp`;
            fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
            fs.renameSync(tmp, CONTENT);
            return send(res, 200, { ok: true, saved: new Date().toISOString() });
          }
          if (url.pathname === '/backups' && req.method === 'GET') {
            const list = fs.existsSync(BACKUPS) ? fs.readdirSync(BACKUPS).filter((f) => f.startsWith('content-')).sort().reverse() : [];
            return send(res, 200, { backups: list });
          }
          if (url.pathname === '/restore' && req.method === 'POST') {
            const name = path.basename(url.searchParams.get('name') || '');
            const file = path.join(BACKUPS, name);
            if (!name.startsWith('content-') || !fs.existsSync(file)) return send(res, 404, { error: 'No such backup.' });
            JSON.parse(fs.readFileSync(file, 'utf8'));
            backup();
            fs.copyFileSync(file, CONTENT);
            return send(res, 200, { ok: true });
          }
          if (url.pathname === '/files' && req.method === 'GET') {
            const dir = url.searchParams.get('dir');
            if (!FOLDERS.includes(dir)) return send(res, 400, { error: 'Unknown folder.' });
            const abs = path.join(ROOT, 'public', dir);
            const files = fs.existsSync(abs) ? fs.readdirSync(abs).filter((f) => TYPES[path.extname(f).toLowerCase()]) : [];
            return send(res, 200, { files: files.map((f) => `${dir}/${f}`) });
          }
          if (url.pathname === '/upload' && req.method === 'POST') {
            const dir = url.searchParams.get('dir');
            let name = clean(url.searchParams.get('name') || '');
            const ext = path.extname(name);
            if (!FOLDERS.includes(dir) || !TYPES[ext] || !name.slice(0, -ext.length)) return send(res, 400, { error: 'Use a JPEG, PNG, WebP, AVIF or GIF image.' });
            const body = await readBody(req, MAX_UPLOAD);
            const abs = path.join(ROOT, 'public', dir);
            fs.mkdirSync(abs, { recursive: true });
            // Never overwrite: a second file with the same name gets a number.
            let n = 1;
            while (fs.existsSync(path.join(abs, name))) name = `${path.basename(clean(url.searchParams.get('name')), ext)}-${++n}${ext}`;
            fs.writeFileSync(path.join(abs, name), body);
            return send(res, 200, { path: `${dir}/${name}`, bytes: body.length });
          }
          send(res, 404, { error: 'Not found.' });
        } catch (err) {
          send(res, err.message === 'too large' ? 413 : 400, { error: err.message === 'too large' ? 'That file is too large.' : `Could not do that: ${err.message}` });
        }
      });
    },
  };
}
