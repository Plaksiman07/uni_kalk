"""Калькулятор «Сетки плиссе (узкая серия)» — собирается из исходника москитных сеток."""
import os
S = os.path.dirname(os.path.abspath(__file__)) + '/'
s = open(S + 'mesh_pre_amo.html').read()

def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    assert n == cnt, (n, a[:90])
    s = s.replace(a, b)

def region(start, end, new, incl_end=False):
    """заменить кусок от start (включительно) до end (не включительно, если incl_end=False)"""
    global s
    assert s.count(start) == 1, ('start', start[:80], s.count(start))
    i = s.index(start)
    j = s.index(end, i)
    if incl_end: j += len(end)
    s = s[:i] + new + s[j:]

# ---------- заголовок, тексты экрана ----------
rep('    .tech-table.wrap td.left { white-space: normal; }\n', '    .tech-table.wrap td.left { white-space: normal; }\n    .summary-value, #costTotal { white-space: nowrap; }\n')
rep('<title>Москитные сетки — SunProtection</title>', '<title>Сетки плиссе — SunProtection</title>')
region('      <div class="block-title">Параметры сетки</div>', '      <div class="form-group">\n        <label>Цвет профиля</label>',
'''      <div class="block-title">Параметры плиссе</div>
      <div class="visual-hint" style="text-align:left;">Сетка плиссе, узкая серия. Цвет — для всего заказа; если у отдельного изделия другой цвет, нажмите кнопку «Цвет профиля» под его размерами.</div>
      <div class="form-group" style="display:none;">
        <label>Тип полотна</label>
        <div class="type-options" id="typeOptions"></div>
      </div>
''')
rep('<div class="visual-hint" style="text-align:left;">Размеры сетки в см. Размеры реза — во вкладке «Тех часть заказа».</div>',
    '<div class="visual-hint" style="text-align:left;">Вводите световой проём (СВП) в см. Готовое изделие = СВП + 5 см по ширине и высоте. Размеры реза — во вкладке «Тех часть заказа».</div>')
rep('<span>Профиль и импост:</span><span class="summary-value" id="costProfile">', '<span>Профиль рамочный и створочный:</span><span class="summary-value" id="costProfile">')
rep('<span>Полотно сетки:</span><span class="summary-value" id="costCloth">', '<span>Полотно плиссе:</span><span class="summary-value" id="costCloth">')
rep('<span>Комплектующие:</span><span class="summary-value" id="costParts">', '<span>Лента, нить, комплектующие:</span><span class="summary-value" id="costParts">')
rep('Настройки — москитные сетки', 'Настройки — сетки плиссе')
rep('+ Добавить сетку</button>', '+ Добавить изделие</button>')

# ---------- справочники ----------
region('    const MESH_TYPES = [', '    function renderChoices() {', '''    const MESH_TYPES = [
      { key: 'plisse', name: 'Плиссе узкая', icon: '🪟' }
    ];
    const MESH_COLORS = [
      { key: 'white', name: 'Белый', hex: '#ffffff' },
      { key: 'brown', name: 'Коричневый', hex: '#6f4e37' },
      { key: 'anthracite', name: 'Антрацит', hex: '#36454f' }
    ];
    let meshType = 'plisse', meshColor = 'white';
    const typeName = () => (MESH_TYPES.find(t => t.key === meshType) || MESH_TYPES[0]).name;
    const colorName = () => (MESH_COLORS.find(c => c.key === meshColor) || MESH_COLORS[0]).name;
    const typeNameOf = k => (MESH_TYPES.find(t => t.key === k) || MESH_TYPES[0]).name;
    const colorNameOf = k => (MESH_COLORS.find(c => c.key === k) || MESH_COLORS[0]).name;
    const colorHexOf = k => (MESH_COLORS.find(c => c.key === k) || MESH_COLORS[0]).hex;

''')

# ---------- формулы реза ----------
region('    // === ФОРМУЛЫ РЕЗА (см)', '    // === НАСТРОЙКИ ===', '''    // === ФОРМУЛЫ (см) — из таблицы «Плиссе узкая» ===
    // w, h — световой проём (СВП). Готовое изделие (ГИ) = СВП + 5.
    function cutParts(w, h) {
      const giW = r1(w + 5), giH = r1(h + 5);
      const profH = r1(giH - 5);                 // профиль рамочный по высоте, 2 шт
      const profW = r1(giW - 2.8);               // профиль рамочный по ширине, 2 шт
      const imp = r1(profH - 0.7);               // профиль створочный (створка), 1 шт
      const meshH = r1(profH + 2);               // высота полотна
      const tape = r1(meshH - 3);                // окантовочная лента, 2 шт
      return {
        giW, giH, profW, profH, imp, meshH, tape,
        folds: Math.round(giW / 2.3),                         // количество складок
        thread: r1((giW + giH) * 2 + 20),                     // нить плиссе, 4 шт
        holeStep: Number(((tape - 8) / 7).toFixed(2))         // расстояние между 8 отверстиями ленты
      };
    }

''')

