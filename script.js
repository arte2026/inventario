'use strict';
/* ---------- Utilidades ---------- */
const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const collator = new Intl.Collator(LANG, {sensitivity: 'base'});

/* ---------- Datos (se guardan en el teléfono) ---------- */
const KEY = 'inventario_v1';
let data = load();
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.lists)) return d;
  } catch (e) {}
  return {v: 1, lists: []};
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); }
  catch (e) { toast(tr('saveFail')); }
}
const getList = id => data.lists.find(l => l.id === id);

/* ---------- Búsqueda ---------- */
const STOP = new Set(STOP_WORDS[LANG]);
const plain = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
function stem(w) {
  if (LANG === 'en') {
    if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.length > 4 && /(s|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  }
  if (w.length > 4 && w.endsWith('es')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}
const norm = s => plain(s).split(' ').map(stem).join(' ');
function tokens(q) {
  const all = norm(q).split(' ').filter(Boolean);
  const t = all.filter(w => !STOP.has(w));
  return t.length ? t : all;
}
function matchItems(items, q) {
  const t = tokens(q);
  if (!t.length) return items.slice();
  return items.filter(it => { const n = norm(it.name); return t.every(w => n.includes(w)); });
}
function searchAll(q) {
  const out = [];
  data.lists.forEach(l => matchItems(l.items, q).forEach(it => out.push({l, it})));
  out.sort((a, b) => collator.compare(a.it.name, b.it.name));
  return out;
}

/* ---------- Voz ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
function listen(onText) {
  if (!SR) { toast(tr('noVoice')); return; }
  try { if (rec) rec.abort(); } catch (e) {}
  rec = new SR();
  rec.lang = VOICE_LANG;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  let got = false;
  rec.onresult = e => { got = true; onText(e.results[0][0].transcript.trim()); };
  rec.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast(tr('micDenied'));
    else if (e.error === 'network') toast(tr('needsInternet'));
    else if (e.error !== 'aborted') toast(tr('notUnderstood'));
    got = true;
  };
  rec.onend = () => { $('#listen').hidden = true; if (!got) toast(tr('notHeard')); };
  try { $('#listen').hidden = false; rec.start(); }
  catch (e) { $('#listen').hidden = true; toast(tr('micFail')); }
}
$('#listen-cancel').onclick = () => { try { rec.abort(); } catch (e) {} $('#listen').hidden = true; };
function speak(t) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = VOICE_LANG; u.rate = 0.9;
    speechSynthesis.speak(u);
  } catch (e) {}
}
function say(results, q) {
  if (!results.length) { speak(tr('sayNotFound', {q})); return; }
  const parts = results.slice(0, 3).map(r => {
    const n = r.it.qty;
    return r.it.name + ': ' + (n === 0 ? tr('sayNone') : tr('sayHave', {n})) + (r.l ? tr('sayInList', {name: r.l.name}) : '');
  });
  speak((results.length > 1 ? tr('sayFound', {n: results.length}) : '') + parts.join('. ') + '.');
}
const NUMS = NUMS_BY_LANG[LANG];
function parseQty(t) {
  const m = t.match(/\d+/);
  if (m) return parseInt(m[0], 10);
  let sum = 0, found = false;
  plain(t).split(' ').forEach(w => {
    if (w === 'hundred') { sum = (sum || 1) * 100; found = true; }
    else if (Object.prototype.hasOwnProperty.call(NUMS, w)) { sum += NUMS[w]; found = true; }
  });
  return found ? sum : null;
}

/* ---------- Navegación ---------- */
let view = {name: 'home'};
let filter = '';
function go(v, push = true) {
  view = v; filter = '';
  if (push) history.pushState(v, '');
  closeModal();
  render();
  window.scrollTo(0, 0);
}
window.addEventListener('popstate', e => { view = e.state || {name: 'home'}; filter = ''; closeModal(); render(); });
history.replaceState(view, '');

/* ---------- Pantallas ---------- */
const themeMeta = document.querySelector('meta[name="theme-color"]');
const themeMain = themeMeta ? themeMeta.content : '';
function render() {
  const app = $('#app'), back = $('#back'), title = $('#title');
  // Cambia los colores (encabezado) según la pantalla: la clase la usa style.css
  document.body.classList.toggle('list-view', view.name === 'list');
  if (themeMeta) {
    const hdr = getComputedStyle(document.body).getPropertyValue('--header-bg').trim();
    themeMeta.content = (view.name === 'list' && hdr) ? hdr : themeMain;
  }
  if (view.name === 'list') {
    const l = getList(view.id);
    if (!l) { go({name: 'home'}, false); return; }
    title.textContent = l.name; back.hidden = false;
    app.innerHTML = listHTML(l);
  } else if (view.name === 'search') {
    title.textContent = tr('results'); back.hidden = false;
    app.innerHTML = searchHTML(view.q);
  } else {
    title.textContent = tr('appTitle'); back.hidden = true;
    app.innerHTML = homeHTML();
  }
}
function homeHTML() {
  const ls = data.lists;
  return `
  <h2>${tr('myLists')}</h2>
  ${ls.length ? ls.map(l => `<button class="card" data-a="openlist" data-l="${l.id}"><span class="cn">${esc(l.name)}</span><span class="cs">${l.items.length} ${l.items.length === 1 ? tr('product') : tr('productShort')}</span></button>`).join('')
    : `<p class="empty">${tr('noLists')}</p>`}
  <button class="big blue" data-a="newlist">${tr('newList')}</button>

<button class="big blue2 mic" data-a="micall">${tr('micAll')}</button>
  <div class="inrow"><input id="q" type="search" enterkeyhint="search" placeholder="${tr('typeHere')}" autocomplete="off"><button data-a="searchall">${tr('searchBtn')}</button></div>

  <button class="link" data-a="backup">${tr('backup')}</button>`;
}
function rowHTML(l, it, showList) {
  return `<div class="row">
    <div class="rowtop">
      <div class="iname">${esc(it.name)}${showList ? `<small>${tr('listLabel')}${esc(l.name)}</small>` : ''}</div>
      <button class="ico" data-a="edit" data-l="${l.id}" data-i="${it.id}" aria-label="${tr('edit')}">✏️</button>
    </div>
    <div class="qty">
      <button class="qb minus" data-a="dec" data-l="${l.id}" data-i="${it.id}" aria-label="${tr('removeOne')}">−</button>
      <span class="n ${it.qty <= 0 ? 'zero' : ''}">${it.qty}</span>
      <button class="qb plus" data-a="inc" data-l="${l.id}" data-i="${it.id}" aria-label="${tr('addOne')}">+</button>
    </div>
  </div>`;
}
function itemsHTML(l) {
  const items = (filter ? matchItems(l.items, filter) : l.items.slice()).sort((a, b) => collator.compare(a.name, b.name));
  if (!items.length) {
    return filter ? `<p class="empty">${tr('emptyFilter')}</p>`
      : `<p class="empty">${tr('emptyList')}</p>`;
  }
  return items.map(it => rowHTML(l, it, false)).join('');
}
function listHTML(l) {
  return `
   <button class="link2" data-a="listopts">${tr('listOpts')}</button>
  <button class="big green mic" data-a="miclist">${tr('micList')}</button>
  <div class="inrow"><input id="f" type="search" placeholder="${tr('typeToSearch')}" autocomplete="off" value="${esc(filter)}"></div>
  <div id="items">${itemsHTML(l)}</div>
 
  <button class="fab" data-a="add">${tr('addProduct')}</button>`;
}
function searchHTML(q) {
  const res = searchAll(q);
  return `
  <h2 style="margin-top:0">${tr('searching')}: “${esc(q)}”</h2>
  ${res.length ? res.map(r => rowHTML(r.l, r.it, true)).join('') : `<p class="empty">${tr('noResults')}</p>`}
  <button class="big green mic" data-a="micall">${tr('searchAnother')}</button>`;
}

/* ---------- Ventanas ---------- */
function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="sheet">${html}</div>`; m.hidden = false; }
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

function textModal(title, value, placeholder, onSave) {
  modal(`<h2>${esc(title)}</h2>
    <div class="inrow"><input id="m-text" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off"><button id="m-mic" aria-label="${tr('speak')}">${tr('voice')}</button></div>
    <button class="big blue" id="m-save">${tr('save')}</button>
    <button class="big gray" id="m-cancel">${tr('cancel')}</button>`);
  $('#m-mic').onclick = () => listen(t => { $('#m-text').value = cap(t); });
  $('#m-cancel').onclick = closeModal;
  $('#m-save').onclick = () => {
    const v = cap($('#m-text').value.trim());
    if (!v) { toast(tr('nameToast')); return; }
    onSave(v);
  };
}
function confirmModal(msg, okLabel, onOk) {
  modal(`<h2>${esc(msg)}</h2>
    <button class="big red" id="m-ok">${esc(okLabel)}</button>
    <button class="big gray" id="m-cancel">${tr('noCancel')}</button>`);
  $('#m-cancel').onclick = closeModal;
  $('#m-ok').onclick = () => { closeModal(); onOk(); };
}
function itemModal(l, it) {
  modal(`<h2>${it ? tr('editProduct') : tr('newProduct')}</h2>
    <label>${tr('nameLabel')}</label>
    <div class="inrow"><input id="m-name" value="${it ? esc(it.name) : ''}" placeholder="${tr('exampleName')}" autocomplete="off"><button id="m-mic" aria-label="${tr('sayName')}">${tr('voice')}</button></div>
    <label>${tr('qtyLabel')}</label>
    <div class="qty">
      <button class="qb minus" id="m-minus">−</button>
      <input id="m-qty" type="number" inputmode="numeric" min="0" value="${it ? it.qty : 1}">
      <button class="qb plus" id="m-plus">+</button>
      <button id="m-qmic" style="background:var(--md-on-tertiary)" aria-label="${tr('sayQty')}">${tr('voice')}</button>
    </div>
    <button class="big green" id="m-save">${tr('save')}</button>
    ${it ? '' : `<button class="big green" id="m-save2">${tr('saveAndAdd')}</button>`}
    ${it ? `<button class="big red" id="m-del">${tr('deleteProduct')}</button>` : ''}
    <button class="big gray" id="m-cancel">${tr('cancel')}</button>`);
  const q = $('#m-qty');
  const getQ = () => { const n = parseInt(q.value, 10); return isNaN(n) || n < 0 ? 0 : n; };
  $('#m-minus').onclick = () => { q.value = Math.max(0, getQ() - 1); };
  $('#m-plus').onclick = () => { q.value = getQ() + 1; };
  $('#m-mic').onclick = () => listen(t => { $('#m-name').value = cap(t); });
  $('#m-qmic').onclick = () => listen(t => {
    const n = parseQty(t);
    if (n === null) toast(tr('qtyNotUnderstood')); else q.value = n;
  });
  $('#m-cancel').onclick = closeModal;
  const commit = again => {
    const name = cap($('#m-name').value.trim());
    if (!name) { toast(tr('productNameToast')); return; }
    if (it) { it.name = name; it.qty = getQ(); }
    else l.items.push({id: uid(), name, qty: getQ()});
    save(); closeModal(); render();
    if (again) itemModal(l, null);
  };
  $('#m-save').onclick = () => commit(false);
  if (!it) $('#m-save2').onclick = () => commit(true);
  if (it) $('#m-del').onclick = () => confirmModal(tr('confirmDeleteItem', {name: it.name}), tr('yesDelete'), () => {
    l.items = l.items.filter(x => x.id !== it.id); save(); render();
  });
}
function listOptions(l) {
  modal(`<h2>${esc(l.name)}</h2>
    <button class="big blue" id="o-share">${tr('share')}</button>
    <button class="big blue" id="o-rename">${tr('rename')}</button>
    <button class="big red" id="o-del">${tr('deleteList')}</button>
    <button class="big gray" id="o-close">${tr('close')}</button>`);
  $('#o-close').onclick = closeModal;
  $('#o-share').onclick = () => { closeModal(); shareList(l); };
  $('#o-rename').onclick = () => textModal(tr('newListName'), l.name, tr('nameLabel'), v => { l.name = v; save(); closeModal(); render(); });
  $('#o-del').onclick = () => confirmModal(tr('confirmDeleteList', {name: l.name}), tr('yesDeleteAll'), () => {
    data.lists = data.lists.filter(x => x.id !== l.id); save(); go({name: 'home'});
  });
}
async function shareList(l) {
  const text = l.name + '\n' + l.items.slice().sort((a, b) => collator.compare(a.name, b.name)).map(i => '• ' + i.name + ': ' + i.qty).join('\n');
  if (navigator.share) {
    try { await navigator.share({title: l.name, text}); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(text); toast(tr('copied')); }
  catch (e) { toast(tr('shareFail')); }
}
function backupModal() {
  modal(`<h2>${tr('backupTitle')}</h2>
    <p>${tr('backupText')}</p>
    <button class="big blue" id="b-save">${tr('saveCopy')}</button>
    <button class="big blue" id="b-load">${tr('loadCopy')}</button>
    <input id="b-file" type="file" accept=".json,application/json" hidden>
    <button class="big gray" id="b-close">${tr('close')}</button>`);
  $('#b-close').onclick = closeModal;
  $('#b-save').onclick = () => {
    const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inventario-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(tr('copySaved'));
  };
  $('#b-load').onclick = () => $('#b-file').click();
  $('#b-file').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || !Array.isArray(d.lists)) throw 0;
        confirmModal(tr('replaceConfirm'), tr('yesRestore'), () => { data = d; save(); go({name: 'home'}); toast(tr('restored')); });
      } catch (err) { toast(tr('invalidBackup')); }
    };
    r.readAsText(f);
  };
}

/* ---------- Acciones ---------- */
function doSearch(q, byVoice) {
  q = (q || '').trim();
  if (!q) { toast(tr('saySearch')); return; }
  go({name: 'search', q});
  if (byVoice) say(searchAll(q), q);
}
function changeQty(listId, itemId, delta) {
  const l = getList(listId), it = l && l.items.find(i => i.id === itemId);
  if (!it) return;
  it.qty = Math.max(0, it.qty + delta);
  save(); render();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b) return;
  const d = b.dataset;
  switch (d.a) {
    case 'back': go({name: 'home'}); break;
    case 'openlist': go({name: 'list', id: d.l}); break;
    case 'newlist':
      textModal(tr('createList'), '', tr('typeName'), v => {
        const l = {id: uid(), name: v, items: []};
        data.lists.push(l); save(); go({name: 'list', id: l.id});
      });
      break;
    case 'micall': listen(t => doSearch(t, true)); break;
    case 'searchall': doSearch($('#q').value, false); break;
    case 'sfilter':
      stockFilter = d.sf || 'all';
      render();
      break;
    case 'miclist': listen(t => {
      filter = t;
      const l = getList(view.id);
      render();
      say(matchItems(l.items, t).map(it => ({l, it})), t);
    }); break;
    case 'add': itemModal(getList(view.id), null); break;
    case 'edit': { const l = getList(d.l); itemModal(l, l.items.find(i => i.id === d.i)); break; }
    case 'inc': changeQty(d.l, d.i, 1); break;
    case 'dec': changeQty(d.l, d.i, -1); break;
    case 'listopts': listOptions(getList(view.id)); break;
    case 'backup': backupModal(); break;
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'f' && view.name === 'list') {
    filter = e.target.value;
    $('#items').innerHTML = itemsHTML(getList(view.id));
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'q') doSearch(e.target.value, false);
});

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
}

try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
render();

//WELCOME
try {
    if (sessionStorage.getItem("welcomeSeen")) {
      document.documentElement.classList.add("skip-welcome");
    }
  } catch (e) {}
// WELCOME: shown once per session (flag is set in sessionStorage)
  (function () {
    var screenEl = document.getElementById("welcomeScreen");
    if (!screenEl) return;
    if (document.documentElement.classList.contains("skip-welcome")) {
      screenEl.style.display = "none";
      return;
    }
    screenEl.addEventListener("click", function () {
      try { sessionStorage.setItem("welcomeSeen", "1"); } catch (e) {}
      screenEl.classList.add("fade-out");
      setTimeout(function () { screenEl.style.display = "none"; }, 900);
    });
  })();

  let stockFilter = 'all'; // 'all' | 'low' | 'out'
const LOW_THRESHOLD = 3;

const isOut = it => Number(it.qty) <= 0;
const isLow = it => {
  const q = Number(it.qty);
  const limit = typeof it.minQty === 'number' ? it.minQty : LOW_THRESHOLD;
  return q > 0 && q <= limit;
};

function go(v, push = true) {
  view = v;
  filter = '';
  stockFilter = 'all';
  if (push) history.pushState(v, '');
  closeModal();
  render();
  window.scrollTo(0, 0);
}