"""Калькулятор «Вертикальные жалюзи» (изделия дилера Amigo) — собирается из исходника москитных сеток."""
import os
S = os.path.dirname(os.path.abspath(__file__)) + '/'
s = open(S + 'mesh_pre_amo.html').read()

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

# ---------- экран ----------
rep('<title>Москитные сетки — SunProtection</title>', '<title>Вертикальные жалюзи — SunProtection</title>')
region('      <div class="block-title">Параметры сетки</div>', '    <div class="app-block">\n      <div class="block-title">Помещения и Размеры</div>', '''      <div class="block-title">Ламели</div>
      <div class="visual-hint" style="text-align:left;">Материал и цвет — для всего заказа. У отдельного изделия можно выбрать другие и включить доп. опции — кнопка под его размерами.</div>
      <div class="form-group">
        <label>Материал ламелей</label>
        <select id="vMatSelect"></select>
        <div class="visual-hint" id="vMatInfo" style="text-align:left; margin:6px 0 0;"></div>
      </div>
      <div class="form-group">
        <label>Цвет / номер ламели</label>
        <input type="text" id="vColorInput" placeholder="например: 0225 белый" autocomplete="off">
      </div>
    </div>

''')
rep('<div class="visual-hint" style="text-align:left;">Размеры сетки в см. Размеры реза — во вкладке «Тех часть заказа».</div>',
    '<div class="visual-hint" style="text-align:left;">Размеры изделия в см (ширина карниза × высота). Заказ дилеру — во вкладке «Тех часть заказа».</div>')
rep('<span>Профиль и импост:</span><span class="summary-value" id="costProfile">', '<span>Изделия у дилера:</span><span class="summary-value" id="costProfile">')
rep('<span>Полотно сетки:</span><span class="summary-value" id="costCloth">', '<span>Доп. опции у дилера:</span><span class="summary-value" id="costCloth">')
rep('<span>Комплектующие:</span><span class="summary-value" id="costParts">', '<span>Доставка от дилера:</span><span class="summary-value" id="costParts">')
rep('<span>Работы<span id="tripLabel"></span>:</span>', '<span>Установка<span id="tripLabel"></span>:</span>')
rep('Настройки — москитные сетки', 'Настройки — вертикальные жалюзи')
rep('+ Добавить сетку</button>', '+ Добавить изделие</button>')
rep('<div class="block-title">Раскрой профиля</div>', '<div class="block-title">Заказ дилеру</div>')
rep('<div class="app-block" id="blockBars">', '<div class="app-block" id="blockBars" style="display:none;">')
rep('<div class="block-title">Расход комплектующих (на весь заказ)</div>', '<div class="block-title">Итого по заказу дилеру</div>')
rep('    .tech-table.wrap td.left { white-space: normal; }\n', '''    .tech-table.wrap td.left { white-space: normal; }
    .summary-value, #costTotal { white-space: nowrap; }
    .io-opts label.chk { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 600; color: #1c1e21; margin: 0 0 10px; white-space: normal; cursor: pointer; }
    .io-opts label.chk input { width: 22px; height: 22px; flex: none; margin: 0; }
    .io-opts label.chk small { display: block; font-weight: 400; color: #7f8c8d; font-size: 12px; }
    .tech-table td.opts { white-space: normal; text-align: left; font-size: 12px; min-width: 120px; }

    /* поиск материала (как поиск ткани в UNI) */
    .ms-box { position: relative; }
    .ms-box input { padding-right: 40px; }
    .ms-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); border: none; background: transparent; color: #90949c; font-size: 16px; width: 30px; height: 30px; cursor: pointer; display: none; padding: 0; }
    .ms-box.has-value .ms-clear { display: block; }
    .ms-list { display: none; position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 60; max-height: 300px; overflow-y: auto; background: #fff; border: 1px solid #ced0d4; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
    .ms-list.open { display: block; }
    .ms-item { padding: 12px 14px; font-size: 15px; cursor: pointer; border-bottom: 1px solid #f0f2f5; display: flex; justify-content: space-between; gap: 10px; }
    .ms-item:last-child { border-bottom: none; }
    .ms-item.active, .ms-item:hover { background: #fdf0e6; }
    .ms-item mark { background: none; color: #d35400; font-weight: 700; }
    .ms-item .ms-meta { color: #90949c; font-size: 13px; white-space: nowrap; }
    .ms-empty { padding: 12px 14px; color: #90949c; font-size: 14px; }
''')

