/* Devlog editor – client. Talks to devlog/editor.py; no frameworks. */
'use strict';

const $ = (id) => document.getElementById(id);
const TOKEN = document.querySelector('meta[name="editor-token"]')?.content || '';

const TEXT_FIELDS = ['kicker', 'kicker_short', 'title_en', 'title_he', 'teaser_en', 'teaser_he',
  'banner_alt_en', 'banner_alt_he', 'banner_caption_en', 'banner_caption_he'];
const LANGS = ['en', 'he'];

const state = {
  status: { has_key: false, icons: {} },
  posts: [],
  slug: null,
  post: null,                  // the post object as stored in posts.json
  banner: '', thumb: '',
  raw: { en: '', he: '' },     // body files as stored (tokens, original formatting)
  baseline: { en: '', he: '' },// editor.getContent() right after loading/saving
  editors: {},
  loading: false,
  dirty: false,
};

// ── helpers ──────────────────────────────────────────────────────────────
async function api(path, body) {
  const opts = { headers: { 'X-Editor-Token': TOKEN } };
  if (body !== undefined) {
    opts.method = 'POST';
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try { res = await fetch(path, opts); } catch (e) { throw new Error('The editor server is not answering. Is editor.py still running?'); }
  let data = {};
  try { data = await res.json(); } catch (e) { /* not JSON */ }
  if (!res.ok || data.ok === false) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.data = data;
    throw err;
  }
  return data;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const _dec = document.createElement('textarea');
function decode(s) { _dec.innerHTML = s ?? ''; return _dec.value; }
function encodeField(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function niceDate(when) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(when || '');
  return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]} · ${m[4]}` : '';
}

function toast(msg, kind = 'ok', ms) {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  $('toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms || (kind === 'err' ? 7000 : 2600));
}
function busy(text) { $('busyText').textContent = text; $('busy').hidden = false; }
function idle() { $('busy').hidden = true; }

function iconSvg(name, colour = '#f9a8d4', size = 16) {
  const rows = state.status.icons[name] || [];
  let rects = '';
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 8 8" fill="${colour}" shape-rendering="crispEdges">${rects}</svg>`;
}

