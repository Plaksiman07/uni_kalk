"""Калькулятор «Шторы плиссе» — дилер PRO Plisse (diler-pro-plisse.ru, вкладка «Шторы»).
Собирается из калькулятора горизонтальных жалюзи. Цена дилера повторяет калькулятор дилера:
розничная цена дилера по его формуле, «моя цена» = розница − скидка субдилера (упаковка без скидки)."""
import json
import os
S = os.path.dirname(os.path.abspath(__file__)) + '/'
s = open(S + 'horiz_pre_amo.html').read()
DATA = json.load(open(S + 'pleat_data.json'))

def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    assert n == cnt, (n, a[:100])
    s = s.replace(a, b)

def region(start, end, new):
    global s
    assert s.count(start) == 1, ('start', start[:80], s.count(start))
    i = s.index(start); j = s.index(end, i)
    s = s[:i] + new + s[j:]

# ---------- тексты экрана ----------
rep('<title>Горизонтальные жалюзи — SunProtection</title>', '<title>Шторы плиссе — SunProtection</title>')
rep('Настройки — горизонтальные жалюзи', 'Настройки — шторы плиссе')
region('      <div class="block-title">Ламели</div>', '    <div class="app-block">\n      <div class="block-title">Помещения и Размеры</div>', '''      <div class="block-title">Ткань и профиль</div>
      <div class="visual-hint" style="text-align:left;">Ткань и цвет профиля — для всего заказа. У отдельного изделия можно выбрать другие — кнопка под его размерами.</div>
      <div class="form-group">
        <label>Ткань (серия и цвет)</label>
        <select id="vMatSelect"></select>
        <div class="visual-hint" id="vMatInfo" style="text-align:left; margin:6px 0 0;"></div>
      </div>
      <div class="form-group"><label>Цвет профиля</label><select id="vColorSel"></select></div>
      <div class="form-group">
        <label>Примечание к заказу дилеру (необязательно)</label>
        <input type="text" id="vColorInput" placeholder="например: ручка справа" autocomplete="off">
      </div>
    </div>

''')
rep('Размеры изделия в см (ширина × высота). Заказ дилеру — во вкладке «Тех часть заказа».',
    'Размеры готового изделия в см (ширина × высота), как в заказе дилеру. Заказ дилеру — во вкладке «Тех часть заказа».')
rep('Себестоимость — цена дилера по курсу и доставка.', 'Себестоимость — цена дилера и доставка.')
rep('<span>Изделия у дилера:</span><span class="summary-value" id="costProfile">', '<span>Шторы у дилера:</span><span class="summary-value" id="costProfile">')
rep('        <div class="summary-row"><span>Доп. опции у дилера:</span><span class="summary-value" id="costCloth">0 ₽</span></div>\n',
    '        <div class="summary-row" style="display:none;"><span>Доп. опции у дилера:</span><span class="summary-value" id="costCloth">0 ₽</span></div>\n')

