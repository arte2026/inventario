'use strict';
/* ---------- Idiomas / Languages ----------
   Detecta el idioma del navegador. Idiomas disponibles: es, en.
   Si el navegador no está en ninguno de los dos, se usa español.
   Para probar: añade ?lang=en o ?lang=es a la dirección de la página.
*/
const SUPPORTED_LANGS = ['es', 'en'];
const DEFAULT_LANG = 'es';

const browserLangs = () =>
  (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]).filter(Boolean);

const LANG = (() => {
  try {
    const forced = new URLSearchParams(location.search).get('lang');
    if (SUPPORTED_LANGS.includes(forced)) return forced;
  } catch (e) {}
  for (const l of browserLangs()) {
    const code = String(l).toLowerCase().slice(0, 2);
    if (SUPPORTED_LANGS.includes(code)) return code;
  }
  return DEFAULT_LANG;
})();

// Idioma para el reconocimiento y la voz (usa la variante regional del navegador si existe)
const VOICE_LANG = (() => {
  const m = browserLangs().find(l => String(l).toLowerCase().startsWith(LANG) && String(l).includes('-'));
  return m || (LANG === 'en' ? 'en-US' : 'es-MX');
})();

/* ---------- Palabras que se ignoran al buscar ---------- */
const STOP_WORDS = {
  es: ['de','del','la','el','los','las','un','una','unos','unas','y','en','cuanto','cuantos','cuanta','cuantas','hay','tengo','tenemos','quedan','queda','busca','buscar','buscame','dime','que','cual','para','mi','por','favor','a','con'],
  en: ['the','a','an','of','in','on','how','many','much','do','does','i','have','we','is','are','there','left','remain','remaining','search','find','show','me','tell','what','which','for','my','please','with','and','to','any','got','look','up']
};

/* ---------- Números hablados ---------- */
const NUMS_BY_LANG = {
  es: {cero:0,un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,docena:12,trece:13,catorce:14,quince:15,veinte:20,treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90,cien:100,ciento:100},
  en: {zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,dozen:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90}
};
// Números 16-19 en español (se escriben en una sola palabra)
Object.assign(NUMS_BY_LANG.es, {dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19});