# ---------- настройки ----------
region('    const DEFAULT_SETTINGS = {', '    const SETTINGS_KEY = ', '''    const DEFAULT_SETTINGS = {
      laborMake: 150, laborInstall: 200,
      frameWhite: 190, sashWhite: 280, frameBrown: 190, sashBrown: 280, frameAnthracite: 190, sashAnthracite: 280,
      cloth: 118, clothWaste: 0, tape: 33, thread: 3,
      accKit: 76.3, overlayKit: 60, plugs: 1.2, screwsPress: 39, screws40: 6, screws19: 1.8,
      markup: 4, discount7: 7, discount12: 12, b2bExtra: 15,
      taxB2B: 6, tripFee: 0, minOrder: 0, roundStep: 10,
      laborMarkup: 0,
      metalWaste: 0, barLen: 600, sawKerf: 0.3,
      labelW: 58, labelH: 40
    };
    const SETTINGS_DEF = [
      { group: 'Работы', items: [
        ['laborMake', 'Изготовление, ₽ за изделие'],
        ['laborInstall', 'Установка, ₽ за изделие'] ] },
      { group: 'Профиль, ₽/м.п. — по цветам', items: [
        ['frameWhite', 'Рамочный, белый'], ['sashWhite', 'Створочный, белый'],
        ['frameBrown', 'Рамочный, коричневый'], ['sashBrown', 'Створочный, коричневый'],
        ['frameAnthracite', 'Рамочный, антрацит'], ['sashAnthracite', 'Створочный, антрацит'] ] },
      { group: 'Полотно и расходники', items: [
        ['cloth', 'Сетка плиссе, ₽/м² (по размеру готового изделия)'],
        ['clothWaste', 'Запас сетки, %'],
        ['tape', 'Окантовочная лента, ₽/м.п.'],
        ['thread', 'Нить плиссе, ₽/м.п.'] ] },
      { group: 'Комплектующие (на одно изделие)', items: [
        ['accKit', 'Комплект аксессуаров (углы, ролики, шконты, люверсы и т. п.), ₽'],
        ['overlayKit', 'Комплект накладок, ₽'],
        ['plugs', 'Заглушки 8 мм, ₽ за 2 шт'],
        ['screwsPress', 'Саморезы с пресс-шайбой, ₽ за 18 шт'],
        ['screws40', 'Саморезы 40 мм, ₽ за 4 шт'],
        ['screws19', 'Саморезы 19 мм, ₽ за 2 шт'] ] },
      { group: 'Наценки и скидки', items: [
        ['laborMarkup', 'Изготовление и установка в цене клиента', [[0, 'Без наценки'], [1, 'С наценкой']]],
        ['markup', 'Наценка: материалы ×'],
        ['discount7', 'Первая скидка, %'],
        ['discount12', 'Вторая скидка, %'],
        ['b2bExtra', 'Оплата по Р/С: наценка к материалам больше на, %'],
        ['taxB2B', 'Налог с оплаты по Р/С, %'],
        ['roundStep', 'Округлять цены вверх до, ₽ (0 — не округлять)'] ] },
      { group: 'Заказ целиком', items: [
        ['tripFee', 'Выезд (замер, доставка), ₽ за заказ — в себестоимость'],
        ['minOrder', 'Минимальная сумма заказа, ₽ (0 — нет)'] ] },
      { group: 'Профиль: хлысты и отход', items: [
        ['barLen', 'Длина хлыста профиля, см'],
        ['sawKerf', 'Пропил, см'],
        ['metalWaste', 'Запас на обрезки профиля в себестоимости, %'] ] },
      { group: 'Наклейки (термопринтер)', items: [
        ['labelW', 'Ширина наклейки, мм'],
        ['labelH', 'Высота наклейки, мм'] ] }
    ];
''')
rep("const SETTINGS_KEY = 'meshCalcSettings3';", "const SETTINGS_KEY = 'plisseCalcSettings1';")
rep("const STATE_KEY = 'meshCalcState1';", "const STATE_KEY = 'plisseCalcState1';")
rep("indexedDB.open('meshCalcPhotos', 1)", "indexedDB.open('plisseCalcPhotos', 1)")

# ---------- изделие ----------
rep('<span class="item-title-text">Сетка</span>', '<span class="item-title-text">Изделие</span>')
rep("row.querySelector('.item-title-text').textContent = `Сетка ${i + 1}`;", "row.querySelector('.item-title-text').textContent = `Изделие ${i + 1}`;")
rep('<label>Ширина (см)</label>', '<label>Ш, СВП</label>')
rep('<label>Высота (см)</label>', '<label>В, СВП</label>')

# цвет отдельного изделия (полотно у плиссе одно)
region('    function renderItemOpt(row) {', '    function openItemOpts(itemId) {', '''    function renderItemOpt(row) {
      const btn = row && row.querySelector('.item-opt-btn');
      if (!btn) return;
      const oc = row.dataset.color || '';
      btn.classList.toggle('own', !!oc);
      btn.innerHTML = oc
        ? `🎨 Цвет профиля: <b>${esc(colorNameOf(oc).toLowerCase())}</b>`
        : `🎨 Цвет профиля: как в заказе <span class="io-sub">· ${esc(colorName().toLowerCase())} — нажмите, чтобы изменить</span>`;
    }
''')
region('          <div class="form-group" style="margin-top:14px;"><label>Тип полотна</label>', '          <div class="form-group"><label>Цвет профиля</label>', '')
rep('<div class="io-colors">', '<div class="io-colors" style="margin-top:14px;">')
rep('${esc(title)}: полотно и цвет</div>', '${esc(title)}: цвет профиля</div>')
rep('aria-label="Полотно и цвет сетки"', 'aria-label="Цвет профиля изделия"')

# ---------- расчёт ----------
rep("""        problem = 'Есть сетки со слишком маленьким размером.';
        msg = 'Слишком маленький размер: ' + tooSmall.map(it => `сетка ${it.n} (${fmtNum(it.w)}×${fmtNum(it.h)})`).join(', ') + '. Ширина и высота должны быть больше 6 см.';""",
"""        problem = 'Есть изделия со слишком маленьким размером.';
        msg = 'Слишком маленький размер: ' + tooSmall.map(it => `изделие ${it.n} (${fmtNum(it.w)}×${fmtNum(it.h)})`).join(', ') + '.';""")