# ---------- справочники и формула дилера ----------
region('    // === ПРАЙС ДИЛЕРА', '    function renderChoices() {', '''    // === ШТОРЫ ПЛИССЕ (дилер PRO Plisse) — ткани: [код серии, название, розничная цена ₽/м², цвета] ===
    const P_SERIES = ''' + json.dumps(DATA, ensure_ascii=False) + ''';
    const SERIES_BY = Object.fromEntries(P_SERIES.map(([code, name]) => [code, name]));
    const MESH_TYPES = [];
    P_SERIES.forEach(([code, sname, , cols]) => cols.forEach(c => MESH_TYPES.push({ key: code + '|' + c, name: c, g: code, cat: sname })));
    const MAT_BY = Object.fromEntries(MESH_TYPES.map(m => [m.key, m]));
    const V_COLORS = [['white', 'Белый RAL 9016'], ['beige', 'Бежевый RAL 1013'], ['brown', 'Коричневый RAL 8017'], ['grey', 'Серый RAL 7040'],
      ['quartz', 'Кварцевый серый RAL 7039'], ['anthracite', 'Антрацит RAL 7016'], ['black', 'Черный RAL 9005']];
    const nameIn = (list, k) => (list.find(x => x[0] === k) || list[0])[1];
    const isHoney = g => g === 'honeycomb' || g === 'honeycomb_premium';
    const limOf = g => isHoney(g) ? { wMin: 20, wMax: 100, hMin: 20, hMax: 200, aMax: 99 } : { wMin: 20, wMax: 120, hMin: 20, hMax: 250, aMax: 99 };
    const MESH_COLORS = [];
    let meshType = '', meshColor = '';
    let ORD = { color: 'white' };
    const matLabel = k => { const m = MAT_BY[k]; return m ? m.name : '—'; };
    const typeName = () => MAT_BY[meshType] ? matLabel(meshType) : 'не выбрана';
    const colorName = () => meshColor || '—';
    const typeNameOf = k => matLabel(k);
    const colorNameOf = k => nameIn(V_COLORS, k);
    const effOf = it => ({ color: (it.opts || {}).pc || ORD.color });
    function optsText(o) { return o.pc ? 'профиль ' + colorNameOf(o.pc) : ''; }
    // Цена дилера за 1 штору. n, d — ширина и высота в мм; g — код серии ткани.
    function pleatCalc(n, d, g) {
      const S = SETTINGS;
      const frameM = (n - 10) / 1000 * 2;
      const F = d < 1000 ? 2.1 : d > 1500 ? 2.3 : 2.2;
      const waves = g === 'honeycomb' ? Math.round(d / 7.5)
        : g === 'honeycomb_premium' ? (d <= 1500 ? Math.round(d / 5.8) : d <= 1900 ? Math.round(d / 6) : Math.round(d / 6.1))
        : Math.round(d / F / 10);
      const clothM2 = Math.round((n - 1) * (waves * (isHoney(g) ? 0.01 : 0.03)) / 10) / 100;
      const threadM = (4 * n + 2 * d + 300) / 1000;
      const insertM = (n - 1) / 1000;
      const rivets = n <= 500 ? 4 : n <= 1000 ? 6 : 8;
      const mat = S.frame * frameM + clothM2 * (Number(S['cloth_' + g]) || 0) + S.thread * threadM + S.insert * insertM * 2 + S.rivets * rivets + S.accessories;
      const waste = Math.round(mat * S.waste / 100);
      const retail = Math.round(mat + S.assembly + waste + S.pack);
      const disc = Number.isFinite(Number(S.discount)) ? Number(S.discount) : 0;
      const dealer = Math.round(Math.round((retail - S.pack) - (retail - S.pack) * disc / 100) + S.pack);
      return { retail, dealer, waves, clothM2, threadM, frameM, rivets };
    }

''')
region('    function renderChoices() {', "    document.getElementById('vMatSelect').addEventListener('change'", '''    function renderChoices() {
      const sel = document.getElementById('vMatSelect');
      if (!sel.options.length) {
        sel.add(new Option('— выберите ткань —', ''));
        P_SERIES.forEach(([code, sname, price]) => {
          const og = document.createElement('optgroup'); og.label = sname;
          MESH_TYPES.filter(m => m.g === code).forEach(m => og.appendChild(new Option(m.name, m.key)));
          sel.appendChild(og);
        });
      }
      sel.value = meshType;
      const cs = document.getElementById('vColorSel');
      if (!cs.options.length) V_COLORS.forEach(([k, t]) => cs.add(new Option(t, k)));
      cs.value = ORD.color;
      document.getElementById('vColorInput').value = meshColor;
      const m = MAT_BY[meshType];
      document.getElementById('vMatInfo').textContent = m ? `Серия ${m.cat}${isHoney(m.g) ? ' · до 100×200 см' : ' · до 120×250 см'}` : '';
      attachMatSearch(sel);
    }
    document.getElementById('vColorSel').addEventListener('change', e => { ORD.color = e.target.value; renderChoices(); calculateTotals(); });
''')
rep('''    function cutParts(w, h) {
      return { chain: Math.round(h * 2 / 3), area: w * h / 10000, profW: w, profH: h };
    }''', '''    function cutParts(w, h) {
      return { chain: 0, area: w * h / 10000, profW: w, profH: h };
    }''')

