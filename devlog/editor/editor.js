/* Devlog editor – client. Talks to devlog/editor.py; no frameworks.
   Hebrew-first and Hebrew-only: Alex writes Hebrew; the English side is translated by Claude on the server
   (on Publish, or on "Preview in English"). The UI is Hebrew and right-to-left. */
'use strict';

const $ = (id) => document.getElementById(id);
const TOKEN = document.querySelector('meta[name="editor-token"]')?.content || '';

const TEXT_FIELDS = ['kicker', 'kicker_short', 'title_he', 'teaser_he', 'banner_alt_he', 'banner_caption_he'];
const ACTION_IDS = ['previewEn', 'previewHe', 'publishBtn'];

const state = {
  status: { has_key: false, icons: {} },
  posts: [],
  view: null,                  // null | 'post' | 'intro'
  slug: null,
  post: null,                  // the post object as stored in posts.json
  banner: '', thumb: '',
  raw: { he: '', intro: '' },      // HTML as stored (tokens, original formatting)
  baseline: { he: '', intro: '' }, // editor.getContent() right after loading/saving
  intro: null,                 // { description_he }
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
  try { res = await fetch(path, opts); } catch (e) { throw new Error('שרת העורך לא עונה. האם editor.py עדיין רץ?'); }
  let data = {};
  try { data = await res.json(); } catch (e) { /* not JSON */ }
  if (!res.ok || data.ok === false) {
    const err = new Error(data.error || `הבקשה נכשלה (${res.status})`);
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

// Hebrew-style dates: "15 באוק׳ 2026 · 21:28"
const MONTHS = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
function niceDate(when) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(when || '');
  return m ? `${+m[3]} ב${MONTHS[+m[2] - 1]} ${m[1]} · ${m[4]}` : '';
}
const ltr = (s) => `<bdi dir="ltr">${esc(s)}</bdi>`;

function toast(msg, kind = 'ok', ms) {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.dir = 'auto';
  t.textContent = msg;
  $('toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms || (kind === 'err' ? 8000 : 2600));
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
    const first = back.querySelector('input:not([type=checkbox]):not([type=file]), textarea');
    (first || row.lastElementChild)?.focus();
  });
}
const confirmBox = (title, sub, okText = 'אישור', danger = false) =>
  modal({ title, sub, danger, buttons: [{ text: 'ביטול', value: false }, { text: okText, value: true, cls: danger ? 'danger-btn' : 'primary' }] });
const infoBox = (title, sub, html = '') => modal({ title, sub, html, buttons: [{ text: 'סגירה', cls: 'primary' }] });

