import os
S = os.path.dirname(os.path.abspath(__file__)) + '/'
client=open(S + 'pdf-lib.js').read()+open(S + 'amo-client.js').read()+open(S + 'embed.js').read()
CSS="""
    /* === amoCRM === */
    .btn-amo { background: #2f6fd6; border: 1px solid #2f6fd6; color: #ffffff; }
    .btn-amo:hover { background: #2459b0; }
    .amo-status { font-size: 13px; line-height: 1.45; margin-top: 8px; color: #65676b; }
    .amo-status:empty { display: none; }
    .amo-status.ok { color: #1e8449; } .amo-status.warn { color: #b9770e; } .amo-status.err { color: #c0392b; }
    .amo-status a { color: inherit; font-weight: 700; }
    .amo-settings-row { text-align: center; margin: 8px 0 40px; font-size: 13px; }
    .amo-settings-row a { color: #7f8c8d; }
    textarea#orderNote { width: 100%; padding: 14px; font-size: 16px; border: 1px solid #ced0d4; border-radius: 10px; background-color: #f7f8fa; color: #1c1e21; box-sizing: border-box; font-family: inherit; resize: vertical; min-height: 54px; }
    textarea#orderNote:focus { outline: none; border-color: #d35400; background-color: #ffffff; }
    .prepay-hint { font-size: 13px; color: #65676b; margin-top: 6px; line-height: 1.4; }
    .prepay-hint:empty { display: none; }
    .prepay-hint b { color: #1c1e21; }
    .prepay-hint.neg b { color: #c0392b; }
    .amo-num-hint { font-size: 13px; color: #65676b; margin-top: 6px; line-height: 1.4; }
    .amo-num-hint:empty { display: none; }
    .amo-num-hint b { color: #1c1e21; }
    .amo-num-fill { border: 1px solid #d35400; background: #fdf0e6; color: #a04000; border-radius: 8px; padding: 6px 10px; font-size: 13px; font-weight: 700; cursor: pointer; margin-left: 2px; }
    .amo-cfg-msg { font-size: 13px; min-height: 18px; margin-top: 4px; line-height: 1.4; }
    /* копия печатных стилей для сборки PDF-файла */
    .pdf-capture .lt-table, .pdf-capture .print-table { width: 100%; border-collapse: collapse; }
    .pdf-capture .lt-table th, .pdf-capture .lt-table td { padding: 6px 8px; font-size: 13px; border: 1px solid #95a5a6; }
    .pdf-capture .print-table th, .pdf-capture .print-table td { padding: 4px 6px; font-size: 12px; }
    .pdf-capture .print-section { margin-bottom: 0; }
"""
HTML="""    </div><!-- /pdf-btns -->
    <button type="button" id="amoBtn" class="btn-action btn-amo">📤 Добавить в amoCRM</button>
    <div class="amo-status" id="amoStatus"></div>
    <div class="amo-settings-row"><a href="#" id="amoSettingsLink">⚙ Подключение amoCRM</a></div>
"""
HOOK_OLD="      Promise.all(imgs).then(() => setTimeout(() => { window.print(); document.title = oldTitle; }, 150));"
HOOK_NEW="""      if (window.__onPrintReady) {   // сборка PDF-файла для amoCRM — без окна печати
        const cb = window.__onPrintReady; window.__onPrintReady = null; document.title = oldTitle;
        Promise.all(imgs).then(cb); return;
      }
      Promise.all(imgs).then(() => setTimeout(() => { window.print(); document.title = oldTitle; }, 150));"""
