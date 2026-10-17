# UNI I ЗЕБРА: uni_pre_amo.html → zebra_pre_amo.html
# Всё как в UNI I (ввод по СП, Ш ГИ = СП + 4, короб/труба = Ш ГИ − 3, направляющие В − 6, цепь В × 1,5), кроме:
#   ткань длина = В × 2 + 10 (ткань зебра идёт двумя слоями);
#   вместо утяжелителя — отвес для зебры UNI 10 мм (белый, ОПТ Амиго 208,24 ₽/м.п.), длина = ширине ткани;
#   + доп. профиль для UNI зебра (белый, ОПТ 133,61 ₽/м.п.), длина = длине короба;
#   ткани — прайс Амиго 01.08.26, лист «ЗЕБРА ТКАНЬ», колонка ОПТ ($ за м.п.) → zebra_fabrics.json.
import os, json
S = os.path.dirname(os.path.abspath(__file__)) + '/'
s = open(S + 'uni_pre_amo.html', encoding='utf-8').read()

def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    assert n == cnt, (n, a[:80])
    s = s.replace(a, b)

# --- ткани зебра вместо рулонных
a = s.index('    const fabricDB = [\n'); b = s.index('    ];\n', a) + len('    ];\n')
fab = json.load(open(S + 'zebra_fabrics.json', encoding='utf-8'))
s = s[:a] + '    const fabricDB = [\n' + ',\n'.join('      ' + json.dumps(f, ensure_ascii=False) for f in fab) + '\n    ];\n' + s[b:]

# --- названия и хранилища
rep('Кассетные рулонные шторы UNI I — это эстетичное и надежное решение для защиты вашего помещения от солнца.',
    'Рулонные шторы «зебра» (день-ночь) UNI I — чередование прозрачных и плотных полос позволяет плавно регулировать освещённость.')
rep('Рулонные шторы UNI I (кассетные с направляющими)', 'Рулонные шторы зебра UNI I (кассетные с направляющими)')
s = s.replace('Рулонные шторы UNI I', 'Рулонные шторы зебра UNI I').replace('Модель UNI I', 'Модель UNI I зебра').replace('системы UNI I.', 'системы UNI I зебра.')
rep("'uniCalcState12'", "'zebraCalcState1'", 2)
rep("'uniCalcPhotos'", "'zebraCalcPhotos'")
rep("'uniCalcSettings1'", "'zebraCalcSettings1'")

# --- формулы
rep("        fabricLen: Number((h + 10).toFixed(1)),                 // длина ткани: В + 10",
    "        fabricLen: Number((h * 2 + 10).toFixed(1)),             // длина ткани зебра: В × 2 + 10\n        profile: Number((wFinished - 3).toFixed(1)),            // доп. профиль UNI: как короб")
rep("        fabricBot: Number(w.toFixed(1)),                        // ткань / утяжелитель: Ш ткани = Ш СП",
    "        fabricBot: Number(w.toFixed(1)),                        // ткань / отвес: Ш ткани = Ш СП")
rep("width: it.w / 100, height: it.h / 100 + 0.1 });", "width: it.w / 100, height: (it.h * 2 + 10) / 100 });")
rep("const areaOf = it => (it.w / 100) * ((it.h + 10) / 100) * it.qty;", "const areaOf = it => (it.w / 100) * ((it.h * 2 + 10) / 100) * it.qty;")
rep("const totals = { qty: 0, widthCm: 0, boxCm: 0, guidesCm: 0, chainCm: 0 };", "const totals = { qty: 0, widthCm: 0, boxCm: 0, profileCm: 0, guidesCm: 0, chainCm: 0 };")
rep("        totals.boxCm += cutParts(w, h).boxLen * qty;", "        totals.boxCm += cutParts(w, h).boxLen * qty;\n        totals.profileCm += cutParts(w, h).profile * qty;")
rep("return boxM * mw * S.box + boxM * mw * S.tube + wm * mw * S.weight +",
    "return boxM * mw * S.box + boxM * mw * S.tube + c.profile / 100 * mw * S.profile + wm * mw * S.weight +")

# --- настройки
rep("box: 220, tube: 55, weight: 130,", "box: 220, tube: 55, profile: 133.61, weight: 208.24,")
rep("        ['weight', 'Утяжелитель, ₽/м.п.'],", "        ['profile', 'Доп. профиль UNI зебра, ₽/м.п.'],\n        ['weight', 'Отвес для зебры UNI 10 мм, ₽/м.п.'],")
rep("['weightCap', 'Крышка утяжелителя, ₽/шт (2 на изделие)'],", "['weightCap', 'Заглушка отвеса, ₽/шт (2 на изделие)'],")

# --- комплектующие
rep("        ['Утяжелитель ткани', 'м.п.', m(t.widthCm)],", "        ['Доп. профиль UNI зебра', 'м.п.', m(t.profileCm)],\n        ['Отвес для зебры UNI 10 мм', 'м.п.', m(t.widthCm)],")
rep("        ['Крышка утяжелителя', 'шт', t.qty * 2],", "        ['Заглушка отвеса', 'шт', t.qty * 2],")

# --- тех. часть
rep('''          <td class="key">${c.boxLen} см</td><td class="key">${c.fabricBot} см</td><td class="key">${c.fabricLen} см</td>''',
    '''          <td class="key">${c.boxLen} см</td><td class="key">${c.profile} см</td><td class="key">${c.fabricBot} см</td><td class="key">${c.fabricLen} см</td>''')
rep('''            <th>Ткань / Утяж.<small>(Ш)</small></th>
            <th>Ткань длина<small>(В + 10)</small></th>''', '''            <th>Доп. профиль<small>(Ш. гот. − 3)</small></th>
            <th>Ткань / Отвес<small>(Ш)</small></th>
            <th>Ткань длина<small>(В × 2 + 10)</small></th>''')
rep('Высота изделий указана с учетом +10см намотки', 'Длина ткани зебра на схеме: В × 2 + 10 см')
rep('высота на схеме с +10 см на намотку', 'длина ткани на схеме: В × 2 + 10 см')

# --- PDF: раскрой металла
rep('''            <td style="text-align: center; font-weight: bold; color: #16a085;">${cut.boxLen}</td>
            <td style="text-align: center; font-weight: bold; color: #16a085;">${cut.fabricBot}</td>''', '''            <td style="text-align: center; font-weight: bold; color: #16a085;">${cut.boxLen}</td>
            <td style="text-align: center; font-weight: bold; color: #16a085;">${cut.profile}</td>
            <td style="text-align: center; font-weight: bold; color: #16a085;">${cut.fabricBot}</td>''')
rep('''                  <th>Ткань / Утяж.<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(Ш)</span></th>
                  <th>Ткань длина<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(В + 10)</span></th>''', '''                  <th>Доп. профиль<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(Ш. гот. − 3)</span></th>
                  <th>Ткань / Отвес<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(Ш)</span></th>
                  <th>Ткань длина<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(В × 2 + 10)</span></th>''')
rep('Размеры труб, короба, ткани и направляющих указаны', 'Размеры труб, короба, доп. профиля, ткани, отвеса и направляющих указаны')

open(S + 'zebra_pre_amo.html', 'w', encoding='utf-8').write(s)
print('zebra_pre_amo.html ok')