rep('      const blocked = tooSmall.length > 0;\n', '''      // пределы: высота сетки — не больше высоты рулона, профиль — не длиннее хлыста
      const L0 = S.barLen > 0 ? S.barLen : 600, rollH = (S.clothRollH > 0 ? S.clothRollH : 3) * 100;
      const tooBig = items.filter(it => it.cut.meshH > rollH || Math.max(it.cut.profW, it.cut.profH) > L0);
      if (!problem && tooBig.length) {
        problem = 'Есть изделия больше допустимого размера.';
        msg = 'Слишком большой размер: ' + tooBig.map(it => `изделие ${it.n} (${fmtNum(it.w)}×${fmtNum(it.h)}): ` +
          (it.cut.meshH > rollH ? `высота сетки ${fmtNum(it.cut.meshH)} см больше высоты рулона ${fmtNum(rollH)} см` : `профиль ${fmtNum(Math.max(it.cut.profW, it.cut.profH))} см длиннее хлыста ${fmtNum(L0)} см`)).join('; ') + '.';
      }
      const blocked = tooSmall.length > 0 || tooBig.length > 0;
''')
region('      // расход и себестоимость: у каждой сетки', '      const tripFee = items.length ? S.tripFee : 0;', '''      // расход и себестоимость: у каждого изделия свой цвет профиля (по умолчанию — как в заказе)
      const mw = 1 + S.metalWaste / 100;
      const PROF = {
        white: [S.frameWhite, S.sashWhite], brown: [S.frameBrown, S.sashBrown], anthracite: [S.frameAnthracite, S.sashAnthracite]
      };
      const t = { qty: 0, frameCm: 0, impCm: 0, clothM: 0, cordCm: 0, threadCm: 0, byColor: {}, byType: {} };
      let costProfile = 0, costCloth = 0, costParts = 0, costLabor = 0;
      const unitLabor = S.laborMake + (noInstall ? 0 : S.laborInstall);
      const kitPerItem = S.accKit + S.overlayKit + S.plugs + S.screwsPress + S.screws40 + S.screws19;
      items.forEach(it => {
        const c = it.cut;
        const [pFrame, pSash] = PROF[it.color] || PROF.white;
        const frameCm = 2 * (c.profW + c.profH), impCm = c.imp;
        const clothM2 = (c.giW / 100) * (c.giH / 100) * (1 + S.clothWaste / 100);   // сетка, м² по ГИ
        const tapeCm = 2 * c.tape, threadCm = 4 * c.thread;
        const prof = (frameCm / 100) * mw * pFrame + (impCm / 100) * mw * pSash;
        const cloth = clothM2 * S.cloth;
        const parts = (tapeCm / 100) * S.tape + (threadCm / 100) * S.thread + kitPerItem;
        it.markup = S.markup;
        it.unitMat = prof + cloth + parts;
        it.unitCost = it.unitMat + unitLabor;
        costProfile += prof * it.qty; costCloth += cloth * it.qty; costParts += parts * it.qty; costLabor += unitLabor * it.qty;
        t.qty += it.qty; t.frameCm += frameCm * it.qty; t.impCm += impCm * it.qty; t.clothM += clothM2 * it.qty;
        t.cordCm += tapeCm * it.qty; t.threadCm += threadCm * it.qty;
        const bc = t.byColor[it.color] || (t.byColor[it.color] = { frameCm: 0, impCm: 0 });
        bc.frameCm += frameCm * it.qty; bc.impCm += impCm * it.qty;
        t.byType[it.type] = (t.byType[it.type] || 0) + clothM2 * it.qty;
      });
''')
rep("""            framePieces.push({ len: it.cut.profW, n: it.n, kind: 'Ш' }, { len: it.cut.profW, n: it.n, kind: 'Ш' },
                             { len: it.cut.profH, n: it.n, kind: 'В' }, { len: it.cut.profH, n: it.n, kind: 'В' });
            impPieces.push({ len: it.cut.imp, n: it.n, kind: 'И' });""",
"""            framePieces.push({ len: it.cut.profW, n: it.n, kind: 'Ш' }, { len: it.cut.profW, n: it.n, kind: 'Ш' },
                             { len: it.cut.profH, n: it.n, kind: 'В' }, { len: it.cut.profH, n: it.n, kind: 'В' });
            impPieces.push({ len: it.cut.imp, n: it.n, kind: 'С' });""")
rep("""      const pricesEmpty = ['profile', 'impost', 'clothStandard', 'clothAntimoshka', 'clothAntipyl', 'clothAntikoshka', 'cord', 'corner', 'impConn', 'mountKit', 'handle', 'laborMake']""",
    """      const pricesEmpty = ['frameWhite', 'sashWhite', 'cloth', 'tape', 'thread', 'accKit', 'overlayKit', 'laborMake']""")
rep("const kindTxt = k => k === 'И' ? 'Имп' : k;", "const kindTxt = k => k === 'С' ? 'Ств' : k;")

