# UNI II: uni_pre_amo.html → uni2_pre_amo.html
# Отличия от UNI I (таблица «Раскрой UNI II»):
#   ширина вводится по линии штапика (она же готовая);
#   короб / труба = Ш − 1; ткань / утяжелитель = Ш − 1,7; ткань длина = В + 10; цепь = В × 1,5;
#   направляющая типа С = В − 7 (2 шт, вместо направляющих UNI I, цена та же);
#   + доп. профиль UNI = Ш − 1 (200 ₽/м.п.), + накладки 2 шт на изделие (50 ₽ за пару).
import os
S = os.path.dirname(os.path.abspath(__file__)) + '/'
s = open(S + 'uni_pre_amo.html', encoding='utf-8').read()

def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    assert n == cnt, (n, a[:80])
    s = s.replace(a, b)

# --- названия и хранилища (отдельно от UNI I)
s = s.replace('UNI I', 'UNI II')
rep("'uniCalcState12'", "'uni2CalcState1'", 2)
rep("'uniCalcPhotos'", "'uni2CalcPhotos'")
rep("'uniCalcSettings1'", "'uni2CalcSettings1'")
rep('<label>Ширина СП (см)</label>', '<label>Ширина (штапик)</label>')

# --- формулы раскроя
rep('''      const wFinished = Number((w + 4).toFixed(1));            // Ш ГИ
      return {
        wFinished,
        boxLen: Number((wFinished - 3).toFixed(1)),             // короб / труба: Ш ГИ − 3
        fabricBot: Number(w.toFixed(1)),                        // ткань / утяжелитель: Ш ткани = Ш СП
        fabricLen: Number((h + 10).toFixed(1)),                 // длина ткани: В + 10
        chain: Number((h * 1.5).toFixed(1)),                    // цепь: В × 1.5
        guides: Number(Math.max(0, h - 6).toFixed(1))           // направляющие: В − 6
      };''', '''      const wFinished = Number(w.toFixed(1));                  // Ш по линии штапика = готовая
      return {
        wFinished,
        boxLen: Number(Math.max(0, w - 1).toFixed(1)),          // короб / труба: Ш − 1
        profile: Number(Math.max(0, w - 1).toFixed(1)),         // доп. профиль UNI: Ш − 1
        fabricBot: Number(Math.max(0, w - 1.7).toFixed(1)),     // ткань / утяжелитель: Ш − 1,7
        fabricLen: Number((h + 10).toFixed(1)),                 // длина ткани: В + 10
        chain: Number((h * 1.5).toFixed(1)),                    // цепь: В × 1.5
        guides: Number(Math.max(0, h - 7).toFixed(1))           // направляющая типа С: В − 7
      };''')

# ткань в раскрое — по ширине полотна (Ш − 1,7)
rep("itemsToPack.push({ n: it.n, originalW: it.w / 100, originalH: it.h / 100, width: it.w / 100, height: it.h / 100 + 0.1 });",
    "const fw = cutParts(it.w, it.h).fabricBot / 100;\n          itemsToPack.push({ n: it.n, originalW: fw, originalH: it.h / 100, width: fw, height: it.h / 100 + 0.1 });")
rep("const tooWide = order.items.filter(it => it.fab.width > 0 && it.w > it.fab.width);",
    "const tooWide = order.items.filter(it => it.fab.width > 0 && cutParts(it.w, it.h).fabricBot > it.fab.width);")
rep("изделие ${it.n}: ${fmtNum(it.w)} см, а рулон", "изделие ${it.n}: ткань ${fmtNum(cutParts(it.w, it.h).fabricBot)} см, а рулон")
rep("const areaOf = it => (it.w / 100) * ((it.h + 10) / 100) * it.qty;",
    "const areaOf = it => (cutParts(it.w, it.h).fabricBot / 100) * ((it.h + 10) / 100) * it.qty;")

# итоги по заказу
rep("const totals = { qty: 0, widthCm: 0, boxCm: 0, guidesCm: 0, chainCm: 0 };",
    "const totals = { qty: 0, widthCm: 0, boxCm: 0, profileCm: 0, guidesCm: 0, chainCm: 0 };")
rep('''        totals.widthCm += w * qty;
        totals.boxCm += cutParts(w, h).boxLen * qty;
        totals.guidesCm += Math.max(0, h - 6) * 2 * qty;''', '''        const cp = cutParts(w, h);
        totals.widthCm += cp.fabricBot * qty;
        totals.boxCm += cp.boxLen * qty;
        totals.profileCm += cp.profile * qty;
        totals.guidesCm += cp.guides * 2 * qty;''')

# себестоимость фурнитуры
rep("const wm = w / 100, boxM = c.boxLen / 100, guidesM = c.guides * 2 / 100, chainM = c.chain / 100;",
    "const wm = c.fabricBot / 100, boxM = c.boxLen / 100, profM = c.profile / 100, guidesM = c.guides * 2 / 100, chainM = c.chain / 100;")
rep("return boxM * mw * S.box + boxM * mw * S.tube + wm * mw * S.weight + guidesM * mw * S.guide +",
    "return boxM * mw * S.box + boxM * mw * S.tube + profM * mw * S.profile + wm * mw * S.weight + guidesM * mw * S.guide + S.overlayPair +")