EMBED_HEAD = """  <script>
    (function () {
      var m = location.search.match(/[?&]embed=([\\w-]+)/);
      if (!m) return;
      window.SP_EMBED = m[1];
      document.documentElement.className += ' sp-embed';
      var re = /^((uni|uni2|zebra|zebra2)CalcState(12|1)|(mesh|plisse|vert|horiz)CalcState1|spExtra:.*)$/;
      var key = function (k) { return re.test(k) ? k + '@combo:' + window.SP_EMBED : k; };
      var P = Storage.prototype, g = P.getItem, s = P.setItem, r = P.removeItem;
      P.getItem = function (k) { return g.call(this, key(k)); };
      P.setItem = function (k, v) { return s.call(this, key(k), v); };
      P.removeItem = function (k) { return r.call(this, key(k)); };
    })();
  </script>
"""
DEFS={
 'uni.html':"""
    const AMO_CALC_ID = 'uni', AMO_CALC_NAME = 'Рулонные шторы UNI I', AMO_PIPELINE = 'Солнцезащитные системы';
    const amoGroups = () => (window.calcData.fabricGroups || []);
    function amoDetails() {
      const g = amoGroups();
      if (g.length > 1) return ['Ткани:', ...g.map(x => `  ${x.rooms.join(', ')} — ${specText(x.spec)}`)];
      return [`Ткань: ${g[0] ? specText(g[0].spec) : getFabricLabel()}`];
    }
    function amoItemText(it) { return `${fmtNum(it.w)}×${fmtNum(it.h)} см (Ш гот. ${cutParts(it.w, it.h).wFinished}), упр. ${it.ctrl}, ${it.qty} шт${amoGroups().length > 1 ? ', ткань ' + specText(it.fab) : ''}`; }
    function amoItemField(it) {
      const fab = amoGroups().length > 1 ? ` · ${capFirst(it.fab.name)}${it.fab.color ? ' ' + it.fab.color : ''}` : '';
      return `${String(fmtNum(it.w)).replace('.', ',')}×${String(fmtNum(it.h)).replace('.', ',')} ${String(it.ctrl).toLowerCase()}${it.qty > 1 ? ', ' + it.qty + ' шт' : ''}${fab}`;
    }
    function amoFields() {
      const g = amoGroups();
      const names = [...new Set(g.map(x => capFirst(x.spec.name)).filter(Boolean))];
      const colors = [...new Set(g.map(x => capFirst(x.spec.color)).filter(Boolean))];
      return { 'Материал': names.join(' / '), 'Цвет': colors.length === 1 ? colors[0] : '' };
    }
    function amoTags() { return ['UNI I', `${readOrder().totals.qty} шт`]; }
""",
 'mesh.html':"""
    const AMO_CALC_ID = 'mesh', AMO_CALC_NAME = 'Москитные сетки', AMO_PIPELINE = 'Москитные сетки';
    const amoMixed = () => window.calcData.mixedType || window.calcData.mixedColor;
    function amoDetails() {
      const d = window.calcData;
      const tt = d.mixedType ? countBy('type', typeNameOf) : typeNameOf(d.types[0] || meshType);
      const cc = d.mixedColor ? countBy('color', colorNameOf) : colorNameOf(d.colors[0] || meshColor);
      return [`Полотно: ${tt}`, `Цвет профиля: ${cc}`];
    }
    function amoItemText(it) { return `${fmtNum(it.w)}×${fmtNum(it.h)} см, ${it.qty} шт${amoMixed() ? ', ' + optText(it) : ''}`; }
    function amoItemField(it) { return `${String(fmtNum(it.w)).replace('.', ',')}×${String(fmtNum(it.h)).replace('.', ',')}${it.qty > 1 ? ', ' + it.qty + ' шт' : ''}${amoMixed() ? ' · ' + optText(it) : ''}`; }
    function amoFields() {
      const d = window.calcData;
      return { 'Материал': (d.types.length ? d.types : [meshType]).map(typeNameOf).join(' / '), 'Цвет': d.colors.length > 1 ? '' : colorNameOf(d.colors[0] || meshColor) };
    }
    function amoTags() { const d = window.calcData; return ['Рамные МС', ...d.types.map(typeNameOf), ...d.colors.map(colorNameOf), `${d.totals.qty} шт`]; }
"""}
DEFS['plisse.html']='''
    const AMO_CALC_ID = 'plisse', AMO_CALC_NAME = 'Сетки плиссе', AMO_PIPELINE = 'Москитные сетки';
    const amoMixed = () => window.calcData.mixedColor;
    function amoDetails() {
      const d = window.calcData;
      return ['Изделие: сетка плиссе, узкая серия', `Цвет профиля: ${d.mixedColor ? countBy('color', colorNameOf) : colorNameOf(d.colors[0] || meshColor)}`];
    }
    function amoItemText(it) { return `СВП ${fmtNum(it.w)}×${fmtNum(it.h)} см (ГИ ${fmtNum(it.cut.giW)}×${fmtNum(it.cut.giH)}), ${it.qty} шт${amoMixed() ? ', ' + optText(it) : ''}`; }
    function amoItemField(it) { return `${String(fmtNum(it.cut.giW)).replace('.', ',')}×${String(fmtNum(it.cut.giH)).replace('.', ',')}${it.qty > 1 ? ', ' + it.qty + ' шт' : ''}${amoMixed() ? ' · ' + optText(it) : ''}`; }
    function amoFields() {
      const d = window.calcData;
      return { 'Материал': 'Плиссе', 'Цвет': d.colors.length > 1 ? '' : colorNameOf(d.colors[0] || meshColor) };
    }
    function amoTags() { const d = window.calcData; return ['Плиссе', ...d.colors.map(colorNameOf), `${d.totals.qty} шт`]; }
'''
EXTRA_FIELDS='''      <div class="form-group"><input type="text" id="clientAddress" placeholder="Адрес объекта" oninput="saveState()"></div>
      <div class="form-group"><input type="number" id="prepay" placeholder="Предоплата, ₽" inputmode="decimal" min="0" step="1"><div class="prepay-hint" id="prepayHint"></div></div>
      <div class="form-group"><textarea id="orderNote" rows="3" placeholder="Например: установка через неделю, оплата в рассрочку"></textarea></div>
'''
EXTRAS=open(S+'extras.js').read()
DEFS['vert.html']='''
    const AMO_CALC_ID = 'vert', AMO_CALC_NAME = 'Вертикальные жалюзи', AMO_PIPELINE = 'Солнцезащитные системы';
    function amoDetails() {
      const d = window.calcData;
      return [`Изделие: вертикальные жалюзи`, `Ламели: ${countBy("type", matLabel)}`];
    }
    function amoItemText(it) { return `${fmtNum(it.w)}×${fmtNum(it.h)} см, ${it.qty} шт, ${matLabel(it.type)}${it.color ? ' ' + it.color : ''}, упр. ${it.ctrl}, сборка ${it.stack.toLowerCase()}${optsText(it.opts) ? ', ' + optsText(it.opts) : ''}`; }
    function amoItemField(it) { return `${String(fmtNum(it.w)).replace('.', ',')}×${String(fmtNum(it.h)).replace('.', ',')} ${String(it.ctrl).toLowerCase()}${it.qty > 1 ? ', ' + it.qty + ' шт' : ''} · ${it.mat ? it.mat.name : ''}${it.color ? ' ' + it.color : ''}`; }
    function amoFields() {
      const d = window.calcData;
      return { 'Материал': 'Вертикальные: ' + [...new Set(d.items.map(it => it.mat ? it.mat.name : '').filter(Boolean))].join(' / ') };
    }
    function amoTags() { return ['Вертикальные', `${window.calcData.totals.qty} шт`]; }
'''
DEFS['horiz.html']='''
    const AMO_CALC_ID = 'horiz', AMO_CALC_NAME = 'Горизонтальные жалюзи', AMO_PIPELINE = 'Солнцезащитные системы';
    function amoDetails() { return ['Изделие: горизонтальные алюминиевые жалюзи', `Ламели: ${countBy("type", matLabel)}`]; }
    function amoItemText(it) { return `${fmtNum(it.w)}×${fmtNum(it.h)} см, ${it.qty} шт, ${matLabel(it.type)}${it.color ? ' (' + it.color + ')' : ''}, упр. ${it.ctrl}, ${it.mount.toLowerCase()}${optsText(it.opts) ? ', ' + optsText(it.opts) : ''}`; }
    function amoItemField(it) { return `${String(fmtNum(it.w)).replace('.', ',')}×${String(fmtNum(it.h)).replace('.', ',')} ${String(it.ctrl).toLowerCase()}${it.qty > 1 ? ', ' + it.qty + ' шт' : ''} · ${it.mat ? it.mat.cat + ' ' + it.mat.name : ''}`; }
    function amoFields() {
      const d = window.calcData;
      return { 'Материал': 'Горизонтальные: ' + [...new Set(d.items.map(it => it.mat ? it.mat.cat + ' ' + it.mat.name : '').filter(Boolean))].join(' / ') };
    }
    function amoTags() { return ['Горизонтальные', `${window.calcData.totals.qty} шт`]; }
'''
DEFS['uni2.html']=DEFS['uni.html'].replace("['UNI I', ", "['UNI II', ").replace("AMO_CALC_ID = 'uni', AMO_CALC_NAME = 'Рулонные шторы UNI I'", "AMO_CALC_ID = 'uni2', AMO_CALC_NAME = 'Рулонные шторы UNI II'").replace(" (Ш гот. ${cutParts(it.w, it.h).wFinished})", " по штапику")
assert "'uni2'" in DEFS['uni2.html'] and 'по штапику' in DEFS['uni2.html']
DEFS['zebra.html']=DEFS['uni.html'].replace("AMO_CALC_ID = 'uni', AMO_CALC_NAME = 'Рулонные шторы UNI I'", "AMO_CALC_ID = 'zebra', AMO_CALC_NAME = 'Рулонные шторы зебра UNI I'").replace("['UNI I', ", "['UNI I зебра', ")
assert "'zebra'" in DEFS['zebra.html'] and 'UNI I зебра' in DEFS['zebra.html']
DEFS['zebra2.html']=DEFS['uni2.html'].replace("AMO_CALC_ID = 'uni2', AMO_CALC_NAME = 'Рулонные шторы UNI II'", "AMO_CALC_ID = 'zebra2', AMO_CALC_NAME = 'Рулонные шторы зебра UNI II'").replace("['UNI II', ", "['UNI II зебра', ")
assert "'zebra2'" in DEFS['zebra2.html'] and 'UNI II зебра' in DEFS['zebra2.html']
for f,src in [('uni.html','uni_pre_amo.html'),('uni2.html','uni2_pre_amo.html'),('zebra.html','zebra_pre_amo.html'),('zebra2.html','zebra2_pre_amo.html'),('mesh.html','mesh_pre_amo.html'),('plisse.html','plisse_pre_amo.html'),('vert.html','vert_pre_amo.html'),('horiz.html','horiz_pre_amo.html')]:
    s=open(S+src).read()
    def rep(a,b):
        global s
        assert s.count(a)==1, (f,a[:60]); s=s.replace(a,b)
    rep('    </div><!-- /pdf-btns -->\n', HTML)
    rep('    .pdf-btns { display: flex; gap: 10px; margin-bottom: 40px; }', '    .pdf-btns { display: flex; gap: 10px; margin-bottom: 10px; }')
    rep(HOOK_OLD, HOOK_NEW)
    # режим раздела «Комбинированного заказа»: свои ключи хранения, чтобы не путать с обычной работой калькулятора
    s = s.replace('<head>\n', '<head>\n' + EMBED_HEAD, 1)
    s = s.replace('<a href="index.html" class="home-btn"', '<a href="index.html#new" class="home-btn"')
    # сквозная нумерация изделий в комбинированном заказе
    if "let n = 0;\n      const specCache" in s: rep("let n = 0;\n      const specCache", "let n = window.__numOffset || 0;\n      const specCache")
    else: rep("items.push({ n: i + 1,", "items.push({ n: i + 1 + (window.__numOffset || 0),")
    rep("return { blob: buildLabelsPdf(pages, W, H), count: pages.length, W, H, orderNoRaw };", "return { blob: buildLabelsPdf(pages, W, H), pages, count: pages.length, W, H, orderNoRaw };")
    rep('<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">', '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">')
    rep('  </style>\n</head>', CSS+open(S+'polish.css').read()+'  </style>\n</head>')
    rep('      <div class="form-group"><input type="text" id="clientAddress" placeholder="Адрес объекта" oninput="saveState()"></div>\n', EXTRA_FIELDS)
    rep("      if (pdfMode === 'order') pdfRoot.querySelectorAll('.kp-part').forEach(el => el.remove());\n",
        "      if (pdfMode === 'order') pdfRoot.querySelectorAll('.kp-part').forEach(el => el.remove());\n      if (window.spDecoratePrint) window.spDecoratePrint(pdfRoot);\n")
    rep('    loadPhotos();\n', DEFS[f]+EXTRAS+open(S+'polish.js').read()+client+'\n    loadPhotos();\n')
    # тексты: вкладка, подписи размеров, единая кнопка «Готово»
    s = s.replace('Тех часть заказа</button>', 'Тех. часть</button>').replace('«Тех часть заказа»', '«Тех. часть»')
    s = s.replace('<label>Ширина (см)</label>', '<label>Ширина</label>').replace('<label>Высота (см)</label>', '<label>Высота</label>').replace('<label>Ширина СП (см)</label>', '<label>Ширина СП</label>')
    s = s.replace('data-save style="margin:0;">Сохранить</button>', 'data-save style="margin:0;">Готово</button>')
    s = s.replace('Настройки сеток отдельные от рулонных штор.', 'Настройки этого калькулятора хранятся отдельно от других.' if f != 'mesh.html' else 'Настройки сеток отдельные от рулонных штор.')
    s = s.replace('<div class="block-title">Помещения и Размеры</div>\n      <div id="roomsContainer"></div>', '<div class="block-title">Помещения и Размеры</div>\n      <div class="visual-hint" style="text-align:left;">Размеры в см.</div>\n      <div id="roomsContainer"></div>')
    if f in ('mesh.html', 'vert.html', 'horiz.html'):   # картинка изделия в КП и заказ-наряде
        MICON = open(S + {'mesh.html': 'mesh_icon.svg', 'vert.html': 'vert_icon.svg', 'horiz.html': 'horiz_icon.svg'}[f]).read()
        rep('                <div style="width: 140px;"></div>\n', '                <div style="width: 140px; text-align: right;">' + MICON + '</div>\n')
        rep('''                <div style="text-align: right; font-size: 13px; color: #7f8c8d;">Дата формирования:<br><strong style="color: #2c3e50;">${dateStr}</strong></div>''',
            '''                <table style="border-collapse: collapse;"><tr>
                  <td style="text-align: right; font-size: 13px; color: #7f8c8d; vertical-align: bottom; padding-right: 10px;">Дата формирования:<br><strong style="color: #2c3e50;">${dateStr}</strong></td>
                  <td style="vertical-align: bottom;">''' + MICON.replace('width="110" height="110"', 'width="64" height="64"') + '''</td>
                </tr></table>''')
    open(S + '../' + f, 'w').write(s)
print('ok')
