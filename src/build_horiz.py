"""Калькулятор «Горизонтальные жалюзи (алюминий)» — дилер Amigo. Собирается из калькулятора вертикальных жалюзи."""
import json
import os
S = os.path.dirname(os.path.abspath(__file__)) + '/'
s = open(S + 'vert_pre_amo.html').read()
DATA = json.load(open(S + 'horiz_data.json'))

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
rep('<title>Вертикальные жалюзи — SunProtection</title>', '<title>Горизонтальные жалюзи — SunProtection</title>')
rep('Настройки — вертикальные жалюзи', 'Настройки — горизонтальные жалюзи')
rep('Материал и цвет — для всего заказа. У отдельного изделия можно выбрать другие и включить доп. опции — кнопка под его размерами.',
    'Ламели (ширина и цвет) — для всего заказа. У отдельного изделия можно выбрать другие и включить доп. опции — кнопка под его размерами.')
rep('''        <label>Материал ламелей</label>
        <select id="vMatSelect"></select>''', '''        <label>Ламели: ширина и цвет</label>
        <select id="vMatSelect"></select>''')
rep('''        <label>Цвет / номер ламели</label>
        <input type="text" id="vColorInput" placeholder="например: 0225 белый" autocomplete="off">''',
    '''        <label>Примечание к заказу дилеру (необязательно)</label>
        <input type="text" id="vColorInput" placeholder="например: цвет лесенки, шнура" autocomplete="off">''')
rep('Размеры изделия в см (ширина карниза × высота). Заказ дилеру — во вкладке «Тех часть заказа».',
    'Размеры изделия в см (ширина × высота). Заказ дилеру — во вкладке «Тех часть заказа».')

# ---------- прайс ----------
names = {'l25': '25 мм', 'l16': '16 мм', 'l50': '50 мм'}
region('    // === ПРАЙС ДИЛЕРА', '    function renderChoices() {', '''    // === ПРАЙС ДИЛЕРА (Amigo, «ГЖ алюминий», 18.02.26) — цены в $ за м² по номеру цвета ===
    const H_PRICES = ''' + json.dumps(DATA, ensure_ascii=False) + ''';
    const V_GROUPS = {
      l25: { title: 'Ламель 25 мм', unit: 'm2', lim: { wMin: 25, wMax: 285, hMin: 30, hMax: 300, aMax: 7 } },
      l16: { title: 'Ламель 16 мм', unit: 'm2', lim: { wMin: 25, wMax: 210, hMin: 30, hMax: 300, aMax: 7 } },
      l50: { title: 'Ламель 50 мм', unit: 'm2', lim: { wMin: 25, wMax: 285, hMin: 30, hMax: 300, aMax: 7 } }
    };
    const MULTI_LIM = { wMin: 30, wMax: 150, hMin: 40, hMax: 170, aMax: 2.5 };   // межрамные 16/25 мм
    const MESH_TYPES = [];
    Object.keys(H_PRICES).forEach(g => H_PRICES[g].forEach(([n, p]) => MESH_TYPES.push({ key: g + ':' + n, name: n, g, price: p, cat: V_GROUPS[g].title.replace('Ламель ', '') })));
    const MAT_BY = Object.fromEntries(MESH_TYPES.map(m => [m.key, m]));
    const MESH_COLORS = [];
    let meshType = '', meshColor = '';
    const matLabel = k => { const m = MAT_BY[k]; return m ? `${m.cat} · ${m.name}` : '—'; };
    const typeName = () => MAT_BY[meshType] ? matLabel(meshType) : 'не выбраны';
    const colorName = () => meshColor || '—';
    const typeNameOf = k => matLabel(k);
    const colorNameOf = k => k || '';
    const unitPrice = m => m.price * (1 + (SETTINGS.priceChange || 0) / 100);
    const matPriceTxt = m => `${fmtNum(unitPrice(m))} $/м²`;
    const V_OPTS = [
      ['side', 'Боковая фиксация', '', '7,42 $/м² (16/25 мм) · 10,17 $/м² (50 мм)'],
      ['holis', 'Держатель нижнего карниза Холис', '', 'бесплатно'],
      ['pvc', 'ПВХ крепления', 'optPvc', '$ за изделие'],
      ['ladder', 'Декоративная лесенка (50 мм)', 'optLadder', '$ за м²'],
      ['complex', 'Сложная форма', '', '+100% к стоимости']
    ];
    const V_MULTI = [['', 'Нет'], ['classic', 'Классические'], ['lever', 'С рычагом управления']];
    const V_ARCH = [['', 'Одна'], ['2', '2 ленты (+50%)'], ['3', '3–6 лент (+100%)']];
    const STACK = [''];
    function optsText(o) {
      const a = V_OPTS.filter(x => o[x[0]]).map(x => x[1].replace(' (50 мм)', ''));
      if (o.multi) a.push('Межрамные: ' + (V_MULTI.find(x => x[0] === o.multi) || [, ''])[1].toLowerCase());
      if (o.arch) a.push((V_ARCH.find(x => x[0] === o.arch) || [, ''])[1].replace(/ \\(.*\\)/, ''));
      if (o.holderB) a.push(`держатель тип «В» ${o.holderB} шт`);
      if (o.holderM) a.push(`держатель магнитный ${o.holderM} шт`);
      return a.join(', ');
    }

''')
region('    function renderChoices() {', "    document.getElementById('vMatSelect').addEventListener('change'", '''    function renderChoices() {
      const sel = document.getElementById('vMatSelect');
      if (!sel.options.length) {
        sel.add(new Option('— выберите ламели —', ''));
        Object.keys(V_GROUPS).forEach(g => {
          const og = document.createElement('optgroup'); og.label = V_GROUPS[g].title;
          MESH_TYPES.filter(m => m.g === g).forEach(m => og.appendChild(new Option(`${m.cat} · ${m.name} — ${fmtNum(m.price)} $`, m.key)));
          sel.appendChild(og);
        });
      }
      sel.value = meshType;
      document.getElementById('vColorInput').value = meshColor;
      const m = MAT_BY[meshType];
      document.getElementById('vMatInfo').textContent = m ? `${V_GROUPS[m.g].title}, цвет ${m.name}: ${matPriceTxt(m)} у дилера` : '';
      attachMatSearch(sel);
    }
''')