# настройки
rep("box: 220, tube: 55, weight: 130, guide: 70, mechanism: 60,",
    "box: 220, tube: 55, profile: 200, weight: 130, guide: 70, overlayPair: 50, mechanism: 60,")
rep('''        ['tube', 'Труба, ₽/м.п.'],
        ['weight', 'Утяжелитель, ₽/м.п.'],
        ['guide', 'Направляющие, ₽/м.п.'],''', '''        ['tube', 'Труба, ₽/м.п.'],
        ['profile', 'Доп. профиль UNI, ₽/м.п.'],
        ['weight', 'Утяжелитель, ₽/м.п.'],
        ['guide', 'Направляющая типа С, ₽/м.п.'],
        ['overlayPair', 'Накладки, ₽ за пару (1 пара на изделие)'],''')

# комплектующие
rep('''        ['Труба', 'м.п.', m(t.boxCm)],
        ['Утяжелитель ткани', 'м.п.', m(t.widthCm)],
        ['Направляющие UNI', 'м.п.', m(t.guidesCm)],''', '''        ['Труба', 'м.п.', m(t.boxCm)],
        ['Доп. профиль UNI', 'м.п.', m(t.profileCm)],
        ['Утяжелитель ткани', 'м.п.', m(t.widthCm)],
        ['Направляющая типа С', 'м.п.', m(t.guidesCm)],
        ['Накладки', 'шт', t.qty * 2],''')

# вкладка «Тех. часть»: раскрой
rep('''          <td class="key">${c.boxLen} см</td><td class="key">${c.fabricBot} см</td><td class="key">${c.fabricLen} см</td>''',
    '''          <td class="key">${c.boxLen} см</td><td class="key">${c.profile} см</td><td class="key">${c.fabricBot} см</td><td class="key">${c.fabricLen} см</td>''')
rep('''            <th>Короб / Труба<small>(Ш. гот. − 3)</small></th>
            <th>Ткань / Утяж.<small>(Ш)</small></th>''', '''            <th>Короб / Труба<small>(Ш − 1)</small></th>
            <th>Доп. профиль<small>(Ш − 1)</small></th>
            <th>Ткань / Утяж.<small>(Ш − 1,7)</small></th>''')
rep("<th>Направляющие<small>(В − 6)</small></th>", "<th>Направл. С<small>(В − 7), 2 шт</small></th>")
# размеры: одна ширина (по штапику)
rep('''<td>${it.w} см</td>
          <td><strong>${c.wFinished} см</strong></td><td>${it.h} см</td>''', '''<td><strong>${it.w} см</strong></td><td>${it.h} см</td>''')
rep("<th>Шир. (СП)</th><th>Шир. (Готовая)</th><th>Высота</th>", "<th>Шир. (штапик)</th><th>Высота</th>")

# PDF: КП
rep('padding: 10px;">Ширина (по стеклу)</th>', 'padding: 10px;">Ширина</th>')
rep("Рулонные шторы UNI II (кассетные с направляющими)", "Рулонные шторы UNI II (кассетные, с направляющими типа С)")
# PDF: заказ-наряд — спецификация
rep('''            <td style="padding: 8px; border: 1px solid #bdc3c7; text-align: center;">${w} см</td>
            <td style="padding: 8px; border: 1px solid #bdc3c7; text-align: center; font-weight: bold;">${wFinished} см</td>''',
    '''            <td style="padding: 8px; border: 1px solid #bdc3c7; text-align: center; font-weight: bold;">${wFinished} см</td>''')
rep('''                  <th style="border: 1px solid #bdc3c7;">Шир. (СП)</th>
                  <th style="border: 1px solid #bdc3c7;">Шир. (Готовая)</th>''', '''                  <th style="border: 1px solid #bdc3c7;">Шир. (штапик)</th>''')
# PDF: раскрой металла
rep('''            <td style="text-align: center; font-weight: bold; color: #16a085;">${cut.boxLen}</td>
            <td style="text-align: center; font-weight: bold; color: #16a085;">${cut.fabricBot}</td>''', '''            <td style="text-align: center; font-weight: bold; color: #16a085;">${cut.boxLen}</td>
            <td style="text-align: center; font-weight: bold; color: #16a085;">${cut.profile}</td>
            <td style="text-align: center; font-weight: bold; color: #16a085;">${cut.fabricBot}</td>''')
rep('''                  <th>Короб / Труба<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(Ш. гот. − 3)</span></th>
                  <th>Ткань / Утяж.<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(Ш)</span></th>''', '''                  <th>Короб / Труба<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(Ш − 1)</span></th>
                  <th>Доп. профиль<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(Ш − 1)</span></th>
                  <th>Ткань / Утяж.<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(Ш − 1,7)</span></th>''')
rep('''<th>Направляющие<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(В − 6), 2 шт</span></th>''',
    '''<th>Направл. С<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(В − 7), 2 шт</span></th>''')
rep("Размеры труб, короба, ткани и направляющих указаны с учетом допусков для сборки системы UNI II.",
    "Размеры труб, короба, доп. профиля, ткани и направляющих типа С указаны с учетом допусков для сборки системы UNI II. Накладки — 2 шт на изделие.")

rep("function barGuideName() { return 'Направляющие'; }", "function barGuideName() { return 'Направляющие типа С'; }")
open(S + 'uni2_pre_amo.html', 'w', encoding='utf-8').write(s)
print('uni2_pre_amo.html ok')