// ── modals ───────────────────────────────────────────────────────────────
function modal({ title, sub = '', html = '', buttons = [], wide = false, danger = false, onOpen }) {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal${wide ? ' wide' : ''}${danger ? ' danger' : ''}" role="dialog" aria-modal="true">
      <h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}<div class="m-body">${html}</div>
      <div class="row"></div></div>`;
    const row = back.querySelector('.row');
    const close = (v) => { back.remove(); document.removeEventListener('keydown', onKey, true); resolve(v); };
    buttons.forEach((b) => {
      const el = document.createElement('button');
      el.className = 'btn big ' + (b.cls || '');
      el.textContent = b.text;
      el.addEventListener('click', async () => {
        if (b.validate && !(await b.validate(back))) return;
        close(b.value !== undefined ? b.value : b.text);
      });
      row.appendChild(el);
    });
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(null); }
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        const primary = [...row.querySelectorAll('.btn')].pop();
        if (primary) { e.preventDefault(); primary.click(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(null); });
    $('modalRoot').appendChild(back);
    if (onOpen) onOpen(back, close);
    const first = back.querySelector('input, textarea');
    (first || row.lastElementChild)?.focus();
  });
}
const confirmBox = (title, sub, okText = 'OK', danger = false) =>
  modal({ title, sub, danger, buttons: [{ text: 'Cancel', value: false }, { text: okText, value: true, cls: danger ? 'danger-btn' : 'primary' }] });
const infoBox = (title, sub, html = '') => modal({ title, sub, html, buttons: [{ text: 'OK', cls: 'primary' }] });

function noKeyBox() {
  return infoBox('Claude needs an API key',
    'Translate and Draft call the Claude API, and there is no key yet. Everything else in the editor works without one.',
    `<p class="sub">Create the file <code>devlog/.env</code> with this one line, then restart the editor:</p>
     <pre>ANTHROPIC_API_KEY=sk-ant-...</pre>
     <p class="sub">The key comes from <code>platform.claude.com</code> → API keys. The <code>.env</code> file is in <code>.gitignore</code>, so it never gets committed.</p>`);
}

// ── body conversion: file tokens <-> editor HTML ─────────────────────────
function toEditor(raw) {
  return (raw || '')
    .replace(/\{IMG\}/g, '/img/')
    .replace(/\{icon:(\w+)\}/g, (m, n) => `<img class="dl-icon" data-icon="${n}" src="/icon/${n}.svg" alt="" />`);
}
function fromEditor(html) {
  let out = html
    .replace(/<img\b[^>]*\bdata-icon="(\w+)"[^>]*>/g, '{icon:$1}')
    .replace(/(\b(?:src|href)=")\/img\//g, '$1{IMG}');
  if (out && !out.endsWith('\n')) out += '\n';
  return out;
}
function bodyForSave(lang) {
  const ed = state.editors[lang];
  const cur = ed.getContent();
  return cur === state.baseline[lang] ? state.raw[lang] : fromEditor(cur);
}
function setBody(lang, raw) {
  const ed = state.editors[lang];
  state.loading = true;
  ed.setContent(toEditor(raw));
  ed.undoManager.clear();
  state.baseline[lang] = ed.getContent();
  state.loading = false;
}

// ── dirty tracking ───────────────────────────────────────────────────────
let dirtyTimer = null;
function markDirty() {
  if (state.loading || !state.slug) return;
  clearTimeout(dirtyTimer);
  dirtyTimer = setTimeout(recomputeDirty, 150);
}
function fieldValue(name) { return $('f-' + name).value; }
function recomputeDirty() {
  if (!state.post) { setDirty(false); return; }
  const p = state.post;
  let d = TEXT_FIELDS.some((f) => fieldValue(f) !== decode(p[f] || ''));
  d = d || $('f-when').value !== (p.when || '').slice(0, 16);
  d = d || $('f-draft').checked !== !!p.draft;
  d = d || state.banner !== (p.banner || '') || state.thumb !== (p.thumb || '');
  d = d || LANGS.some((l) => state.editors[l] && state.editors[l].getContent() !== state.baseline[l]);
  setDirty(d);
}
function setDirty(d) {
  state.dirty = d;
  const s = $('saveState');
  s.className = 'save-state ' + (d ? 'dirty' : 'clean');
  s.querySelector('.txt').textContent = !state.slug ? 'No post open' : d ? 'Unsaved changes' : 'All saved';
  $('saveBtn').disabled = !state.slug;
}
window.addEventListener('beforeunload', (e) => {
  recomputeDirty();
  if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
});

// ── posts list ───────────────────────────────────────────────────────────
async function loadList() {
  const { posts } = await api('/api/posts');
  state.posts = posts;
  const ul = $('postList');
  ul.innerHTML = '';
  if (!posts.length) ul.innerHTML = '<li class="sub">No posts yet.</li>';
  posts.forEach((p) => {
    const li = document.createElement('li');
    li.className = 'post-item' + (p.slug === state.slug ? ' active' : '');
    li.innerHTML = `${p.thumb ? `<img src="/img/${encodeURIComponent(p.thumb)}" alt="" loading="lazy" />` : '<span class="noimg"></span>'}
      <div><div class="meta-line">${p.draft ? '<span class="badge">DRAFT</span>' : `<span class="num">#${p.n}</span>`}<span>${esc(niceDate(p.when))}</span></div>
      <div class="t">${esc(p.title_en || p.slug)}</div></div>`;
    li.addEventListener('click', () => openPost(p.slug));
    ul.appendChild(li);
  });
}

async function leaveOk() {
  recomputeDirty();
  if (!state.dirty) return true;
  const r = await modal({
    title: 'Unsaved changes', sub: 'This post has changes that are not saved yet.',
    buttons: [{ text: 'Cancel', value: 'cancel' }, { text: 'Discard', value: 'discard', cls: 'danger-btn' }, { text: 'Save first', value: 'save', cls: 'primary' }],
  });
  if (r === 'save') return await save();
  return r === 'discard';
}

async function openPost(slug, force = false) {
  if (!force && slug !== state.slug && !(await leaveOk())) return;
  const data = await api('/api/post/' + encodeURIComponent(slug));
  state.slug = slug;
  state.post = data.post;
  state.raw = { en: data.body_en, he: data.body_he };
  state.loading = true;
  TEXT_FIELDS.forEach((f) => { $('f-' + f).value = decode(data.post[f] || ''); });
  $('f-when').value = (data.post.when || '').slice(0, 16);
  $('f-draft').checked = !!data.post.draft;
  state.banner = data.post.banner || '';
  state.thumb = data.post.thumb || '';
  showPickers();
  $('emptyView').hidden = true;
  $('postView').hidden = false;
  LANGS.forEach((l) => setBody(l, state.raw[l]));
  state.loading = false;
  const entry = state.posts.find((p) => p.slug === slug);
  $('postNum').textContent = entry && entry.n ? `DEVLOG #${entry.n} · ${slug}` : `DRAFT · ${slug}`;
  ['previewEn', 'previewHe', 'trEnHe', 'trHeEn', 'publishBtn'].forEach((id) => { $(id).disabled = false; });
  setDirty(false);
  history.replaceState(null, '', '#' + slug);
  document.querySelectorAll('.post-item').forEach((li, i) => li.classList.toggle('active', state.posts[i]?.slug === slug));
}

function showPickers() {
  const set = (id, name) => {
    const img = $(id);
    if (name) img.src = '/img/' + encodeURIComponent(name); else img.removeAttribute('src');
    img.parentElement.classList.toggle('has', !!name);
    img.parentElement.title = name || '';
  };
  set('bannerImg', state.banner);
  set('thumbImg', state.thumb);
}