# ---------- справочники ----------
region('    const MESH_TYPES = [', '    // === ФОРМУЛЫ РЕЗА', '''    // === ПРАЙС ДИЛЕРА (Amigo, «Вертикальные», 18.02.26) — цены в $, правятся в настройках ===
    const V_GROUPS = {
      fabric:  { title: 'Тканевые', unit: 'm2', lim: { wMin: 20, wMax: 600, hMin: 50, hMax: 400, aMax: 20 } },
      breeze:  { title: 'Нитяные (Бриз)', unit: 'pm', lim: { wMin: 20, wMax: 600, hMin: 0, hMax: 300, aMax: 20 } },
      plastic: { title: 'Пластик', unit: 'm2', lim: { wMin: 20, wMax: 400, hMin: 30, hMax: 350, aMax: 14 } },
      alu:     { title: 'Алюминий', unit: 'm2', lim: { wMin: 20, wMax: 450, hMin: 50, hMax: 400, aMax: 15 } },
      cornice: { title: 'Карниз без ламелей', unit: 'pm', lim: { wMin: 20, wMax: 600, hMin: 0, hMax: 100000, aMax: 1e9 } }
    };
    const MULTI_LIM = { wMin: 20, wMax: 400, hMin: 50, hMax: 350, aMax: 14 };
    const V_CATS = [
      ['fabric', 'priceE', 'Кат. E', ['ЛАЙН II', 'ЛАЙН мокрый асфальт', 'ЛАЙН серый', 'МАЛЬТА', 'КЁЛЬН', 'ПЛЭЙН']],
      ['fabric', 'price1', 'Кат. 1', ['БОН', 'КРЕП', 'СЕУЛ']],
      ['fabric', 'price2', 'Кат. 2', ['БАЛИ', 'МИЛАН', 'РИО', 'РЕЙН', 'ШЕЛК II']],
      ['fabric', 'price3', 'Кат. 3', ['ВЕНЕРА', 'ЛИОН', 'РУАН', 'СИДЕ', 'АРГОС', 'ВИКТОРИЯ', 'МАИС', 'МАРСЕЛЬ', 'ЭЙЛАТ', 'ЛИВС', 'РОКОКО', 'САВАННА', 'СФЕРА', 'АРУБА']],
      ['fabric', 'price4', 'Кат. 4', ['БЕЙРУТ', 'ВЕНЕРА ЗОЛОТО', 'ВЕНЕРА СЕРЕБРО', 'ДЖАНГЛ', 'ПЕРЛ', 'РАТАН', 'ПЛЭЙН B/O', 'ОФИС B/O', 'СИДЕ B/O', 'ШЁЛК', 'СЭНДИ', 'МАНИЛА', 'ДЕЛЬТА B/O', 'ОПТИМА', 'КРИСТАЛЛ B/O']],
      ['fabric', 'price5', 'Кат. 5', ['АРИЗОНА B/O', 'ПЕРЛ B/O', 'СКРИН']],
      ['breeze', 'brClassic', 'Бриз', ['БРИЗ КЛАССИК']],
      ['breeze', 'brMulti', 'Бриз', ['БРИЗ MULTI']],
      ['breeze', 'brDouble', 'Бриз', ['БРИЗ DOUBLE']],
      ['breeze', 'brDoubleSp', 'Бриз', ['БРИЗ DOUBLE 1606, 4221, 2871, 1909']],
      ['plastic', 'plRib', 'Пластик', ['РИБКОРД']],
      ['plastic', 'plStd', 'Пластик', ['СТАНДАРТ']],
      ['plastic', 'plMarble', 'Пластик', ['МРАМОР 2']],
      ['plastic', 'plFrost', 'Пластик', ['ФРОСТ']],
      ['alu', 'aluGloss', 'Алюминий', ['БЕЛЫЙ ГЛЯНЕЦ', 'БЕЖЕВЫЙ ГЛЯНЕЦ', 'СЕРЫЙ ГЛЯНЕЦ', 'ЗОЛОТО', 'МЕТАЛЛИК', 'СЕРЕБРО']],
      ['alu', 'aluPerf', 'Алюминий', ['ПЕРФОРАЦИЯ БЕЛЫЙ ГЛЯНЕЦ', 'ПЕРФОРАЦИЯ МЕТАЛЛИК']],
      ['cornice', 'cornice', 'Карниз', ['КАРНИЗ В СБОРЕ (без ламелей)']]
    ];
    const MESH_TYPES = [];   // все материалы: key — id, name — название
    V_CATS.forEach(([g, pk, cat, names]) => names.forEach(n => MESH_TYPES.push({ key: g + ':' + n, name: n, g, pk, cat })));
    const MAT_BY = Object.fromEntries(MESH_TYPES.map(m => [m.key, m]));
    const MESH_COLORS = [];
    let meshType = '', meshColor = '';
    const typeName = () => (MAT_BY[meshType] || {}).name || 'не выбран';
    const colorName = () => meshColor || 'не указан';
    const typeNameOf = k => (MAT_BY[k] || {}).name || '—';
    const colorNameOf = k => k || '';
    const matLabel = k => { const m = MAT_BY[k]; return m ? (m.g === 'fabric' ? `${m.name} (${m.cat.toLowerCase()})` : m.name) : '—'; };
    const unitPrice = m => SETTINGS[m.pk];
    const matPriceTxt = m => `${fmtNum(unitPrice(m))} $/${V_GROUPS[m.g].unit === 'pm' ? 'пог. м' : 'м²'}`;
    const V_OPTS = [   // доп. опции на изделие
      ['onlySlats', 'Только ламели (без карниза)', 'optOnlySlats', '$ за м² — вычитается'],
      ['metal', 'Металлическая фурнитура', 'optMetal', '$ за м²'],
      ['clear', 'Прозрачная комплектация (цепь + замок)', 'optClear', '$ за изделие'],
      ['deco', 'Декоративный карниз', 'optDeco', '$ за пог. м'],
      ['electro', 'Карниз с электроприводом (доплата)', 'optElectro', '$ за пог. м'],
      ['tilt', 'Наклонные жалюзи', '', '+100% к стоимости']
    ];
    const V_MULTI = [['', 'Нет'], ['multiF2', 'Ткань, 2 слоя'], ['multiF3', 'Ткань, 3 слоя'], ['multiF4', 'Ткань, 4 слоя'], ['multiP2', 'Пластик, 2 слоя'], ['multiP3', 'Пластик, 3 слоя']];
    const V_ARCH = [['', 'Нет'], ['archF', 'Ткань'], ['archP', 'Пластик']];
    const STACK = ['К управлению', 'От управления', 'К центру', 'От центра'];
    function optsText(o) {
      const a = V_OPTS.filter(x => o[x[0]]).map(x => x[1].replace(' (без карниза)', '').replace(' (цепь + замок)', '').replace(' (доплата)', ''));
      if (o.multi) a.push('Мультифактура: ' + (V_MULTI.find(x => x[0] === o.multi) || [, ''])[1].toLowerCase());
      if (o.arch) a.push('Арка: ' + (V_ARCH.find(x => x[0] === o.arch) || [, ''])[1].toLowerCase());
      return a.join(', ');
    }

    function renderChoices() {
      const sel = document.getElementById('vMatSelect');
      if (!sel.options.length) {
        sel.add(new Option('— выберите материал —', ''));
        Object.keys(V_GROUPS).forEach(g => {
          const og = document.createElement('optgroup'); og.label = V_GROUPS[g].title;
          V_CATS.filter(c => c[0] === g).forEach(([, pk, cat, names]) => names.forEach(n => {
            const o = new Option(g === 'fabric' ? `${n} — ${cat.toLowerCase()}` : n, g + ':' + n); og.appendChild(o);
          }));
          sel.appendChild(og);
        });
      }
      sel.value = meshType;
      document.getElementById('vColorInput').value = meshColor;
      const m = MAT_BY[meshType];
      document.getElementById('vMatInfo').textContent = m ? `${V_GROUPS[m.g].title}${m.g === 'fabric' ? ', ' + m.cat.toLowerCase() : ''}: ${matPriceTxt(m)} у дилера` : '';
      attachMatSearch(sel);
    }
    document.getElementById('vMatSelect').addEventListener('change', e => { meshType = e.target.value; renderChoices(); calculateTotals(); });
    document.getElementById('vColorInput').addEventListener('input', e => { meshColor = e.target.value; calculateTotals(); });

''' + r'''    // === Поиск по списку материалов: превращает <select> в строку поиска с подсказками ===
    function attachMatSearch(sel) {
      if (sel.__ms) { sel.__ms.sync(); return sel.__ms; }
      const box = document.createElement('div'); box.className = 'ms-box';
      box.innerHTML = '<input type="text" autocomplete="off" spellcheck="false" placeholder="Название или номер цвета…"><button type="button" class="ms-clear" tabindex="-1" title="Очистить">✕</button><div class="ms-list"></div>';
      sel.insertAdjacentElement('beforebegin', box); sel.style.display = 'none';
      const inp = box.querySelector('input'), list = box.querySelector('.ms-list');
      const norm = t => String(t).toLowerCase().replace(/ё/g, 'е').replace(/[.,·—()«»]/g, ' ').replace(/\s+/g, ' ').trim();
      let matches = [], active = -1;
      const opts = () => [...sel.options].map(o => ({ v: o.value, t: o.text, g: o.parentElement.tagName === 'OPTGROUP' ? o.parentElement.label : '' }));
      const label = () => { const o = sel.options[sel.selectedIndex]; return o && o.value ? o.text : ''; };
      const hl = (t, q) => { const w = q.split(' ').filter(Boolean)[0]; if (!w) return esc(t); const i = norm(t).indexOf(w); return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + w.length)) + '</mark>' + esc(t.slice(i + w.length)); };
      function render() {
        const q = norm(inp.value), words = q.split(' ').filter(Boolean);
        matches = opts().filter(o => { const h = norm(o.t + ' ' + o.g); return words.every(w => h.includes(w)); });
        if (words.length) matches.sort((a, b) => (norm(b.t).startsWith(words[0]) ? 1 : 0) - (norm(a.t).startsWith(words[0]) ? 1 : 0));
        active = matches.length ? 0 : -1;
        list.innerHTML = matches.length
          ? matches.map((o, i) => `<div class="ms-item${i === active ? ' active' : ''}" data-i="${i}"><span>${hl(o.t, q)}</span><span class="ms-meta">${esc(o.g)}</span></div>`).join('')
          : '<div class="ms-empty">Ничего не найдено</div>';
        list.classList.add('open'); box.classList.toggle('has-value', inp.value !== '');
      }
      function setActive(i) {
        const it = list.querySelectorAll('.ms-item'); if (!it.length) return;
        active = (i + it.length) % it.length; it.forEach((el, k) => el.classList.toggle('active', k === active)); it[active].scrollIntoView({ block: 'nearest' });
      }
      function sync() { inp.value = label(); box.classList.toggle('has-value', inp.value !== ''); }
      function pick(o) {
        list.classList.remove('open');
        if (sel.value !== o.v) { sel.value = o.v; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        sync(); inp.blur();
      }
      inp.addEventListener('focus', () => { inp.select(); render(); });
      inp.addEventListener('input', render);
      inp.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); if (!list.classList.contains('open')) render(); else setActive(active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
        else if (e.key === 'Enter') { e.preventDefault(); if (active >= 0 && matches[active]) pick(matches[active]); }
        else if (e.key === 'Escape') { list.classList.remove('open'); sync(); inp.blur(); }
      });
      list.addEventListener('mousedown', e => { e.preventDefault(); const it = e.target.closest('.ms-item'); if (it) pick(matches[+it.dataset.i]); });
      inp.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== inp) { list.classList.remove('open'); sync(); } }, 150));
      box.querySelector('.ms-clear').addEventListener('mousedown', e => { e.preventDefault(); inp.value = ''; inp.focus(); render(); });
      sel.addEventListener('change', sync);
      sel.__ms = { sync };
      sync();
      return sel.__ms;
    }

''')

