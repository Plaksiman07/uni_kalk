
    // === amoCRM: «Добавить в amoCRM» ===
    // Заказ уходит через посредника (Cloudflare Worker), который хранит токен amoCRM.
    // Адрес посредника и ключ доступа вводятся один раз и общие для всех калькуляторов на устройстве.
    const AMO_CFG_KEY = 'spAmoConfig';
    const amoCfg = () => { try { return JSON.parse(localStorage.getItem(AMO_CFG_KEY) || '{}') || {}; } catch (e) { return {}; } };
    const amoSaveCfg = c => { try { localStorage.setItem(AMO_CFG_KEY, JSON.stringify(c)); } catch (e) {} };
    const amoBase = c => String(c.url || '').trim().replace(/\/+$/, '');

    async function amoCall(cfg, path, init = {}) {
      // запросы только на чтение повторяем до 3 раз (мобильная сеть/VPN иногда обрывают *.workers.dev); создание сделки — без повтора
      const readOnly = /^\/(ping|last-number|orders)\b/.test(path);
      let r;
      for (let attempt = 1; ; attempt++) {
        try {
          r = await fetch(amoBase(cfg) + path, { ...init, headers: { 'X-App-Key': cfg.key, ...(init.headers || {}) } });
          if (readOnly && attempt < 3 && r.status === 404 && !/json/.test(r.headers.get('Content-Type') || '')) throw new Error('not worker');
          break;
        } catch (e) {
          if (!readOnly || attempt >= 3) throw new Error(`нет связи с посредником (${amoBase(cfg).replace(/^https?:\/\//, '')}) — проверьте интернет, VPN или адрес в «⚙ Подключение amoCRM»`);
          await new Promise(res => setTimeout(res, 1200 * attempt));
        }
      }
      let d = {};
      try { d = await r.json(); } catch (e) {}
      if (!r.ok || d.error) throw new Error(d.error || `посредник ответил ${r.status}`);
      return d;
    }

    // Окно настройки подключения
    function amoConfigDialog() {
      return new Promise(resolve => {
        const cfg = amoCfg();
        const ov = document.createElement('div');
        ov.className = 'settings-overlay open';
        ov.innerHTML = `
          <div class="settings-panel" role="dialog" aria-label="Подключение amoCRM">
            <div class="settings-panel-head">
              <div class="block-title" style="margin-bottom:0;">Подключение amoCRM</div>
              <button type="button" class="settings-close" data-x aria-label="Закрыть">&times;</button>
            </div>
            <div class="visual-hint" style="text-align:left; margin-top:12px;">Один раз на устройстве. Адрес посредника и ключ — из инструкции по настройке. Подключение общее для всех калькуляторов.</div>
            <div class="form-group"><label>Адрес посредника</label><input type="text" data-url placeholder="https://….workers.dev" autocomplete="off" spellcheck="false"></div>
            <div class="form-group"><label>Ключ доступа (APP_KEY)</label><input type="text" data-key placeholder="ключ" autocomplete="off" spellcheck="false"></div>
            <div class="amo-cfg-msg" data-msg></div>
            <div style="display:flex; gap:8px; margin-top:12px;">
              <button type="button" class="btn-action btn-labels" data-test style="margin:0;">Проверить связь</button>
              <button type="button" class="btn-action btn-amo" data-save style="margin:0;">Сохранить</button>
            </div>
          </div>`;
        document.body.appendChild(ov);
        const $ = s => ov.querySelector(s);
        $('[data-url]').value = cfg.url || ''; $('[data-key]').value = cfg.key || '';
        const read = () => ({ url: $('[data-url]').value.trim(), key: $('[data-key]').value.trim() });
        const msg = (t, ok) => { const m = $('[data-msg]'); m.textContent = t; m.style.color = ok ? '#27ae60' : '#e74c3c'; };
        const close = v => { ov.remove(); resolve(v); };
        $('[data-x]').onclick = () => close(false);
        ov.addEventListener('click', e => { if (e.target === ov) close(false); });
        $('[data-test]').onclick = async () => {
          const c = read();
          if (!/^https:\/\//.test(c.url) || !c.key) { msg('Введите адрес (начинается с https://) и ключ.'); return; }
          msg('Проверяю…', true);
          try { const d = await amoCall(c, '/ping', { method: 'POST' }); msg(`Связь есть ✓ Аккаунт amoCRM: ${d.account}`, true); }
          catch (e) { msg('Нет связи: ' + e.message); }
        };
        $('[data-save]').onclick = () => {
          const c = read();
          if (!/^https:\/\//.test(c.url) || !c.key) { msg('Введите адрес (начинается с https://) и ключ.'); return; }
          amoSaveCfg(c); close(true);
        };
      });
    }

    // PDF заказ-наряда как файл: тот же макет, что и при печати, превращённый в картинки по страницам A4
    const rubTxt = v => `${Math.round(v || 0).toLocaleString('ru-RU')} ₽`;
    function amoSelectedPrice() {
      const d = window.calcData, sel = document.querySelector('input[name="selectedPrice"]:checked').value;
      const price = { base: d.priceBase, discount7: d.price7, discount12: d.price12, b2b: d.priceB2B }[sel] || 0;
      const label = { base: 'Базовая', discount7: discountLabel('discount7').replace('Со скидкой', 'Скидка'),
        discount12: discountLabel('discount12').replace('Со скидкой', 'Скидка'), b2b: 'Оплата по Р/С (ИП)' }[sel];
      return { sel, price, label, profit: d.profitOf[sel] };
    }

    // Текст примечания для сделки
    function amoNoteText() {
      const d = window.calcData;
      const g = id => document.getElementById(id).value.trim();
      const { price, label, profit } = amoSelectedPrice();
      const weights = d.items.map(it => it.lineWeight != null ? it.lineWeight : it.lineCost);
      const wSum = weights.reduce((a, b) => a + b, 0);
      const sums = weights.map(w => wSum > 0 ? Math.round(price * w / wSum) : 0);
      if (sums.length) {   // как в КП: остаток округления — в самую дорогую строку, сумма строк = итог
        let mi = 0; sums.forEach((v, k) => { if (v > sums[mi]) mi = k; });
        sums[mi] += Math.round(price) - sums.reduce((a, v) => a + v, 0);
      }
      const lines = d.items.map((it, i) => `${it.n}. ${it.room || '—'}: ${amoItemText(it)} — ${rubTxt(sums[i])}`);
      return [
        `${AMO_CALC_NAME} · заказ №${g('orderNumber') || '—'}`,
        `Клиент: ${g('clientName') || '—'}${g('clientPhone') ? ', ' + g('clientPhone') : ''}`,
        `Адрес: ${g('clientAddress') || '—'}`,
        ...amoDetails(),
        `Монтаж: ${d.noInstall ? 'не входит' : 'включён'}`,
        '',
        'Позиции:',
        ...lines,
        '',
        `Итого для клиента (${label}): ${rubTxt(price)}`,
        ...(typeof spPayLines === 'function' ? spPayLines() : []),
        'Полный заказ-наряд с раскроем — в файле PDF этой сделки.',
        `Отправлено из калькулятора ${new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
      ].join('\n');
    }

    // Короткая метка для названия сделки — улица из адреса (как «№ 35 Обрывная»), иначе имя клиента
    function amoStreet(addr) {
      const parts = String(addr || '').split(',').map(x => x.trim()).filter(x => /[a-zа-яё]/i.test(x));
      let p = parts.find(x => /[a-zа-яё].*\d/i.test(x)) || parts[parts.length - 1] || '';
      p = p.replace(/^(г\.?|город|ул\.?|улица|пр-т\.?|пр\.?|проспект|пер\.?|переулок|бул\.?|бульвар|ш\.?|шоссе|мкр\.?|д\.?)\s+/i, '');
      p = p.replace(/\s*\d.*$/, '').trim();
      return p;
    }
    function amoLeadTitle() {
      const g = id => document.getElementById(id).value.trim();
      const label = amoStreet(g('clientAddress')) || g('clientName');
      return [g('orderNumber') ? '№ ' + g('orderNumber') : '', label].filter(Boolean).join(' ') || AMO_CALC_NAME;
    }
    // Поля «Изделие 1…8»: если позиций больше 8, в восьмом — сколько ещё
    function amoItemFields(fmt) {
      const items = window.calcData.items, out = {};
      items.forEach((it, i) => {
        if (i < 7 || items.length <= 8) out[`Изделие ${i + 1}`] = fmt(it);
        else if (i === 7) out['Изделие 8'] = `+ ещё ${items.length - 7} поз. — см. PDF`;
      });
      return out;
    }
    const capFirst = v => { v = String(v || '').trim(); return v ? v[0].toUpperCase() + v.slice(1).toLowerCase() : ''; };

    const amoBtn = document.getElementById('amoBtn');
    const amoStatus = document.getElementById('amoStatus');
    function amoSetStatus(html, kind) {
      amoStatus.innerHTML = html;
      amoStatus.className = 'amo-status' + (kind ? ' ' + kind : '');
    }

    async function amoSend() {
      calculateTotals();
      const d = window.calcData;
      if (d.problem) { alert(d.problem); return; }
      let cfg = amoCfg();
      if (!cfg.url || !cfg.key) { if (!(await amoConfigDialog())) return; cfg = amoCfg(); }

      const orderNo = document.getElementById('orderNumber').value.trim();
      const client = document.getElementById('clientName').value.trim();
      if (!orderNo && !confirm('Номер заказа не указан. Всё равно отправить в amoCRM?')) return;
      const leadKey = `spAmoLead:${AMO_CALC_ID}:${orderNo || '-'}:${client}`;
      let leadId = 0;
      try { leadId = Number(localStorage.getItem(leadKey)) || 0; } catch (e) {}
      if (leadId && !confirm(`Этот заказ уже отправлен в сделку №${leadId}.\n\nОК — обновить её (новая сумма, примечание и PDF).\nОтмена — ничего не отправлять.`)) return;

      const { price } = amoSelectedPrice();
      const btnText = amoBtn.textContent;
      amoBtn.disabled = true;
      try {
        amoSetStatus('⏳ Готовлю PDF: заказ-наряд, КП и наклейки…');
        await buildPrintAreaSilently();
        const isKp = x => x.classList.contains('kp-part');
        const pdfBlob = await printAreaToPdfBlob(x => !isKp(x));
        const kpBlob = await printAreaToPdfBlob(isKp);
        let labelsBlob = null, labelsErr = '';
        try { labelsBlob = makeLabelsPdf().blob; } catch (e) { labelsErr = (e && e.message) || String(e); }

        amoSetStatus('⏳ Отправляю заказ в amoCRM…');
        const lead = await amoCall(cfg, '/lead', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: leadId || undefined,
            title: amoLeadTitle(),
            price,
            pipeline: AMO_PIPELINE,
            status: 'Изготовление',
            contact: { name: client, phone: document.getElementById('clientPhone').value.trim() },
            fields: Object.assign({ 'Адрес': document.getElementById('clientAddress').value.trim() }, amoFields(), amoItemFields(amoItemField)),
            note: amoNoteText(),
            tags: amoTags()
          })
        });
        try { localStorage.setItem(leadKey, String(lead.lead_id)); } catch (e) {}

        const no = orderNo ? '№ ' + orderNo : 'без номера';
        const files = [
          ['заказ-наряд', `Заказ-наряд ${no} — ${AMO_CALC_NAME}.pdf`, pdfBlob],
          ['КП', `КП SunProtection ${no} — ${AMO_CALC_NAME}.pdf`, kpBlob],
          ['наклейки', `Наклейки ${no} — ${AMO_CALC_NAME}.pdf`, labelsBlob]
        ];
        const done = [], failed = [];
        if (!labelsBlob) failed.push(`наклейки (не собрались: ${esc(labelsErr)})`);
        for (const [label, name, blob] of files) {
          if (!blob) continue;
          amoSetStatus(`⏳ Прикрепляю к сделке: ${label} (${done.length + failed.length + 1} из 3)…`);
          const fileName = name.replace(/[\\/:*?"<>|]/g, '-');
          let err = '';
          for (let attempt = 1; attempt <= 2; attempt++) {   // при сбое сети — ещё одна попытка
            try {
              const r = await amoCall(cfg, `/file?lead_id=${lead.lead_id}`, { method: 'POST', headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent(fileName) }, body: blob });
              err = ''; done.push(r && r.in_feed === false ? `${label} (в «Файлах», не в ленте)` : label); break;
            } catch (e) { err = e.message; }
          }
          if (err) failed.push(`${label} — ${esc(err)}`);
        }

        try { if (lead.url) localStorage.setItem('spAmoBase', new URL(lead.url).origin); } catch (e) {}
        const spStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        const link = `<a href="${esc(lead.url)}"${spStandalone ? '' : ' target="_blank"'} rel="noopener">открыть сделку</a>`;
        const head = lead.created ? `Сделка создана в «${esc(lead.pipeline_name || AMO_PIPELINE)}» → «${esc(lead.status_name || 'Изготовление')}»` : 'Сделка обновлена';
        const extra = [];
        if (lead.status_fallback) extra.push(`в воронке нет этапа «Изготовление» — сделка поставлена в «${esc(lead.status_name)}»`);
        if (lead.contact_existing) extra.push('клиент уже был в amo — сделка привязана к нему');
        if (lead.missing_fields && lead.missing_fields.length) extra.push('не заполнены поля: ' + lead.missing_fields.map(esc).join(', '));
        const tail = extra.length ? `<br><small>${extra.join('; ')}</small>` : '';
        const filesTxt = done.length ? `прикреплены: ${done.join(', ')}` : 'файлы не прикреплены';
        if (!failed.length) amoSetStatus(`✓ ${head}: ${rubTxt(price)}, ${filesTxt} — ${link}${tail}`, (lead.status_fallback || extra.some(x => x.startsWith('не заполнены'))) ? 'warn' : 'ok');
        else amoSetStatus(`⚠ ${head}: ${rubTxt(price)}, ${filesTxt}.<br><b>Не прикрепилось:</b> ${failed.join('; ')} — ${link}${tail}`, 'warn');
      } catch (e) {
        amoSetStatus(`✕ Не отправлено: ${esc(e.message)}`, 'err');
      } finally {
        amoBtn.disabled = false; amoBtn.textContent = btnText;
      }
    }
    amoBtn.addEventListener('click', amoSend);
    document.getElementById('amoSettingsLink').addEventListener('click', e => { e.preventDefault(); amoConfigDialog(); });

    // === Номер заказа: подсказка «последний номер в amoCRM» и кнопка «подставить следующий» ===
    (function () {
      const inp = document.getElementById('orderNumber');
      if (!inp || window.SP_EMBED) return;
      const hint = document.createElement('div');
      hint.className = 'amo-num-hint';
      inp.insertAdjacentElement('afterend', hint);
      const KEY = 'spAmoLastNum';
      function show(last) {
        if (!last || !last.number) { hint.innerHTML = ''; return; }
        const next = last.number + 1;
        inp.placeholder = `последний в amo: ${last.number}`;
        hint.innerHTML = `Последний заказ в amoCRM: <b>№ ${last.number}</b>` + (inp.value.trim() ? '' : ` · <button type="button" class="amo-num-fill">Подставить ${next}</button>`);
        const b = hint.querySelector('.amo-num-fill');
        if (b) b.onclick = () => { inp.value = String(next); inp.dispatchEvent(new Event('input', { bubbles: true })); show(last); };
      }
      let cached = null;
      try { cached = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) {}
      if (cached) show(cached.last);
      inp.addEventListener('input', () => show(cached && cached.last));
      const cfg = amoCfg();
      if (!cfg.url || !cfg.key || (cached && Date.now() - cached.t < 2 * 60 * 1000)) return;
      amoCall(cfg, '/last-number', { method: 'POST' }).then(d => {
        cached = { t: Date.now(), last: d.last || null };
        try { sessionStorage.setItem(KEY, JSON.stringify(cached)); } catch (e) {}
        show(cached.last);
      }).catch(() => {});   // старый посредник или нет сети — просто без подсказки
    })();
