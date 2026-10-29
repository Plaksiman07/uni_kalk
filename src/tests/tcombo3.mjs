import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const OUT = new URL('./out/', import.meta.url).pathname;
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
p.on('frameattached', f => {}); 
let ok = true; const chk = (n, c, x = '') => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n + ' ' + x); if (!c) ok = false; };
const B = 'http://localhost:8765/';
// главный экран
await p.goto(B + 'index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
chk('главный: «Новый заказ», калькуляторов нет', await p.isVisible('#newBtn') && !(await p.isVisible('a[href="uni.html"]')));
await p.screenshot({ path: OUT + 'idx_home.png', fullPage: true });
await p.click('a[href="#settings"]'); await p.waitForTimeout(150);
chk('настройки: все 8 калькуляторов', (await p.$$eval('#viewSettings a.row', e => e.length)) === 8 && await p.isVisible('a[href="uni.html"]'));
await p.screenshot({ path: OUT + 'idx_settings.png', fullPage: true });
await p.goBack(); await p.waitForTimeout(150); chk('назад — главный', await p.isVisible('#newBtn'));
// подготовка: обычный UNI со своим заказом (не должен пострадать)
const ID = 'test1';
await p.evaluate(([ID]) => {
  localStorage.setItem('spAmoConfig', JSON.stringify({ url: 'http://localhost:8790', key: 'secret1' }));
  localStorage.setItem('uniCalcState12', JSON.stringify({ orderNumber: '555', clientName: 'Обычный', fabricName: 'ОМЕГА', fabricWidth: '250', fabricColor: 'белый', rooms: [{ name: 'Зал', pk: 'z', items: [{ w: '100', h: '100', qty: '1', ctrl: 'Л' }] }] }));
  localStorage.setItem('uniCalcState12@combo:' + ID, JSON.stringify({ fabricName: 'ОМЕГА', fabricWidth: '250', fabricColor: 'белый', selectedPrice: 'base', rooms: [{ name: 'Кухня', pk: 'a', items: [{ w: '120', h: '150', qty: '1', ctrl: 'Л' }, { w: '80', h: '140', qty: '2', ctrl: 'П' }] }] }));
  localStorage.setItem('meshCalcState1@combo:' + ID, JSON.stringify({ meshType: 'standard', meshColor: 'anthracite', selectedPrice: 'base', rooms: [{ name: 'Спальня', pk: 'b', items: [{ w: '75', h: '150', qty: '1' }, { w: '94', h: '147.5', qty: '1' }] }] }));
  localStorage.setItem('spCombo2', JSON.stringify({ id: ID, client: { orderNumber: '888', clientName: 'Кудухова Марина', clientPhone: '+7 928 666-06-39', clientAddress: 'г. Краснодар, ул. Кудухова 1', prepay: '5000' }, parts: ['mesh', 'uni'], sum: {}, priceSel: 'base', pipeline: '' }));
}, [ID]);
await p.goto(B + 'combo.html');
await p.waitForFunction(() => document.querySelectorAll('.part .it').length === 4, null, { timeout: 20000 }); await p.waitForTimeout(800);
const nums = await p.evaluate(() => [...document.querySelectorAll('.it-n span')].map(s => s.textContent));
chk('сквозная нумерация 1–4 (UNI первым)', nums.join() === '1,2,3,4', nums.join());
const sums = await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('spCombo2')); return { uni: st.sum.uni.prices.base, mesh: st.sum.mesh.prices.base, tot: +document.querySelector('.row.total .money').textContent.replace(/\D/g, '') }; });
chk('итог = UNI + сетки', sums.tot === sums.uni + sums.mesh, JSON.stringify(sums));
chk('воронка по умолчанию — где больше сумма', (await p.textContent('#pipeVal')) === 'Солнцезащитные системы');
await p.screenshot({ path: OUT + 'combo3_a.png', fullPage: true });
await p.click('[data-toggle="uni"]'); await p.waitForTimeout(400); await p.click('#clientSum'); await p.waitForTimeout(400);
await p.screenshot({ path: OUT + 'combo3_b.png', fullPage: true });
await p.click('#addBtn'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + 'combo3_add.png' }); await p.click('.menu-bg'); await p.waitForTimeout(250);
await p.click('#priceRow'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + 'combo3_price.png' }); await p.click('.menu-bg'); await p.waitForTimeout(250);
await p.click('#docsBtn'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + 'combo3_docs.png' }); await p.click('.menu-bg'); await p.waitForTimeout(250);
await p.click('[data-toggle="mesh"]'); await p.waitForTimeout(400);
// редактор раздела
await p.click('[data-edit="mesh"]'); await p.waitForTimeout(500);
const fr = p.frames().find(f => f.url().includes('mesh.html?embed='));
chk('раздел открыт: клиентский блок и кнопки PDF/amo скрыты', fr && !(await fr.isVisible('#orderNumber')) && !(await fr.isVisible('#amoBtn')));
await fr.fill('.item-width >> nth=0', '80'); await p.waitForTimeout(100);
await p.screenshot({ path: OUT + 'combo2_sheet.png' });
await fr.click('#settingsToggle'); await p.waitForTimeout(200); await p.screenshot({ path: OUT + 'combo2_sheet_settings.png' }); await fr.click('#settingsClose');
await p.click('#shDone'); await p.waitForTimeout(700);
const t2 = await p.evaluate(() => JSON.parse(localStorage.getItem('spCombo2')).sum.mesh.items[0].text);
chk('изменение в разделе попало в заказ', /80×150/.test(t2), t2);
chk('обычный UNI не тронут', await p.evaluate(() => JSON.parse(localStorage.getItem('uniCalcState12')).clientName === 'Обычный'));
// документы
for (const [idx, name] of [[0, 'kp'], [1, 'order'], [2, 'labels']]) {
  await p.click('#docsBtn'); await p.waitForTimeout(250);
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click(`.menu .m-i >> nth=${idx}`)]);
  await p.waitForFunction(() => !document.getElementById('docsBtn').disabled, null, { timeout: 60000 });
  await dl.saveAs(OUT + `combo2_${name}.pdf`); console.log(name, dl.suggestedFilename());
}
// amo
const leads = [], files = [];
await p.route('http://localhost:8790/**', route => { const u = route.request().url(); if (u.endsWith('/lead')) leads.push(JSON.parse(route.request().postData())); if (u.includes('/file')) files.push(decodeURIComponent(route.request().headers()['x-file-name'] || '')); route.continue(); });
{ const sub = await p.textContent('#sub'), cnt = await p.textContent('#itemsCount'), heads = await p.$$eval('.p-sub', e => e.map(x => x.textContent)); console.log(sub, '|', cnt, '|', heads.join(' / ')); chk('счёт по штукам', /5 изделий/.test(sub) && /5 шт/.test(cnt) && /3 изделия/.test(heads[0])); }
await p.click('#amoBtn'); await p.waitForFunction(() => /\b(ok|warn|err)\b/.test(document.getElementById('status').className), null, { timeout: 90000 }); await p.screenshot({ path: OUT + 'combo3_sent.png' });
console.log('amo:', await p.innerText('#status'));
chk('тег N шт по штукам', leads[0].tags.includes('5 шт'), JSON.stringify(leads[0].tags));
chk('одна сделка на весь заказ', leads.length === 1 && leads[0].pipeline === 'Солнцезащитные системы');
const tot = +(await p.textContent('.row.total .money')).replace(/\D/g, '');
chk('сумма сделки = итог', leads[0].price === tot, leads[0].price + ' vs ' + tot);
chk('3 файла: заказ-наряд, КП, наклейки', files.length === 3, files.join(' | '));
console.log(JSON.stringify(leads[0].fields), JSON.stringify(leads[0].tags)); console.log(leads[0].note.split('\n').slice(0, 12).join('\n'));
// главный: черновик → шторка «продолжить / новый»
await p.goto(B + 'index.html'); await p.waitForTimeout(200);
chk('чип черновика', /888/.test(await p.textContent('#draftChip')) && await p.isVisible('#draftChip'), await p.textContent('#draftChip'));
await p.screenshot({ path: OUT + 'idx_home_draft.png' });
await p.click('#newBtn'); await p.waitForTimeout(400); await p.screenshot({ path: OUT + 'idx_sheet.png' });
chk('шторка: заказ № 888, 5 изделий', /888/.test(await p.textContent('#dTitle')) && /5 изделий/.test(await p.textContent('#dSub')), await p.textContent('#dSub') + ' ' + await p.textContent('#dSum'));
await p.click('#dCont'); await p.waitForURL(/combo\.html$/); await p.waitForTimeout(800);
chk('продолжить — заказ на месте', (await p.$$('.part')).length === 2 && /888/.test(await p.textContent('#navTitle')));
await p.goto(B + 'index.html'); await p.click('#newBtn'); await p.waitForTimeout(400); await p.click('#dNew'); await p.waitForURL(/combo\.html/); await p.waitForTimeout(800);
chk('новый — пустой заказ без вопросов', (await p.$$('.part')).length === 0 && (await p.textContent('#navTitle')) === 'Новый заказ' && !/new=1/.test(p.url()));
await p.goto(B + 'index.html'); await p.waitForTimeout(200);
await p.click('#newBtn'); await p.waitForTimeout(300);
chk('пустой черновик — сразу в заказ', /combo\.html/.test(p.url()) || (await p.isVisible('#sheet.show')) === false);
console.log('errors', errs, ok ? 'ALL OK' : 'HAS FAILS'); await b.close();
