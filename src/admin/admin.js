// The site admin. A visual editor for src/content.json: every list on the site, every room's
// posters and wording, and any other words on the page. Changes stay here until saved; saving
// writes the file (with a backup) and the preview reloads with them.
import './admin.css';
import { GROUPS, SELECT, HIDDEN, IMAGE_KEYS, COLOR_KEYS, LABELS, find } from './schema.js';

const api = async (path, opts = {}) => {
  const r = await fetch(`/__admin${path}`, { ...opts, headers: { 'x-refugio-admin': '1', ...(opts.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
};
const clone = (v) => JSON.parse(JSON.stringify(v));
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const get = (o, path) => path.reduce((a, k) => (a == null ? a : a[k]), o);
const set = (o, path, v) => {
  const last = path[path.length - 1];
  const parent = get(o, path.slice(0, -1));
  if (v === undefined) delete parent[last];
  else parent[last] = v;
};
const label = (k) => LABELS[k] ?? String(k).replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

const ui = (() => {
  try {
    return JSON.parse(sessionStorage.getItem('refugio-admin') || '{}');
  } catch {
    return {};
  }
})();
const remember = () => {
  try {
    sessionStorage.setItem('refugio-admin', JSON.stringify({ group: state.group.id, open: [...state.open], pick: state.pick, scroll: form?.scrollTop ?? 0 }));
  } catch {
    /* Storage can be blocked: the panel just forgets its place. */
  }
};

const state = {
  data: null,
  saved: null,
  group: GROUPS.find((g) => g.id === ui.group) ?? GROUPS[0],
  history: [],
  open: new Set(ui.open ?? []),
  filter: '',
  pick: !!ui.pick,
  lastPush: 0,
};

const root = document.getElementById('admin');
root.innerHTML = `
  <div class="ad">
    <aside class="ad-left">
      <section class="ad-card ad-me">
        <div class="ad-me__top">
          <span class="ad-avatar" data-initial>R</span>
          <div class="ad-me__who"><b data-sitename>Site</b><small>Site admin</small></div>
          <a class="ad-round" href="/" target="_blank" rel="noopener" title="Open the site in a new tab" aria-label="Open the site in a new tab"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg></a>
        </div>
        <h1>Content<br>editor</h1>
        <div class="ad-progress"><i data-progress></i></div>
        <div class="ad-progress__row"><span data-samples></span><span data-percent></span></div>
      </section>
      <section class="ad-card ad-groups">
        <header><h2>Sections</h2><span class="ad-chip ad-chip--ink">${GROUPS.length}</span></header>
        <nav data-nav></nav>
      </section>
    </aside>
    <main class="ad-card ad-main">
      <header class="ad-main__head">
        <div><h2 data-title></h2><p class="ad-live"><i></i><span data-sub></span></p></div>
        <div class="ad-main__actions">
          <button class="ad-pill" data-undo disabled>Undo</button>
          <button class="ad-pill" data-revert disabled>Discard changes</button>
        </div>
      </header>
      <div class="ad-form" data-form></div>
    </main>
    <aside class="ad-right">
      <section class="ad-card ad-dark ad-preview">
        <header><div><h3>Preview</h3><small>Shows the last saved version</small></div><span class="ad-chip ad-chip--lime" data-preview-state>Live</span></header>
        <div class="ad-frame" data-frame-box><iframe title="Site preview" data-frame src="/#${state.group.preview}"></iframe></div>
        <div class="ad-preview__row">
          <button class="ad-pill ad-pill--dark" data-pick aria-pressed="false">Pick text on the page</button>
          <button class="ad-pill ad-pill--dark" data-reload-preview>Reload</button>
        </div>
      </section>
      <section class="ad-card ad-save">
        <header><h3>Changes</h3><span class="ad-chip" data-dirty-chip>Saved</span></header>
        <dl class="ad-save__rows">
          <div><dt>Section</dt><dd data-save-group></dd></div>
          <div><dt>Unsaved edits</dt><dd data-save-count>0</dd></div>
          <div><dt>Last saved</dt><dd data-save-time>Not this session</dd></div>
        </dl>
        <button class="ad-confirm" data-save disabled><span>Save changes</span><i><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg></i></button>
        <details class="ad-backups"><summary>Backups</summary><ul data-backups></ul></details>
      </section>
    </aside>
  </div>
  <div class="ad-toast" role="status" aria-live="polite"></div>
  <div class="ad-picker" hidden><div class="ad-picker__sheet ad-card"><header><h3>Choose an image</h3><button class="ad-round" data-picker-close aria-label="Close">&times;</button></header><div class="ad-picker__grid" data-picker-grid></div></div></div>`;

const $ = (s) => root.querySelector(s);
const nav = $('[data-nav]');
const form = $('[data-form]');
const frame = $('[data-frame]');
const toastEl = document.querySelector('.ad-toast');
let edits = 0;

function toast(msg, bad) {
  toastEl.textContent = msg;
  toastEl.classList.toggle('is-bad', !!bad);
  toastEl.classList.add('is-on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => toastEl.classList.remove('is-on'), 3200);
}

/* ---------- Status ---------- */
function samples() {
  let n = 0;
  let total = 0;
  const walk = (v, inList) => {
    if (Array.isArray(v)) v.forEach((x) => walk(x, true));
    else if (isObj(v)) {
      if (inList && ('sample' in v || 'title' in v || 'name' in v || 'label' in v)) total += 1;
      if (v.sample === true) n += 1;
      Object.entries(v).forEach(([k, x]) => k !== 'text' && walk(x, false));
    }
  };
  walk(state.data, false);
  if (state.data.site.name === 'REFUGIO') n += 1;
  if (/example\.com/.test(state.data.site.email)) n += 1;
  return { n, total: total + 2 };
}

function status() {
  const dirty = JSON.stringify(state.data) !== JSON.stringify(state.saved);
  $('[data-save]').disabled = !dirty;
  $('[data-revert]').disabled = !dirty;
  $('[data-undo]').disabled = !state.history.length;
  $('[data-dirty-chip]').textContent = dirty ? 'Unsaved' : 'Saved';
  $('[data-dirty-chip]').classList.toggle('ad-chip--lime', dirty);
  $('[data-save-count]').textContent = dirty ? edits : 0;
  $('[data-save-group]').textContent = state.group.label;
  $('[data-preview-state]').textContent = dirty ? 'Draft' : 'Live';
  const s = samples();
  const pct = Math.round((1 - s.n / Math.max(1, s.total)) * 100);
  $('[data-progress]').style.width = `${pct}%`;
  $('[data-samples]').textContent = s.n ? `${s.n} samples left to replace` : 'No samples left';
  $('[data-percent]').textContent = `${pct}%`;
  $('[data-sitename]').textContent = state.data.site.name;
  $('[data-initial]').textContent = (state.data.site.name || 'R')[0];
}

function change(path, v) {
  const now = performance.now();
  if (now - state.lastPush > 900) {
    state.history.push(clone(state.data));
    if (state.history.length > 60) state.history.shift();
  }
  state.lastPush = now;
  set(state.data, path, v);
  edits += 1;
  status();
}

/* ---------- Left list ---------- */
function count(g) {
  if (g.special === 'text') return Object.values(state.data.text ?? {}).reduce((n, m) => n + Object.keys(m).length, 0);
  const v = get(state.data, g.path);
  if (Array.isArray(v)) return v.length;
  if (g.room) return v.posters?.length ?? 0;
  return Object.keys(v ?? {}).length;
}
function renderNav() {
  nav.innerHTML = GROUPS.map(
    (g) => `<button class="ad-nav ${g === state.group ? 'is-on' : ''}" data-group="${g.id}">
      <span><b>${esc(g.label)}</b><small>${esc(g.note)}</small></span><em>${count(g)}</em>${g === state.group ? '<i></i>' : ''}
    </button>`,
  ).join('');
}
nav.addEventListener('click', (e) => {
  const b = e.target.closest('[data-group]');
  if (!b) return;
  state.group = GROUPS.find((g) => g.id === b.dataset.group);
  state.filter = '';
  form.scrollTop = 0;
  renderNav();
  renderMain();
  status();
  goPreview();
  remember();
});

/* ---------- Fields ---------- */
const longKeys = ['intro', 'text', 'note', 'blurb', 'alt', 'credit', 'body', 'mono', 'line'];
function field(path, value, g) {
  const key = path[path.length - 1];
  const id = `f-${path.join('-')}`;
  const options = find(SELECT, path.map(String));
  const wrap = h(`<div class="ad-field" data-path="${esc(path.join('.'))}"><label for="${id}">${esc(label(key))}</label></div>`);
  if (typeof value === 'boolean') {
    const t = h(`<button class="ad-toggle ${value ? 'is-on' : ''}" id="${id}" role="switch" aria-checked="${value}"><i></i></button>`);
    t.addEventListener('click', () => {
      const v = !t.classList.contains('is-on');
      t.classList.toggle('is-on', v);
      t.setAttribute('aria-checked', v);
      change(path, v || undefined);
    });
    wrap.classList.add('ad-field--row');
    wrap.append(t);
    return wrap;
  }
  if (typeof value === 'number') {
    const i = h(`<input class="ad-input" id="${id}" type="number" value="${value}">`);
    i.addEventListener('input', () => change(path, i.value === '' ? 0 : +i.value));
    wrap.append(i);
    return wrap;
  }
  if (Array.isArray(value) && value.every((x) => Array.isArray(x))) return table(path, value, wrap);
  if (Array.isArray(value)) return strings(path, value, wrap);
  if (options) {
    const chips = h(`<div class="ad-chips" role="radiogroup" aria-label="${esc(label(key))}">${options.map((o) => `<button role="radio" aria-checked="${o === value}" class="ad-chipbtn ${o === value ? 'is-on' : ''}" data-v="${esc(o)}">${esc(o || 'none')}</button>`).join('')}</div>`);
    chips.addEventListener('click', (e) => {
      const b = e.target.closest('[data-v]');
      if (!b) return;
      chips.querySelectorAll('button').forEach((x) => {
        x.classList.toggle('is-on', x === b);
        x.setAttribute('aria-checked', x === b);
      });
      change(path, b.dataset.v || undefined);
      refreshTitle(path);
    });
    wrap.append(chips);
    return wrap;
  }
  const folder = g.images ?? (path.includes('posters') ? 'posters' : path[0] === 'rooms' ? 'art' : null);
  if (IMAGE_KEYS.includes(key) && folder) return imageField(path, value ?? '', wrap, folder);
  if (COLOR_KEYS.includes(key) && /^#[0-9a-f]{3,8}$/i.test(value ?? '')) {
    const row = h(`<div class="ad-color"><input type="color" value="${esc(value.length === 4 ? `#${[...value.slice(1)].map((c) => c + c).join('')}` : value.slice(0, 7))}" aria-label="${esc(label(key))}"><input class="ad-input" id="${id}" value="${esc(value)}"></div>`);
    const [pick, text] = row.querySelectorAll('input');
    pick.addEventListener('input', () => {
      text.value = pick.value;
      change(path, pick.value);
    });
    text.addEventListener('input', () => {
      if (/^#[0-9a-f]{6}$/i.test(text.value)) pick.value = text.value;
      change(path, text.value);
    });
    wrap.append(row);
    return wrap;
  }
  const long = (value ?? '').length > 70 || longKeys.includes(key);
  const input = long ? h(`<textarea class="ad-input" id="${id}" rows="${Math.min(6, Math.max(2, Math.ceil((value ?? '').length / 60)))}"></textarea>`) : h(`<input class="ad-input" id="${id}">`);
  input.value = value ?? '';
  input.addEventListener('input', () => {
    change(path, input.value);
    refreshTitle(path);
  });
  wrap.append(input);
  return wrap;
}

function strings(path, list, wrap) {
  const box = h(`<div class="ad-strings"></div>`);
  const draw = () => {
    box.innerHTML = '';
    list.forEach((s, i) => {
      const row = h(`<div class="ad-strings__row"><span>${i + 1}</span><input class="ad-input" aria-label="${esc(label(path[path.length - 1]))} ${i + 1}"><button class="ad-icon" title="Remove" aria-label="Remove">&times;</button></div>`);
      const inp = row.querySelector('input');
      inp.value = s;
      inp.addEventListener('input', () => {
        list[i] = inp.value;
        change(path, list);
        refreshTitle(path);
      });
      row.querySelector('button').addEventListener('click', () => {
        list.splice(i, 1);
        change(path, list);
        draw();
      });
      box.append(row);
    });
    const add = h(`<button class="ad-add">+ Add a line</button>`);
    add.addEventListener('click', () => {
      list.push('');
      change(path, list);
      draw();
      box.querySelectorAll('input')[list.length - 1]?.focus();
    });
    box.append(add);
  };
  draw();
  wrap.append(box);
  return wrap;
}

function table(path, rows, wrap) {
  const box = h(`<div class="ad-table"></div>`);
  const draw = () => {
    box.innerHTML = '';
    rows.forEach((r, i) => {
      const row = h(`<div class="ad-table__row" style="--cols:${r.length}">${r.map(() => '<input class="ad-input">').join('')}<button class="ad-icon" aria-label="Remove row">&times;</button></div>`);
      row.querySelectorAll('input').forEach((inp, c) => {
        inp.value = r[c];
        inp.addEventListener('input', () => {
          rows[i][c] = inp.value;
          change(path, rows);
        });
      });
      row.querySelector('button').addEventListener('click', () => {
        rows.splice(i, 1);
        change(path, rows);
        draw();
      });
      box.append(row);
    });
    const add = h(`<button class="ad-add">+ Add a row</button>`);
    add.addEventListener('click', () => {
      rows.push(Array.from({ length: rows[0]?.length ?? 3 }, () => ''));
      change(path, rows);
      draw();
    });
    box.append(add);
  };
  draw();
  wrap.append(box);
  return wrap;
}

function imageField(path, value, wrap, folder) {
  const box = h(`<div class="ad-image">
    <div class="ad-image__thumb" data-thumb></div>
    <div class="ad-image__body">
      <input class="ad-input" placeholder="${folder}/file.jpg" aria-label="Image path">
      <div class="ad-image__btns">
        <label class="ad-pill ad-pill--ink">Upload<input type="file" accept="image/*" hidden></label>
        <button class="ad-pill" data-browse>Choose from ${folder}/</button>
        <button class="ad-pill" data-clear>Remove</button>
      </div>
      <div class="ad-drop"><span class="ad-round">+</span>Drop an image here${path.includes('posters') ? '. Leave empty to use the drawn poster' : ''}</div>
    </div>
  </div>`);
  const input = box.querySelector('input.ad-input');
  const thumb = box.querySelector('[data-thumb]');
  const show = (v) => {
    input.value = v;
    thumb.style.backgroundImage = v ? `url('/${v}')` : '';
    thumb.classList.toggle('is-empty', !v);
  };
  show(value);
  input.addEventListener('input', () => {
    show(input.value);
    change(path, input.value);
  });
  const upload = async (file) => {
    if (!file) return;
    try {
      toast(`Uploading ${file.name}…`);
      const r = await api(`/upload?dir=${folder}&name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file });
      show(r.path);
      change(path, r.path);
      toast(`Uploaded to public/${r.path}. Save to use it.`);
    } catch (err) {
      toast(err.message, true);
    }
  };
  box.querySelector('input[type=file]').addEventListener('change', (e) => upload(e.target.files[0]));
  const drop = box.querySelector('.ad-drop');
  ['dragenter', 'dragover'].forEach((t) =>
    box.addEventListener(t, (e) => {
      e.preventDefault();
      drop.classList.add('is-over');
    }),
  );
  ['dragleave', 'drop'].forEach((t) => box.addEventListener(t, () => drop.classList.remove('is-over')));
  box.addEventListener('drop', (e) => {
    e.preventDefault();
    upload(e.dataTransfer.files[0]);
  });
  box.querySelector('[data-clear]').addEventListener('click', () => {
    show('');
    change(path, '');
  });
  box.querySelector('[data-browse]').addEventListener('click', () =>
    browse(folder, (p) => {
      show(p);
      change(path, p);
    }),
  );
  wrap.append(box);
  return wrap;
}

async function browse(folder, done) {
  const picker = document.querySelector('.ad-picker');
  const grid = picker.querySelector('[data-picker-grid]');
  grid.innerHTML = '<p>Loading…</p>';
  picker.hidden = false;
  try {
    const { files } = await api(`/files?dir=${folder}`);
    grid.innerHTML = files.length ? files.map((f) => `<button data-f="${esc(f)}"><span style="background-image:url('/${esc(f)}')"></span><small>${esc(f.split('/').pop())}</small></button>`).join('') : `<p>No images in public/${folder}/ yet. Use Upload instead.</p>`;
  } catch (err) {
    grid.innerHTML = `<p>${esc(err.message)}</p>`;
  }
  grid.onclick = (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    done(b.dataset.f);
    picker.hidden = true;
  };
}
document.querySelector('[data-picker-close]').addEventListener('click', () => (document.querySelector('.ad-picker').hidden = true));

/* ---------- Records and groups ---------- */
function itemTitle(g, item, i) {
  try {
    const t = g.title?.(item);
    if (t) return t;
  } catch {
    /* fall back below */
  }
  return item.title ?? item.name ?? item.label ?? item.what ?? `Item ${i + 1}`;
}
function refreshTitle(path) {
  const g = state.group;
  for (let n = path.length - 1; n > 0; n--) {
    const at = path.slice(0, n);
    const card = form.querySelector(`[data-item="${CSS.escape(at.join('.'))}"]`);
    if (card) {
      const list = get(state.data, at.slice(0, -1));
      const item = get(state.data, at);
      card.querySelector('[data-item-title]').textContent = itemTitle(path.includes('posters') ? {} : g, item, +at[at.length - 1]);
      return;
    }
  }
}

function blank(v) {
  if (typeof v === 'string') return '';
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return undefined;
  if (Array.isArray(v)) return v.length && Array.isArray(v[0]) ? [v[0].map(() => '')] : v.length && typeof v[0] === 'string' ? [''] : v.map(blank);
  if (isObj(v)) return Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'sample').map(([k, x]) => [k, blank(x)]));
  return v;
}
function keepChoices(tpl, src, path) {
  // Choices keep a valid value instead of going blank.
  for (const [k, v] of Object.entries(src)) {
    if (find(SELECT, [...path, k].map(String))) tpl[k] = v;
    if (COLOR_KEYS.includes(k) && typeof v === 'string' && v.startsWith('#')) tpl[k] = v;
  }
  return tpl;
}

function list(path, items, g, title) {
  const box = h(`<div class="ad-list"><div class="ad-list__head"><h3>${esc(title ?? label(path[path.length - 1]))}</h3><span class="ad-chip">${items.length}</span></div></div>`);
  items.forEach((item, i) => {
    const p = [...path, i];
    const key = p.join('.');
    const open = state.open.has(key);
    const card = h(`<div class="ad-item ${open ? 'is-open' : ''}" data-item="${esc(key)}">
      <header>
        <button class="ad-item__toggle" aria-expanded="${open}"><span class="ad-item__n">${String(i + 1).padStart(2, '0')}</span><b data-item-title>${esc(itemTitle(path.includes('posters') ? {} : g, item, i))}</b>${item.sample ? '<em class="ad-chip">Sample</em>' : ''}${item.image || item.src ? `<span class="ad-item__img" style="background-image:url('/${esc(item.image || item.src)}')"></span>` : ''}</button>
        <span class="ad-item__tools">
          <button class="ad-icon" data-act="up" title="Move up" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>&uarr;</button>
          <button class="ad-icon" data-act="down" title="Move down" aria-label="Move down" ${i === items.length - 1 ? 'disabled' : ''}>&darr;</button>
          <button class="ad-icon" data-act="copy" title="Duplicate" aria-label="Duplicate">&#x2398;</button>
          <button class="ad-icon ad-icon--bad" data-act="del" title="Delete" aria-label="Delete">&times;</button>
        </span>
      </header>
      <div class="ad-item__body"></div>
    </div>`);
    const body = card.querySelector('.ad-item__body');
    if (open) body.append(fields(p, item, g));
    card.querySelector('.ad-item__toggle').addEventListener('click', () => {
      const on = !card.classList.contains('is-open');
      card.classList.toggle('is-open', on);
      card.querySelector('.ad-item__toggle').setAttribute('aria-expanded', on);
      if (on) {
        state.open.add(key);
        if (!body.childElementCount) body.append(fields(p, item, g));
      } else state.open.delete(key);
      remember();
    });
    card.querySelector('.ad-item__tools').addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      const arr = clone(items);
      if (act === 'up') [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      if (act === 'down') [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
      if (act === 'copy') arr.splice(i + 1, 0, clone(item));
      if (act === 'del') {
        if (!confirm(`Delete “${itemTitle(g, item, i)}”? You can still undo, or discard changes before saving.`)) return;
        arr.splice(i, 1);
      }
      state.open.clear();
      change(path, arr);
      renderMain();
      renderNav();
    });
    box.append(card);
  });
  const add = h(`<button class="ad-add ad-add--big"><span class="ad-round">+</span>Add ${esc(label(path[path.length - 1]).toLowerCase().replace(/s$/, ''))}</button>`);
  add.addEventListener('click', () => {
    const tpl = keepChoices(blank(items[0] ?? { title: '' }), items[0] ?? {}, [...path, 0]);
    const arr = [...clone(items), tpl];
    state.open.add([...path, arr.length - 1].join('.'));
    change(path, arr);
    renderMain();
    renderNav();
    form.querySelector(`[data-item="${CSS.escape([...path, arr.length - 1].join('.'))}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  box.append(add);
  return box;
}

function fields(path, obj, g) {
  const box = h(`<div class="ad-fields"></div>`);
  Object.entries(obj).forEach(([k, v]) => {
    const p = [...path, k];
    if (find(HIDDEN, p.map(String))) return;
    if (Array.isArray(v) && v.length && isObj(v[0])) box.append(list(p, v, g));
    else if (isObj(v)) {
      const fs = h(`<fieldset class="ad-group"><legend>${esc(label(k))}</legend></fieldset>`);
      fs.append(fields(p, v, g));
      box.append(fs);
    } else if (v === null && k === 'card') {
      const b = h(`<div class="ad-field"><label>${esc(label(k))}</label><button class="ad-add">+ Add a title card</button></div>`);
      b.querySelector('button').addEventListener('click', () => {
        change(p, { title: '', code: '' });
        renderMain();
      });
      box.append(b);
    } else box.append(field(p, v, g));
  });
  // Every list item can be marked or unmarked as a sample.
  if (Number.isInteger(path[path.length - 1]) && !('sample' in obj) && ['graphics', 'wheelCards', 'photos', 'sites', 'sleeves', 'wagons', 'reel'].includes(path[0])) {
    box.append(field([...path, 'sample'], false, g));
  }
  return box;
}

/* ---------- Page text ---------- */
function inventory() {
  try {
    return frame.contentWindow?.__refugio?.texts?.() ?? null;
  } catch {
    return null;
  }
}
function renderText() {
  const inv = inventory();
  if (!inv) {
    form.innerHTML = '<p class="ad-empty">Waiting for the preview to load the page…</p>';
    return;
  }
  const t = state.data.text ?? (state.data.text = {});
  const scopes = [...new Set(inv.map((x) => x.scope))];
  const name = (s) => state.data.sections?.[s]?.title ?? { hud: 'Header and menu', route: 'Route map', case: 'Project viewer', rooms: 'Rooms (open a room in the preview to list its words)' }[s] ?? s;
  form.innerHTML = '';
  const top = h(`<div class="ad-text__top">
    <label class="ad-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg><input placeholder="Search the words on the page" value="${esc(state.filter)}" aria-label="Search the words on the page"></label>
    <p>${inv.length} pieces of text. Change one and save; clear a field to go back to the original wording.</p>
  </div>`);
  const search = top.querySelector('input');
  search.addEventListener('input', () => {
    state.filter = search.value;
    filterRows();
  });
  form.append(top);
  scopes.forEach((s) => {
    const rows = inv.filter((x) => x.scope === s);
    const sec = h(`<section class="ad-text__group" data-scope="${esc(s)}"><h3>${esc(name(s))} <span class="ad-chip">${rows.length}</span></h3></section>`);
    rows.forEach((r) => {
      const now = t[s]?.[r.original];
      const shown = r.original.startsWith('@placeholder ') ? r.original.slice(13) : r.original;
      const row = h(`<label class="ad-text__row ${now !== undefined ? 'is-changed' : ''}" data-orig="${esc(r.original)}"><span>${r.tag === 'placeholder' ? 'Field hint: ' : ''}${esc(shown)}</span><input class="ad-input"></label>`);
      const inp = row.querySelector('input');
      inp.value = now ?? shown;
      inp.addEventListener('input', () => {
        const v = inp.value.trim();
        const map = { ...(t[s] ?? {}) };
        if (!v || v === shown) delete map[r.original];
        else map[r.original] = inp.value;
        change(['text', s], Object.keys(map).length ? map : undefined);
        row.classList.toggle('is-changed', r.original in map);
      });
      sec.append(row);
    });
    form.append(sec);
  });
  filterRows();
}
function filterRows() {
  const f = state.filter.trim().toLowerCase();
  form.querySelectorAll('.ad-text__row').forEach((r) => (r.hidden = f && !r.textContent.toLowerCase().includes(f) && !r.querySelector('input').value.toLowerCase().includes(f)));
  form.querySelectorAll('.ad-text__group').forEach((g) => (g.hidden = ![...g.querySelectorAll('.ad-text__row')].some((r) => !r.hidden)));
}

/* ---------- Main panel ---------- */
function renderMain() {
  const g = state.group;
  $('[data-title]').textContent = g.label;
  $('[data-sub]').textContent = g.note;
  if (g.special === 'text') return renderText();
  form.innerHTML = '';
  const v = get(state.data, g.path);
  if (Array.isArray(v)) form.append(list(g.path, v, g, g.label));
  else form.append(fields(g.path, v, g));
}

/* ---------- Preview ---------- */
function fit() {
  const box = $('[data-frame-box]');
  const k = box.clientWidth / 1440;
  frame.style.transform = `scale(${k})`;
  box.style.height = `${900 * k}px`;
}
addEventListener('resize', fit);
function goPreview() {
  try {
    const w = frame.contentWindow;
    if (w && w.location.pathname === '/' && w.__refugio) w.location.hash = state.group.preview;
    else frame.src = `/#${state.group.preview}`;
  } catch {
    frame.src = `/#${state.group.preview}`;
  }
}
function armPick() {
  const btn = $('[data-pick]');
  btn.setAttribute('aria-pressed', state.pick);
  btn.classList.toggle('is-on', state.pick);
  let doc;
  try {
    doc = frame.contentDocument;
  } catch {
    return;
  }
  if (!doc?.body) return;
  doc.documentElement.classList.toggle('admin-pick', state.pick);
  if (!doc.getElementById('admin-pick-style')) {
    const st = doc.createElement('style');
    st.id = 'admin-pick-style';
    st.textContent = 'html.admin-pick * { cursor: crosshair !important; } html.admin-pick .admin-hover { outline: 2px solid #cfe82a !important; outline-offset: 2px; background: rgba(207,232,42,.18) !important; }';
    doc.head.append(st);
  }
  if (doc.__adminPick) return;
  doc.__adminPick = true;
  let last = null;
  doc.addEventListener('mouseover', (e) => {
    if (!state.pick) return;
    last?.classList.remove('admin-hover');
    last = e.target.closest('*');
    if (frame.contentWindow.__refugio?.wordsAt?.(last)) last.classList.add('admin-hover');
    else last = null;
  });
  doc.addEventListener(
    'click',
    (e) => {
      if (!state.pick) return;
      e.preventDefault();
      e.stopPropagation();
      const hit = frame.contentWindow.__refugio?.wordsAt?.(e.target);
      if (!hit) return toast('That text comes from a list. Find it in the section it belongs to.');
      state.group = GROUPS.find((x) => x.special === 'text');
      state.filter = '';
      renderNav();
      renderMain();
      status();
      remember();
      const row = [...form.querySelectorAll(`[data-scope="${CSS.escape(hit.scope)}"] .ad-text__row`)].find((r) => r.dataset.orig === hit.original);
      if (row) {
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        row.classList.add('is-flash');
        row.querySelector('input').focus({ preventScroll: true });
        setTimeout(() => row.classList.remove('is-flash'), 1600);
      }
    },
    true,
  );
}
frame.addEventListener('load', () => {
  fit();
  // The site reloads itself after a save; give it a moment to build, then wire it up.
  const ready = () => {
    if (!frame.contentWindow?.__refugio) return setTimeout(ready, 200);
    armPick();
    if (state.group.special === 'text') renderMain();
  };
  ready();
});
$('[data-pick]').addEventListener('click', () => {
  state.pick = !state.pick;
  armPick();
  remember();
  toast(state.pick ? 'Click any words in the preview to edit them.' : 'Picking is off.');
});
$('[data-reload-preview]').addEventListener('click', () => frame.contentWindow?.location.reload());

/* ---------- Saving ---------- */
async function save() {
  if ($('[data-save]').disabled) return;
  try {
    $('[data-save]').classList.add('is-busy');
    await api('/content', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(state.data) });
    state.saved = clone(state.data);
    edits = 0;
    $('[data-save-time]').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    toast('Saved. The preview reloads with your changes.');
    status();
    backups();
    remember();
  } catch (err) {
    toast(err.message, true);
  } finally {
    $('[data-save]').classList.remove('is-busy');
  }
}
$('[data-save]').addEventListener('click', save);
$('[data-undo]').addEventListener('click', () => {
  const prev = state.history.pop();
  if (!prev) return;
  state.data = prev;
  edits = Math.max(0, edits - 1);
  renderMain();
  renderNav();
  status();
});
$('[data-revert]').addEventListener('click', () => {
  if (!confirm('Discard every change since the last save?')) return;
  state.data = clone(state.saved);
  state.history = [];
  edits = 0;
  renderMain();
  renderNav();
  status();
});
addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    save();
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    $('[data-undo]').click();
  }
});
addEventListener('beforeunload', (e) => {
  remember();
  if (JSON.stringify(state.data) !== JSON.stringify(state.saved)) e.preventDefault();
});

async function backups() {
  try {
    const { backups: list } = await api('/backups');
    $('[data-backups]').innerHTML = list.length
      ? list.slice(0, 12).map((f) => `<li><span>${esc(f.replace('content-', '').replace('.json', '').replace(/T(\d\d)-(\d\d)-(\d\d).*/, ' $1:$2:$3'))}</span><button class="ad-pill" data-restore="${esc(f)}">Restore</button></li>`).join('')
      : '<li>No backups yet. One is made every time you save.</li>';
  } catch {
    /* The list is a convenience. */
  }
}
$('[data-backups]').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-restore]');
  if (!b || !confirm('Replace the current content with this backup? The current version is backed up first.')) return;
  try {
    await api(`/restore?name=${encodeURIComponent(b.dataset.restore)}`, { method: 'POST' });
    await load();
    toast('Backup restored.');
  } catch (err) {
    toast(err.message, true);
  }
});

async function load() {
  try {
    state.data = await api('/content');
  } catch (err) {
    form.innerHTML = `<p class="ad-empty">${esc(err.message)} Start the site with <code>npm run dev</code> and open this page from it.</p>`;
    return;
  }
  state.saved = clone(state.data);
  state.history = [];
  renderNav();
  renderMain();
  status();
  backups();
  if (ui.scroll) form.scrollTop = ui.scroll;
}
fit();
load();
