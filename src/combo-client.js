
    // === Общий заказ: изделия из разных калькуляторов в одном заказе ===
    // Хранится в браузере: localStorage «spCombo» (данные клиента и части заказа), IndexedDB «spComboFiles» (PDF частей).
    const COMBO_KEY = 'spCombo';
    const COMBO_CLIENT = ['orderNumber', 'clientName', 'clientPhone', 'clientAddress', 'prepay', 'orderNote'];
    const COMBO_STATE_KEYS = { uni: 'uniCalcState12', uni2: 'uni2CalcState1', zebra: 'zebraCalcState1', zebra2: 'zebra2CalcState1',
      mesh: 'meshCalcState1', plisse: 'plisseCalcState1', vert: 'vertCalcState1', horiz: 'horizCalcState1' };
    const comboGet = () => { try { const c = JSON.parse(localStorage.getItem(COMBO_KEY) || 'null'); return c && c.active ? c : null; } catch (e) { return null; } };
    const comboSet = c => { try { localStorage.setItem(COMBO_KEY, JSON.stringify(c)); return true; } catch (e) { alert('Не удалось сохранить общий заказ: ' + e.message); return false; } };
    function comboDb() {
      return new Promise((res, rej) => {
        const r = indexedDB.open('spComboFiles', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('f');
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
    }
    async function comboPutFile(key, blob) {
      const db = await comboDb();
      await new Promise((res, rej) => { const tx = db.transaction('f', 'readwrite'); tx.objectStore('f').put(blob, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    }
    const comboClientRead = () => Object.fromEntries(COMBO_CLIENT.map(id => [id, (document.getElementById(id) || {}).value || '']));
    // «Отпечаток» расчёта: если он изменился после добавления — часть в общем заказе устарела
    function comboSig() {
      const d = window.calcData || {};
      return JSON.stringify([d.priceBase, d.price7, d.price12, d.priceB2B, d.noInstall, (d.items || []).map(it => [it.n, it.room, amoItemText(it)])]);
    }
    function comboSnapshot() {
      const d = window.calcData;
      const stateKey = COMBO_STATE_KEYS[AMO_CALC_ID];
      let state = null, extra = null;
      try { state = localStorage.getItem(stateKey); extra = localStorage.getItem(SP_EXTRA_KEY); } catch (e) {}
      return {
        calcId: AMO_CALC_ID, calcName: AMO_CALC_NAME, pipeline: AMO_PIPELINE, page: location.pathname.split('/').pop() || (AMO_CALC_ID + '.html'),
        stateKey, state, extraKey: SP_EXTRA_KEY, extra, at: Date.now(), sig: comboSig(),
        prices: { base: d.priceBase, discount7: d.price7, discount12: d.price12, b2b: d.priceB2B },
        labels: { discount7: discountLabel('discount7'), discount12: discountLabel('discount12') },
        noInstall: !!d.noInstall, details: amoDetails(), fields: amoFields(), tags: amoTags(),
        items: (d.items || []).map(it => ({ n: it.n, room: it.room || '', text: amoItemText(it), field: amoItemField(it), qty: it.qty,
          w: it.lineWeight != null ? it.lineWeight : (it.lineCost || 0) }))
      };
    }

    // кнопка и плашка
    const comboBtn = document.createElement('button');
    comboBtn.type = 'button'; comboBtn.id = 'comboBtn'; comboBtn.className = 'btn-action btn-combo';
    const comboStatus = document.createElement('div'); comboStatus.className = 'amo-status'; comboStatus.id = 'comboStatus';
    amoBtn.insertAdjacentElement('beforebegin', comboBtn);
    comboBtn.insertAdjacentElement('afterend', comboStatus);
    const comboBanner = document.createElement('div'); comboBanner.className = 'combo-banner';
    const ui = document.getElementById('calculatorUI');
    if (ui) ui.insertAdjacentElement('afterbegin', comboBanner);

    function comboRender() {
      const c = comboGet(), part = c && c.parts[AMO_CALC_ID];
      const stale = part && part.sig !== comboSig();
      comboBtn.textContent = !part ? '🧺 Добавить в общий заказ' : stale ? '🔄 Обновить в общем заказе' : '✓ В общем заказе — обновить';
      comboBtn.classList.toggle('stale', !!stale);
      if (!c) { comboBanner.innerHTML = ''; return; }
      const names = Object.values(c.parts).map(p => p.calcName);
      comboBanner.innerHTML = `<div class="cb-main">🧺 <b>Общий заказ${c.client.orderNumber ? ' № ' + esc(c.client.orderNumber) : ''}</b>${c.client.clientName ? ' · ' + esc(c.client.clientName) : ''}
        <div class="cb-sub">${names.length ? 'В заказе: ' + esc(names.join(', ')) : 'Пока пусто'}${part ? (stale ? ' · <b class="cb-warn">этот калькулятор изменён — нажмите «Обновить в общем заказе»</b>' : ' · этот калькулятор добавлен ✓') : ' · этот калькулятор ещё не добавлен'}</div>
        <div class="cb-sub">Данные клиента общие для всех калькуляторов. Итог, предоплата, КП и отправка в amoCRM — в «Общем заказе».</div></div>
        <a class="cb-open" href="combo.html">Открыть</a>`;
    }

    async function comboAdd() {
      calculateTotals();
      const d = window.calcData;
      if (d.problem) { alert(d.problem); return; }
      if (!(d.items || []).length) { alert('Добавьте изделия.'); return; }
      let c = comboGet();
      if (!c) {
        if (!confirm('Начать общий заказ с этого клиента?\n\nПотом откройте другой калькулятор — данные клиента подставятся сами, и добавьте туда остальные изделия.')) return;
        c = { active: true, id: Date.now().toString(36), created: Date.now(), client: comboClientRead(), parts: {}, priceSel: 'base' };
      }
      comboBtn.disabled = true;
      try {
        comboStatus.className = 'amo-status'; comboStatus.textContent = '⏳ Готовлю заказ-наряд и наклейки для общего заказа…';
        await buildPrintAreaSilently();
        const orderBlob = await printAreaToPdfBlob(x => !x.classList.contains('kp-part'));
        let labelsBlob = null; try { labelsBlob = makeLabelsPdf().blob; } catch (e) {}
        await comboPutFile(c.id + ':' + AMO_CALC_ID + ':order', orderBlob);
        if (labelsBlob) await comboPutFile(c.id + ':' + AMO_CALC_ID + ':labels', labelsBlob);
        c.client = Object.assign({}, c.client, Object.fromEntries(Object.entries(comboClientRead()).filter(([, v]) => v !== '')));
        c.parts[AMO_CALC_ID] = comboSnapshot();
        if (!comboSet(c)) return;
        comboStatus.className = 'amo-status ok';
        comboStatus.innerHTML = `✓ ${esc(AMO_CALC_NAME)} в общем заказе (${Object.keys(c.parts).length} ${Object.keys(c.parts).length === 1 ? 'часть' : 'части'}). <a href="combo.html">Открыть общий заказ</a> или <a href="index.html">добавить другие изделия</a>.`;
      } catch (e) {
        comboStatus.className = 'amo-status err'; comboStatus.textContent = '✕ Не добавлено: ' + ((e && e.message) || e);
      } finally { comboBtn.disabled = false; comboRender(); }
    }
    comboBtn.addEventListener('click', comboAdd);

    // данные клиента: пока общий заказ открыт — одни на все калькуляторы
    (function () {
      const c = comboGet();
      if (c) COMBO_CLIENT.forEach(id => {
        const el = document.getElementById(id), v = c.client[id];
        if (el && v !== undefined && el.value !== v) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
      });
      COMBO_CLIENT.forEach(id => {
        const el = document.getElementById(id); if (!el) return;
        el.addEventListener('input', () => { const cc = comboGet(); if (!cc) return; cc.client[id] = el.value; comboSet(cc); comboRender(); });
      });
      const orig = calculateTotals;
      calculateTotals = function () { const r = orig.apply(this, arguments); try { comboRender(); } catch (e) {} return r; };
      window.addEventListener('storage', e => { if (e.key === COMBO_KEY) comboRender(); });
      comboRender();
    })();