# ---------- настройки ----------
CL = ', '.join(f"cloth_{c}: {p}" for c, _, p, _ in DATA)
CLDEF = ',\n        '.join(f"['cloth_{c}', '{n}']" for c, n, _, _ in DATA)
region('    const DEFAULT_SETTINGS = {', '    const SETTINGS_KEY = ', '''    // Розничные цены дилера (₽) и скидка субдилера — из калькулятора PRO Plisse, ноябрь 2026
    const DEFAULT_SETTINGS = {
      discount: 25, tripFee: 0, laborInstall: 500,
      frame: 415, thread: 30, insert: 131, rivets: 7, accessories: 380, assembly: 600, waste: 20, pack: 30,
      ''' + CL + ''',
      markup: 2, discount7: 7, discount12: 12, b2bExtra: 15,
      taxB2B: 6, minOrder: 0, roundStep: 10,
      laborMarkup: 0,
      labelW: 58, labelH: 40
    };
    const SETTINGS_DEF = [
      { group: 'Дилер, доставка, установка', items: [
        ['discount', 'Моя скидка у дилера от розницы, %'],
        ['tripFee', 'Доставка от дилера, ₽ за заказ — в себестоимость'],
        ['laborInstall', 'Установка, ₽ за изделие'] ] },
      { group: 'Ткань — розница дилера, ₽ за м²', items: [
        ''' + CLDEF + ''' ] },
      { group: 'Розница дилера: профиль и комплектующие', items: [
        ['frame', 'Профиль, ₽ за м.п.'],
        ['thread', 'Нить, ₽ за м.п.'],
        ['insert', 'Вставка шторы, ₽ за м.п.'],
        ['rivets', 'Клёпка, ₽ за шт'],
        ['accessories', 'Аксессуары, ₽ за изделие'],
        ['assembly', 'Сборка, ₽ за изделие'],
        ['waste', 'Отход материалов, %'],
        ['pack', 'Упаковка (стрейч), ₽ за изделие'] ] },
      { group: 'Наценки и скидки', items: [
        ['laborMarkup', 'Установка в цене клиента', [[0, 'Без наценки'], [1, 'С наценкой']]],
        ['markup', 'Наценка: изделие и доставка ×'],
        ['discount7', 'Первая скидка, %'],
        ['discount12', 'Вторая скидка, %'],
        ['b2bExtra', 'Оплата по Р/С: наценка больше на, %'],
        ['taxB2B', 'Налог с оплаты по Р/С, %'],
        ['roundStep', 'Округлять цены вверх до, ₽ (0 — не округлять)'],
        ['minOrder', 'Минимальная сумма заказа, ₽ (0 — нет)'] ] },
      { group: 'Наклейки (термопринтер)', items: [
        ['labelW', 'Ширина наклейки, мм'],
        ['labelH', 'Высота наклейки, мм'] ] }
    ];
''')
rep("const SETTINGS_KEY = 'horizCalcSettings1';", "const SETTINGS_KEY = 'pleatCalcSettings1';")
rep("const STATE_KEY = 'horizCalcState1';", "const STATE_KEY = 'pleatCalcState1';")
rep("indexedDB.open('horizCalcPhotos', 1)", "indexedDB.open('pleatCalcPhotos', 1)")
rep("const pricesEmpty = ['rate']", "const pricesEmpty = ['frame', 'cloth_lina']")
rep("        meshType, meshColor,\n", "        meshType, meshColor, ord: ORD,\n")
rep("      if (typeof state.meshColor === 'string') meshColor = state.meshColor;\n",
    """      if (typeof state.meshColor === 'string') meshColor = state.meshColor;
      if (state.ord && V_COLORS.some(x => x[0] === state.ord.color)) ORD.color = state.ord.color;
""")