# ---------- расход комплектующих ----------
region('    function componentsList() {', '    // Полотно / цвет позиции', '''    function componentsList() {
      const d = window.calcData, t = d.totals;
      const m = cm => (cm / 100).toFixed(2);
      const bars = (key, part) => { const g = d.barGroups.find(x => x.color === key); return g ? g[part].bars.length : 0; };
      const cols = MESH_COLORS.filter(c => t.byColor[c.key]);
      const q = t.qty;
      return [
        ...cols.map(c => [`Профиль рамочный, ${c.name.toLowerCase()} (хлыстов: ${bars(c.key, 'frame')})`, 'м.п.', m(t.byColor[c.key].frameCm)]),
        ...cols.map(c => [`Профиль створочный, ${c.name.toLowerCase()} (хлыстов: ${bars(c.key, 'imp')})`, 'м.п.', m(t.byColor[c.key].impCm)]),
        [`Сетка плиссе (по размеру ГИ${SETTINGS.clothWaste ? ', запас ' + fmtNum(SETTINGS.clothWaste) + '%' : ''})`, 'м²', t.clothM.toFixed(2)],
        ['Окантовочная лента (2 шт на изделие)', 'м.п.', m(t.cordCm)],
        ['Нить плиссе (4 шт на изделие)', 'м.п.', m(t.threadCm)],
        ['Углы', 'шт', q * 4],
        ['Ролики', 'шт', q * 2],
        ['Шконты', 'шт', q * 2],
        ['Заглушки 8 мм', 'шт', q * 2],
        ['Заглушки на углы', 'шт', q * 4],
        ['Люверсы 5 мм', 'шт', q * 16],
        ['Саморезы с пресс-шайбой', 'шт', q * 18],
        ['Саморезы 40 мм', 'шт', q * 4],
        ['Саморезы 19 мм', 'шт', q * 2],
        ['Комплект аксессуаров', 'компл', q],
        ['Комплект накладок', 'компл', q]
      ];
    }
''')

# ---------- тех часть ----------
rep("""          <div class="summary-row"><span>Полотно:</span><span class="summary-value" style="text-align:right;">${d.mixedType ? countBy('type', typeNameOf) : (d.types[0] ? typeNameOf(d.types[0]) : typeName())}</span></div>""",
    """          <div class="summary-row"><span>Изделие:</span><span class="summary-value" style="text-align:right;">Сетка плиссе, узкая серия</span></div>""")
rep("""<span>Сеток всего:</span><span class="summary-value">${d.totals.qty} шт</span>""", """<span>Изделий всего:</span><span class="summary-value">${d.totals.qty} шт</span>""")
region("""      document.getElementById('techCut').innerHTML = `""", """      document.getElementById('techBars').innerHTML =""", """      document.getElementById('techCut').innerHTML = `
        <div class="table-scroll"><table class="tech-table">
          <thead><tr><th>№</th><th class="left">Комната</th><th>Кол-во</th><th>СВП<small>Ш × В</small></th><th>ГИ<small>СВП + 5</small></th>${mixed ? `<th>${optHead()}</th>` : ''}
            <th>Профиль В<small>(ГИ В − 5), 2 шт</small></th><th>Профиль Ш<small>(ГИ Ш − 2,8), 2 шт</small></th>
            <th>Створка<small>(проф. В − 0,7), 1 шт</small></th><th>Сетка В<small>(проф. В + 2)</small></th><th>Складок<small>(ГИ Ш / 2,3)</small></th>
            <th>Нить<small>4 шт</small></th><th>Лента<small>(сетка В − 3), 2 шт</small></th><th>Шаг отв.<small>8 отв.</small></th></tr></thead>
          <tbody>${d.items.map(it => `<tr><td>${it.n}</td><td class="left">${esc(it.room)}</td><td>${it.qty} шт</td>
            <td>${fmtNum(it.w)}×${fmtNum(it.h)}</td><td><b>${fmtNum(it.cut.giW)}×${fmtNum(it.cut.giH)}</b></td>${mixed ? `<td class="opt">${esc(optText(it))}</td>` : ''}
            <td class="key">${it.cut.profH} см</td><td class="key">${it.cut.profW} см</td><td class="key">${it.cut.imp} см</td>
            <td>${it.cut.meshH} см</td><td>${it.cut.folds}</td><td class="ctrl">${it.cut.thread} см</td><td class="ctrl">${it.cut.tape} см</td><td>${it.cut.holeStep} см</td></tr>`).join('')}</tbody></table></div>`;

""")
rep("""Рама — с пазом под шнур, импост — без паза. На отрезке: номер сетки · Ш / В / Имп · длина в см.""",
    """Рамочный профиль — с пазом, створочный — без паза. На отрезке: номер изделия · Ш / В / Ств · длина в см.""")
rep("""        d.barGroups.map(g => barsHtml(g.frame, `Профиль рамочный, ${g.name.toLowerCase()} (с пазом)`, true, g.color) + barsHtml(g.imp, `Импост, ${g.name.toLowerCase()} (без паза)`, false, g.color)).join('');""",
    """        d.barGroups.map(g => barsHtml(g.frame, `Профиль рамочный, ${g.name.toLowerCase()}`, true, g.color) + barsHtml(g.imp, `Профиль створочный, ${g.name.toLowerCase()}`, false, g.color)).join('');""")
rep("`сетка ${p.n} (${p.len} см)`", "`изделие ${p.n} (${p.len} см)`")

# ---------- наклейки ----------
rep("fit('сетка Ш × В, см', subPx, leftW, false);", "fit('плиссе ГИ Ш × В, см', subPx, leftW, false);")
rep("ctx.fillText('сетка Ш × В, см', pad, sizeBase + subPx * 1.45);", "ctx.fillText('плиссе ГИ Ш × В, см', pad, sizeBase + subPx * 1.45);")
rep("""          drawLabel(ctx, { order: orderNoRaw ? '№ ' + orderNoRaw : 'без номера', n: it.n, size: `${num(it.w)}×${num(it.h)}`,
            type: typeNameOf(it.type), color: colorNameOf(it.color),""",
    """          drawLabel(ctx, { order: orderNoRaw ? '№ ' + orderNoRaw : 'без номера', n: it.n, size: `${num(it.cut.giW)}×${num(it.cut.giH)}`,
            type: 'Плиссе', color: colorNameOf(it.color),""")