# ---------- «формулы» ----------
region('    // === ФОРМУЛЫ РЕЗА', '    // === НАСТРОЙКИ ===', '''    // Длина управления — 2/3 высоты (стандарт дилера)
    function cutParts(w, h) {
      return { chain: Math.round(h * 2 / 3), area: w * h / 10000, profW: w, profH: h };
    }

''')

# ---------- настройки ----------
region('    const DEFAULT_SETTINGS = {', '    const SETTINGS_KEY = ', '''    const DEFAULT_SETTINGS = {
      rate: 95, tripFee: 1500, laborInstall: 500,
      priceE: 12.35, price1: 13.87, price2: 14.84, price3: 17.06, price4: 22.36, price5: 30.07,
      brClassic: 93.62, brMulti: 93.62, brDouble: 105.93, brDoubleSp: 137.71,
      plRib: 23.56, plStd: 23.56, plMarble: 33.76, plFrost: 34.56,
      aluGloss: 34.37, aluPerf: 37.38, cornice: 12.32604,
      minArea: 1,
      optOnlySlats: 1.125, optMetal: 10.17, optClear: 1.979082, optDeco: 1.824498, optElectro: 4.068, optSketch: 11.404638,
      multiF2: 35.925525, multiF3: 47.893581, multiF4: 59.863671, multiP2: 47.893581, multiP3: 77.707953,
      archF: 23.949333, archP: 35.924508,
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
      { group: 'Тканевые, $ за м²', items: [
        ['priceE', 'Категория E'], ['price1', 'Категория 1'], ['price2', 'Категория 2'],
        ['price3', 'Категория 3'], ['price4', 'Категория 4'], ['price5', 'Категория 5'] ] },
      { group: 'Нитяные (Бриз), $ за пог. м ширины', items: [
        ['brClassic', 'Бриз классик'], ['brMulti', 'Бриз MULTI'], ['brDouble', 'Бриз DOUBLE'], ['brDoubleSp', 'Бриз DOUBLE 1606, 4221, 2871, 1909'] ] },
      { group: 'Пластик и алюминий, $ за м²', items: [
        ['plRib', 'Рибкорд'], ['plStd', 'Стандарт'], ['plMarble', 'Мрамор 2'], ['plFrost', 'Фрост'],
        ['aluGloss', 'Алюминий (глянец, золото, металлик, серебро)'], ['aluPerf', 'Алюминий перфорация'] ] },
      { group: 'Карниз и площадь', items: [
        ['cornice', 'Карниз в сборе (без ламелей), $ за пог. м'],
        ['minArea', 'Минимальная расчётная площадь, м²'] ] },
      { group: 'Доп. опции, $', items: [
        ['optOnlySlats', 'Только ламели (без карниза): минус за м²'],
        ['optMetal', 'Металлическая фурнитура, за м²'],
        ['optClear', 'Прозрачная комплектация, за изделие'],
        ['optDeco', 'Декоративный карниз, за пог. м'],
        ['optElectro', 'Доплата за карниз с электроприводом, за пог. м'],
        ['optSketch', 'Эскиз мультифактурных жалюзи, за изделие'],
        ['multiF2', 'Мультифактура ткань 2 слоя, за м²'], ['multiF3', 'Мультифактура ткань 3 слоя, за м²'], ['multiF4', 'Мультифактура ткань 4 слоя, за м²'],
        ['multiP2', 'Мультифактура пластик 2 слоя, за м²'], ['multiP3', 'Мультифактура пластик 3 слоя, за м²'],
        ['archF', 'Арка без основания, ткань, за м²'], ['archP', 'Арка без основания, пластик, за м²'] ] },
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
rep("const SETTINGS_KEY = 'meshCalcSettings3';", "const SETTINGS_KEY = 'vertCalcSettings1';")
rep("const STATE_KEY = 'meshCalcState1';", "const STATE_KEY = 'vertCalcState1';")
rep("indexedDB.open('meshCalcPhotos', 1)", "indexedDB.open('vertCalcPhotos', 1)")
rep("      if (MESH_COLORS.some(c => c.key === state.meshColor)) meshColor = state.meshColor;", "      if (typeof state.meshColor === 'string') meshColor = state.meshColor;")
rep("""          t: item.dataset.type || '', c: item.dataset.color || ''
        }));""", """          t: item.dataset.type || '', c: item.dataset.color || '', o: item.dataset.opts || '',
          ctrl: item.querySelector('.item-ctrl').value, stack: item.querySelector('.item-stack').value, mount: item.querySelector('.item-mount').value
        }));""")

# ---------- изделие ----------
rep('<span class="item-title-text">Сетка</span>', '<span class="item-title-text">Изделие</span>')
rep("row.querySelector('.item-title-text').textContent = `Сетка ${i + 1}`;", "row.querySelector('.item-title-text').textContent = `Изделие ${i + 1}`;")
rep("      const ownC = MESH_COLORS.some(c => c.key === data.c) ? data.c : '';", "      const ownC = typeof data.c === 'string' ? data.c : '';")
rep("""${ownC ? ` data-color="${ownC}"` : ''}>""", """${ownC ? ` data-color="${esc(ownC)}"` : ''}${data.o ? ` data-opts="${esc(data.o)}"` : ''}>""")
rep("""          <button type="button" class="item-opt-btn" onclick="openItemOpts('${itemId}')"></button>
        </div>`);
      renderItemOpt(document.getElementById(itemId));""", """          <div class="row" style="margin-top: 12px;">
            <div class="form-group col"><label>Управление</label>
              <select class="item-ctrl" onchange="calculateTotals()"><option value="Л">Слева</option><option value="П">Справа</option></select></div>
            <div class="form-group col"><label>Крепление</label>
              <select class="item-mount" onchange="calculateTotals()"><option>Потолок</option><option>Стена</option></select></div>
          </div>
          <div class="form-group" style="margin-top: 12px;"><label>Сборка ламелей</label>
            <select class="item-stack" onchange="calculateTotals()">${STACK.map(x => `<option>${x}</option>`).join('')}</select></div>
          <button type="button" class="item-opt-btn" onclick="openItemOpts('${itemId}')"></button>
        </div>`);
      const rowEl = document.getElementById(itemId);
      if (data.ctrl) rowEl.querySelector('.item-ctrl').value = data.ctrl;
      if (data.mount) rowEl.querySelector('.item-mount').value = data.mount;
      if (data.stack) rowEl.querySelector('.item-stack').value = data.stack;
      renderItemOpt(rowEl);""")
rep("""        delete item.dataset.type; delete item.dataset.color; renderItemOpt(item);""", """        delete item.dataset.type; delete item.dataset.color; delete item.dataset.opts; renderItemOpt(item);""")

region('    function renderItemOpt(row) {', '    // Разбор заказа:', '''    const itemOpts = row => { try { return JSON.parse(row.dataset.opts || '{}') || {}; } catch (e) { return {}; } };
    function renderItemOpt(row) {
      const btn = row && row.querySelector('.item-opt-btn');
      if (!btn) return;
      const ot = row.dataset.type || '', oc = row.dataset.color || '', ox = optsText(itemOpts(row));
      btn.classList.toggle('own', !!(ot || oc || ox));
      const mat = ot ? `<b>${esc(matLabel(ot))}</b>` : `${esc(typeName())} <span class="io-sub">(как в заказе)</span>`;
      const col = oc ? `<b>${esc(oc)}</b>` : `${esc(colorName())} <span class="io-sub">(как в заказе)</span>`;
      btn.innerHTML = (ot || oc || ox)
        ? `🪟 Ламели: ${mat} · цвет: ${col}${ox ? `<br>➕ <b>${esc(ox)}</b>` : ''}`
        : `🪟 Ламели, цвет и опции: как в заказе <span class="io-sub">· ${esc([MAT_BY[meshType] ? matLabel(meshType) : 'материал не выбран', meshColor].filter(Boolean).join(', '))} — нажмите, чтобы изменить</span>`;
    }
    function openItemOpts(itemId) {
      const row = document.getElementById(itemId);
      if (!row) return;
      const title = row.querySelector('.item-title-text').textContent;
      const ov = document.createElement('div');
      ov.className = 'settings-overlay open';
      const o = itemOpts(row);
      ov.innerHTML = `
        <div class="settings-panel" role="dialog" aria-label="Ламели и опции изделия">
          <div class="settings-panel-head">
            <div class="block-title" style="margin-bottom:0;">${esc(title)}: ламели и опции</div>
            <button type="button" class="settings-close" data-x aria-label="Закрыть">&times;</button>
          </div>
          <div class="form-group" style="margin-top:14px;"><label>Материал ламелей</label><select data-m></select></div>
          <div class="form-group"><label>Цвет / номер ламели</label><input type="text" data-c placeholder="${meshColor ? 'как в заказе: ' + esc(meshColor) : 'не указан'}" value="${esc(row.dataset.color || '')}"></div>
          <div class="io-opts">
            <label style="margin-bottom:8px;">Доп. опции (цены дилера)</label>
            ${V_OPTS.map(([k, name, pk, unit]) => `<label class="chk"><input type="checkbox" data-o="${k}"${o[k] ? ' checked' : ''}><span>${name}<small>${pk ? fmtNum(SETTINGS[pk]) + ' ' : ''}${unit}</small></span></label>`).join('')}
            <div class="row">
              <div class="form-group col"><label>Мультифактура</label><select data-multi>${V_MULTI.map(([k, t]) => `<option value="${k}"${o.multi === k ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
              <div class="form-group col"><label>Арка без основания</label><select data-arch>${V_ARCH.map(([k, t]) => `<option value="${k}"${o.arch === k ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
            </div>
          </div>
          <div style="display:flex; gap:8px; margin-top:12px;">
            <button type="button" class="btn-action btn-labels" data-reset style="margin:0;">Как в заказе</button>
            <button type="button" class="btn-action btn-pdf" data-x style="margin:0;">Готово</button>
          </div>
        </div>`;
      const sel = ov.querySelector('[data-m]');
      const src = document.getElementById('vMatSelect');
      sel.innerHTML = src.innerHTML;
      sel.options[0].text = `как в заказе: ${typeName()}`;
      sel.value = row.dataset.type || '';
      attachMatSearch(sel);
      const apply = () => {
        if (sel.value) row.dataset.type = sel.value; else delete row.dataset.type;
        const c = ov.querySelector('[data-c]').value.trim();
        if (c) row.dataset.color = c; else delete row.dataset.color;
        const no = {};
        ov.querySelectorAll('[data-o]').forEach(cb => { if (cb.checked) no[cb.dataset.o] = 1; });
        const mu = ov.querySelector('[data-multi]').value, ar = ov.querySelector('[data-arch]').value;
        if (mu) no.multi = mu; if (ar) no.arch = ar;
        if (Object.keys(no).length) row.dataset.opts = JSON.stringify(no); else delete row.dataset.opts;
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
rep("""        const ownT = row.dataset.type || '', ownC = row.dataset.color || '';
        items.push({ n: i + 1, room, w, h, qty, cut: c, type: ownT || meshType, color: ownC || meshColor, ownType: !!ownT, ownColor: !!ownC });""",
"""        const ownT = row.dataset.type || '', ownC = row.dataset.color || '';
        const type = ownT || meshType;
        items.push({ n: i + 1, room, w, h, qty, cut: c, type, mat: MAT_BY[type] || null, color: ownC || meshColor, opts: itemOpts(row),
          ctrl: row.querySelector('.item-ctrl').value, stack: row.querySelector('.item-stack').value, mount: row.querySelector('.item-mount').value,
          ownType: !!ownT, ownColor: !!ownC });""")

# ---------- расчёт ----------
region('      // проверки\n', '      const tripFee = items.length ? S.tripFee : 0;', '''      // проверки: материал и предельные размеры дилера
      let problem = '', msg = '';
      const noMat = items.filter(it => !it.mat);
      const bad = [];
      items.forEach(it => {
        if (!it.mat) return;
        const L = it.opts.multi ? MULTI_LIM : V_GROUPS[it.mat.g].lim;
        const why = [];
        if (it.w < L.wMin || it.w > L.wMax) why.push(`ширина ${L.wMin}–${L.wMax} см`);
        if (it.h < L.hMin || it.h > L.hMax) why.push(`высота ${L.hMin ? L.hMin + '–' : 'до '}${L.hMax} см`);
        if (it.w * it.h / 10000 > L.aMax) why.push(`площадь до ${L.aMax} м²`);
        if (why.length) bad.push(`изделие ${it.n} (${fmtNum(it.w)}×${fmtNum(it.h)}, ${it.mat.name}): ${why.join(', ')}`);
      });
      if (!items.length) problem = 'Добавьте размеры изделий.';
      else if (noMat.length) { problem = 'Выберите материал ламелей.'; msg = 'Выберите материал ламелей — для заказа или для изделий: ' + noMat.map(it => it.n).join(', ') + '.'; }
      else if (bad.length) { problem = 'Есть изделия вне предельных размеров дилера.'; msg = 'Вне предельных размеров дилера: ' + bad.join('; ') + '.'; }
      const blocked = !!(noMat.length || bad.length);

      // себестоимость: цена дилера ($ × курс) + доставка за заказ; установка — работа
      const rate = S.rate > 0 ? S.rate : 0;
      const t = { qty: 0, areaCalc: 0, usd: 0, byColor: {}, byType: {} };
      let costProfile = 0, costCloth = 0, costParts = 0, costLabor = 0;
      const unitLabor = noInstall ? 0 : S.laborInstall;
      items.forEach(it => {
        const m = it.mat;
        it.usd = 0; it.usdBase = 0; it.areaCalc = 0;
        if (m) {
          const unit = V_GROUPS[m.g].unit, o = it.opts;
          const area = Math.max(S.minArea, it.w * it.h / 10000), wm = it.w / 100;
          const base = (unit === 'pm' ? wm : area) * unitPrice(m);
          let add = 0;
          if (o.onlySlats && unit === 'm2') add -= S.optOnlySlats * area;
          if (o.metal) add += S.optMetal * area;
          if (o.clear) add += S.optClear;
          if (o.deco) add += S.optDeco * wm;
          if (o.electro) add += S.optElectro * wm;
          if (o.multi) add += (S[o.multi] || 0) * area + S.optSketch;
          if (o.arch) add += (S[o.arch] || 0) * area;
          let sum = base + add;
          if (o.tilt) sum *= 2;                       // наклонные: +100% к стоимости изделия
          it.usdBase = base; it.usd = sum; it.areaCalc = unit === 'pm' ? 0 : area;
        }
        it.markup = S.markup;
        it.unitMat = it.usd * rate;
        it.unitCost = it.unitMat + unitLabor;
        costProfile += it.usdBase * rate * it.qty; costCloth += (it.usd - it.usdBase) * rate * it.qty; costLabor += unitLabor * it.qty;
        t.qty += it.qty; t.areaCalc += it.areaCalc * it.qty; t.usd += it.usd * it.qty;
      });
''')
region('      // хлысты — отдельно по каждому цвету профиля', '      window.calcData = {', '''      const barGroups = [];
      const types = [...new Set(items.map(it => it.type).filter(k => MAT_BY[k]))];
      const colors = [...new Set(items.map(it => it.color))];

''')
rep("""        types, colors, mixedType: types.length > 1, mixedColor: colors.length > 1
      };""", """        types, colors, mixedType: true, mixedColor: true, rate
      };""")
rep("""      const pricesEmpty = ['profile', 'impost', 'clothStandard', 'clothAntimoshka', 'clothAntipyl', 'clothAntikoshka', 'cord', 'corner', 'impConn', 'mountKit', 'handle', 'laborMake']""",
    """      const pricesEmpty = ['rate', 'priceE', 'price3']""")
rep("""      show('costLabor', costLabor + tripFee); show('costTotal', totalCost);
      document.getElementById('tripLabel').textContent = tripFee > 0 ? ' и выезд' : '';""",
    """      show('costLabor', costLabor); show('costTotal', totalCost);
      document.getElementById('costParts').textContent = blocked ? '—' : rub(tripFee);
      document.getElementById('tripLabel').textContent = noInstall ? ' (без монтажа)' : '';""")
rep("'Изготовление и установка входят в цену без наценки.'", "'Установка входит в цену без наценки.'")
rep("Отметьте цену, которая пойдет в PDF.", "Отметьте цену, которая пойдет в PDF. Себестоимость — цена дилера по курсу и доставка.")

# ---------- итоги и тех часть ----------
region('    function componentsList() {', '    // === Визуализация хлыста', '''    function componentsList() {
      const d = window.calcData, t = d.totals;
      const usd = v => `${(Math.round(v * 100) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}`;
      return [
        ['Изделий', 'шт', t.qty],
        ['Расчётная площадь (не меньше ' + fmtNum(SETTINGS.minArea) + ' м² на изделие)', 'м²', t.areaCalc.toFixed(2)],
        ['Сумма у дилера', '$', usd(t.usd)],
        ['Сумма у дилера по курсу ' + fmtNum(d.rate), '₽', Math.round(t.usd * d.rate).toLocaleString('ru-RU')],
        ['Доставка от дилера', '₽', Math.round(d.tripFee).toLocaleString('ru-RU')]
      ];
    }
    const optText = it => [matLabel(it.type), it.color].filter(Boolean).join(', ');
    const optHead = () => 'Ламели, цвет';
    function countBy(key, nameOf) {
      const m = {}; window.calcData.items.forEach(it => { m[it[key]] = (m[it[key]] || 0) + it.qty; });
      return Object.keys(m).map(k => `${nameOf(k)} — ${m[k]} шт`).join(' · ');
    }
    const usd2 = v => (Math.round(v * 100) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

''')
region('    function renderTech(errText) {', '    // Развернуть блок на весь экран', '''    function renderTech(errText) {
      const d = window.calcData;
      const client = esc(document.getElementById('clientName').value || 'Не указан');
      const orderNo = esc(document.getElementById('orderNumber').value || 'Не указан');
      document.getElementById('techSummary').innerHTML = `
        <div class="summary-box">
          <div class="summary-row"><span>Номер заказа:</span><span class="summary-value">${orderNo}</span></div>
          <div class="summary-row"><span>Клиент:</span><span class="summary-value">${client}</span></div>
          <div class="summary-row"><span>Изделий всего:</span><span class="summary-value">${d.totals.qty} шт</span></div>
          <div class="summary-row"><span>Сумма у дилера:</span><span class="summary-value">${usd2(d.totals.usd)} $</span></div>
        </div>` + (errText ? `<div class="tech-error">${esc(errText)}</div>` : '');
      const empty = '<div class="tech-empty">Добавьте размеры на вкладке «Заказ-наряд».</div>';
      if (!d.items.length) { ['techCut', 'techComponents'].forEach(id => { document.getElementById(id).innerHTML = empty; }); return; }
      document.getElementById('techCut').innerHTML = `
        <div class="table-scroll"><table class="tech-table">
          <thead><tr><th>№</th><th class="left">Комната</th><th class="left">Ламели</th><th>Цвет</th><th>Ш × В, см</th><th>Кол-во</th>
            <th>Упр.</th><th>Длина упр.<small>2/3 В</small></th><th>Сборка</th><th>Крепл.</th><th class="left">Опции</th><th>Площадь<small>расч., м²</small></th><th>Дилер, $<small>за все шт</small></th></tr></thead>
          <tbody>${d.items.map(it => `<tr><td>${it.n}</td><td class="left">${esc(it.room)}</td><td class="left"><b>${esc(matLabel(it.type))}</b></td><td>${esc(it.color || '—')}</td>
            <td class="key">${fmtNum(it.w)}×${fmtNum(it.h)}</td><td>${it.qty}</td><td class="ctrl">${it.ctrl}</td><td>${it.cut.chain} см</td><td>${esc(it.stack)}</td><td>${esc(it.mount)}</td>
            <td class="opts">${esc(optsText(it.opts) || '—')}</td><td>${it.areaCalc ? it.areaCalc.toFixed(2) : '—'}</td><td><b>${usd2(it.usd * it.qty)}</b></td></tr>`).join('')}</tbody></table></div>`;
      document.getElementById('techComponents').innerHTML = `
        <div class="table-scroll"><table class="tech-table wrap">
          <thead><tr><th class="left">Наименование</th><th>Ед. изм.</th><th>Итого</th></tr></thead>
          <tbody>${componentsList().map(r => `<tr><td class="left">${esc(r[0])}</td><td>${r[1]}</td><td><strong>${r[2]}</strong></td></tr>`).join('')}</tbody></table></div>`;
    }

''')

# ---------- наклейки ----------
rep("fit('сетка Ш × В, см', subPx, leftW, false);", "fit('жалюзи Ш × В, см', subPx, leftW, false);")
rep("ctx.fillText('сетка Ш × В, см', pad, sizeBase + subPx * 1.45);", "ctx.fillText('жалюзи Ш × В, см', pad, sizeBase + subPx * 1.45);")
rep("""            type: typeNameOf(it.type), color: colorNameOf(it.color), room: it.room || '', qty: it.qty, copy: c }, W, H);""",
    """            type: it.mat ? it.mat.name : '—', color: (it.color || (it.mat ? it.mat.cat : '')) + ' · упр. ' + it.ctrl, room: it.room || '', qty: it.qty, copy: c }, W, H);""")
rep("if (!pages.length) throw new Error('нет сеток');", "if (!pages.length) throw new Error('нет изделий');")
rep("alert('Добавьте размеры сеток — наклеек пока нет.')", "alert('Добавьте размеры изделий — наклеек пока нет.')")
rep("a.download = `mesh_labels_${safe}", "a.download = `vert_labels_${safe}")
rep("— по одной на каждую сетку.`", "— по одной на каждое изделие.`")

# ---------- PDF ----------
rep("""      const tName = d.mixedType ? 'разные — см. спецификацию' : esc(typeNameOf(d.types[0])), cColor = d.mixedColor ? 'разные — см. спецификацию' : esc(colorNameOf(d.colors[0]));""",
    """      const tName = d.types.length === 1 ? esc(matLabel(d.types[0])) : 'разные — см. спецификацию', cColor = d.colors.length === 1 ? esc(d.colors[0] || 'не указан') : 'разные — см. спецификацию';""")
rep("const tShort = d.mixedType ? 'разные' : tName, cShort = d.mixedColor ? 'разные' : cColor;",
    "const tShort = d.types.length === 1 ? tName : 'разные', cShort = d.colors.length === 1 ? cColor : 'разные';")
rep("Полотно: <strong>${tShort}</strong> &nbsp;·&nbsp; Профиль: <strong>${cShort}</strong>", "Ламели: <strong>${tShort}</strong> &nbsp;·&nbsp; Цвет: <strong>${cShort}</strong>")
rep("Мы рады предложить вам изготовление москитных сеток по вашим индивидуальным размерам. Сетка защищает от насекомых и не мешает проветриванию; рамку легко снять для мытья окна и убрать на зиму.",
    "Мы рады предложить вам вертикальные жалюзи по вашим индивидуальным размерам. Ламели поворачиваются на 180° и сдвигаются в сторону: легко регулировать освещение и закрыть окно от посторонних взглядов. Подходят для окон, балконов и офисов.")
rep("""                <div style="margin-bottom: 8px;"><strong>Изделие:</strong> Москитная сетка рамочная</div>
                <div style="margin-bottom: 8px;"><strong>Полотно:</strong> ${tName}</div>
                <div style="margin-bottom: 8px;"><strong>Цвет профиля:</strong> ${cColor}</div>""",
    """                <div style="margin-bottom: 8px;"><strong>Изделие:</strong> Вертикальные жалюзи</div>
                <div style="margin-bottom: 8px;"><strong>Ламели:</strong> ${tName}</div>
                <div style="margin-bottom: 8px;"><strong>Цвет:</strong> ${cColor}</div>""")
rep("ЗАКАЗ-НАРЯД № ${orderNo} (Москитные сетки)", "ЗАКАЗ-НАРЯД № ${orderNo} (Вертикальные жалюзи)")
rep("""                    <div style="margin-bottom: 4px;"><strong>Полотно:</strong> ${tName}</div>
                    <div style="margin-bottom: 4px;"><strong>Цвет профиля:</strong> ${cColor}</div>
                    <div><strong>Сеток всего:</strong>""", """                    <div style="margin-bottom: 4px;"><strong>Ламели:</strong> ${tName}</div>
                    <div style="margin-bottom: 4px;"><strong>Цвет:</strong> ${cColor}</div>
                    <div><strong>Изделий всего:</strong>""")
rep("<h3 class=\"avoid-break\" style=\"font-size: 14px; margin: 15px 0 8px; color: #2c3e50; text-transform: uppercase;\">Расход комплектующих (на весь заказ)</h3>",
    "<h3 class=\"avoid-break\" style=\"font-size: 14px; margin: 15px 0 8px; color: #2c3e50; text-transform: uppercase;\">Итого по заказу дилеру</h3>")
rep("""<span>Профиль и импост:</span> <strong>${fmtRub(d.costProfile)} ₽</strong>""", """<span>Изделия у дилера:</span> <strong>${fmtRub(d.costProfile)} ₽</strong>""")
rep("""<span>Полотно:</span> <strong>${fmtRub(d.costCloth)} ₽</strong>""", """<span>Доп. опции у дилера:</span> <strong>${fmtRub(d.costCloth)} ₽</strong>""")
rep("""<span>Комплектующие:</span> <strong>${fmtRub(d.costParts)} ₽</strong>""", """<span>Доставка от дилера:</span> <strong>${fmtRub(d.tripFee)} ₽</strong>""")
rep("""<span>Работы${d.tripFee > 0 ? ', выезд' : ''}${d.noInstall ? ' (без монтажа)' : ''}:</span> <strong>${fmtRub(d.costLabor + d.tripFee)} ₽</strong>""",
    """<span>Установка${d.noInstall ? ' (без монтажа)' : ''}:</span> <strong>${fmtRub(d.costLabor)} ₽</strong>""")
region("      const cutRows = d.items.map(it =>", "      const sheetHeader = ", """      const cutRows = d.items.map(it => `<tr><td>${it.n}</td><td style="text-align:left;">${esc(it.room)}</td><td style="text-align:left; font-weight:bold;">${esc(matLabel(it.type))}</td><td>${esc(it.color || '—')}</td>
        <td style="font-weight:bold; color:#16a085;">${fmtNum(it.w)}×${fmtNum(it.h)}</td><td>${it.qty}</td><td style="font-weight:bold; color:#d35400;">${it.ctrl}</td><td>${it.cut.chain}</td>
        <td>${esc(it.stack)}</td><td>${esc(it.mount)}</td><td style="text-align:left;">${esc(optsText(it.opts) || '—')}</td><td>${it.areaCalc ? it.areaCalc.toFixed(2) : '—'}</td><td style="font-weight:bold;">${usd2(it.usd * it.qty)}</td><td></td></tr>`).join('');

""")
region("            ${sheetHeader('Раскрой профиля', 'Москитные сетки · размеры в см')}", "          </div>\n\n        </div>`;", """            ${sheetHeader('Заказ дилеру', 'Вертикальные жалюзи · размеры в см (ширина карниза × высота) · длина управления — 2/3 высоты')}
            <table class="lt-table">
              <thead><tr style="background-color: #ecf0f1;">
                <th>№</th><th style="text-align: left;">Комната</th><th style="text-align: left;">Ламели</th><th>Цвет</th><th>Ш × В</th><th>Кол-во</th><th>Упр.</th><th>Длина упр.</th>
                <th>Сборка</th><th>Крепление</th><th style="text-align: left;">Опции</th><th>Площадь, м²</th><th>Дилер, $</th><th>Готово</th>
              </tr></thead>
              <tbody>${cutRows}</tbody>
            </table>
            <div style="margin-top: 10px; font-size: 13px; text-align: right;">Итого у дилера: <b>${usd2(d.totals.usd)} $</b> · по курсу ${fmtNum(d.rate)} ₽: <b>${fmtRub(d.totals.usd * d.rate)} ₽</b> · доставка: <b>${fmtRub(d.tripFee)} ₽</b></div>
""")
rep("— москитные сетки` : `Заказ-наряд${pdfNo} — москитные сетки`", "— вертикальные жалюзи` : `Заказ-наряд${pdfNo} — вертикальные жалюзи`")

# служебное поле цены из сеток назывется it.mat — у нас it.mat это материал, переименовываем
rep("        it.mat = mat + (matNoTrip > 0 ?", "        it.matCost = mat + (matNoTrip > 0 ?")
rep("        it.lineCost = it.mat + it.lab;", "        it.lineCost = it.matCost + it.lab;")
rep("return laborWithMarkup ? it.lineCost * k : it.mat * k + it.lab;", "return laborWithMarkup ? it.lineCost * k : it.matCost * k + it.lab;")
open(S + 'vert_pre_amo.html', 'w').write(s)
left = [m for m in ['москитн', 'Москитн', 'сетк', 'barGroups.map', 'it.cut.imp', 'colorExtra', 'laborMake'] if m in s]
print('built; leftovers:', left)