# ---------- изделие ----------
region('          <div class="row" style="margin-top: 12px;">\n            <div class="form-group col"><label>Управление</label>', '          <select class="item-stack"',
       '''          <select class="item-ctrl" style="display:none;"><option value=""></option></select>
          <select class="item-mount" style="display:none;"><option value=""></option></select>
''')
region('    function renderItemOpt(row) {', '    // Разбор заказа', '''    function renderItemOpt(row) {
      const btn = row && row.querySelector('.item-opt-btn');
      if (!btn) return;
      const ot = row.dataset.type || '', oc = row.dataset.color || '', ox = optsText(itemOpts(row));
      btn.classList.toggle('own', !!(ot || oc || ox));
      btn.innerHTML = (ot || oc || ox)
        ? `🧵 Ткань: ${ot ? `<b>${esc(matLabel(ot))}</b>` : `${esc(typeName())} <span class="io-sub">(как в заказе)</span>`}${ox ? `<br>+ <b>${esc(ox)}</b>` : ''}${oc ? `<br>Примечание: ${esc(oc)}` : ''}`
        : `🧵 Ткань и профиль: как в заказе <span class="io-sub">· ${esc(typeName())}, ${esc(colorNameOf(ORD.color))} — нажмите, чтобы изменить</span>`;
    }
    function openItemOpts(itemId) {
      const row = document.getElementById(itemId);
      if (!row) return;
      const title = row.querySelector('.item-title-text').textContent;
      const ov = document.createElement('div');
      ov.className = 'settings-overlay open';
      const o = itemOpts(row);
      ov.innerHTML = `
        <div class="settings-panel" role="dialog" aria-label="Ткань и профиль изделия">
          <div class="settings-panel-head">
            <div class="block-title" style="margin-bottom:0;">${esc(title)}: ткань и профиль</div>
            <button type="button" class="settings-close" data-x aria-label="Закрыть">&times;</button>
          </div>
          <div class="form-group" style="margin-top:14px;"><label>Ткань</label><select data-m></select></div>
          <div class="form-group"><label>Цвет профиля</label><select data-pc><option value="">как в заказе: ${esc(colorNameOf(ORD.color))}</option>${V_COLORS.map(([k, t]) => `<option value="${k}"${o.pc === k ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label>Примечание (необязательно)</label><input type="text" data-c placeholder="${meshColor ? 'как в заказе: ' + esc(meshColor) : 'не указано'}" value="${esc(row.dataset.color || '')}"></div>
          <div style="display:flex; gap:8px; margin-top:12px;">
            <button type="button" class="btn-action btn-labels" data-reset style="margin:0;">Как в заказе</button>
            <button type="button" class="btn-action btn-pdf" data-x style="margin:0;">Готово</button>
          </div>
        </div>`;
      const sel = ov.querySelector('[data-m]');
      sel.innerHTML = document.getElementById('vMatSelect').innerHTML;
      sel.options[0].text = `как в заказе: ${typeName()}`;
      sel.value = row.dataset.type || '';
      attachMatSearch(sel);
      const apply = () => {
        if (sel.value) row.dataset.type = sel.value; else delete row.dataset.type;
        const c = ov.querySelector('[data-c]').value.trim();
        if (c) row.dataset.color = c; else delete row.dataset.color;
        const pc = ov.querySelector('[data-pc]').value;
        if (pc) row.dataset.opts = JSON.stringify({ pc }); else delete row.dataset.opts;
        calculateTotals();
      };
      ov.addEventListener('change', apply);
      ov.addEventListener('input', e => { if (e.target.matches('[data-c]')) apply(); });
      ov.addEventListener('click', e => {
        if (e.target.closest('[data-reset]')) {
          delete row.dataset.type; delete row.dataset.color; delete row.dataset.opts; calculateTotals(); ov.remove(); return;
        }
        if (e.target === ov || e.target.closest('[data-x]')) ov.remove();
      });
      document.body.appendChild(ov);
    }

''')

# ---------- расчёт ----------
rep("const L = (it.opts.multi && it.mat.g !== 'l50') ? MULTI_LIM : V_GROUPS[it.mat.g].lim;", "const L = limOf(it.mat.g);")
rep("noMat.length) { problem = 'Выберите ламели.'; msg = 'Выберите ламели (ширину и цвет) — для заказа или для изделий: '",
    "noMat.length) { problem = 'Выберите ткань.'; msg = 'Выберите ткань — для заказа или для изделий: '")
rep("      const rate = S.rate > 0 ? S.rate : 0;\n", "      const rate = 1;   // цены дилера сразу в рублях\n")
region("          const unit = 'm2', o = it.opts;", "          it.usdBase = base;", """          const unit = 'm2', e = effOf(it);
          const r = pleatCalc(Math.round(it.w * 10), Math.round(it.h * 10), m.g);
          it.pl = r; it.eff = e;
          const area = it.w * it.h / 10000, base = r.dealer, sum = r.dealer;
""")
rep("      const colors = [...new Set(items.map(it => it.color))];", "      const colors = [...new Set(items.map(it => colorNameOf((it.eff || ORD).color)))];")

# за пределами размеров дилер делает «без гарантии» — предупреждаем, но не блокируем
rep("      else if (bad.length) { problem = 'Есть изделия вне предельных размеров дилера.'; msg = 'Вне предельных размеров дилера: ' + bad.join('; ') + '.'; }\n      const blocked = !!(noMat.length || bad.length);",
    "      else if (bad.length) { msg = 'Вне размеров дилера — дилер сделает без гарантии: ' + bad.join('; ') + '.'; }\n      const blocked = !!noMat.length;")