rep("if (!pages.length) throw new Error('нет сеток');", "if (!pages.length) throw new Error('нет изделий');")
rep("alert('Добавьте размеры сеток — наклеек пока нет.')", "alert('Добавьте размеры изделий — наклеек пока нет.')")
rep("a.download = `mesh_labels_${safe}", "a.download = `plisse_labels_${safe}")
rep("— по одной на каждую сетку.`", "— по одной на каждое изделие.`")

# ---------- PDF ----------
rep("""      const tName = d.mixedType ? 'разные — см. спецификацию' : esc(typeNameOf(d.types[0])), cColor""",
    """      const tName = 'Сетка плиссе, узкая серия', cColor""")
rep("""      const cpRows = d.items.map((it, i) => `<tr>${td(it.n)}${td(esc(it.room), 'text-align:left; font-weight:bold;')}${td(fmtNum(it.w) + ' см')}${td(fmtNum(it.h) + ' см')}""",
    """      const cpRows = d.items.map((it, i) => `<tr>${td(it.n)}${td(esc(it.room), 'text-align:left; font-weight:bold;')}${td(fmtNum(it.cut.giW) + ' см')}${td(fmtNum(it.cut.giH) + ' см')}""")
rep("""      const specRows = d.items.map(it => `<tr>${td(it.n)}${td(esc(it.room), 'text-align:left; font-weight:bold;')}${td(fmtNum(it.w) + ' см')}${td(fmtNum(it.h) + ' см')}${optTd(it)}""",
    """      const specRows = d.items.map(it => `<tr>${td(it.n)}${td(esc(it.room), 'text-align:left; font-weight:bold;')}${td(fmtNum(it.w) + '×' + fmtNum(it.h))}${td('<b>' + fmtNum(it.cut.giW) + '×' + fmtNum(it.cut.giH) + '</b>')}${optTd(it)}""")
region("      const cutRows = d.items.map(it =>", "      const sheetHeader = ", """      const cutRows = d.items.map(it => `<tr><td>${it.n}</td><td style="text-align:left;">${esc(it.room)}</td><td>${it.qty}</td><td>${fmtNum(it.w)}×${fmtNum(it.h)}</td><td style="font-weight:bold;">${fmtNum(it.cut.giW)}×${fmtNum(it.cut.giH)}</td>${mixed ? `<td style="font-weight:bold; color:#8e44ad; white-space:nowrap;">${esc(optText(it))}</td>` : ''}
        <td style="font-weight:bold; color:#16a085;">${it.cut.profH}</td><td style="font-weight:bold; color:#16a085;">${it.cut.profW}</td><td style="font-weight:bold; color:#16a085;">${it.cut.imp}</td>
        <td>${it.cut.meshH}</td><td>${it.cut.folds}</td><td style="font-weight:bold; color:#d35400;">${it.cut.thread}</td><td style="font-weight:bold; color:#d35400;">${it.cut.tape}</td><td>${it.cut.holeStep}</td><td></td></tr>`).join('');

""")
rep("Полотно: <strong>${tShort}</strong> &nbsp;·&nbsp; Профиль: <strong>${cShort}</strong>", "Сетка плиссе &nbsp;·&nbsp; Профиль: <strong>${cShort}</strong>")
rep("Мы рады предложить вам изготовление москитных сеток по вашим индивидуальным размерам. Сетка защищает от насекомых и не мешает проветриванию; рамку легко снять для мытья окна и убрать на зиму.",
    "Мы рады предложить вам изготовление москитных сеток плиссе по вашим индивидуальным размерам. Сетка складывается гармошкой и сдвигается в сторону: проём свободен, когда сетка не нужна, и защищён от насекомых, когда закрыта. Подходит для дверей, балконов и больших окон.")
rep("<strong>Изделие:</strong> Москитная сетка рамочная</div>", "<strong>Изделие:</strong> Москитная сетка плиссе (узкая серия)</div>")
rep("""                <div style="margin-bottom: 8px;"><strong>Полотно:</strong> ${tName}</div>
                <div style="margin-bottom: 8px;"><strong>Цвет профиля:</strong> ${cColor}</div>
                <div><strong>Монтаж:</strong>""", """                <div style="margin-bottom: 8px;"><strong>Цвет профиля:</strong> ${cColor}</div>
                <div><strong>Монтаж:</strong>""")
rep("""${th('№')}${th('Помещение', 'text-align:left;')}${th('Ширина')}${th('Высота')}${optTh()}${th('Кол-во')}${th('Сумма')}""",
    """${th('№')}${th('Помещение', 'text-align:left;')}${th('Ширина')}${th('Высота')}${optTh()}${th('Кол-во')}${th('Сумма')}""")
rep("ЗАКАЗ-НАРЯД № ${orderNo} (Москитные сетки)", "ЗАКАЗ-НАРЯД № ${orderNo} (Сетки плиссе)")
rep("""                    <div style="margin-bottom: 4px;"><strong>Полотно:</strong> ${tName}</div>
                    <div style="margin-bottom: 4px;"><strong>Цвет профиля:</strong> ${cColor}</div>
                    <div><strong>Сеток всего:</strong>""", """                    <div style="margin-bottom: 4px;"><strong>Изделие:</strong> ${tName}</div>
                    <div style="margin-bottom: 4px;"><strong>Цвет профиля:</strong> ${cColor}</div>
                    <div><strong>Изделий всего:</strong>""")
rep("""${th('Комната', 'text-align:left;')}${th('Ширина')}${th('Высота')}${optTh()}${th('Кол-во')}</tr>""",
    """${th('Комната', 'text-align:left;')}${th('СВП Ш×В')}${th('ГИ Ш×В')}${optTh()}${th('Кол-во')}</tr>""")
