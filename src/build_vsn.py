"""Калькулятор «Вставные сетки VSN» — дилер plisse.ltd (iem.plisse.ltd → «Вставная»).
Собирается из калькулятора горизонтальных жалюзи (тоже дилерский: цена дилера + доставка, × наценка + установка).
Формула цены дилера повторяет калькулятор дилера calc.plisse.ltd построчно (проверено на 48 комбинациях)."""
import os
S = os.path.dirname(os.path.abspath(__file__)) + '/'
s = open(S + 'horiz_pre_amo.html').read()

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
rep('<title>Горизонтальные жалюзи — SunProtection</title>', '<title>Вставные сетки — SunProtection</title>')
rep('Настройки — горизонтальные жалюзи', 'Настройки — вставные сетки VSN')
region('      <div class="block-title">Ламели</div>', '    <div class="app-block">\n      <div class="block-title">Помещения и Размеры</div>', '''      <div class="block-title">Вставная сетка</div>
      <div class="visual-hint" style="text-align:left;">Параметры — для всего заказа. У отдельного изделия можно выбрать другие — кнопка под его размерами.</div>
      <div class="form-group">
        <label>Полотно</label>
        <select id="vMatSelect"></select>
      </div>
      <div class="row">
        <div class="form-group col"><label>Цвет профиля</label><select id="vColorSel"></select></div>
        <div class="form-group col"><label>Профиль</label><select id="vProfSel"></select></div>
      </div>
      <div class="row">
        <div class="form-group col"><label>Угол</label><select id="vCornerSel"></select></div>
        <div class="form-group col"><label>Перемычка</label><select id="vJumpSel"></select></div>
      </div>
      <div class="visual-hint" id="vMatInfo" style="text-align:left; margin:0 0 12px;"></div>
      <div class="form-group">
        <label>Примечание к заказу дилеру (необязательно)</label>
        <input type="text" id="vColorInput" placeholder="например: ручка снаружи" autocomplete="off">
      </div>
    </div>

''')
rep('Размеры изделия в см (ширина × высота). Заказ дилеру — во вкладке «Тех часть заказа».',
    'Размеры сетки в см (ширина × высота), как в заказе дилеру. Заказ дилеру — во вкладке «Тех часть заказа».')
rep('Себестоимость — цена дилера по курсу и доставка.', 'Себестоимость — цена дилера и доставка.')
rep('<span>Изделия у дилера:</span><span class="summary-value" id="costProfile">', '<span>Материалы у дилера:</span><span class="summary-value" id="costProfile">')
rep('<span>Доп. опции у дилера:</span><span class="summary-value" id="costCloth">', '<span>Изготовление у дилера:</span><span class="summary-value" id="costCloth">')