# ---------- заказ дилеру ----------
region('    function componentsList() {', '    function countBy(key, nameOf) {', '''    function componentsList() {
      const d = window.calcData, by = {};
      d.items.forEach(it => { if (it.mat) by[it.type] = (by[it.type] || 0) + it.qty; });
      const retail = d.items.reduce((a, it) => a + (it.pl ? it.pl.retail * it.qty : 0), 0);
      return [
        ['Штор', 'шт', d.totals.qty],
        ...Object.keys(by).map(k => [`Ткань ${matLabel(k)}`, 'шт', by[k]]),
        ['Розничная цена дилера', '₽', Math.round(retail).toLocaleString('ru-RU')],
        ['Моя цена у дилера (скидка ' + fmtNum(SETTINGS.discount) + '%)', '₽', Math.round(d.totals.usd).toLocaleString('ru-RU')],
        ['Доставка от дилера', '₽', Math.round(d.tripFee).toLocaleString('ru-RU')]
      ];
    }
    const optText = it => [matLabel(it.type), colorNameOf((it.eff || ORD).color)].join(', ');
    const optHead = () => 'Ткань, профиль';
''')
rep("const usd2 = v => (Math.round(v * 100) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });",
    "const usd2 = v => Math.round(v).toLocaleString('ru-RU');")
rep('<span>Сумма у дилера:</span><span class="summary-value">${usd2(d.totals.usd)} $</span>', '<span>Сумма у дилера:</span><span class="summary-value">${usd2(d.totals.usd)} ₽</span>')
region("      document.getElementById('techCut').innerHTML = `", "      document.getElementById('techComponents').innerHTML = `", """      document.getElementById('techCut').innerHTML = `
        <div class="table-scroll"><table class="tech-table">
          <thead><tr><th>№</th><th class="left">Комната</th><th class="left">Ткань</th><th>Профиль</th><th>Ш × В, мм</th><th>Кол-во</th>
            <th>Складок</th><th>Примеч.</th><th>Дилер, ₽<small>за 1 шт</small></th><th>Дилер, ₽<small>за все шт</small></th></tr></thead>
          <tbody>${d.items.map(it => `<tr><td>${it.n}</td><td class="left">${esc(it.room)}</td><td class="left"><b>${esc(matLabel(it.type))}</b></td>
            <td>${esc(colorNameOf(it.eff ? it.eff.color : ORD.color))}</td><td class="key">${Math.round(it.w * 10)}×${Math.round(it.h * 10)}</td><td>${it.qty}</td>
            <td>${it.pl ? it.pl.waves : '—'}</td><td>${esc(it.color || '—')}</td><td>${usd2(it.usd)}</td><td><b>${usd2(it.usd * it.qty)}</b></td></tr>`).join('')}</tbody></table></div>`;
""")

# ---------- наклейки ----------
rep("fit('жалюзи Ш × В, см', subPx, leftW, false);", "fit('плиссе Ш × В, см', subPx, leftW, false);")
rep("ctx.fillText('жалюзи Ш × В, см', pad, sizeBase + subPx * 1.45);", "ctx.fillText('плиссе Ш × В, см', pad, sizeBase + subPx * 1.45);")
rep("type: it.mat ? it.mat.name : '—', color: it.mat ? it.mat.cat + ' · упр. ' + it.ctrl : '',",
    "type: matLabel(it.type), color: it.eff ? colorNameOf(it.eff.color) : '',")
rep("a.download = `horiz_labels_${safe}", "a.download = `pleat_labels_${safe}")