rep("<span>Профиль и импост:</span> <strong>", "<span>Профиль:</span> <strong>")
rep("<span>Комплектующие:</span> <strong>$", "<span>Лента, нить, комплектующие:</span> <strong>$")
rep("${sheetHeader('Раскрой профиля', 'Москитные сетки · размеры в см')}", "${sheetHeader('Раскрой плиссе', 'Сетки плиссе, узкая серия · размеры в см · ГИ = СВП + 5')}")
region("""                <th>№</th><th style="text-align: left;">Комната</th><th>Кол-во, шт</th><th>Размер Ш × В</th>""", """                <th>Готово</th>""",
"""                <th>№</th><th style="text-align: left;">Комната</th><th>Кол-во, шт</th><th>СВП Ш × В</th><th>ГИ Ш × В</th>${mixed ? `<th>${optHead()}</th>` : ''}
                <th>Профиль В<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(ГИ В − 5), 2 шт</span></th>
                <th>Профиль Ш<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(ГИ Ш − 2,8), 2 шт</span></th>
                <th>Створка<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(проф. В − 0,7), 1 шт</span></th>
                <th>Сетка В<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(проф. В + 2)</span></th>
                <th>Складок</th>
                <th>Нить<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">4 шт</span></th>
                <th>Лента<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(сетка В − 3), 2 шт</span></th>
                <th>Шаг отв.<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">8 отв.</span></th>
""")
rep("""${d.barGroups.map(g => barsPrint(g.frame, `Профиль рамочный, ${g.name.toLowerCase()} (с пазом)`, true, g.color) + barsPrint(g.imp, `Импост, ${g.name.toLowerCase()} (без паза)`, false, g.color)).join('')}""",
    """${d.barGroups.map(g => barsPrint(g.frame, `Профиль рамочный, ${g.name.toLowerCase()}`, true, g.color) + barsPrint(g.imp, `Профиль створочный, ${g.name.toLowerCase()}`, false, g.color)).join('')}""")
rep("— москитные сетки` : `Заказ-наряд${pdfNo} — москитные сетки`", "— сетки плиссе` : `Заказ-наряд${pdfNo} — сетки плиссе`")

open(S + 'plisse_pre_amo.html', 'w').write(s)
import re
left = [m for m in ['москитн', 'Москитн', 'Импост', 'импост', 'meshCalc'] if m in s]
print('built; leftovers:', left)

# ---------- v2: работа 500/500, иконка плиссе в КП и заказ-наряде ----------
s = open(S + 'plisse_pre_amo.html').read()
rep("      laborMake: 150, laborInstall: 200,\n      frameWhite:", "      laborMake: 500, laborInstall: 500,\n      frameWhite:")
rep("const SETTINGS_KEY = 'plisseCalcSettings1';", "const SETTINGS_KEY = 'plisseCalcSettings2';")
rep("      const savedS = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');",
    """      let savedS = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (!savedS) {   // переход с первой версии: цены сохраняем, работу берём новую по умолчанию (500 / 500)
        savedS = JSON.parse(localStorage.getItem('plisseCalcSettings1') || '{}') || {};
        delete savedS.laborMake; delete savedS.laborInstall;
      }""")
ICON = '''<svg viewBox="0 0 100 100" width="110" height="110" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;" fill="none" stroke="#2c3e50" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">
  <rect x="20" y="10" width="60" height="76"/>
  <path d="M20 10 L24 15 H76 L80 10"/>
  <path d="M24 15 V86 M76 15 V86"/>
  <rect x="15" y="86" width="70" height="4.5" rx="1"/>
  <path d="M26.5 17 V84 M31.5 17 V84 M36.5 17 V84 M41.5 17 V84 M46.5 17 V84 M51.5 17 V84" stroke-width="1.6"/>
  <path d="M26.5 17 L29 21 L31.5 17 L34 21 L36.5 17 L39 21 L41.5 17 L44 21 L46.5 17 L49 21 L51.5 17 L54 21" stroke-width="1.6"/>
  <path d="M26.5 84 L29 80 L31.5 84 L34 80 L36.5 84 L39 80 L41.5 84 L44 80 L46.5 84 L49 80 L51.5 84 L54 80" stroke-width="1.6"/>
  <path d="M29 21 V80 M34 21 V80 M39 21 V80 M44 21 V80 M49 21 V80" stroke-width="0.9"/>
  <rect x="54" y="16" width="3.4" height="69"/>
  <path d="M55.7 26 V48" stroke-width="1"/>
  <rect x="55" y="50" width="1.6" height="7" rx="0.8" fill="#2c3e50" stroke-width="0.8"/>
  <path d="M57.4 18 L72 15.5 V86 L57.4 82"/>
  <path d="M74 15.5 V86" stroke-width="1.4"/>
</svg>'''
rep('                <div style="width: 140px;"></div>\n', '                <div style="width: 140px; text-align: right;">' + ICON + '</div>\n')
rep('''                <div style="text-align: right; font-size: 13px; color: #7f8c8d;">Дата формирования:<br><strong style="color: #2c3e50;">${dateStr}</strong></div>''',
    '''                <table style="border-collapse: collapse;"><tr>
                  <td style="text-align: right; font-size: 13px; color: #7f8c8d; vertical-align: bottom; padding-right: 10px;">Дата формирования:<br><strong style="color: #2c3e50;">${dateStr}</strong></td>
                  <td style="vertical-align: bottom;">''' + ICON.replace('width="110" height="110"', 'width="64" height="64"') + '''</td>
                </tr></table>''')
open(S + 'plisse_pre_amo.html', 'w').write(s)
print('v2 patched')