# ---------- справочники и формула дилера ----------
region('    // === ПРАЙС ДИЛЕРА', '    // === Поиск по списку материалов', '''    // === ВСТАВНАЯ СЕТКА (дилер plisse.ltd) — состав и цены как в калькуляторе дилера ===
    // Полотно: списание (запас) % — как у дилера; цена ₽/м² — в настройках
    const MESH_TYPES = [
      { key: 'standard', name: 'Стандарт', price: 'meshStandard', spis: 35, work: 'work' },
      { key: 'antimoshka', name: 'Антимошка', price: 'meshAntimoshka', spis: 35, work: 'work' },
      { key: 'antikoshka_w', name: 'Антикошка белая', price: 'meshAntikoshka', spis: 35, work: 'workPS' },
      { key: 'antikoshka_b', name: 'Антикошка чёрная', price: 'meshAntikoshka', spis: 35, work: 'workPS' },
      { key: 'antikoshka_g', name: 'Антикошка серая', price: 'meshAntikoshka', spis: 0, work: 'workPS' },
      { key: 'antikoshka_s', name: 'Антикошка серебро', price: 'meshAntikoshka', spis: 35, work: 'workPS' },
      { key: 'antipyl', name: 'Антипыль', price: 'meshAntipyl', spis: 0, work: '' }
    ];
    const MAT_BY = Object.fromEntries(MESH_TYPES.map(m => [m.key, m]));
    const V_COLORS = [['white', 'Белый'], ['brown', 'Коричневый'], ['anthracite', 'Антрацит']];
    const V_PROFS = [['lite', 'Лайт'], ['prem', 'Премиум']];
    const V_CORNERS = [['metal', 'Металл'], ['plastic', 'Пластик']];
    const V_JUMPS = [['yes', 'Есть'], ['no', 'Нет']];
    const VSN_LIM = { wMin: 25, wMax: 130, hMin: 25, hMax: 240, aMax: 99 };   // см, пределы дилера
    const JUMP_FORCE_H = 140;   // выше 140 см перемычка у дилера обязательна
    const nameIn = (list, k) => (list.find(x => x[0] === k) || list[0])[1];
    const MESH_COLORS = [];
    let meshType = 'standard', meshColor = '';
    let ORD = { color: 'white', prof: 'lite', corner: 'metal', jump: 'yes' };
    const matLabel = k => { const m = MAT_BY[k]; return m ? m.name : '—'; };
    const typeName = () => matLabel(meshType);
    const colorName = () => meshColor || '—';
    const typeNameOf = k => matLabel(k);
    const colorNameOf = k => nameIn(V_COLORS, k);
    const profNameOf = k => nameIn(V_PROFS, k);
    const effOf = it => {
      const o = it.opts || {};
      return { color: o.pc || ORD.color, prof: o.pr || ORD.prof, corner: o.co || ORD.corner, jump: o.ju || ORD.jump };
    };
    const vsnDesc = (it, e = it.eff || effOf(it)) => [matLabel(it.type), `профиль ${profNameOf(e.prof)} ${colorNameOf(e.color).toLowerCase()}`,
      e.corner === 'plastic' ? 'пласт. угол' : 'мет. угол', (it.jumpOn != null ? it.jumpOn : (e.jump === 'yes' || it.h > JUMP_FORCE_H)) ? 'с перемычкой' : 'без перемычки'].join(', ');
    const ordText = () => [typeName(), colorNameOf(ORD.color).toLowerCase(), profNameOf(ORD.prof), ORD.corner === 'plastic' ? 'пласт. угол' : 'мет. угол', ORD.jump === 'yes' ? 'с перемычкой' : 'без перемычки'].join(', ');
    function optsText(o) {
      const a = [];
      if (o.pc) a.push('профиль ' + colorNameOf(o.pc).toLowerCase());
      if (o.pr) a.push(profNameOf(o.pr));
      if (o.co) a.push(o.co === 'plastic' ? 'пласт. угол' : 'мет. угол');
      if (o.ju) a.push(o.ju === 'yes' ? 'с перемычкой' : 'без перемычки');
      return a.join(', ');
    }
    // Цена дилера за 1 изделие. n, d — ширина и высота в мм. Каждая строка округляется вверх до рубля, как у дилера.
    function vsnCalc(n, d, meshKey, color, prof, corner, jump) {
      const S = SETTINGS, met = corner !== 'plastic', m = MAT_BY[meshKey] || MESH_TYPES[0];
      const C = { white: 'White', brown: 'Brown', anthracite: 'Anth' }[color] || 'White', cn = colorNameOf(color).toLowerCase();
      const J = jump === 'yes' || d > JUMP_FORCE_H * 10;
      const lines = [];
      const L = (name, unit, q, price, spis = 0, work = false) => {
        q = Number(q.toFixed(3));
        lines.push({ name, unit, qty: q, sum: Math.ceil(q * (1 + spis / 100) * (Number(price) || 0)), work });
      };
      const per = met ? (2 * (n + 17) + 2 * (d + 15)) / 1000 : (2 * (n - 43) + 2 * (d - 48)) / 1000;
      L(`Профиль ${profNameOf(prof)}, ${cn}`, 'м.п.', per, prof === 'prem' ? S['profPrem' + C] : S.profLite, 3);
      L('Шнур фиксирующий', 'м.п.', per, S.cord);
      if (met) L('Угол соединительный металлический', 'шт', 4, S.cornerMetal);
      else L(`Угол пластиковый, ${cn}`, 'шт', 4, S['cornerPl' + C]);
      if (J) {
        L(`Перемычка, ${cn}`, 'м.п.', met ? (n + 17 - 61) / 1000 : (n - 43 + 2) / 1000, S['jump' + C], 3);
        L('Крепление перемычки', 'шт', 2, S.jumpMount);
      }
      const k = (n >= 600 || d >= 1700) ? 4 : 2;
      L('Фиксатор', 'шт', k, S.fix);
      L('Заклёпка', 'шт', k, S.rivet);
      L(`Ручка металлическая, ${cn}`, 'шт', 1, S['handle' + C]);
      L(`Полотно «${m.name}»`, 'м²', n * d / 1e6, S[m.price], m.spis);
      if (m.work) L(m.work === 'workPS' ? 'Работа (антикошка)' : 'Работа', 'шт', 1, S[m.work], 0, true);
      const work = lines.filter(l => l.work).reduce((a, l) => a + l.sum, 0);
      const total = lines.reduce((a, l) => a + l.sum, 0);
      return { lines, mat: total - work, work, total, J };
    }

    function renderChoices() {
      const fill = (id, list, v) => {
        const sel = document.getElementById(id);
        if (!sel.options.length) list.forEach(([k, t]) => sel.add(new Option(t, k)));
        sel.value = v;
      };
      fill('vMatSelect', MESH_TYPES.map(m => [m.key, m.name]), meshType);
      fill('vColorSel', V_COLORS, ORD.color); fill('vProfSel', V_PROFS, ORD.prof);
      fill('vCornerSel', V_CORNERS, ORD.corner); fill('vJumpSel', V_JUMPS, ORD.jump);
      document.getElementById('vColorInput').value = meshColor;
      document.getElementById('vMatInfo').textContent = ORD.jump === 'no' ? `Сетки выше ${JUMP_FORCE_H} см дилер делает с перемычкой всегда.` : '';
    }
    document.getElementById('vMatSelect').addEventListener('change', e => { meshType = e.target.value; renderChoices(); calculateTotals(); });
    [['vColorSel', 'color'], ['vProfSel', 'prof'], ['vCornerSel', 'corner'], ['vJumpSel', 'jump']].forEach(([id, k]) =>
      document.getElementById(id).addEventListener('change', e => { ORD[k] = e.target.value; renderChoices(); calculateTotals(); }));
    document.getElementById('vColorInput').addEventListener('input', e => { meshColor = e.target.value; calculateTotals(); });

''')
# поиск по списку (attachMatSearch) не нужен: 7 полотен — обычный список
region('    // === Поиск по списку материалов', '    // Длина управления', '')
rep('''    function cutParts(w, h) {
      return { chain: Math.round(h * 2 / 3), area: w * h / 10000, profW: w, profH: h };
    }''', '''    function cutParts(w, h) {
      return { chain: 0, area: w * h / 10000, profW: w, profH: h };
    }''')

