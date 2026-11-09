
'use strict';
/* ---------- Utilidades ---------- */
const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const collator = new Intl.Collator('es', {sensitivity: 'base'});

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
  catch (e) { toast('⚠️ No se pudo guardar. Haga una copia de seguridad.'); }
}
const getList = id => data.lists.find(l => l.id === id);

/* ---------- Búsqueda ---------- */
const STOP = new Set(['de','del','la','el','los','las','un','una','unos','unas','y','en','cuanto','cuantos','cuanta','cuantas','hay','tengo','tenemos','quedan','queda','busca','buscar','buscame','dime','que','cual','para','mi','por','favor','a','con']);
const plain = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
function stem(w) {
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
  if (!SR) { toast('Este teléfono no permite usar la voz. Escriba en la caja.'); return; }
  try { if (rec) rec.abort(); } catch (e) {}
  rec = new SR();
  rec.lang = 'es-MX';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  let got = false;
  rec.onresult = e => { got = true; onText(e.results[0][0].transcript.trim()); };
  rec.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Hay que permitir el micrófono para usar la voz.');
    else if (e.error === 'network') toast('La voz necesita internet.');
    else if (e.error !== 'aborted') toast('No le entendí. Intente otra vez.');
    got = true;
  };
  rec.onend = () => { $('#listen').hidden = true; if (!got) toast('No le escuché. Intente otra vez.'); };
  try { $('#listen').hidden = false; rec.start(); }
  catch (e) { $('#listen').hidden = true; toast('No se pudo activar el micrófono.'); }
}
$('#listen-cancel').onclick = () => { try { rec.abort(); } catch (e) {} $('#listen').hidden = true; };
function speak(t) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'es-MX'; u.rate = 0.9;
    speechSynthesis.speak(u);
  } catch (e) {}
}
function say(results, q) {
  if (!results.length) { speak('No encontré ' + q); return; }
  const parts = results.slice(0, 3).map(r => {
    const n = r.it.qty;
    return r.it.name + ': ' + (n === 0 ? 'ya no queda' : 'hay ' + n) + (r.l ? ', en la lista ' + r.l.name : '');
  });
  speak((results.length > 1 ? 'Encontré ' + results.length + '. ' : '') + parts.join('. ') + '.');
}
const NUMS = {cero:0,un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,docena:12,trece:13,catorce:14,quince:15,veinte:20,treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90,cien:100,ciento:100};
function parseQty(t) {
  const m = t.match(/\d+/);
  if (m) return parseInt(m[0], 10);
  let sum = 0, found = false;
  plain(t).split(' ').forEach(w => { if (w in NUMS) { sum += NUMS[w]; found = true; } });
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
function render() {
  const app = $('#app'), back = $('#back'), title = $('#title');
  if (view.name === 'list') {
    const l = getList(view.id);
    if (!l) { go({name: 'home'}, false); return; }
    title.textContent = l.name; back.hidden = false;
    app.innerHTML = listHTML(l);
  } else if (view.name === 'search') {
    title.textContent = 'Resultados'; back.hidden = false;
    app.innerHTML = searchHTML(view.q);
  } else {
    title.textContent = 'Mi Inventario 📜'; back.hidden = true;
    app.innerHTML = homeHTML();
  }
}
function homeHTML() {
  const ls = data.lists;
  return `
  
  <h2>Mis Listas :</h2>
  ${ls.length ? ls.map(l => `<button class="card" data-a="openlist" data-l="${l.id}"><span class="cn">${esc(l.name)}</span><span class="cs">${l.items.length} ${l.items.length === 1 ? 'producto' : 'productos'}</span></button>`).join('')
    : `<p class="empty">Todavía no hay listas.<br>Toque el botón azul de abajo para crear la primera.<br><small>Ejemplos: Ferretería, Bebidas, Papelería</small></p>`}
  <button class="big blue" data-a="newlist">+ Nueva lista</button>
  <button class="link" data-a="backup">Copia de seguridad</button>`;
}
function rowHTML(l, it, showList) {
  return `<div class="row">
    <div class="rowtop">
      <div class="iname">${esc(it.name)}${showList ? `<small>Lista: ${esc(l.name)}</small>` : ''}</div>
      <button class="ico" data-a="edit" data-l="${l.id}" data-i="${it.id}" aria-label="Editar">✏️</button>
    </div>
    <div class="qty">
      <button class="qb minus" data-a="dec" data-l="${l.id}" data-i="${it.id}" aria-label="Quitar uno">−</button>
      <span class="n ${it.qty <= 0 ? 'zero' : ''}">${it.qty}</span>
      <button class="qb plus" data-a="inc" data-l="${l.id}" data-i="${it.id}" aria-label="Agregar uno">+</button>
    </div>
  </div>`;
}
function itemsHTML(l) {
  const items = (filter ? matchItems(l.items, filter) : l.items.slice()).sort((a, b) => collator.compare(a.name, b.name));
  if (!items.length) {
    return filter ? `<p class="empty">No hay nada que se llame así en esta lista.</p>`
      : `<p class="empty">Esta lista está vacía.<br>Toque el botón verde de abajo para agregar el primer producto.</p>`;
  }
  return items.map(it => rowHTML(l, it, false)).join('');
}
function listHTML(l) {
  return `
  <button class="big green mic" data-a="miclist">🎤 Buscar en esta lista</button>
  <div class="inrow"><input id="f" type="search" placeholder="o escriba para buscar" autocomplete="off" value="${esc(filter)}"></div>
  <div id="items">${itemsHTML(l)}</div>
  <button class="link" data-a="listopts">Opciones de la lista</button>
  <button class="fab" data-a="add">+ Agregar producto</button>`;
}
function searchHTML(q) {
  const res = searchAll(q);
  return `
  <h2 style="margin-top:0">Buscando: “${esc(q)}”</h2>
  ${res.length ? res.map(r => rowHTML(r.l, r.it, true)).join('') : `<p class="empty">No encontré nada con eso.<br>Pruebe decir solo el nombre, por ejemplo: “tornillos”.</p>`}
  <button class="big green mic" data-a="micall">🎤 Buscar otra cosa</button>`;
}

/* ---------- Ventanas ---------- */
function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="sheet">${html}</div>`; m.hidden = false; }
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

function textModal(title, value, placeholder, onSave) {
  modal(`<h2>${esc(title)}</h2>
    <div class="inrow"><input id="m-text" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off"><button id="m-mic" aria-label="Hablar">🔊</button></div>
    <button class="big green" id="m-save">Guardar</button>
    <button class="big gray" id="m-cancel">Cancelar</button>`);
  $('#m-mic').onclick = () => listen(t => { $('#m-text').value = cap(t); });
  $('#m-cancel').onclick = closeModal;
  $('#m-save').onclick = () => {
    const v = cap($('#m-text').value.trim());
    if (!v) { toast('Escriba o diga el nombre'); return; }
    onSave(v);
  };
}
function confirmModal(msg, okLabel, onOk) {
  modal(`<h2>${esc(msg)}</h2>
    <button class="big red" id="m-ok">${esc(okLabel)}</button>
    <button class="big gray" id="m-cancel">No, cancelar</button>`);
  $('#m-cancel').onclick = closeModal;
  $('#m-ok').onclick = () => { closeModal(); onOk(); };
}
function itemModal(l, it) {
  modal(`<h2>${it ? 'Editar producto' : 'Nuevo producto'}</h2>
    <label>Nombre</label>
    <div class="inrow"><input id="m-name" value="${it ? esc(it.name) : ''}" placeholder="Ej: Tornillos" autocomplete="off"><button id="m-mic" aria-label="Decir el nombre">🎤</button></div>
    <label>Cantidad</label>
    <div class="qty">
      <button class="qb minus" id="m-minus">−</button>
      <input id="m-qty" type="number" inputmode="numeric" min="0" value="${it ? it.qty : 1}">
      <button class="qb plus" id="m-plus">+</button>
      <button id="m-qmic" style="background:var(--blue)" aria-label="Decir la cantidad">🎤</button>
    </div>
    <button class="big green" id="m-save">Guardar</button>
    ${it ? '' : '<button class="big blue" id="m-save2">Guardar y agregar otro</button>'}
    ${it ? '<button class="big red" id="m-del">Borrar producto</button>' : ''}
    <button class="big gray" id="m-cancel">Cancelar</button>`);
  const q = $('#m-qty');
  const getQ = () => { const n = parseInt(q.value, 10); return isNaN(n) || n < 0 ? 0 : n; };
  $('#m-minus').onclick = () => { q.value = Math.max(0, getQ() - 1); };
  $('#m-plus').onclick = () => { q.value = getQ() + 1; };
  $('#m-mic').onclick = () => listen(t => { $('#m-name').value = cap(t); });
  $('#m-qmic').onclick = () => listen(t => {
    const n = parseQty(t);
    if (n === null) toast('No entendí el número. Use los botones + y −.'); else q.value = n;
  });
  $('#m-cancel').onclick = closeModal;
  const commit = again => {
    const name = cap($('#m-name').value.trim());
    if (!name) { toast('Escriba o diga el nombre del producto'); return; }
    if (it) { it.name = name; it.qty = getQ(); }
    else l.items.push({id: uid(), name, qty: getQ()});
    save(); closeModal(); render();
    if (again) itemModal(l, null);
  };
  $('#m-save').onclick = () => commit(false);
  if (!it) $('#m-save2').onclick = () => commit(true);
  if (it) $('#m-del').onclick = () => confirmModal('¿Borrar “' + it.name + '”?', 'Sí, borrar', () => {
    l.items = l.items.filter(x => x.id !== it.id); save(); render();
  });
}
function listOptions(l) {
  modal(`<h2>${esc(l.name)}</h2>
    <button class="big blue" id="o-share">Enviar lista por mensaje</button>
    <button class="big blue" id="o-rename">Cambiar nombre de la lista</button>
    <button class="big red" id="o-del">Borrar esta lista</button>
    <button class="big gray" id="o-close">Cerrar</button>`);
  $('#o-close').onclick = closeModal;
  $('#o-share').onclick = () => { closeModal(); shareList(l); };
  $('#o-rename').onclick = () => textModal('Nuevo nombre de la lista', l.name, 'Nombre', v => { l.name = v; save(); closeModal(); render(); });
  $('#o-del').onclick = () => confirmModal('¿Borrar la lista “' + l.name + '” y todo lo que tiene?', 'Sí, borrar todo', () => {
    data.lists = data.lists.filter(x => x.id !== l.id); save(); go({name: 'home'});
  });
}
async function shareList(l) {
  const text = l.name + '\n' + l.items.slice().sort((a, b) => collator.compare(a.name, b.name)).map(i => '• ' + i.name + ': ' + i.qty).join('\n');
  if (navigator.share) {
    try { await navigator.share({title: l.name, text}); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(text); toast('Lista copiada. Péguela en un mensaje.'); }
  catch (e) { toast('No se pudo enviar la lista.'); }
}
function backupModal() {
  modal(`<h2>Copia de seguridad</h2>
    <p>Guarde una copia por si se pierde el teléfono o se borra la información.</p>
    <button class="big blue" id="b-save">Guardar copia</button>
    <button class="big blue" id="b-load">Recuperar una copia</button>
    <input id="b-file" type="file" accept=".json,application/json" hidden>
    <button class="big gray" id="b-close">Cerrar</button>`);
  $('#b-close').onclick = closeModal;
  $('#b-save').onclick = () => {
    const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inventario-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Copia guardada en Descargas.');
  };
  $('#b-load').onclick = () => $('#b-file').click();
  $('#b-file').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || !Array.isArray(d.lists)) throw 0;
        confirmModal('Esto reemplaza lo que hay ahora. ¿Continuar?', 'Sí, recuperar', () => { data = d; save(); go({name: 'home'}); toast('Copia recuperada.'); });
      } catch (err) { toast('Ese archivo no es una copia válida.'); }
    };
    r.readAsText(f);
  };
}

/* ---------- Acciones ---------- */
function doSearch(q, byVoice) {
  q = (q || '').trim();
  if (!q) { toast('Diga o escriba lo que busca'); return; }
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
      textModal('Crea una Nueva Lista', '', 'Escribe el Nombre', v => {
        const l = {id: uid(), name: v, items: []};
        data.lists.push(l); save(); go({name: 'list', id: l.id});
      });
      break;
    case 'micall': listen(t => doSearch(t, true)); break;
    case 'searchall': doSearch($('#q').value, false); break;
    case 'miclist': listen(t => {
      filter = t;
      const l = getList(view.id); render();
      say(matchItems(l.items, t).map(it => ({it})), t);
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