/* ---------- Textos ---------- */
const I18N = {
  es: {
    appName: 'Almacén Fácil',
    appTitle: 'Almacén Fácil 📦',
    back: 'Volver',
    results: 'Resultados',
    myLists: 'Mis Listas 📋',
    product: 'producto',
    productShort: 'prod.',
    noLists: 'Todavía no hay listas.<br>Toque el botón azul de abajo para crear la primera.<br><small>Ejemplos: Ferretería, Bebidas, Papelería</small>',
    newList: '+ Nueva lista',
    micAll: '🔎 Busca Prod. con Voz',
    typeHere: 'O Escriba Aquí',
    searchBtn: 'Buscar',
    backup: '📱 Copia de Seguridad',
    listOpts: '✂ Opciones de la Lista',
    micList: '🔎 Buscar en la Lista con Voz',
    typeToSearch: 'o escriba para buscar',
    addProduct: '+ Agregar producto',
    listLabel: 'Lista: ',
    edit: 'Editar',
    removeOne: 'Quitar uno',
    addOne: 'Agregar uno',
    outBadge: 'Agotado',
    emptyStockState: 'No hay productos en este estado de stock.',
    emptyFilter: 'No hay nada que se llame así en esta lista.',
    emptyList: 'Esta lista está vacía.<br>Toque el botón verde de abajo para agregar el primer producto.',
    filterByStock: 'Filtrar por stock',
    all: 'Todos',
    low: 'Stock bajo',
    out: 'Agotado',
    searching: 'Buscando',
    noResults: 'No encontré nada con eso.<br>Pruebe decir solo el nombre, por ejemplo: “tornillos”.',
    searchAnother: 'Voz Buscar otra cosa',
    speak: 'Hablar',
    voice: 'Voz',
    save: 'Guardar',
    cancel: 'Cancelar',
    noCancel: 'No, cancelar',
    nameToast: 'Escriba o diga el nombre',
    productNameToast: 'Escriba o diga el nombre del producto',
    editProduct: 'Editar producto',
    newProduct: 'Nuevo producto',
    nameLabel: 'Nombre',
    qtyLabel: 'Cantidad',
    exampleName: 'Ej: Tornillos',
    sayName: 'Decir el nombre',
    sayQty: 'Decir la cantidad',
    saveAndAdd: 'Guardar y agregar otro',
    deleteProduct: 'Borrar producto',
    qtyNotUnderstood: 'No entendí el número. Use los botones + y −.',
    confirmDeleteItem: '¿Borrar “{name}”?',
    yesDelete: 'Sí, borrar',
    share: 'Enviar lista por mensaje',
    rename: 'Cambiar nombre de la lista',
    deleteList: 'Borrar esta lista',
    close: 'Cerrar',
    newListName: 'Nuevo nombre de la lista',
    confirmDeleteList: '¿Borrar la lista “{name}” y todo lo que tiene?',
    yesDeleteAll: 'Sí, borrar todo',
    copied: 'Lista copiada. Péguela en un mensaje.',
    shareFail: 'No se pudo enviar la lista.',
    backupTitle: 'Copia de seguridad',
    backupText: 'Guarde una copia por si se pierde el teléfono o se borra la información.',
    saveCopy: 'Guardar copia',
    loadCopy: 'Recuperar una copia',
    copySaved: 'Copia guardada en Descargas.',
    replaceConfirm: 'Esto reemplaza lo que hay ahora. ¿Continuar?',
    yesRestore: 'Sí, recuperar',
    restored: 'Copia recuperada.',
    invalidBackup: 'Ese archivo no es una copia válida.',
    saveFail: '⚠️ No se pudo guardar. Haga una copia de seguridad.',
    saySearch: 'Diga o escriba lo que busca',
    createList: 'Crea una Nueva Lista',
    typeName: 'Escribe el Nombre',
    noVoice: 'Este teléfono no permite usar la voz. Escriba en la caja.',
    micDenied: 'Hay que permitir el micrófono para usar la voz.',
    needsInternet: 'La voz necesita internet.',
    notUnderstood: 'No le entendí. Intente otra vez.',
    notHeard: 'No le escuché. Intente otra vez.',
    micFail: 'No se pudo activar el micrófono.',
    listening: 'Escuchando…<br>Hable ahora',
    sayNotFound: 'No encontré {q}',
    sayFound: 'Encontré {n}. ',
    sayNone: 'ya no queda',
    sayHave: 'hay {n}',
    sayInList: ', en la lista {name}'
  },
  en: {
    appName: 'Easy Warehouse',
    appTitle: 'Easy Warehouse 📦',
    back: 'Back',
    results: 'Results',
    myLists: 'My Lists 📋',
    product: 'product',
    productShort: 'prod.',
    noLists: 'There are no lists yet.<br>Tap the blue button below to create the first one.<br><small>Examples: Hardware, Drinks, Stationery</small>',
    newList: '+ New list',
    micAll: '🔎 Search Products by Voice',
    typeHere: 'Or Type Here',
    searchBtn: 'Search',
    backup: '📱 Backup',
    listOpts: '✂ List Options',
    micList: '🔎 Search the List by Voice',
    typeToSearch: 'or type to search',
    addProduct: '+ Add product',
    listLabel: 'List: ',
    edit: 'Edit',
    removeOne: 'Remove one',
    addOne: 'Add one',
    outBadge: 'Out of stock',
    emptyStockState: 'No products in this stock status.',
    emptyFilter: 'Nothing with that name in this list.',
    emptyList: 'This list is empty.<br>Tap the green button below to add the first product.',
    filterByStock: 'Filter by stock',
    all: 'All',
    low: 'Low stock',
    out: 'Out of stock',
    searching: 'Searching',
    noResults: 'I couldn’t find anything for that.<br>Try saying just the name, for example: “screws”.',
    searchAnother: 'Voice: Search for something else',
    speak: 'Speak',
    voice: 'Voice',
    save: 'Save',
    cancel: 'Cancel',
    noCancel: 'No, cancel',
    nameToast: 'Type or say the name',
    productNameToast: 'Type or say the product name',
    editProduct: 'Edit product',
    newProduct: 'New product',
    nameLabel: 'Name',
    qtyLabel: 'Quantity',
    exampleName: 'E.g.: Screws',
    sayName: 'Say the name',
    sayQty: 'Say the quantity',
    saveAndAdd: 'Save and add another',
    deleteProduct: 'Delete product',
    qtyNotUnderstood: 'I didn’t understand the number. Use the + and − buttons.',
    confirmDeleteItem: 'Delete “{name}”?',
    yesDelete: 'Yes, delete',
    share: 'Send list as a message',
    rename: 'Rename the list',
    deleteList: 'Delete this list',
    close: 'Close',
    newListName: 'New list name',
    confirmDeleteList: 'Delete the list “{name}” and everything in it?',
    yesDeleteAll: 'Yes, delete everything',
    copied: 'List copied. Paste it into a message.',
    shareFail: 'The list could not be sent.',
    backupTitle: 'Backup',
    backupText: 'Save a copy in case you lose your phone or your data gets erased.',
    saveCopy: 'Save backup',
    loadCopy: 'Restore a backup',
    copySaved: 'Backup saved to Downloads.',
    replaceConfirm: 'This will replace what you have now. Continue?',
    yesRestore: 'Yes, restore',
    restored: 'Backup restored.',
    invalidBackup: 'That file is not a valid backup.',
    saveFail: '⚠️ Could not save. Please make a backup.',
    saySearch: 'Say or type what you are looking for',
    createList: 'Create a New List',
    typeName: 'Type the Name',
    noVoice: 'This phone does not support voice input. Type in the box.',
    micDenied: 'You need to allow the microphone to use voice.',
    needsInternet: 'Voice needs an internet connection.',
    notUnderstood: 'I didn’t catch that. Please try again.',
    notHeard: 'I didn’t hear anything. Please try again.',
    micFail: 'Could not turn on the microphone.',
    listening: 'Listening…<br>Speak now',
    sayNotFound: 'I couldn’t find {q}',
    sayFound: 'I found {n}. ',
    sayNone: 'none left',
    sayHave: 'there are {n}',
    sayInList: ', in the list {name}'
  }
};

// tr('clave', {variable: valor}) devuelve el texto en el idioma actual
function tr(key, vars) {
  const s = (I18N[LANG] && I18N[LANG][key]) ?? I18N[DEFAULT_LANG][key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
}

// Traduce los textos fijos de index.html
function applyStaticI18n() {
  document.documentElement.lang = LANG;
  document.title = tr('appName');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = tr(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => { el.setAttribute('aria-label', tr(el.dataset.i18nAriaLabel)); });
}
applyStaticI18n();