// ── save ─────────────────────────────────────────────────────────────────
function collect() {
  const p = state.post;
  const meta = {};
  TEXT_FIELDS.forEach((f) => {
    const v = fieldValue(f);
    meta[f] = v === decode(p[f] || '') ? (p[f] || '') : encodeField(v);   // untouched fields keep their exact bytes
  });
  if ($('f-when').value && $('f-when').value !== (p.when || '').slice(0, 16)) meta.when_local = $('f-when').value;
  meta.banner = state.banner;
  meta.thumb = state.thumb || null;
  meta.draft = $('f-draft').checked;
  return { post: meta, body_en: bodyForSave('en'), body_he: bodyForSave('he') };
}

let saving = null;
async function save(quiet = false) {
  if (!state.slug) return false;
  if (saving) return saving;
  saving = (async () => {
    try {
      const payload = collect();
      const res = await api('/api/post/' + encodeURIComponent(state.slug), payload);
      state.post = res.post;
      LANGS.forEach((l) => { state.raw[l] = payload['body_' + l]; state.baseline[l] = state.editors[l].getContent(); });
      // reflect normalised values (e.g. the stored date) without marking anything dirty
      $('f-when').value = (res.post.when || '').slice(0, 16);
      await loadList();
      recomputeDirty();
      if (!quiet) toast('Saved');
      return true;
    } catch (e) {
      toast(e.message, 'err');
      return false;
    } finally { saving = null; }
  })();
  return saving;
}

// ── image library ────────────────────────────────────────────────────────
function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error('Could not read ' + file.name));
    r.readAsDataURL(file);
  });
}
async function uploadFile(file) {
  if (!/^image\/(png|gif|jpeg|webp)$/.test(file.type)) throw new Error(`${file.name}: only PNG, GIF, JPG and WEBP images can be added.`);
  if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} is ${(file.size / 1048576).toFixed(1)} MB; the limit is 5 MB.`);
  const res = await api('/api/upload', { name: file.name, data: await readAsBase64(file) });
  toast('Added ' + res.name);
  return res.name;
}

/** Pick (or upload) an image. Resolves to a file name, or null. */
function pickImage(title, current) {
  return new Promise((resolve) => {
    let chosen = current || null;
    modal({
      title, wide: true,
      sub: 'Images live in <code>docs/assets/images/devlog/</code>. Click one to choose it, or add a new one.',
      html: `<div class="lib-tools"><label class="btn">Upload image…<input type="file" accept="image/png,image/gif,image/jpeg,image/webp" multiple hidden /></label>
             <div class="drop">…or drop image files here (PNG, GIF, JPG, WEBP, up to 5 MB)</div></div><div class="lib-grid"></div>`,
      buttons: [{ text: 'Cancel', value: null }, { text: 'Use this image', cls: 'primary', value: 'use' }],
      onOpen: (back) => {
        const grid = back.querySelector('.lib-grid');
        const render = async (select) => {
          const { images } = await api('/api/images');
          if (select) chosen = select;
          grid.innerHTML = images.map((im) => `<button type="button" class="lib-item${im.name === chosen ? ' sel' : ''}" data-name="${esc(im.name)}">
            <img src="/img/${encodeURIComponent(im.name)}" alt="" loading="lazy" /><span>${esc(im.name)}</span></button>`).join('');
        };
        grid.addEventListener('click', (e) => {
          const b = e.target.closest('.lib-item');
          if (!b) return;
          chosen = b.dataset.name;
          grid.querySelectorAll('.lib-item').forEach((x) => x.classList.toggle('sel', x === b));
        });
        grid.addEventListener('dblclick', (e) => { if (e.target.closest('.lib-item')) back.querySelector('.row .primary').click(); });
        const doUpload = async (files) => {
          let last = null;
          for (const f of files) { try { last = await uploadFile(f); } catch (err) { toast(err.message, 'err'); } }
          if (last) await render(last);
        };
        back.querySelector('input[type=file]').addEventListener('change', (e) => doUpload([...e.target.files]));
        const drop = back.querySelector('.drop');
        drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('over'));
        drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); doUpload([...e.dataTransfer.files]); });
        render().catch((e) => toast(e.message, 'err'));
      },
    }).then((r) => resolve(r === 'use' ? chosen : null));
  });
}

// ── editor building blocks (same markup as the hand-made posts) ──────────
function figureHtml(name, alt, caption) {
  return `<figure class="mt-6">
  <div class="bg-black/70 rounded-xl border border-cyan-300/30 crt-frame p-2">
    <img src="/img/${name}" alt="${encodeField(alt)}" class="w-full h-auto rounded-lg pixelated" loading="lazy" />
  </div>
  <figcaption class="mt-2 text-xs text-cyan-200/60">${esc(caption)}</figcaption>