function noKeyBox(what = 'התרגום לאנגלית והטיוטה מהמשחק משתמשים') {
  return infoBox('צריך מפתח API של Claude',
    `${what} ב־API של Claude, ועדיין אין מפתח. כל השאר בעורך עובד גם בלעדיו.`,
    `<p class="sub">צרו את הקובץ <code>devlog/.env</code> עם השורה הזאת, ואז הפעילו את העורך מחדש:</p>
     <pre>ANTHROPIC_API_KEY=sk-ant-...</pre>
     <p class="sub">את המפתח מקבלים ב־<code>platform.claude.com</code>, תחת API keys. הקובץ <code>.env</code> נמצא ב־<code>.gitignore</code>, כך שהוא אף פעם לא נכנס ל־commit.</p>`);
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
function bodyForSave(key) {
  const cur = state.editors[key].getContent();
  return cur === state.baseline[key] ? state.raw[key] : fromEditor(cur);
}
function setBody(key, raw) {
  const ed = state.editors[key];
  state.loading = true;
  ed.setContent(toEditor(raw));
  ed.undoManager.clear();
  state.baseline[key] = ed.getContent();
  state.loading = false;
}

// ── dirty tracking ───────────────────────────────────────────────────────
let dirtyTimer = null;
function markDirty() {
  if (state.loading || !state.view) return;
  clearTimeout(dirtyTimer);
  dirtyTimer = setTimeout(recomputeDirty, 150);
}
function fieldValue(name) { return $('f-' + name).value; }
function recomputeDirty() {
  let d = false;
  if (state.view === 'post' && state.post) {
    const p = state.post;
    d = TEXT_FIELDS.some((f) => fieldValue(f) !== decode(p[f] || ''));
    d = d || $('f-when').value !== (p.when || '').slice(0, 16);
    d = d || $('f-draft').checked !== !!p.draft;
    d = d || state.banner !== (p.banner || '') || state.thumb !== (p.thumb || '');
    d = d || state.editors.he.getContent() !== state.baseline.he;
  } else if (state.view === 'intro' && state.intro) {
    d = fieldValue('desc_he') !== state.intro.description_he || state.editors.intro.getContent() !== state.baseline.intro;
  }
  setDirty(d);
}
function setDirty(d) {
  state.dirty = d;
  const s = $('saveState');
  s.className = 'save-state ' + (d ? 'dirty' : 'clean');
  s.querySelector('.txt').textContent = !state.view ? 'אין פוסט פתוח' : d ? 'יש שינויים שלא נשמרו' : 'הכול נשמר';
  $('saveBtn').disabled = !state.view;
}
window.addEventListener('beforeunload', (e) => {
  recomputeDirty();
  if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
});

function showEnStatus(id, current) {
  const el = $(id);
  el.classList.toggle('stale', !current);
  el.querySelector('.txt').textContent = current
    ? 'הגרסה האנגלית מעודכנת. היא נוצרת אוטומטית מהעברית, אין צורך לערוך אותה.'
    : 'העברית השתנתה: הגרסה האנגלית תתורגם אוטומטית בפרסום, או עכשיו ב„תצוגה מקדימה באנגלית”.';
}

// ── posts list ───────────────────────────────────────────────────────────
async function loadList() {
  const { posts } = await api('/api/posts');
  state.posts = posts;
  const ul = $('postList');
  ul.innerHTML = '';
  if (!posts.length) ul.innerHTML = '<li class="sub">עדיין אין פוסטים.</li>';
  posts.forEach((p) => {
    const li = document.createElement('li');
    li.className = 'post-item' + (state.view === 'post' && p.slug === state.slug ? ' active' : '');
    li.dataset.slug = p.slug;
    const title = p.title_he ? `<span dir="auto">${esc(decode(p.title_he))}</span>` : (p.title_en ? `<span dir="auto">${esc(decode(p.title_en))}</span>` : ltr(p.slug));
    li.innerHTML = `${p.thumb ? `<img src="/img/${encodeURIComponent(p.thumb)}" alt="" loading="lazy" />` : '<span class="noimg"></span>'}
      <div><div class="meta-line">${p.draft ? '<span class="badge">טיוטה</span>' : `<span class="num" dir="ltr">#${p.n}</span>`}<span>${esc(niceDate(p.when))}</span></div>
      <div class="t">${title}</div></div>`;
    li.addEventListener('click', () => openPost(p.slug));
    ul.appendChild(li);
  });
}
function markActive() {
  document.querySelectorAll('.post-item').forEach((li) => li.classList.toggle('active', state.view === 'post' && li.dataset.slug === state.slug));
  $('introBtn').classList.toggle('active', state.view === 'intro');
}

async function leaveOk() {
  recomputeDirty();
  if (!state.dirty) return true;
  const r = await modal({
    title: 'יש שינויים שלא נשמרו', sub: state.view === 'intro' ? 'בכותרת היומן יש שינויים שעוד לא נשמרו.' : 'בפוסט הזה יש שינויים שעוד לא נשמרו.',
    buttons: [{ text: 'ביטול', value: 'cancel' }, { text: 'לזרוק אותם', value: 'discard', cls: 'danger-btn' }, { text: 'לשמור קודם', value: 'save', cls: 'primary' }],
  });
  if (r === 'save') return await save();
  return r === 'discard';
}

function showView(view) {
  state.view = view;
  $('emptyView').hidden = view !== null;
  $('postView').hidden = view !== 'post';
  $('introView').hidden = view !== 'intro';
  ACTION_IDS.forEach((id) => { $(id).disabled = view === null; });
  markActive();
}

async function openPost(slug, force = false) {
  if (!force && !(state.view === 'post' && slug === state.slug) && !(await leaveOk())) return;
  const data = await api('/api/post/' + encodeURIComponent(slug));
  state.slug = slug;
  state.post = data.post;
  state.raw.he = data.body_he;
  state.loading = true;
  TEXT_FIELDS.forEach((f) => { $('f-' + f).value = decode(data.post[f] || ''); });
  $('f-when').value = (data.post.when || '').slice(0, 16);
  $('f-draft').checked = !!data.post.draft;
  state.banner = data.post.banner || '';
  state.thumb = data.post.thumb || '';
  showPickers();
  showView('post');
  setBody('he', state.raw.he);
  state.loading = false;
  const entry = state.posts.find((p) => p.slug === slug);
  $('postNum').textContent = entry && entry.n ? `DEVLOG #${entry.n} · ${slug}` : `DRAFT · ${slug}`;
  showEnStatus('postEn', data.en_current);
  setDirty(false);
  history.replaceState(null, '', '#' + slug);
}

async function openIntro(force = false) {
  if (!force && state.view !== 'intro' && !(await leaveOk())) return;
  const data = await api('/api/intro');
  state.intro = { description_he: data.description_he };
  state.raw.intro = data.he;
  state.slug = null; state.post = null;
  state.loading = true;
  $('f-desc_he').value = data.description_he;
  showView('intro');
  setBody('intro', data.he);
  state.loading = false;
  showEnStatus('introEn', data.en_current);
  setDirty(false);
  history.replaceState(null, '', '#intro');
}

function closeView() {
  state.slug = null; state.post = null; state.intro = null;
  showView(null);
  setDirty(false);
  history.replaceState(null, '', location.pathname);
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
  return { post: meta, body_he: bodyForSave('he') };      // English is never sent: it's made from the Hebrew
}

let saving = null;
async function save(quiet = false) {
  if (!state.view) return false;
  if (saving) return saving;
  saving = (async () => {
    try {
      if (state.view === 'intro') {
        const payload = { he: bodyForSave('intro').replace(/\n+$/, ''), description_he: fieldValue('desc_he') };
        const res = await api('/api/intro', payload);
        state.raw.intro = payload.he;
        state.baseline.intro = state.editors.intro.getContent();
        state.intro.description_he = payload.description_he;
        showEnStatus('introEn', res.en_current);
      } else {
        const payload = collect();
        const res = await api('/api/post/' + encodeURIComponent(state.slug), payload);
        state.post = res.post;
        state.raw.he = payload.body_he;
        state.baseline.he = state.editors.he.getContent();
        // reflect normalised values (e.g. the stored date) without marking anything dirty
        $('f-when').value = (res.post.when || '').slice(0, 16);
        showEnStatus('postEn', res.en_current);
        await loadList();
      }
      recomputeDirty();
      if (!quiet) toast('נשמר');
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
    r.onerror = () => reject(new Error('לא הצלחתי לקרוא את ' + file.name));
    r.readAsDataURL(file);
  });
}
async function uploadFile(file) {
  if (!/^image\/(png|gif|jpeg|webp)$/.test(file.type)) throw new Error(`${file.name}: אפשר להוסיף רק תמונות PNG, GIF, JPG או WEBP.`);
  if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} שוקל ${(file.size / 1048576).toFixed(1)} MB, והמגבלה היא 5 MB.`);
  const res = await api('/api/upload', { name: file.name, data: await readAsBase64(file) });
  toast('נוספה התמונה ' + res.name);
  return res.name;
}

/** Pick (or upload) an image. Resolves to a file name, or null. */
function pickImage(title, current) {
  return new Promise((resolve) => {
    let chosen = current || null;
    modal({
      title, wide: true,
      sub: 'התמונות נמצאות ב־<code>docs/assets/images/devlog/</code>. לחיצה על תמונה בוחרת אותה, ואפשר גם להוסיף חדשה.',
      html: `<div class="lib-tools"><label class="btn">העלאת תמונה…<input type="file" accept="image/png,image/gif,image/jpeg,image/webp" multiple hidden /></label>
             <div class="drop">…או לגרור לכאן קובצי תמונה (PNG, GIF, JPG, WEBP, עד 5 MB)</div></div><div class="lib-grid"></div>`,
      buttons: [{ text: 'ביטול', value: null }, { text: 'להשתמש בתמונה הזאת', cls: 'primary', value: 'use' }],
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

async function screenshotDialog(ed) {
  const name = await pickImage('צילום מסך לגוף הפוסט');
  if (!name) return;
  let alt = '', cap = '';
  const r = await modal({
    title: 'פרטי צילום המסך',
    html: `<div class="fig-preview"><img src="/img/${encodeURIComponent(name)}" alt="" />
      <div><label class="field"><span>כיתוב (מתחת לתמונה)</span><input id="m-cap" placeholder="כיתוב…" /></label>
      <label class="field"><span>טקסט חלופי (לקוראי מסך)</span><input id="m-alt" value="${esc(altFromName(name))}" /></label></div></div>`,
    buttons: [{ text: 'ביטול', value: null }, { text: 'הוספה', cls: 'primary', value: 'ok',
      validate: (back) => { alt = back.querySelector('#m-alt').value; cap = back.querySelector('#m-cap').value; return true; } }],
  });
  if (r !== 'ok') return;
  ed.focus();
  ed.insertContent(figureHtml(name, alt, cap || 'כיתוב…'));
  markDirty();
}

async function insertDroppedImages(ed, files) {
  for (const f of files) {
    try {
      const name = await uploadFile(f);
      ed.insertContent(figureHtml(name, altFromName(name), 'כיתוב…'));
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
    title: 'כרטיס מספר',
    body: { type: 'panel', items: [
      { type: 'input', name: 'label', label: 'תווית (טקסט פיקסלים קטן, באנגלית: BYTES SAVED)' },
      { type: 'input', name: 'value', label: 'ערך (טקסט גדול, למשל 1,872)' },
      { type: 'selectbox', name: 'colour', label: 'צבע', items: [{ text: 'ורוד', value: 'pink' }, { text: 'תכלת', value: 'cyan' }] },
      { type: 'htmlpanel', html: '<p style="opacity:.7;font-size:12px">כרטיסים סמוכים חולקים שורה אחת (עד 4). כדי להוסיף כרטיס לשורה קיימת, שימו את הסמן בתוכה.</p>' },
    ] },
    initialData: { label: '', value: '', colour: 'pink' },
    buttons: [{ type: 'cancel', text: 'ביטול' }, { type: 'submit', text: 'הוספה', primary: true }],
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
  if (!p) { toast('קודם שימו את הסמן בתוך פסקה.', 'err'); return; }
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
// TinyMCE's own menus and dialogs in Hebrew (pinned community language pack).
const TINYMCE_HE = 'https://cdn.jsdelivr.net/npm/tinymce-i18n@25.6.2/langs7/he_IL.js';

/** key: 'he' (post body) or 'intro' (index header). Both are Hebrew, right-to-left. */
function initEditor(key) {
  const intro = key === 'intro';
  return tinymce.init({
    target: $(intro ? 'intro-he' : 'body-he'),
    license_key: 'gpl',
    skin: 'oxide-dark',
    content_css: ['dark', 'https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&family=Press+Start+2P&display=swap'],
    content_style: CONTENT_STYLE,
    directionality: 'rtl',
    language: 'he_IL',
    language_url: TINYMCE_HE,
    height: intro ? 520 : 760,
    min_height: 360,
    resize: true,
    menubar: false,
    branding: false,
    promotion: false,
    statusbar: true,
    elementpath: false,
    plugins: 'lists link autolink code',
    toolbar: intro ? 'undo redo | bold italic dlcode | link | code'
      : 'undo redo | dlh2 bold italic dlcode | link bullist | dlshot dlicon dltile dllead | code',
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
      state.editors[key] = ed;
      ed.ui.registry.addToggleButton('dlh2', {
        text: 'H2', tooltip: 'כותרת פרק',
        onAction: () => ed.execCommand('mceToggleFormat', false, 'h2'),
        onSetup: (api) => { const off = ed.formatter.formatChanged('h2', (s) => api.setActive(s)); return () => off.unbind(); },
      });
      ed.ui.registry.addToggleButton('dlcode', {
        icon: 'sourcecode', tooltip: 'קוד (בתוך השורה)',
        onAction: () => ed.formatter.toggle('dlcode'),
        onSetup: (api) => { const off = ed.formatter.formatChanged('dlcode', (s) => api.setActive(s)); return () => off.unbind(); },
      });
      ed.ui.registry.addButton('dlshot', { icon: 'image', text: 'צילום מסך', tooltip: 'הוספת צילום מסך עם כיתוב', onAction: () => screenshotDialog(ed) });
      ed.ui.registry.addMenuButton('dlicon', {
        text: 'אייקון', tooltip: 'אייקון פיקסלים (נכנס לתחילת הכותרת שהסמן בתוכה)',
        fetch: (cb) => cb(Object.keys(state.status.icons).map((n) => ({ type: 'menuitem', text: n, icon: 'dl-' + n, onAction: () => insertIcon(ed, n) }))),
      });
      ed.ui.registry.addButton('dltile', { text: '# כרטיס', tooltip: 'כרטיס מספר', onAction: () => tileDialog(ed) });
      ed.ui.registry.addButton('dllead', { text: 'פתיח', tooltip: 'להפוך את הפסקה לפתיח (שורת פתיחה גדולה יותר)', onAction: () => toggleLead(ed) });
      Object.keys(state.status.icons).forEach((n) => ed.ui.registry.addIcon('dl-' + n, iconSvg(n, 'currentColor', 18)));

      ed.on('init', () => {
        ed.formatter.register('dlcode', { inline: 'code', classes: 'text-cyan-300' });
        // the site's Tailwind, so the body looks like the real page while writing
        const d = ed.getDoc();
        const s = d.createElement('script');
        s.src = 'https://cdn.tailwindcss.com';
        d.head.appendChild(s);
        d.body.setAttribute('lang', 'he');
      });
      ed.on('input change undo redo ExecCommand KeyUp SetContent', markDirty);
      ed.addShortcut('meta+s', 'שמירה', () => save());
      ed.on('drop', (e) => {
        const files = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'));
        if (!files.length) return;
        e.preventDefault();
        insertDroppedImages(ed, files);
      });
      ed.on('paste', (e) => {
        const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
        if (!files.length) return;
        e.preventDefault();
        insertDroppedImages(ed, files);
      });
    },
  });
}

// ── actions ──────────────────────────────────────────────────────────────
function stamp() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, '0');
  return `post-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}`;
}
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');

async function newPost() {
  if (!(await leaveOk())) return null;
  let req = null;
  const fallback = stamp();
  const r = await modal({
    title: 'פוסט חדש',
    sub: 'כותרת עבודה בעברית. אפשר לשנות אותה אחר כך.',
    html: `<label class="field"><span>כותרת</span><input id="m-title" placeholder="הבוס נכנס לחדר" /></label>
      <label class="field"><span>כתובת הדף (slug) <em class="hint">באנגלית בלבד: אותיות קטנות, ספרות ומקפים. אי אפשר לשנות אותה אחרי היצירה.</em></span>
        <input id="m-slug" dir="ltr" lang="en" value="${fallback}" spellcheck="false" /></label>
      <p class="slug-preview" id="m-path">docs/devlog-${fallback}.html</p>`,
    buttons: [{ text: 'ביטול', value: null }, { text: 'יצירת טיוטה', cls: 'primary', value: 'ok',
      validate: (back) => {
        const title = back.querySelector('#m-title').value.trim();
        const slug = slugify(back.querySelector('#m-slug').value);
        if (!title) { toast('קודם כותבים כותרת.', 'err'); return false; }
        if (!slug) { toast('ה־slug צריך לפחות אות או ספרה אחת באנגלית.', 'err'); return false; }
        req = { title_he: title, slug };
        return true;
      } }],
    onOpen: (back) => {
      const inp = back.querySelector('#m-slug');
      inp.addEventListener('input', () => { back.querySelector('#m-path').textContent = `docs/devlog-${slugify(inp.value) || '…'}.html`; });
    },
  });
  if (r !== 'ok') return null;
  try {
    const res = await api('/api/new', req);
    await loadList();
    await openPost(res.slug, true);
    toast('הטיוטה נוצרה. היא לא תופיע באתר עד שתכבו את המתג „טיוטה”.');
    return res.slug;
  } catch (e) { toast(e.message, 'err'); return null; }
}

async function deletePost() {
  if (state.view !== 'post') return;
  const title = fieldValue('title_he') || decode(state.post.title_en) || state.slug;
  const ok = await confirmBox('למחוק את הפוסט?',
    `„${esc(title)}” ושני קובצי הגוף שלו (עברית ואנגלית) יימחקו${state.post.draft ? '' : ', והדפים שלו יוסרו מהאתר בפרסום הבא'}. התמונות נשארות בספרייה. אי אפשר לבטל את זה מהעורך (ב־git עדיין יש את ה־commit האחרון).`,
    'מחיקת הפוסט', true);
  if (!ok) return;
  try {
    await api('/api/delete/' + encodeURIComponent(state.slug), {});
    closeView();
    await loadList();
    toast('הפוסט נמחק');
  } catch (e) { toast(e.message, 'err'); }
}

function pageUrl(lang) {
  const prefix = lang === 'en' ? 'en/' : '';
  const q = lang === 'en' ? '?en-notice=1' : '';
  if (state.view === 'intro') return `/site/${prefix}devlog.html${q}`;
  return state.post.draft ? `/site/${prefix}__preview-${state.slug}.html` : `/site/${prefix}devlog-${state.slug}.html${q}`;
}

async function preview(lang) {
  if (!state.view) return;
  const win = window.open('about:blank', '_blank');     // open now, so the popup blocker lets it through
  if (!(await save(true))) { win && win.close(); return; }
  try {
    if (lang === 'en') {
      const stale = $(state.view === 'intro' ? 'introEn' : 'postEn').classList.contains('stale');
      if (stale && !state.status.has_key) { win && win.close(); noKeyBox('התרגום לאנגלית משתמש'); return; }
      busy(stale ? 'Claude מתרגם לאנגלית… (זה יכול לקחת דקה)' : 'בונה את הדפים…');
      const res = await api('/api/preview-en', state.view === 'intro' ? { intro: true } : { slug: state.slug });
      showEnStatus(state.view === 'intro' ? 'introEn' : 'postEn', true);
      if (res.translated) toast('הגרסה האנגלית תורגמה מחדש מהעברית.');
    } else {
      busy('בונה את הדפים…');
      await api('/api/build', {});
    }
    const url = pageUrl(lang);
    if (win) win.location = url; else window.open(url, '_blank');
    if (state.view === 'post' && state.post.draft) toast('נפתחה תצוגה מקדימה של הטיוטה (טיוטות אף פעם לא נכתבות לאתר).');
  } catch (e) { win && win.close(); toast(e.message, 'err'); } finally { idle(); }
}

async function draftFromRepo() {
  busy('קורא את ה־repo של המשחק (git log ו־PR־ים שמוזגו)…');
  let ch;
  try { ch = await api('/api/repo-changes'); } catch (e) { idle(); toast(e.message, 'err'); return; }
  idle();
  if (!ch.prs.length && !ch.commits.length) {
    infoBox('אין שום דבר חדש ב־repo של המשחק', `לא מוזג כלום מאז הפוסט האחרון שפורסם („${esc(decode(ch.since_title))}”, ${esc(niceDate(ch.since))}).`);
    return;
  }
  const prItems = ch.prs.map((p, i) => `<li><label><input type="checkbox" data-pr="${i}" checked />
      <div><div class="c-title" dir="auto">${ltr('#' + p.number)} ${esc(p.title)}</div><div class="c-meta">מוזג ${esc(niceDate(p.mergedAt))} (UTC)</div>
      <div class="c-body" dir="auto">${esc((p.body || '').slice(0, 400))}</div></div></label></li>`).join('');
  const cItems = ch.commits.map((c, i) => `<li><label><input type="checkbox" data-commit="${i}" />
      <div><div class="c-title" dir="auto">${esc(c.subject)}</div><div class="c-meta"><code>${esc(c.short)}</code> · ${esc(niceDate(c.when))}</div></div></label></li>`).join('');
  const target = state.view === 'post' ? `לפוסט הפתוח (<b>${esc(fieldValue('title_he') || state.slug)}</b>)` : 'לפוסט טיוטה חדש';
  let picked = null;
  const r = await modal({
    title: 'טיוטה מהמשחק', wide: true,
    sub: `מה שמוזג מאז הפוסט האחרון, <b>${esc(decode(ch.since_title))}</b> (${esc(niceDate(ch.since))}). סמנו על מה הפוסט יהיה. Claude כותב טיוטה קצרה בעברית ${target}, רק ממה שכתוב ב־PR־ים וב־commit־ים האלה. אחר כך אתם עורכים.`,
    html: `${ch.prs.length ? `<p class="group-label">PR־ים שמוזגו</p><ul class="change-list">${prItems}</ul>` : ''}
           ${ch.commits.length ? `<p class="group-label">commit־ים ישירות על main</p><ul class="change-list">${cItems}</ul>` : ''}
           ${state.status.has_key ? '' : '<p class="sub" style="margin-top:14px;color:#f9a8d4">עדיין אין מפתח API של Claude, אז הטיוטה כבויה. ההסבר ב־devlog/README.md.</p>'}`,
    buttons: [{ text: 'ביטול', value: null }, { text: state.status.has_key ? '✦ טיוטה עם Claude' : 'איך מוסיפים מפתח', cls: 'primary', value: 'go',
      validate: (back) => {
        picked = {
          prs: [...back.querySelectorAll('[data-pr]:checked')].map((x) => ch.prs[+x.dataset.pr]),
          commits: [...back.querySelectorAll('[data-commit]:checked')].map((x) => ch.commits[+x.dataset.commit]),
        };
        if (state.status.has_key && !picked.prs.length && !picked.commits.length) { toast('סמנו לפחות פריט אחד.', 'err'); return false; }
        return true;
      } }],
  });
  if (r !== 'go') return;
  if (!state.status.has_key) { noKeyBox(); return; }
  if (state.view === 'post' && state.editors.he.getContent({ format: 'text' }).trim()
    && !(await confirmBox('להחליף את הטקסט?', 'בפוסט הפתוח כבר יש טקסט. הטיוטה תחליף את הכותרת, התקציר, ה־kicker והגוף.', 'להחליף'))) return;
  if (state.view === 'intro' && !(await leaveOk())) return;
  busy('Claude כותב את הטיוטה… (זה יכול לקחת דקה או שתיים)');
  let draft;
  try { draft = (await api('/api/draft', picked)).draft; } catch (e) { idle(); toast(e.message, 'err'); return; }
  idle();
  if (state.view !== 'post') {
    try {
      const res = await api('/api/new', { title_he: decode(draft.title_he), slug: slugify(draft.slug) || stamp(), dedupe: true });
      await loadList();
      await openPost(res.slug, true);
    } catch (e) { toast(e.message, 'err'); return; }
  }
  $('f-title_he').value = decode(draft.title_he);
  $('f-teaser_he').value = decode(draft.teaser_he);
  $('f-kicker').value = decode(draft.kicker);
  state.editors.he.setContent(toEditor(draft.body_he));
  recomputeDirty();
  toast('הטיוטה בפנים. קראו אותה, תקנו מה שלא מדויק, הוסיפו צילומי מסך ושמרו.', 'ok', 6000);
}

async function publish() {
  if (!state.view) return;
  if (state.dirty && !(await save(true))) return;
  const intro = state.view === 'intro';
  if (!intro && $('f-draft').checked) {
    infoBox('זו עדיין טיוטה', 'כבו את המתג <b>טיוטה</b> (בראש הפוסט) ושמרו. אחר כך מפרסמים.');
    return;
  }
  const stale = $(intro ? 'introEn' : 'postEn').classList.contains('stale');
  const ok = await confirmBox(intro ? 'לפרסם את כותרת היומן?' : 'לפרסם את הפוסט?',
    `${stale ? 'קודם Claude מתרגם לאנגלית את מה שהשתנה בעברית. ' : ''}אחר כך העורך שומר ובונה את הדפים, פותח branch בשם <code>devlog/${esc(intro ? 'index-header' : state.slug)}-…</code> מהמקום שבו אתם נמצאים, עושה commit רק לקובצי היומן, דוחף אותו ופותח PR אל <b>main</b>. שום דבר לא עולה לאוויר עד שממזגים את ה־PR ב־GitHub.`,
    'פרסום');
  if (!ok) return;
  busy(stale ? 'מפרסם: תרגום לאנגלית, בנייה, commit, push ו־PR…' : 'מפרסם: בנייה, commit, push ו־PR…');
  try {
    const res = await api(intro ? '/api/publish-intro' : '/api/publish/' + encodeURIComponent(state.slug), {});
    idle();
    if (res.blocked) {
      infoBox('יש שינויים אחרים בדרך',
        'הפרסום עושה commit רק לקובצי היומן, ובקבצים האלה יש שינויים שלא נכנסו ל־commit. תעשו להם commit או stash קודם (או תבקשו מ־Claude Code), ואז נסו שוב.',
        `<pre>${esc(res.blocked.join('\n'))}</pre>`);
      return;
    }
    await infoBox('ה־PR פתוח ✦',
      `הפרסום נמצא ב־branch <code>${esc(res.branch)}</code>, ואתם חזרה על <code>${esc(res.back_on)}</code>. כדי שזה יעלה לאתר ממזגים את ה־PR ב־GitHub. עד אז העורך מציג את העותק של היומן שב־<code>${esc(res.back_on)}</code>.`,
      res.url ? `<p><a class="btn primary big" href="${esc(res.url)}" target="_blank" rel="noopener">לפתוח את ה־PR ↗</a></p><p class="sub"><bdi dir="ltr">${esc(res.url)}</bdi></p>` : '');
    await refreshStatus();
    await loadList();
    if (intro) await openIntro(true);
    else if (state.posts.some((p) => p.slug === state.slug)) await openPost(state.slug, true);
    else closeView();
  } catch (e) {
    idle();
    infoBox('הפרסום נעצר', 'שום דבר לא מוזג. זה מה שקרה:', `<pre dir="auto">${esc(e.message)}</pre>`);
  }
}

async function refreshStatus() {
  state.status = await api('/api/status');
  $('branch').textContent = state.status.branch;
  const btn = $('draftBtn');
  btn.title = btn.title.replace(/ \(צריך.*$/, '') + (state.status.has_key ? '' : ' (צריך מפתח API של Claude)');
}

// ── wiring ───────────────────────────────────────────────────────────────
async function main() {
  try { await refreshStatus(); } catch (e) { toast(e.message, 'err'); return; }
  await Promise.all(['he', 'intro'].map(initEditor));
  TEXT_FIELDS.concat(['when', 'draft', 'desc_he']).forEach((f) => $('f-' + f).addEventListener('input', markDirty));
  $('f-draft').addEventListener('change', markDirty);
  $('saveBtn').addEventListener('click', () => save());
  $('previewHe').addEventListener('click', () => preview('he'));
  $('previewEn').addEventListener('click', () => preview('en'));
  $('draftBtn').addEventListener('click', draftFromRepo);
  $('publishBtn').addEventListener('click', publish);
  $('newBtn').addEventListener('click', newPost);
  $('introBtn').addEventListener('click', () => openIntro());
  $('deleteBtn').addEventListener('click', deletePost);
  const chooseBanner = async () => { const n = await pickImage('תמונת באנר', state.banner); if (n) { state.banner = n; showPickers(); markDirty(); } };
  const chooseThumb = async () => { const n = await pickImage('תמונה ממוזערת לאינדקס', state.thumb || state.banner); if (n) { state.thumb = n; showPickers(); markDirty(); } };
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
  if (want === 'intro') await openIntro(true);
  else if (want && state.posts.some((p) => p.slug === want)) await openPost(want, true);
  setDirty(false);
}

main();