# ---------- настройки ----------
region('    const DEFAULT_SETTINGS = {', '    const SETTINGS_KEY = ', '''    // Цены дилера (оптовые, ₽) — из калькулятора plisse.ltd, ноябрь 2026
    const DEFAULT_SETTINGS = {
      tripFee: 0, laborInstall: 300,
      meshStandard: 77, meshAntimoshka: 428, meshAntikoshka: 749, meshAntipyl: 1440,
      profLite: 267.5, profPremWhite: 353, profPremBrown: 353, profPremAnth: 415,
      jumpWhite: 85.6, jumpBrown: 200, jumpAnth: 150,
      cornerMetal: 29.44, cornerPlWhite: 20.06, cornerPlBrown: 20.06, cornerPlAnth: 26.75,
      handleWhite: 16, handleBrown: 21, handleAnth: 22,
      cord: 8, fix: 16.6, jumpMount: 4.8, rivet: 1.05,
      work: 160, workPS: 190,
      markup: 2, discount7: 7, discount12: 12, b2bExtra: 15,
      taxB2B: 6, minOrder: 0, roundStep: 10,
      laborMarkup: 0,
      labelW: 58, labelH: 40
    };
    const SETTINGS_DEF = [
      { group: 'Доставка и установка', items: [
        ['tripFee', 'Доставка от дилера, ₽ за заказ — в себестоимость'],
        ['laborInstall', 'Установка, ₽ за изделие'] ] },
      { group: 'Полотно у дилера, ₽ за м²', items: [
        ['meshStandard', 'Стандарт'], ['meshAntimoshka', 'Антимошка'],
        ['meshAntikoshka', 'Антикошка (все цвета)'], ['meshAntipyl', 'Антипыль'] ] },
      { group: 'Профиль у дилера, ₽ за м.п.', items: [
        ['profLite', 'Лайт (все цвета)'],
        ['profPremWhite', 'Премиум, белый'], ['profPremBrown', 'Премиум, коричневый'], ['profPremAnth', 'Премиум, антрацит'],
        ['jumpWhite', 'Перемычка, белая'], ['jumpBrown', 'Перемычка, коричневая'], ['jumpAnth', 'Перемычка, антрацит'],
        ['cord', 'Шнур фиксирующий'] ] },
      { group: 'Комплектующие у дилера, ₽ за шт', items: [
        ['cornerMetal', 'Угол соединительный металлический'],
        ['cornerPlWhite', 'Угол пластиковый, белый'], ['cornerPlBrown', 'Угол пластиковый, коричневый'], ['cornerPlAnth', 'Угол пластиковый, антрацит'],
        ['handleWhite', 'Ручка, белая'], ['handleBrown', 'Ручка, коричневая'], ['handleAnth', 'Ручка, антрацит'],
        ['fix', 'Фиксатор'], ['rivet', 'Заклёпка'], ['jumpMount', 'Крепление перемычки'] ] },
      { group: 'Работа дилера, ₽ за изделие', items: [
        ['work', 'Изготовление (стандарт, антимошка)'],
        ['workPS', 'Изготовление (антикошка)'] ] },
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
rep("const SETTINGS_KEY = 'horizCalcSettings1';", "const SETTINGS_KEY = 'vsnCalcSettings1';")
rep("const STATE_KEY = 'horizCalcState1';", "const STATE_KEY = 'vsnCalcState1';")
rep("indexedDB.open('horizCalcPhotos', 1)", "indexedDB.open('vsnCalcPhotos', 1)")
rep("const pricesEmpty = ['rate']", "const pricesEmpty = ['profLite', 'meshStandard']")
rep("        meshType, meshColor,\n", "        meshType, meshColor, ord: ORD,\n")
rep("      if (typeof state.meshColor === 'string') meshColor = state.meshColor;\n",
    """      if (typeof state.meshColor === 'string') meshColor = state.meshColor;
      if (state.ord && typeof state.ord === 'object') [['color', V_COLORS], ['prof', V_PROFS], ['corner', V_CORNERS], ['jump', V_JUMPS]].forEach(([k, l]) => {
        if (l.some(x => x[0] === state.ord[k])) ORD[k] = state.ord[k];
      });
""")

# ---------- изделие: без управления и крепления ----------
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
        ? `🕸 Полотно: ${ot ? `<b>${esc(matLabel(ot))}</b>` : `${esc(typeName())} <span class="io-sub">(как в заказе)</span>`}${ox ? `<br>➕ <b>${esc(ox)}</b>` : ''}${oc ? `<br>Примечание: ${esc(oc)}` : ''}`
        : `🕸 Сетка: как в заказе <span class="io-sub">· ${esc(ordText())} — нажмите, чтобы изменить</span>`;
    }
    function openItemOpts(itemId) {
      const row = document.getElementById(itemId);
      if (!row) return;
      const title = row.querySelector('.item-title-text').textContent;
      const ov = document.createElement('div');
      ov.className = 'settings-overlay open';
      const o = itemOpts(row);
      const sel = (attr, list, cur, ordV) => `<select ${attr}><option value="">как в заказе: ${esc(nameIn(list, ordV).toLowerCase())}</option>${list.map(([k, t]) => `<option value="${k}"${cur === k ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
      ov.innerHTML = `
        <div class="settings-panel" role="dialog" aria-label="Параметры сетки">
          <div class="settings-panel-head">
            <div class="block-title" style="margin-bottom:0;">${esc(title)}: параметры</div>
            <button type="button" class="settings-close" data-x aria-label="Закрыть">&times;</button>
          </div>
          <div class="form-group" style="margin-top:14px;"><label>Полотно</label>${sel('data-m', MESH_TYPES.map(m => [m.key, m.name]), row.dataset.type || '', meshType)}</div>
          <div class="row">
            <div class="form-group col"><label>Цвет профиля</label>${sel('data-pc', V_COLORS, o.pc, ORD.color)}</div>
            <div class="form-group col"><label>Профиль</label>${sel('data-pr', V_PROFS, o.pr, ORD.prof)}</div>
          </div>
          <div class="row">
            <div class="form-group col"><label>Угол</label>${sel('data-co', V_CORNERS, o.co, ORD.corner)}</div>
            <div class="form-group col"><label>Перемычка</label>${sel('data-ju', V_JUMPS, o.ju, ORD.jump)}</div>
          </div>
          <div class="visual-hint" style="text-align:left; margin:0 0 12px;">Выше ${JUMP_FORCE_H} см перемычка у дилера обязательна.</div>
          <div class="form-group"><label>Примечание (необязательно)</label><input type="text" data-c placeholder="${meshColor ? 'как в заказе: ' + esc(meshColor) : 'не указано'}" value="${esc(row.dataset.color || '')}"></div>
          <div style="display:flex; gap:8px; margin-top:12px;">
            <button type="button" class="btn-action btn-labels" data-reset style="margin:0;">Как в заказе</button>
            <button type="button" class="btn-action btn-pdf" data-x style="margin:0;">Готово</button>
          </div>
        </div>`;
      const apply = () => {
        const m = ov.querySelector('[data-m]').value;
        if (m) row.dataset.type = m; else delete row.dataset.type;
        const c = ov.querySelector('[data-c]').value.trim();
        if (c) row.dataset.color = c; else delete row.dataset.color;
        const no = {};
        ['pc', 'pr', 'co', 'ju'].forEach(k => { const v = ov.querySelector('[data-' + k + ']').value; if (v) no[k] = v; });
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

# ---------- расчёт ----------
rep("const L = (it.opts.multi && it.mat.g !== 'l50') ? MULTI_LIM : V_GROUPS[it.mat.g].lim;", "const L = VSN_LIM;")
rep("bad.push(`изделие ${it.n} (${fmtNum(it.w)}×${fmtNum(it.h)}, ${it.mat.name}): ${why.join(', ')}`);", "bad.push(`сетка ${it.n} (${fmtNum(it.w)}×${fmtNum(it.h)}): ${why.join(', ')}`);")
rep("noMat.length) { problem = 'Выберите ламели.'; msg = 'Выберите ламели (ширину и цвет) — для заказа или для изделий: '",
    "noMat.length) { problem = 'Выберите полотно.'; msg = 'Выберите полотно — для заказа или для изделий: '")
rep("      const rate = S.rate > 0 ? S.rate : 0;\n", "      const rate = 1;   // цены дилера сразу в рублях\n")
region("          const unit = 'm2', o = it.opts;", "          it.usdBase = base;", """          const unit = 'm2', e = effOf(it);
          const r = vsnCalc(Math.round(it.w * 10), Math.round(it.h * 10), it.type, e.color, e.prof, e.corner, e.jump);
          it.vsn = r; it.eff = e; it.jumpOn = r.J;
          const area = it.w * it.h / 10000, base = r.mat, sum = r.total;
""")
rep("      const colors = [...new Set(items.map(it => it.color))];", "      const colors = [...new Set(items.map(it => colorNameOf((it.eff || ORD).color)))];")

# ---------- заказ дилеру ----------
region('    function componentsList() {', '    function countBy(key, nameOf) {', '''    function componentsList() {
      const d = window.calcData, agg = {};
      d.items.forEach(it => (it.vsn ? it.vsn.lines : []).forEach(l => {
        const a = agg[l.name] || (agg[l.name] = { u: l.unit, q: 0 });
        a.q += l.qty * it.qty;
      }));
      const q = a => Number(a.q.toFixed(3)).toLocaleString('ru-RU');
      return [
        ['Сеток', 'шт', d.totals.qty],
        ...Object.keys(agg).map(k => [k, agg[k].u, q(agg[k])]),
        ['Сумма у дилера', '₽', Math.round(d.totals.usd).toLocaleString('ru-RU')],
        ['Доставка от дилера', '₽', Math.round(d.tripFee).toLocaleString('ru-RU')]
      ];
    }
    const optText = it => [matLabel(it.type), `${profNameOf((it.eff || ORD).prof)} ${colorNameOf((it.eff || ORD).color).toLowerCase()}`].join(', ');
    const optHead = () => 'Сетка';
''')
rep("const usd2 = v => (Math.round(v * 100) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });",
    "const usd2 = v => Math.round(v).toLocaleString('ru-RU');")
rep('<span>Сумма у дилера:</span><span class="summary-value">${usd2(d.totals.usd)} $</span>', '<span>Сумма у дилера:</span><span class="summary-value">${usd2(d.totals.usd)} ₽</span>')
rep('<span>Изделий всего:</span><span class="summary-value">${d.totals.qty} шт</span>', '<span>Сеток всего:</span><span class="summary-value">${d.totals.qty} шт</span>')
region("      document.getElementById('techCut').innerHTML = `", "      document.getElementById('techComponents').innerHTML = `", """      const jTd = it => it.jumpOn ? (it.eff.jump === 'no' ? 'есть<small>обязательна</small>' : 'есть') : 'нет';
      document.getElementById('techCut').innerHTML = `
        <div class="table-scroll"><table class="tech-table">
          <thead><tr><th>№</th><th class="left">Комната</th><th class="left">Полотно</th><th>Профиль</th><th>Угол</th><th>Перемычка</th><th>Ш × В, мм</th><th>Кол-во</th>
            <th>Примеч.</th><th>Дилер, ₽<small>за 1 шт</small></th><th>Дилер, ₽<small>за все шт</small></th></tr></thead>
          <tbody>${d.items.map(it => `<tr><td>${it.n}</td><td class="left">${esc(it.room)}</td><td class="left"><b>${esc(matLabel(it.type))}</b></td>
            <td>${profNameOf(it.eff.prof)}, ${colorNameOf(it.eff.color).toLowerCase()}</td><td>${it.eff.corner === 'plastic' ? 'пласт.' : 'мет.'}</td><td>${jTd(it)}</td>
            <td class="key">${Math.round(it.w * 10)}×${Math.round(it.h * 10)}</td><td>${it.qty}</td><td>${esc(it.color || '—')}</td>
            <td>${usd2(it.usd)}</td><td><b>${usd2(it.usd * it.qty)}</b></td></tr>`).join('')}</tbody></table></div>`;
""")

# ---------- наклейки ----------
rep("fit('жалюзи Ш × В, см', subPx, leftW, false);", "fit('сетка Ш × В, см', subPx, leftW, false);")
rep("ctx.fillText('жалюзи Ш × В, см', pad, sizeBase + subPx * 1.45);", "ctx.fillText('сетка Ш × В, см', pad, sizeBase + subPx * 1.45);")
rep("type: it.mat ? it.mat.name : '—', color: it.mat ? it.mat.cat + ' · упр. ' + it.ctrl : '',",
    "type: matLabel(it.type), color: `${profNameOf(it.eff.prof)} · ${colorNameOf(it.eff.color).toLowerCase()}`,")
rep("a.download = `horiz_labels_${safe}", "a.download = `vsn_labels_${safe}")

# ---------- PDF ----------
region("      const cutRows = d.items.map(it =>", "      const sheetHeader = ", """      const cutRows = d.items.map(it => `<tr><td>${it.n}</td><td style="text-align:left;">${esc(it.room)}</td><td style="text-align:left; font-weight:bold;">${esc(matLabel(it.type))}</td>
        <td>${profNameOf(it.eff.prof)}, ${colorNameOf(it.eff.color).toLowerCase()}</td><td>${it.eff.corner === 'plastic' ? 'пластиковый' : 'металлический'}</td><td>${it.jumpOn ? 'есть' : 'нет'}</td>
        <td style="font-weight:bold; color:#16a085;">${Math.round(it.w * 10)}×${Math.round(it.h * 10)}</td><td>${it.qty}</td><td>${esc(it.color || '—')}</td>
        <td style="font-weight:bold;">${usd2(it.usd * it.qty)}</td><td></td></tr>`).join('');

""")
rep("            Ламели: <strong>${tShort}</strong>\n", "            Полотно: <strong>${tShort}</strong> &nbsp;·&nbsp; Профиль: <strong>${cShort}</strong>\n")
rep("Мы рады предложить вам горизонтальные алюминиевые жалюзи по вашим индивидуальным размерам. Ламели поворачиваются и поднимаются: легко регулировать освещение и закрыть окно от солнца и посторонних взглядов. Жалюзи компактные, практичные и легко моются.",
    "Мы рады предложить вам вставные москитные сетки по вашим индивидуальным размерам. Сетка ставится прямо в проём окна, без кронштейнов снаружи: держится плотно, не продувается и не мешает закрывать окно. Легко снимается для мытья и на зиму.")
rep("<strong>Изделие:</strong> Горизонтальные алюминиевые жалюзи</div>", "<strong>Изделие:</strong> Москитная сетка вставная (VSN)</div>")
rep("                <div style=\"margin-bottom: 8px;\"><strong>Ламели:</strong> ${tName}</div>\n",
    "                <div style=\"margin-bottom: 8px;\"><strong>Полотно:</strong> ${tName}</div>\n                <div style=\"margin-bottom: 8px;\"><strong>Цвет профиля:</strong> ${cColor}</div>\n")
rep("ЗАКАЗ-НАРЯД № ${orderNo} (Горизонтальные жалюзи)", "ЗАКАЗ-НАРЯД № ${orderNo} (Вставные сетки)")
rep("                    <div style=\"margin-bottom: 4px;\"><strong>Ламели:</strong> ${tName}</div>\n",
    "                    <div style=\"margin-bottom: 4px;\"><strong>Полотно:</strong> ${tName}</div>\n                    <div style=\"margin-bottom: 4px;\"><strong>Цвет профиля:</strong> ${cColor}</div>\n")
rep("<span>Изделия у дилера:</span> <strong>", "<span>Материалы у дилера:</span> <strong>")
rep("<span>Доп. опции у дилера:</span> <strong>", "<span>Изготовление у дилера:</span> <strong>")
rep("${sheetHeader('Заказ дилеру', 'Горизонтальные алюминиевые жалюзи · размеры в см (ширина × высота) · длина управления — 2/3 высоты')}",
    "${sheetHeader('Заказ дилеру', 'Вставные москитные сетки · размеры в мм (ширина × высота)')}")
rep("""                <th>№</th><th style="text-align: left;">Комната</th><th style="text-align: left;">Ламели</th><th>Примечание</th><th>Ш × В</th><th>Кол-во</th><th>Упр.</th><th>Длина упр.</th>
                <th>Крепление</th><th style="text-align: left;">Опции</th><th>Площадь, м²</th><th>Дилер, $</th><th>Готово</th>""",
    """                <th>№</th><th style="text-align: left;">Комната</th><th style="text-align: left;">Полотно</th><th>Профиль</th><th>Угол</th><th>Перемычка</th><th>Ш × В, мм</th><th>Кол-во</th>
                <th>Примечание</th><th>Дилер, ₽</th><th>Готово</th>""")
rep("Итого у дилера: <b>${usd2(d.totals.usd)} $</b> · по курсу ${fmtNum(d.rate)} ₽: <b>${fmtRub(d.totals.usd * d.rate)} ₽</b> · доставка: <b>${fmtRub(d.tripFee)} ₽</b>",
    "Итого у дилера: <b>${usd2(d.totals.usd)} ₽</b> · доставка: <b>${fmtRub(d.tripFee)} ₽</b>")
rep("— горизонтальные жалюзи` : `Заказ-наряд${pdfNo} — горизонтальные жалюзи`", "— вставные сетки` : `Заказ-наряд${pdfNo} — вставные сетки`")

open(S + 'vsn_pre_amo.html', 'w').write(s)
left = [m for m in ['оризонтальн', 'жалюзи', 'Ламел', 'ламел', 'H_PRICES', 'V_GROUPS', 'MULTI_LIM', 'unitPrice', 'matPriceTxt', 'attachMatSearch', 'horizCalc', ' $<', 'd.rate'] if m in s]
print('built; leftovers:', left)