</figure><p></p>`;
}
const altFromName = (n) => n.replace(/\.[a-z]+$/i, '').replace(/^fist2-/, '').replace(/[-_]+/g, ' ');

async function screenshotDialog(ed, lang) {
  const name = await pickImage(lang === 'he' ? 'Screenshot for the Hebrew body' : 'Screenshot for the English body');
  if (!name) return;
  const he = lang === 'he';
  let alt = '', cap = '';
  const r = await modal({
    title: 'Screenshot details',
    html: `<div class="fig-preview"><img src="/img/${encodeURIComponent(name)}" alt="" />
      <div dir="${he ? 'rtl' : 'ltr'}"><label class="field"><span>${he ? 'כיתוב (מתחת לתמונה)' : 'Caption (under the picture)'}</span><input id="m-cap" placeholder="${he ? 'כיתוב…' : 'Caption…'}" /></label>
      <label class="field"><span>${he ? 'טקסט חלופי (לקוראי מסך)' : 'Alt text (for screen readers)'}</span><input id="m-alt" value="${esc(altFromName(name))}" /></label></div></div>`,
    buttons: [{ text: 'Cancel', value: null }, { text: 'Insert', cls: 'primary', value: 'ok',
      validate: (back) => { alt = back.querySelector('#m-alt').value; cap = back.querySelector('#m-cap').value; return true; } }],
  });
  if (r !== 'ok') return;
  ed.focus();
  ed.insertContent(figureHtml(name, alt, cap || (he ? 'כיתוב…' : 'Caption…')));
  markDirty();
}

async function insertDroppedImages(ed, lang, files) {
  for (const f of files) {
    try {
      const name = await uploadFile(f);
      ed.insertContent(figureHtml(name, altFromName(name), lang === 'he' ? 'כיתוב…' : 'Caption…'));
    } catch (e) { toast(e.message, 'err'); }
  }
  markDirty();
}

function insertIcon(ed, name) {
  ed.focus();
  const node = ed.selection.getNode();
  const h2 = ed.dom.getParent(node, 'h2');
  const img = ed.dom.create('img', { class: 'dl-icon', 'data-icon': name, src: `/icon/${name}.svg`, alt: '' });
  ed.undoManager.transact(() => {
    if (h2) {
      const old = h2.querySelector('img.dl-icon');
      if (old) old.replaceWith(img); else h2.insertBefore(img, h2.firstChild);
    } else {
      ed.insertContent(img.outerHTML);
    }
  });
  ed.nodeChanged();
  ed.focus();
  markDirty();
}

const TILE_PARENT = (el) => el && el.nodeType === 1 && /\bgrid\b/.test(el.className || '') && !!el.querySelector(':scope > div.rounded-xl');
function tileHtml(label, value, colour) {
  const c = colour === 'cyan' ? 'cyan' : 'pink';
  return `<div class="rounded-xl p-4 bg-black/50 border border-${c}-400/30">
    <p class="[font-family:'Press Start 2P',monospace] text-[9px] tracking-widest text-${c}-300">${esc(label)}</p>
    <p class="mt-3 text-2xl text-${c}-200">${esc(value)}</p>
  </div>`;
}
function fixGridCols(grid) {
  const n = Math.min(4, grid.querySelectorAll(':scope > div.rounded-xl').length);
  grid.className = grid.className.replace(/\bsm:grid-cols-\d\b/, '').replace(/\s+/g, ' ').trim() + ` sm:grid-cols-${Math.max(1, n)}`;
}
function tileDialog(ed) {
  ed.windowManager.open({
    title: 'Number tile',
    body: { type: 'panel', items: [
      { type: 'input', name: 'label', label: 'Label (small pixel text, e.g. BYTES SAVED)' },
      { type: 'input', name: 'value', label: 'Value (big text, e.g. 1,872)' },
      { type: 'selectbox', name: 'colour', label: 'Colour', items: [{ text: 'Pink', value: 'pink' }, { text: 'Cyan', value: 'cyan' }] },
      { type: 'htmlpanel', html: '<p style="opacity:.7;font-size:12px">Tiles next to each other share one row (up to 4). Put the cursor in an existing tile row to add to it.</p>' },
    ] },
    initialData: { label: '', value: '', colour: 'pink' },
    buttons: [{ type: 'cancel', text: 'Cancel' }, { type: 'submit', text: 'Insert', primary: true }],
    onSubmit: (dlg) => {
      const d = dlg.getData();
      if (!d.label.trim() && !d.value.trim()) { dlg.close(); return; }
      const node = ed.selection.getNode();
      let grid = ed.dom.getParent(node, TILE_PARENT);
      let emptyBlock = null;
      if (!grid) {
        const block = ed.dom.getParent(node, (el) => el.parentNode === ed.getBody());
        const prev = block && block.previousElementSibling;
        if (prev && TILE_PARENT(prev) && block.textContent.trim() === '') { grid = prev; emptyBlock = block; }
      }
      ed.undoManager.transact(() => {
        if (grid) {
          grid.insertAdjacentHTML('beforeend', tileHtml(d.label, d.value, d.colour));
          fixGridCols(grid);
          if (emptyBlock) ed.selection.setCursorLocation(emptyBlock, 0);
        } else {
          ed.insertContent(`<div class="mt-6 grid grid-cols-1 sm:grid-cols-1 gap-4">${tileHtml(d.label, d.value, d.colour)}</div><p></p>`);
        }
      });
      ed.nodeChanged();
      markDirty();
      dlg.close();
    },
  });
}

const LEAD = 'mt-6 text-base text-sky-100/95 leading-relaxed';
function toggleLead(ed) {
  const p = ed.dom.getParent(ed.selection.getNode(), 'p');
  if (!p) { toast('Put the cursor in a paragraph first.', 'err'); return; }
  ed.undoManager.transact(() => {
    if (p.className === LEAD) p.removeAttribute('class'); else p.className = LEAD;
  });
  ed.nodeChanged();
  markDirty();
}

// ── TinyMCE ──────────────────────────────────────────────────────────────
const CONTENT_STYLE = `
  html { background: #07000f; }
  body { font-family: Heebo, system-ui, sans-serif; background: #07000f; color: #e0f2fe; margin: 18px 20px 40px; font-size: 15px; line-height: 1.75; }
  body > p:not([class]), body > ul:not([class]), body > ol:not([class]) { margin-top: 1.1rem; color: rgb(224 242 254 / .9); }
  ul:not([class]) { list-style: disc; padding-inline-start: 1.25rem; }
  ol:not([class]) { list-style: decimal; padding-inline-start: 1.5rem; }
  h2:not([class]) { font-size: 1.3rem; color: #cffafe; margin-top: 1.8rem; display: flex; align-items: center; gap: .6rem; }
  h2 { display: flex; align-items: center; gap: .6rem; }
  a { color: #67e8f9; text-decoration: underline; }
  code:not([class]) { color: #67e8f9; }
  strong { color: #fff; }
  img.dl-icon { width: 16px; height: 16px; image-rendering: pixelated; vertical-align: -2px; filter: drop-shadow(0 0 4px rgba(255,45,210,.55)); cursor: default; }
  .crt-frame { position: relative; overflow: hidden; }
  .pixelated { image-rendering: pixelated; }
  figure { margin-inline: 0; }
  figcaption { min-height: 1em; }
  .mce-content-body [data-mce-selected="inline-boundary"] { background: rgba(255,45,210,.25); }
`;

function initEditor(lang) {
  const he = lang === 'he';
  return tinymce.init({
    target: $('body-' + lang),
    license_key: 'gpl',
    skin: 'oxide-dark',
    content_css: ['dark', 'https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&family=Press+Start+2P&display=swap'],
    content_style: CONTENT_STYLE,
    directionality: he ? 'rtl' : 'ltr',
    language: 'en',
    height: 720,
    min_height: 400,
    resize: true,
    menubar: false,
    branding: false,
    promotion: false,
    statusbar: true,
    elementpath: false,
    plugins: 'lists link autolink code',
    toolbar: 'undo redo | dlh2 bold italic dlcode | link bullist | dlshot dlicon dltile dllead | code',
    toolbar_mode: 'wrap',
    // keep the hand-written markup exactly: every attribute, every Tailwind class
    extended_valid_elements: '*[*]',
    valid_children: '+body[style|div|figure],+div[div|h2|h3|p|ul|ol|figure],+figure[div|img|figcaption],+a[div|p|img]',
    verify_html: false,
    entity_encoding: 'raw',
    convert_urls: false,
    relative_urls: false,
    remove_script_host: false,
    paste_data_images: false,
    link_default_target: '_blank',
    link_assume_external_targets: true,
    setup: (ed) => {
      state.editors[lang] = ed;
      ed.ui.registry.addToggleButton('dlh2', {
        text: 'H2', tooltip: 'Section heading',
        onAction: () => ed.execCommand('mceToggleFormat', false, 'h2'),
        onSetup: (api) => { const off = ed.formatter.formatChanged('h2', (s) => api.setActive(s)); return () => off.unbind(); },
      });
      ed.ui.registry.addToggleButton('dlcode', {
        icon: 'sourcecode', tooltip: 'Code (inline)',
        onAction: () => ed.formatter.toggle('dlcode'),
        onSetup: (api) => { const off = ed.formatter.formatChanged('dlcode', (s) => api.setActive(s)); return () => off.unbind(); },
      });
      ed.ui.registry.addButton('dlshot', { icon: 'image', text: 'Screenshot', tooltip: 'Insert a screenshot with a caption', onAction: () => screenshotDialog(ed, lang) });
      ed.ui.registry.addMenuButton('dlicon', {
        text: 'Icon', tooltip: 'Pixel icon (goes at the start of the heading you are in)',
        fetch: (cb) => cb(Object.keys(state.status.icons).map((n) => ({ type: 'menuitem', text: n, icon: 'dl-' + n, onAction: () => insertIcon(ed, n) }))),
      });
      ed.ui.registry.addButton('dltile', { text: '# Tile', tooltip: 'Number tile', onAction: () => tileDialog(ed) });
      ed.ui.registry.addButton('dllead', { text: 'Lead', tooltip: 'Make this paragraph the lead (bigger opening line)', onAction: () => toggleLead(ed) });
      Object.keys(state.status.icons).forEach((n) => ed.ui.registry.addIcon('dl-' + n, iconSvg(n, 'currentColor', 18)));

      ed.on('init', () => {
        ed.formatter.register('dlcode', { inline: 'code', classes: 'text-cyan-300' });
        // the site's Tailwind, so the body looks like the real page while writing
        const d = ed.getDoc();
        const s = d.createElement('script');
        s.src = 'https://cdn.tailwindcss.com';
        d.head.appendChild(s);
        d.body.setAttribute('lang', he ? 'he' : 'en');
      });
      ed.on('input change undo redo ExecCommand KeyUp SetContent', markDirty);
      ed.addShortcut('meta+s', 'Save', () => save());
      ed.on('drop', (e) => {
        const files = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'));
        if (!files.length) return;
        e.preventDefault();
        insertDroppedImages(ed, lang, files);
      });
      ed.on('paste', (e) => {
        const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
        if (!files.length) return;
        e.preventDefault();
        insertDroppedImages(ed, lang, files);
      });
    },
  });
}

// ── actions ──────────────────────────────────────────────────────────────
async function newPost() {
  if (!(await leaveOk())) return;
  let title = '';
  const r = await modal({
    title: 'New post',
    sub: 'Give it a working title in English. It becomes the address of the page (you can change the title later; the address stays).',
    html: '<label class="field"><span>Title</span><input id="m-title" placeholder="The boss walks in" /></label><p class="slug-preview" id="m-slug">devlog-….html</p>',
    buttons: [{ text: 'Cancel', value: null }, { text: 'Create draft', cls: 'primary', value: 'ok',
      validate: (back) => { title = back.querySelector('#m-title').value.trim(); if (!title) { toast('Type a title first.', 'err'); return false; } return true; } }],
    onOpen: (back) => {
      const inp = back.querySelector('#m-title');
      inp.addEventListener('input', () => {
        const slug = inp.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
        back.querySelector('#m-slug').textContent = `docs/devlog-${slug || '…'}.html`;
      });
    },
  });
  if (r !== 'ok') return null;
  try {
    const res = await api('/api/new', { title });
    await loadList();
    await openPost(res.slug, true);
    toast('Draft created. It stays off the site until you switch off "Draft".');
    return res.slug;
  } catch (e) { toast(e.message, 'err'); return null; }
}

async function deletePost() {
  if (!state.slug) return;
  const title = fieldValue('title_en') || state.slug;
  const ok = await confirmBox('Delete this post?',
    `"${esc(title)}" and both its body files will be deleted${state.post.draft ? '' : ', and its pages removed from the site on the next publish'}. Images stay in the library. This can't be undone from the editor (git still has the last commit).`,
    'Delete post', true);
  if (!ok) return;
  try {
    await api('/api/delete/' + encodeURIComponent(state.slug), {});
    state.slug = null; state.post = null;
    $('postView').hidden = true; $('emptyView').hidden = false;
    ['previewEn', 'previewHe', 'trEnHe', 'trHeEn', 'publishBtn'].forEach((id) => { $(id).disabled = true; });
    setDirty(false);
    history.replaceState(null, '', location.pathname);
    await loadList();
    toast('Post deleted');
  } catch (e) { toast(e.message, 'err'); }
}

async function preview(lang) {
  if (!state.slug) return;
  const win = window.open('about:blank', '_blank');     // open now, so the popup blocker lets it through
  if (!(await save(true))) { win && win.close(); return; }
  try {
    busy('Building the pages…');
    await api('/api/build', {});
    const prefix = lang === 'en' ? 'en/' : '';
    const url = state.post.draft ? `/site/${prefix}__preview-${state.slug}.html` : `/site/${prefix}devlog-${state.slug}.html`;
    if (win) win.location = url; else window.open(url, '_blank');
    toast(state.post.draft ? 'Draft preview opened (drafts are never written to the site).' : 'Built. The page opened in a new tab.');
  } catch (e) { win && win.close(); toast(e.message, 'err'); } finally { idle(); }
}

async function translate(dir) {
  if (!state.slug) return;
  if (!state.status.has_key) { noKeyBox(); return; }
  const [from, to] = dir === 'en2he' ? ['en', 'he'] : ['he', 'en'];
  const targetHasText = ['title', 'teaser', 'banner_alt', 'banner_caption'].some((f) => fieldValue(`${f}_${to}`).trim())
    || state.editors[to].getContent({ format: 'text' }).trim();
  if (targetHasText && !(await confirmBox(`Replace the ${to === 'he' ? 'Hebrew' : 'English'} side?`,
    `Claude will overwrite the ${to === 'he' ? 'Hebrew' : 'English'} title, teaser, banner texts and body with a fresh translation. You can still undo by not saving.`, 'Translate'))) return;
  const fields = {
    title: fieldValue('title_' + from), teaser: fieldValue('teaser_' + from),
    banner_alt: fieldValue('banner_alt_' + from), banner_caption: fieldValue('banner_caption_' + from),
    body: fromEditor(state.editors[from].getContent()),
  };
  busy(`Claude is translating to ${to === 'he' ? 'Hebrew' : 'English'}… (this can take a minute)`);
  try {
    const res = await api('/api/translate', { direction: dir, fields });
    const f = res.fields;
    $('f-title_' + to).value = decode(f.title);
    $('f-teaser_' + to).value = decode(f.teaser);
    $('f-banner_alt_' + to).value = decode(f.banner_alt);
    $('f-banner_caption_' + to).value = decode(f.banner_caption);
    state.editors[to].setContent(toEditor(f.body));
    recomputeDirty();
    toast('Translated. Read it through, then save.');
  } catch (e) { toast(e.message, 'err'); } finally { idle(); }
}

async function draftFromRepo() {
  busy('Reading the game repo (git log + merged PRs)…');
  let ch;
  try { ch = await api('/api/repo-changes'); } catch (e) { idle(); toast(e.message, 'err'); return; }
  idle();
  if (!ch.prs.length && !ch.commits.length) {
    infoBox('Nothing new in the game repo', `Nothing was merged since the last published post (${esc(ch.since_title)}, ${esc(niceDate(ch.since))}).`);
    return;
  }
  const prItems = ch.prs.map((p, i) => `<li><label><input type="checkbox" data-pr="${i}" checked />
      <div><div class="c-title">#${p.number} ${esc(p.title)}</div><div class="c-meta">merged ${esc(niceDate(p.mergedAt))} UTC</div>
      <div class="c-body">${esc((p.body || '').slice(0, 400))}</div></div></label></li>`).join('');
  const cItems = ch.commits.map((c, i) => `<li><label><input type="checkbox" data-commit="${i}" />
      <div><div class="c-title">${esc(c.subject)}</div><div class="c-meta"><code>${esc(c.short)}</code> · ${esc(niceDate(c.when))}</div></div></label></li>`).join('');
  const target = state.slug ? `the open post (<b>${esc(fieldValue('title_en') || state.slug)}</b>)` : 'a new draft post';
  let picked = null;
  const r = await modal({
    title: 'Draft from the game repo', wide: true,
    sub: `Merged since the last post, <b>${esc(ch.since_title)}</b> (${esc(niceDate(ch.since))}). Tick what the post should be about. Claude writes a short English draft into ${target}, using only what these PRs and commits say. You edit it after.`,
    html: `${ch.prs.length ? `<p class="group-label">MERGED PULL REQUESTS</p><ul class="change-list">${prItems}</ul>` : ''}
           ${ch.commits.length ? `<p class="group-label">COMMITS STRAIGHT ON MAIN</p><ul class="change-list">${cItems}</ul>` : ''}
           ${state.status.has_key ? '' : '<p class="sub" style="margin-top:14px;color:#f9a8d4">There is no Claude API key yet, so drafting is off. See devlog/README.md.</p>'}`,
    buttons: [{ text: 'Cancel', value: null }, { text: state.status.has_key ? '✦ Draft with Claude' : 'How to add a key', cls: 'primary', value: 'go',
      validate: (back) => {
        picked = {
          prs: [...back.querySelectorAll('[data-pr]:checked')].map((x) => ch.prs[+x.dataset.pr]),
          commits: [...back.querySelectorAll('[data-commit]:checked')].map((x) => ch.commits[+x.dataset.commit]),
        };
        if (state.status.has_key && !picked.prs.length && !picked.commits.length) { toast('Tick at least one item.', 'err'); return false; }
        return true;
      } }],
  });
  if (r !== 'go') return;
  if (!state.status.has_key) { noKeyBox(); return; }
  if (state.slug && state.editors.en.getContent({ format: 'text' }).trim()
    && !(await confirmBox('Replace the English body?', 'The open post already has English text. The draft replaces the English title, teaser, kicker and body.', 'Replace'))) return;
  busy('Claude is drafting the post… (this can take a minute or two)');
  let draft;
  try { draft = (await api('/api/draft', picked)).draft; } catch (e) { idle(); toast(e.message, 'err'); return; }
  idle();
  if (!state.slug) {
    try {
      const res = await api('/api/new', { title: decode(draft.title_en) });
      await loadList();
      await openPost(res.slug, true);
    } catch (e) { toast(e.message, 'err'); return; }
  }
  $('f-title_en').value = decode(draft.title_en);
  $('f-teaser_en').value = decode(draft.teaser_en);
  $('f-kicker').value = decode(draft.kicker);
  state.editors.en.setContent(toEditor(draft.body_en));
  recomputeDirty();
  toast('Draft is in. Read it, fix anything that is not quite right, add screenshots, then translate.', 'ok', 6000);
}

async function publish() {
  if (!state.slug) return;
  if (state.dirty && !(await save(true))) return;
  if ($('f-draft').checked) {
    infoBox('Still a draft', 'Switch off <b>Draft</b> (top right of the post) and save. Then publish.');
    return;
  }
  const ok = await confirmBox('Publish this post?',
    `This saves and builds the pages, then makes a git branch <code>devlog/${esc(state.slug)}-…</code> from where you are now, commits only the devlog files, pushes it and opens a pull request into <b>main</b>. Nothing goes live until you merge the PR on GitHub.`,
    'Publish');
  if (!ok) return;
  busy('Publishing: build, commit, push, pull request…');
  try {
    const res = await api('/api/publish/' + encodeURIComponent(state.slug), {});
    idle();
    if (res.blocked) {
      infoBox('Other changes are in the way',
        'Publish only commits devlog files, and these other files have uncommitted changes. Commit or stash them first (or ask Claude Code to), then try again.',
        `<pre>${esc(res.blocked.join('\n'))}</pre>`);
      return;
    }
    await infoBox('Pull request is open ✦',
      `Your post is on branch <code>${esc(res.branch)}</code>, and you're back on <code>${esc(res.back_on)}</code>. Merge the PR on GitHub to put it live. Until then this editor shows <code>${esc(res.back_on)}</code>'s copy of the devlog.`,
      res.url ? `<p><a class="btn primary big" href="${esc(res.url)}" target="_blank" rel="noopener">Open the pull request ↗</a></p><p class="sub">${esc(res.url)}</p>` : '');
    await refreshStatus();
    await loadList();
    if (state.posts.some((p) => p.slug === state.slug)) await openPost(state.slug, true);
    else { state.slug = null; $('postView').hidden = true; $('emptyView').hidden = false; setDirty(false); }
  } catch (e) {
    idle();
    infoBox('Publish stopped', 'Nothing was merged. Here is what git or gh said:', `<pre>${esc(e.message)}</pre>`);
  }
}

async function refreshStatus() {
  state.status = await api('/api/status');
  $('branch').textContent = state.status.branch;
  ['trEnHe', 'trHeEn', 'draftBtn'].forEach((id) => {
    $(id).title = state.status.has_key ? $(id).title.replace(/ \(needs.*$/, '') : $(id).title.replace(/ \(needs.*$/, '') + ' (needs a Claude API key)';
  });
}

// ── wiring ───────────────────────────────────────────────────────────────
async function main() {
  try { await refreshStatus(); } catch (e) { toast(e.message, 'err'); return; }
  await Promise.all(LANGS.map(initEditor));
  TEXT_FIELDS.concat(['when', 'draft']).forEach((f) => $('f-' + f).addEventListener('input', markDirty));
  $('f-draft').addEventListener('change', markDirty);
  $('saveBtn').addEventListener('click', () => save());
  $('previewEn').addEventListener('click', () => preview('en'));
  $('previewHe').addEventListener('click', () => preview('he'));
  $('trEnHe').addEventListener('click', () => translate('en2he'));
  $('trHeEn').addEventListener('click', () => translate('he2en'));
  $('draftBtn').addEventListener('click', draftFromRepo);
  $('publishBtn').addEventListener('click', publish);
  $('newBtn').addEventListener('click', newPost);
  $('deleteBtn').addEventListener('click', deletePost);
  const chooseBanner = async () => { const n = await pickImage('Banner image', state.banner); if (n) { state.banner = n; showPickers(); markDirty(); } };
  const chooseThumb = async () => { const n = await pickImage('Index thumbnail', state.thumb || state.banner); if (n) { state.thumb = n; showPickers(); markDirty(); } };
  $('pickBanner').addEventListener('click', chooseBanner);
  $('bannerChange').addEventListener('click', chooseBanner);
  $('pickThumb').addEventListener('click', chooseThumb);
  $('thumbChange').addEventListener('click', chooseThumb);
  $('thumbClear').addEventListener('click', () => { state.thumb = ''; showPickers(); markDirty(); });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });
  await loadList();
  const want = decodeURIComponent(location.hash.slice(1));
  if (want && state.posts.some((p) => p.slug === want)) await openPost(want, true);
  setDirty(false);
}

main();
