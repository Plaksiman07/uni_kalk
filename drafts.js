// Черновики заказов. Открытый заказ лежит в spCombo2, сохранённые черновики — в spDrafts ({ id: заказ }).
// Разделы калькуляторов заказа лежат в localStorage под ключами «…@combo:<id>», фото — в IndexedDB «photos@combo:<id>»,
// номер сделки — в spComboLead2:<id>. Поэтому несколько заказов живут рядом, не мешая друг другу.
(function () {
  const KEY = 'spDrafts', CUR = 'spCombo2';
  const CALC_IDS = ['uni', 'uni2', 'zebra', 'zebra2', 'mesh', 'plisse', 'vsn', 'vert', 'horiz', 'pleat'];
  const get = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const num = v => parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')) || 0;
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };

  const leadOf = st => { try { return Number(localStorage.getItem('spComboLead2:' + st.id)) || 0; } catch (e) { return 0; } };
  // черновик — заказ с содержимым, ещё не отправленный в amoCRM, или отправленный и потом изменённый
  function state(st) {
    if (!st || !st.id) return '';
    const c = st.client || {};
    if (leadOf(st)) return st.sentSig && st.sig && st.sig !== st.sentSig ? 'changed' : '';
    return ((st.parts || []).length || (st.services || []).length || c.clientName || c.orderNumber || c.clientPhone) ? 'draft' : '';
  }
  function summary(st) {
    const c = st.client || {};
    let pcs = 0, sum = 0;
    (st.services || []).forEach(x => { sum += num(x.price); });
    (st.parts || []).forEach(id => { const s = st.sum && st.sum[id]; if (!s) return; (s.items || []).forEach(it => { pcs += Number(it.qty) || 1; }); sum += Number(s.prices && s.prices[st.priceSel || 'base']) || 0; });
    const title = c.orderNumber ? 'Заказ № ' + c.orderNumber : (c.clientName || 'Заказ без номера');
    const sub = [c.orderNumber ? c.clientName : '', pcs ? pcs + ' ' + plural(pcs, 'изделие', 'изделия', 'изделий') : 'изделий пока нет'].filter(Boolean).join(' · ');
    return { title, sub, pcs, sum, changed: state(st) === 'changed', when: st.savedAt || 0 };
  }
  const list = () => get(KEY) || {};
  // сохранить заказ в черновики (если в нём есть что сохранять)
  function stash(st) {
    if (!state(st)) return false;
    const all = list();
    const copy = JSON.parse(JSON.stringify(st)); copy.savedAt = Date.now();
    all[st.id] = copy;
    return put(KEY, all);
  }
  // достать черновик: он становится открытым заказом и уходит из списка
  function take(id) {
    const all = list(), st = all[id];
    if (!st) return null;
    delete all[id]; put(KEY, all);
    return st;
  }
  function idbDel(db, key) {
    return new Promise(res => { try { const r = indexedDB.open(db, 1); r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => { try { const t = r.result.transaction('kv', 'readwrite'); t.objectStore('kv').delete(key); t.oncomplete = t.onerror = () => { r.result.close(); res(); }; } catch (e) { res(); } };
      r.onerror = () => res(); } catch (e) { res(); } });
  }
  // стереть данные заказа: разделы калькуляторов, фото, связь со сделкой (сама сделка в amoCRM остаётся)
  async function dropData(id, keepLead) {
    try { Object.keys(localStorage).filter(k => k.endsWith('@combo:' + id)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    if (!keepLead) try { localStorage.removeItem('spComboLead2:' + id); } catch (e) {}
    await Promise.all(CALC_IDS.map(n => idbDel(n + 'CalcPhotos', 'photos@combo:' + id)));
  }
  // удалить черновик насовсем (и открытый, и сохранённый)
  async function remove(id) {
    const all = list();
    if (all[id]) { delete all[id]; put(KEY, all); }
    const cur = get(CUR);
    if (cur && cur.id === id) { try { localStorage.removeItem(CUR); } catch (e) {} }
    await dropData(id);
  }
  // все черновики для экрана: открытый первым, остальные — по дате сохранения
  function all() {
    const out = [];
    const cur = get(CUR);
    if (state(cur)) out.push(Object.assign({ id: cur.id, active: true }, summary(cur)));
    Object.values(list()).filter(st => st && st.id && (!cur || st.id !== cur.id))
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)).forEach(st => out.push(Object.assign({ id: st.id, active: false }, summary(st))));
    return out;
  }
  window.SPDrafts = { CALC_IDS, state, summary, list, stash, take, dropData, remove, all };
})();
