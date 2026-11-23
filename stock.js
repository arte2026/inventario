function render() {
  const app = $('#app'), back = $('#back'), title = $('#title'), spacer = $('#headerSpacer');
  document.body.classList.toggle('list-view', view.name === 'list');
  if (themeMeta) {
    const hdr = getComputedStyle(document.body).getPropertyValue('--header-bg').trim();
    themeMeta.content = (view.name === 'list' && hdr) ? hdr : themeMain;
  }
  if (view.name === 'list') {
    const l = getList(view.id);
    if (!l) { go({name: 'home'}, false); return; }
    title.textContent = l.name;
    back.hidden = false;
    if (spacer) spacer.hidden = false;
    app.innerHTML = listHTML(l);
  } else if (view.name === 'search') {
    title.textContent = tr('results');
    back.hidden = false;
    if (spacer) spacer.hidden = false;
    app.innerHTML = searchHTML(view.q);
  } else {
    title.textContent = tr('appTitle');
    back.hidden = true;
    if (spacer) spacer.hidden = true;
    app.innerHTML = homeHTML();
  }
}

function rowHTML(l, it, showList) {
  const out = isOut(it);
  const low = !out && isLow(it);
  const rowCls = out ? 'row out-stock' : (low ? 'row low-stock' : 'row');
  const numCls = out ? 'n zero' : (low ? 'n low' : 'n');
  const badge = out
    ? `<span class="stock-badge out">${tr('outBadge')}</span>`
    : (low ? `<span class="stock-badge low">⛔</span>` : '');

  return `<div class="${rowCls}" data-item-id="${esc(it.id)}">
    <div class="rowtop">
      <div class="iname">${esc(it.name)}${badge}${showList ? `<small>${tr('listLabel')}${esc(l.name)}</small>` : ''}</div>
      <button class="ico" data-a="edit" data-l="${l.id}" data-i="${it.id}" aria-label="${tr('edit')}">✏️</button>
    </div>
    <div class="qty">
      <button class="qb minus" data-a="dec" data-l="${l.id}" data-i="${it.id}" aria-label="${tr('removeOne')}">−</button>
      <span class="${numCls}">${it.qty}</span>
      <button class="qb plus" data-a="inc" data-l="${l.id}" data-i="${it.id}" aria-label="${tr('addOne')}">+</button>
    </div>
  </div>`;
}

function itemsHTML(l) {
  let items = filter ? matchItems(l.items, filter) : l.items.slice();
  if (stockFilter === 'low') items = items.filter(isLow);
  if (stockFilter === 'out') items = items.filter(isOut);
  items.sort((a, b) => collator.compare(a.name, b.name));

  if (!items.length) {
    if (stockFilter !== 'all') {
      return `<p class="empty">${tr('emptyStockState')}</p>`;
    }
    return filter
      ? `<p class="empty">${tr('emptyFilter')}</p>`
      : `<p class="empty">${tr('emptyList')}</p>`;
  }
  return items.map(it => rowHTML(l, it, false)).join('');
}

function listHTML(l) {
  const lowCount = l.items.filter(isLow).length;
  const outCount = l.items.filter(isOut).length;
  return `
    <button class="link2" data-a="listopts">${tr('listOpts')}</button>
    <button class="big green mic" data-a="miclist">${tr('micList')}</button>
    <div class="inrow"><input id="f" type="search" placeholder="${tr('typeToSearch')}" autocomplete="off" value="${esc(filter)}"></div>
    <div class="chip-row" role="group" aria-label="${tr('filterByStock')}">
      <button class="chip ${stockFilter === 'all' ? 'active' : ''}" data-a="sfilter" data-sf="all">${tr('all')} (${l.items.length})</button>
      <button class="chip warn ${stockFilter === 'low' ? 'active' : ''}" data-a="sfilter" data-sf="low">${tr('low')} (${lowCount})</button>
      <button class="chip warn ${stockFilter === 'out' ? 'active' : ''}" data-a="sfilter" data-sf="out">${tr('out')} (${outCount})</button>
    </div>
    <div id="items">${itemsHTML(l)}</div>
    <button class="fab" data-a="add">${tr('addProduct')}</button>`;
}

function changeQty(listId, itemId, delta) {
  const l = getList(listId), it = l && l.items.find(i => i.id === itemId);
  if (!it) return;
  it.qty = Math.max(0, it.qty + delta);
  save();
  render();
  const el = document.querySelector(`[data-item-id="${CSS.escape(itemId)}"] .n`);
  if (el) {
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 200);
  }
}