# ---------- v3: цены из прайса ТБМ (узкая серия 18 мм) ----------
s = open(S + 'plisse_pre_amo.html').read()
region('    const DEFAULT_SETTINGS = {', '    const SETTINGS_KEY = ', '''    // Цены — прайс ТБМ от 08.05.2026, узкая серия 18 мм. Вводятся как в прайсе (за хлыст, рулон, моток…).
    const DEFAULT_SETTINGS = {
      laborMake: 500, laborInstall: 500,
      frameBarWhite: 1170.57, frameBarBrown: 1264.44, frameBarAnthracite: 1206.76,
      sashBarWhite: 1710.81, sashBarBrown: 1763.73, sashBarAnthracite: 1763.73,
      priceBarM: 6,
      clothRoll: 10751.14, clothRollArea: 80, clothRollH: 3, clothWaste: 0,
      tapePack: 144.67, tapePackLen: 4.5,
      thread100: 304.05,
      magnet: 85.44,
      rivets1000: 816, rivetsQty: 16,
      accKit: 123.89, overlayKit: 61.83, plugs: 1.2, screwsPress: 39, screws40: 6, screws19: 1.8,
      markup: 4, discount7: 7, discount12: 12, b2bExtra: 15,
      taxB2B: 6, tripFee: 0, minOrder: 0, roundStep: 10,
      laborMarkup: 0,
      metalWaste: 0, barLen: 600, sawKerf: 0.3,
      labelW: 58, labelH: 40
    };
    const SETTINGS_DEF = [
      { group: 'Работы', items: [
        ['laborMake', 'Изготовление, ₽ за изделие'],
        ['laborInstall', 'Установка, ₽ за изделие'] ] },
      { group: 'Профиль рамы узкой серии 18 мм, ₽ за хлыст', items: [
        ['frameBarWhite', 'Белый RAL9016 (PLIS0008.07)'],
        ['frameBarBrown', 'Коричневый RAL8017 (PLIS0008.05)'],
        ['frameBarAnthracite', 'Антрацит RAL7016 (PLIS0008.41)'] ] },
      { group: 'Профиль створки узкой серии 18 мм, ₽ за хлыст', items: [
        ['sashBarWhite', 'Белый RAL9016 (PLIS0010.07)'],
        ['sashBarBrown', 'Коричневый RAL8017 (PLIS0010.05)'],
        ['sashBarAnthracite', 'Антрацит RAL7016 (PLIS0010.41)'],
        ['priceBarM', 'Длина хлыста в прайсе, м'] ] },
      { group: 'Полотно плиссе (считается по погонному метру ширины ГИ)', items: [
        ['clothRoll', 'Рулон, ₽ (PLIS0015/3000 — высота 3 м, изгиб 15 мм)'],
        ['clothRollArea', 'Площадь рулона, м²'],
        ['clothRollH', 'Высота рулона, м'],
        ['clothWaste', 'Запас полотна, %'] ] },
      { group: 'Лента, нить, клепки', items: [
        ['tapePack', 'Окантовочная лента 14 мм, ₽ за моток (PLIS0052)'],
        ['tapePackLen', 'Длина мотка ленты, м'],
        ['thread100', 'Нить, ₽ за 100 м (PLIS0006)'],
        ['magnet', 'Магнитная лента, ₽/м (PLIS0412) — по высоте створки'],
        ['rivets1000', 'Клепки размер 3, ₽ за 1000 шт (PLIS0003/1)'],
        ['rivetsQty', 'Клепок на изделие, шт'] ] },
      { group: 'Комплектующие (на одно изделие)', items: [
        ['accKit', 'Комплект аксессуаров, чёрный (PLIS0042.06), ₽'],
        ['overlayKit', 'Комплект накладок (PLIS0021), ₽'],
        ['plugs', 'Заглушки 8 мм, ₽ за 2 шт'],
        ['screwsPress', 'Саморезы с пресс-шайбой, ₽ за 18 шт'],
        ['screws40', 'Саморезы 40 мм, ₽ за 4 шт'],
        ['screws19', 'Саморезы 19 мм, ₽ за 2 шт'] ] },
      { group: 'Наценки и скидки', items: [
        ['laborMarkup', 'Изготовление и установка в цене клиента', [[0, 'Без наценки'], [1, 'С наценкой']]],
        ['markup', 'Наценка: материалы ×'],
        ['discount7', 'Первая скидка, %'],
        ['discount12', 'Вторая скидка, %'],
        ['b2bExtra', 'Оплата по Р/С: наценка к материалам больше на, %'],
        ['taxB2B', 'Налог с оплаты по Р/С, %'],
        ['roundStep', 'Округлять цены вверх до, ₽ (0 — не округлять)'] ] },
      { group: 'Заказ целиком', items: [
        ['tripFee', 'Выезд (замер, доставка), ₽ за заказ — в себестоимость'],
        ['minOrder', 'Минимальная сумма заказа, ₽ (0 — нет)'] ] },
      { group: 'Профиль: раскрой хлыстов и отход', items: [
        ['barLen', 'Длина хлыста для раскроя, см'],
        ['sawKerf', 'Пропил, см'],
        ['metalWaste', 'Запас на обрезки профиля в себестоимости, %'] ] },
      { group: 'Наклейки (термопринтер)', items: [
        ['labelW', 'Ширина наклейки, мм'],
        ['labelH', 'Высота наклейки, мм'] ] }
    ];
''')
rep("const SETTINGS_KEY = 'plisseCalcSettings2';", "const SETTINGS_KEY = 'plisseCalcSettings3';")
rep("""      if (!savedS) {   // переход с первой версии: цены сохраняем, работу берём новую по умолчанию (500 / 500)
        savedS = JSON.parse(localStorage.getItem('plisseCalcSettings1') || '{}') || {};
        delete savedS.laborMake; delete savedS.laborInstall;
      }""", """      if (!savedS) {   // переход на цены из прайса: из прежних настроек берём только работу, наценки и прочее, цены — новые
        const old = JSON.parse(localStorage.getItem('plisseCalcSettings2') || '{}') || {};
        savedS = {};
        ['laborMake', 'laborInstall', 'markup', 'discount7', 'discount12', 'b2bExtra', 'taxB2B', 'tripFee', 'minOrder', 'roundStep', 'laborMarkup',
         'metalWaste', 'barLen', 'sawKerf', 'labelW', 'labelH'].forEach(k => { if (k in old) savedS[k] = old[k]; });
      }""")