# ---------- PDF ----------
region("      const cutRows = d.items.map(it =>", "      const sheetHeader = ", """      const cutRows = d.items.map(it => `<tr><td>${it.n}</td><td style="text-align:left;">${esc(it.room)}</td><td style="text-align:left; font-weight:bold;">${esc(matLabel(it.type))}</td>
        <td>${esc(colorNameOf(it.eff ? it.eff.color : ORD.color))}</td><td style="font-weight:bold; color:#16a085;">${Math.round(it.w * 10)}×${Math.round(it.h * 10)}</td><td>${it.qty}</td>
        <td>${esc(it.color || '—')}</td><td style="font-weight:bold;">${usd2(it.usd * it.qty)}</td><td></td></tr>`).join('');

""")
rep("            Ламели: <strong>${tShort}</strong>\n", "            Ткань: <strong>${tShort}</strong> &nbsp;·&nbsp; Профиль: <strong>${cShort}</strong>\n")
rep("Мы рады предложить вам горизонтальные алюминиевые жалюзи по вашим индивидуальным размерам. Ламели поворачиваются и поднимаются: легко регулировать освещение и закрыть окно от солнца и посторонних взглядов. Жалюзи компактные, практичные и легко моются.",
    "Мы рады предложить вам шторы плиссе по вашим индивидуальным размерам. Ткань складывается гармошкой и свободно двигается вверх и вниз: можно закрыть любую часть окна — сверху, снизу или посередине. Шторы крепятся прямо на створку, не мешают открывать окно и подходят для окон любой формы.")
rep("<strong>Изделие:</strong> Горизонтальные алюминиевые жалюзи</div>", "<strong>Изделие:</strong> Шторы плиссе</div>")
rep("                <div style=\"margin-bottom: 8px;\"><strong>Ламели:</strong> ${tName}</div>\n",
    "                <div style=\"margin-bottom: 8px;\"><strong>Ткань:</strong> ${tName}</div>\n                <div style=\"margin-bottom: 8px;\"><strong>Цвет профиля:</strong> ${cColor}</div>\n")
rep("ЗАКАЗ-НАРЯД № ${orderNo} (Горизонтальные жалюзи)", "ЗАКАЗ-НАРЯД № ${orderNo} (Шторы плиссе)")
rep("                    <div style=\"margin-bottom: 4px;\"><strong>Ламели:</strong> ${tName}</div>\n",
    "                    <div style=\"margin-bottom: 4px;\"><strong>Ткань:</strong> ${tName}</div>\n                    <div style=\"margin-bottom: 4px;\"><strong>Цвет профиля:</strong> ${cColor}</div>\n")
rep("<span>Изделия у дилера:</span> <strong>", "<span>Шторы у дилера:</span> <strong>")
rep("""                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px;"><span>Доп. опции у дилера:</span> <strong>${fmtRub(d.costCloth)} ₽</strong></div>\n""", "")
rep("${sheetHeader('Заказ дилеру', 'Горизонтальные алюминиевые жалюзи · размеры в см (ширина × высота) · длина управления — 2/3 высоты')}",
    "${sheetHeader('Заказ дилеру', 'Шторы плиссе · размеры готового изделия в мм (ширина × высота)')}")
rep("""                <th>№</th><th style="text-align: left;">Комната</th><th style="text-align: left;">Ламели</th><th>Примечание</th><th>Ш × В</th><th>Кол-во</th><th>Упр.</th><th>Длина упр.</th>
                <th>Крепление</th><th style="text-align: left;">Опции</th><th>Площадь, м²</th><th>Дилер, $</th><th>Готово</th>""",
    """                <th>№</th><th style="text-align: left;">Комната</th><th style="text-align: left;">Ткань</th><th>Профиль</th><th>Ш × В, мм</th><th>Кол-во</th>
                <th>Примечание</th><th>Дилер, ₽</th><th>Готово</th>""")
rep("Итого у дилера: <b>${usd2(d.totals.usd)} $</b> · по курсу ${fmtNum(d.rate)} ₽: <b>${fmtRub(d.totals.usd * d.rate)} ₽</b> · доставка: <b>${fmtRub(d.tripFee)} ₽</b>",
    "Итого у дилера: <b>${usd2(d.totals.usd)} ₽</b> · доставка: <b>${fmtRub(d.tripFee)} ₽</b>")
rep("— горизонтальные жалюзи` : `Заказ-наряд${pdfNo} — горизонтальные жалюзи`", "— шторы плиссе` : `Заказ-наряд${pdfNo} — шторы плиссе`")

open(S + 'pleat_pre_amo.html', 'w').write(s)
left = [m for m in ['оризонтальн', 'жалюзи', 'Ламел', 'ламел', 'H_PRICES', 'V_GROUPS', 'MULTI_LIM', 'unitPrice', 'matPriceTxt', 'horizCalc', ' $<', 'd.rate', 'V_OPTS'] if m in s]
print('built; leftovers:', left)
