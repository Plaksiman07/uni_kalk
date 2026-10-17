# UNI II ЗЕБРА: uni2_pre_amo.html → zebra2_pre_amo.html (запускать после build_uni2.py)
# Всё как в UNI II (ширина по штапику, короб/труба Ш − 1, ткань Ш − 1,7, направляющая С В − 7, накладки), кроме:
#   ткань длина = В × 2 + 10;
#   вместо утяжелителя — отвес для зебры UNI 10 мм (белый, ОПТ Амиго 208,24 ₽/м.п.), длина = ширине ткани;
#   доп. профиль — один, высокий универсальный белый UNI II (ОПТ Амиго 213,98 ₽/м.п.), длина = Ш − 1 (как короб);
#   ткани — zebra_fabrics.json (прайс Амиго 01.08.26, «ЗЕБРА ТКАНЬ», ОПТ).
import os, json
S = os.path.dirname(os.path.abspath(__file__)) + '/'
s = open(S + 'uni2_pre_amo.html', encoding='utf-8').read()

def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    assert n == cnt, (n, a[:80])
    s = s.replace(a, b)

a = s.index('    const fabricDB = [\n'); b = s.index('    ];\n', a) + len('    ];\n')
fab = json.load(open(S + 'zebra_fabrics.json', encoding='utf-8'))
s = s[:a] + '    const fabricDB = [\n' + ',\n'.join('      ' + json.dumps(f, ensure_ascii=False) for f in fab) + '\n    ];\n' + s[b:]

rep('Кассетные рулонные шторы UNI II — это эстетичное и надежное решение для защиты вашего помещения от солнца.',
    'Рулонные шторы «зебра» (день-ночь) UNI II — чередование прозрачных и плотных полос позволяет плавно регулировать освещённость.')
rep('Рулонные шторы UNI II (кассетные, с направляющими типа С)', 'Рулонные шторы зебра UNI II (кассетные, с направляющими типа С)')
s = s.replace('Рулонные шторы UNI II', 'Рулонные шторы зебра UNI II').replace('Модель UNI II', 'Модель UNI II зебра').replace('системы UNI II.', 'системы UNI II зебра.')
rep("'uni2CalcState1'", "'zebra2CalcState1'", 2)
rep("'uni2CalcPhotos'", "'zebra2CalcPhotos'")
rep("'uni2CalcSettings1'", "'zebra2CalcSettings1'")

rep("        fabricLen: Number((h + 10).toFixed(1)),                 // длина ткани: В + 10",
    "        fabricLen: Number((h * 2 + 10).toFixed(1)),             // длина ткани зебра: В × 2 + 10")
rep("// ткань / утяжелитель: Ш − 1,7", "// ткань / отвес: Ш − 1,7")
rep("width: fw, height: it.h / 100 + 0.1 });", "width: fw, height: (it.h * 2 + 10) / 100 });")
rep("* ((it.h + 10) / 100) * it.qty;", "* ((it.h * 2 + 10) / 100) * it.qty;")

rep("profile: 200, weight: 130,", "profile: 213.98, weight: 208.24,")
rep("['profile', 'Доп. профиль UNI, ₽/м.п.'],", "['profile', 'Доп. профиль высокий универсальный UNI II, ₽/м.п.'],")
rep("['weight', 'Утяжелитель, ₽/м.п.'],", "['weight', 'Отвес для зебры UNI 10 мм, ₽/м.п.'],")
rep("['weightCap', 'Крышка утяжелителя, ₽/шт (2 на изделие)'],", "['weightCap', 'Заглушка отвеса, ₽/шт (2 на изделие)'],")
rep("['Доп. профиль UNI', 'м.п.', m(t.profileCm)],", "['Доп. профиль высокий универсальный UNI II', 'м.п.', m(t.profileCm)],")
rep("['Утяжелитель ткани', 'м.п.', m(t.widthCm)],", "['Отвес для зебры UNI 10 мм', 'м.п.', m(t.widthCm)],")
rep("['Крышка утяжелителя', 'шт', t.qty * 2],", "['Заглушка отвеса', 'шт', t.qty * 2],")

rep("<th>Ткань / Утяж.<small>(Ш − 1,7)</small></th>", "<th>Ткань / Отвес<small>(Ш − 1,7)</small></th>")
rep("<th>Ткань длина<small>(В + 10)</small></th>", "<th>Ткань длина<small>(В × 2 + 10)</small></th>")
rep('<th>Ткань / Утяж.<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(Ш − 1,7)</span></th>',
    '<th>Ткань / Отвес<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(Ш − 1,7)</span></th>')
rep('<th>Ткань длина<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(В + 10)</span></th>',
    '<th>Ткань длина<br><span style="font-size:10px; font-weight:normal; color:#7f8c8d;">(В × 2 + 10)</span></th>')
rep('Высота изделий указана с учетом +10см намотки', 'Длина ткани зебра на схеме: В × 2 + 10 см')
rep('высота на схеме с +10 см на намотку', 'длина ткани на схеме: В × 2 + 10 см')
rep('доп. профиля, ткани и направляющих типа С', 'доп. профиля, ткани, отвеса и направляющих типа С')

rep("function barWeightName() { return 'Утяжелитель'; }", "function barWeightName() { return 'Отвес'; }")
open(S + 'zebra2_pre_amo.html', 'w', encoding='utf-8').write(s)
print('zebra2_pre_amo.html ok')