region("      const PROF = {", "      const tripFee = items.length ? S.tripFee : 0;", """      const perM = bar => bar / (S.priceBarM > 0 ? S.priceBarM : 6);           // ₽ за хлыст → ₽/м
      const PROF = {
        white: [perM(S.frameBarWhite), perM(S.sashBarWhite)],
        brown: [perM(S.frameBarBrown), perM(S.sashBarBrown)],
        anthracite: [perM(S.frameBarAnthracite), perM(S.sashBarAnthracite)]
      };
      const clothPerM = S.clothRollArea > 0 && S.clothRollH > 0 ? S.clothRoll / (S.clothRollArea / S.clothRollH) : 0;   // ₽ за погонный метр рулона
      const tapePerM = S.tapePackLen > 0 ? S.tapePack / S.tapePackLen : 0;
      const threadPerM = S.thread100 / 100;
      const t = { qty: 0, frameCm: 0, impCm: 0, clothM: 0, cordCm: 0, threadCm: 0, magnetCm: 0, byColor: {}, byType: {} };
      let costProfile = 0, costCloth = 0, costParts = 0, costLabor = 0;
      const unitLabor = S.laborMake + (noInstall ? 0 : S.laborInstall);
      const kitPerItem = S.accKit + S.overlayKit + S.plugs + S.screwsPress + S.screws40 + S.screws19 + S.rivetsQty * S.rivets1000 / 1000;
      items.forEach(it => {
        const c = it.cut;
        const [pFrame, pSash] = PROF[it.color] || PROF.white;
        const frameCm = 2 * (c.profW + c.profH), impCm = c.imp;
        const clothM = (c.giW / 100) * (1 + S.clothWaste / 100);            // полотно: погонные метры по ширине ГИ (рулон 3 м)
        const tapeCm = 2 * c.tape, threadCm = 4 * c.thread, magnetCm = impCm;  // магнитная лента — по высоте створки
        const prof = (frameCm / 100) * mw * pFrame + (impCm / 100) * mw * pSash;
        const cloth = clothM * clothPerM;
        const parts = (tapeCm / 100) * tapePerM + (threadCm / 100) * threadPerM + (magnetCm / 100) * S.magnet + kitPerItem;
        it.markup = S.markup;
        it.unitMat = prof + cloth + parts;
        it.unitCost = it.unitMat + unitLabor;
        costProfile += prof * it.qty; costCloth += cloth * it.qty; costParts += parts * it.qty; costLabor += unitLabor * it.qty;
        t.qty += it.qty; t.frameCm += frameCm * it.qty; t.impCm += impCm * it.qty; t.clothM += clothM * it.qty;
        t.cordCm += tapeCm * it.qty; t.threadCm += threadCm * it.qty; t.magnetCm += magnetCm * it.qty;
        const bc = t.byColor[it.color] || (t.byColor[it.color] = { frameCm: 0, impCm: 0 });
        bc.frameCm += frameCm * it.qty; bc.impCm += impCm * it.qty;
        t.byType[it.type] = (t.byType[it.type] || 0) + clothM * it.qty;
      });
""")
rep("""        [`Сетка плиссе (по размеру ГИ${SETTINGS.clothWaste ? ', запас ' + fmtNum(SETTINGS.clothWaste) + '%' : ''})`, 'м²', t.clothM.toFixed(2)],""",
    """        [`Полотно плиссе, рулон ${fmtNum(SETTINGS.clothRollH)} м (по ширине ГИ${SETTINGS.clothWaste ? ', запас ' + fmtNum(SETTINGS.clothWaste) + '%' : ''})`, 'м.п.', t.clothM.toFixed(2)],""")
rep("""        ['Нить плиссе (4 шт на изделие)', 'м.п.', m(t.threadCm)],""", """        ['Нить плиссе (4 шт на изделие)', 'м.п.', m(t.threadCm)],
        ['Магнитная лента (по высоте створки)', 'м.п.', m(t.magnetCm)],""")
rep("""        ['Люверсы 5 мм', 'шт', q * 16],""", """        ['Клепки размер 3 (люверсы)', 'шт', q * SETTINGS.rivetsQty],""")
rep("['Комплект аксессуаров', 'компл', q],", "['Комплект аксессуаров (чёрный)', 'компл', q],")
rep("""      const pricesEmpty = ['frameWhite', 'sashWhite', 'cloth', 'tape', 'thread', 'accKit', 'overlayKit', 'laborMake']""",
    """      const pricesEmpty = ['frameBarWhite', 'sashBarWhite', 'clothRoll', 'tapePack', 'thread100', 'accKit', 'overlayKit', 'laborMake']""")
rep("<span>Лента, нить, комплектующие:</span><span class=\"summary-value\" id=\"costParts\">", "<span>Ленты, нить, клепки, комплектующие:</span><span class=\"summary-value\" id=\"costParts\">")
open(S + 'plisse_pre_amo.html', 'w').write(s)
print('v3 patched')