# ---------- настройки ----------
region('    const DEFAULT_SETTINGS = {', '    const SETTINGS_KEY = ', '''    const DEFAULT_SETTINGS = {
      rate: 95, tripFee: 1500, laborInstall: 500,
      priceChange: 0, minArea: 1,
      optSide1625: 7.4241, optSide50: 10.17, optHolderB: 0.1307862, optHolderM: 2.3391, optPvc: 15.65163,
      optInterClassic: 2.72, optInterLever: 22.32, optLadder: 4.87143,
      markup: 2, discount7: 7, discount12: 12, b2bExtra: 15,
      taxB2B: 6, minOrder: 0, roundStep: 10,
      laborMarkup: 0,
      labelW: 58, labelH: 40
    };
    const SETTINGS_DEF = [
      { group: 'Курс, доставка, установка', items: [
        ['rate', 'Курс $ дилера, ₽'],
        ['tripFee', 'Доставка от дилера, ₽ за заказ — в себестоимость'],
        ['laborInstall', 'Установка, ₽ за изделие'] ] },
      { group: 'Цены ламелей', items: [
        ['priceChange', 'Изменение всех цен ламелей от прайса 18.02.26, % (0 — как в прайсе)'],
        ['minArea', 'Минимальная расчётная площадь, м²'] ] },
      { group: 'Доп. опции, $', items: [
        ['optSide1625', 'Боковая фиксация 16, 25 мм, за м²'],
        ['optSide50', 'Боковая фиксация 50 мм, за м²'],
        ['optHolderB', 'Держатель нижнего карниза тип «В» Холис, за шт'],
        ['optHolderM', 'Держатель нижнего карниза магнитный, за шт'],
        ['optPvc', 'ПВХ крепления, за изделие'],
        ['optInterClassic', 'Межрамные классические, за м²'],
        ['optInterLever', 'Межрамные с рычагом управления, за изделие'],
        ['optLadder', 'Декоративная лесенка 50 мм, за м²'] ] },
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
rep("const SETTINGS_KEY = 'vertCalcSettings1';", "const SETTINGS_KEY = 'horizCalcSettings1';")
rep("const STATE_KEY = 'vertCalcState1';", "const STATE_KEY = 'horizCalcState1';")
rep("indexedDB.open('vertCalcPhotos', 1)", "indexedDB.open('horizCalcPhotos', 1)")
rep("const pricesEmpty = ['rate', 'priceE', 'price3']", "const pricesEmpty = ['rate']")

# ---------- изделие: крепление, без «сборки ламелей» ----------
rep('<select class="item-mount" onchange="calculateTotals()"><option>Потолок</option><option>Стена</option></select>',
    '<select class="item-mount" onchange="calculateTotals()"><option>В проём</option><option>На створку</option><option>На стену</option></select>')
rep('''          <div class="form-group" style="margin-top: 12px;"><label>Сборка ламелей</label>
            <select class="item-stack" onchange="calculateTotals()">${STACK.map(x => `<option>${x}</option>`).join('')}</select></div>''',
    '''          <select class="item-stack" style="display:none;"><option value=""></option></select>''')
rep('🪟 Ламели, цвет и опции: как в заказе', '🪟 Ламели и опции: как в заказе')
rep("btn.innerHTML = (ot || oc || ox)\n        ? `🪟 Ламели: ${mat} · цвет: ${col}", "btn.innerHTML = (ot || oc || ox)\n        ? `🪟 Ламели: ${mat}${oc ? ' · ' + col : ''}")

# окно изделия: свои поля опций
rep('<div class="form-group" style="margin-top:14px;"><label>Материал ламелей</label><select data-m></select></div>',
    '<div class="form-group" style="margin-top:14px;"><label>Ламели: ширина и цвет</label><select data-m></select></div>')
rep('<div class="form-group"><label>Цвет / номер ламели</label><input type="text" data-c',
    '<div class="form-group"><label>Примечание (необязательно)</label><input type="text" data-c')
rep('''            <div class="row">
              <div class="form-group col"><label>Мультифактура</label>''', '''            <div class="row">
              <div class="form-group col"><label>Держатель «В», шт</label><input type="number" min="0" step="1" data-hb value="${o.holderB || ''}" placeholder="0"></div>
              <div class="form-group col"><label>Магнитный, шт</label><input type="number" min="0" step="1" data-hm value="${o.holderM || ''}" placeholder="0"></div>
            </div>
            <div class="row">
              <div class="form-group col"><label>Межрамные</label>''')
rep('<div class="form-group col"><label>Арка без основания</label>', '<div class="form-group col"><label>Лент в полотне</label>')
rep("        if (mu) no.multi = mu; if (ar) no.arch = ar;", """        if (mu) no.multi = mu; if (ar) no.arch = ar;
        const hb = Math.max(0, parseInt(ov.querySelector('[data-hb]').value) || 0), hm = Math.max(0, parseInt(ov.querySelector('[data-hm]').value) || 0);
        if (hb) no.holderB = hb; if (hm) no.holderM = hm;""")

# ---------- расчёт ----------
region("          const unit = V_GROUPS[m.g].unit, o = it.opts;", "          it.usdBase = base;", """          const unit = 'm2', o = it.opts;
          const area = Math.max(S.minArea, it.w * it.h / 10000);
          const base = area * unitPrice(m);
          let add = 0;
          if (o.side) add += (m.g === 'l50' ? S.optSide50 : S.optSide1625) * area;
          if (o.holderB) add += S.optHolderB * o.holderB;
          if (o.holderM) add += S.optHolderM * o.holderM;
          if (o.pvc) add += S.optPvc;
          if (o.multi === 'classic') add += S.optInterClassic * area;
          if (o.multi === 'lever') add += S.optInterLever;
          if (o.ladder) add += S.optLadder * area;
          // проценты к стоимости изделия: сложная форма +100%, 2 ленты +50%, 3–6 лент +100%
          const pct = (o.complex ? 1 : 0) + (o.arch === '2' ? 0.5 : o.arch === '3' ? 1 : 0);
          const sum = (base + add) * (1 + pct);
""")
rep("const L = it.opts.multi ? MULTI_LIM : V_GROUPS[it.mat.g].lim;", "const L = (it.opts.multi && it.mat.g !== 'l50') ? MULTI_LIM : V_GROUPS[it.mat.g].lim;")
rep("noMat.length) { problem = 'Выберите материал ламелей.'; msg = 'Выберите материал ламелей — для заказа или для изделий: '",
    "noMat.length) { problem = 'Выберите ламели.'; msg = 'Выберите ламели (ширину и цвет) — для заказа или для изделий: '")

# ---------- тех часть и PDF: без «Сборки», «Цвет» → «Примечание» ----------
rep('<th class="left">Ламели</th><th>Цвет</th>', '<th class="left">Ламели</th><th>Примеч.</th>')
rep('<th>Сборка</th><th>Крепл.</th>', '<th>Крепл.</th>')
rep('<td>${it.cut.chain} см</td><td>${esc(it.stack)}</td>', '<td>${it.cut.chain} см</td>')
rep("        <td>${esc(it.stack)}</td><td>${esc(it.mount)}</td>", "        <td>${esc(it.mount)}</td>")
rep('''<th>№</th><th style="text-align: left;">Комната</th><th style="text-align: left;">Ламели</th><th>Цвет</th>''',
    '''<th>№</th><th style="text-align: left;">Комната</th><th style="text-align: left;">Ламели</th><th>Примечание</th>''')
rep('<th>Сборка</th><th>Крепление</th>', '<th>Крепление</th>')
rep("'Вертикальные жалюзи · размеры в см (ширина карниза × высота) · длина управления — 2/3 высоты'",
    "'Горизонтальные алюминиевые жалюзи · размеры в см (ширина × высота) · длина управления — 2/3 высоты'")

# ---------- наклейки ----------
rep("""            type: it.mat ? it.mat.name : '—', color: (it.color || (it.mat ? it.mat.cat : '')) + ' · упр. ' + it.ctrl,""",
    """            type: it.mat ? it.mat.name : '—', color: it.mat ? it.mat.cat + ' · упр. ' + it.ctrl : '',""")
rep("a.download = `vert_labels_${safe}", "a.download = `horiz_labels_${safe}")

# ---------- КП и заказ-наряд ----------
rep("Мы рады предложить вам вертикальные жалюзи по вашим индивидуальным размерам. Ламели поворачиваются на 180° и сдвигаются в сторону: легко регулировать освещение и закрыть окно от посторонних взглядов. Подходят для окон, балконов и офисов.",
    "Мы рады предложить вам горизонтальные алюминиевые жалюзи по вашим индивидуальным размерам. Ламели поворачиваются и поднимаются: легко регулировать освещение и закрыть окно от солнца и посторонних взглядов. Жалюзи компактные, практичные и легко моются.")
rep("<strong>Изделие:</strong> Вертикальные жалюзи</div>", "<strong>Изделие:</strong> Горизонтальные алюминиевые жалюзи</div>")
rep("""                <div style="margin-bottom: 8px;"><strong>Цвет:</strong> ${cColor}</div>""", "")
rep("ЗАКАЗ-НАРЯД № ${orderNo} (Вертикальные жалюзи)", "ЗАКАЗ-НАРЯД № ${orderNo} (Горизонтальные жалюзи)")
rep("""                    <div style="margin-bottom: 4px;"><strong>Цвет:</strong> ${cColor}</div>""", "")
rep("Ламели: <strong>${tShort}</strong> &nbsp;·&nbsp; Цвет: <strong>${cShort}</strong>", "Ламели: <strong>${tShort}</strong>")
rep("— вертикальные жалюзи` : `Заказ-наряд${pdfNo} — вертикальные жалюзи`", "— горизонтальные жалюзи` : `Заказ-наряд${pdfNo} — горизонтальные жалюзи`")
rep("const optText = it => [matLabel(it.type), it.color].filter(Boolean).join(', ');", "const optText = it => [matLabel(it.type), it.color].filter(Boolean).join(', ');")
rep("const optHead = () => 'Ламели, цвет';", "const optHead = () => 'Ламели';")

open(S + 'horiz_pre_amo.html', 'w').write(s)
left = [m for m in ['ертикальн', 'V_CATS', 'brClassic', 'priceE'] if m in s]
print('built; leftovers:', left)
