import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const OUT = new URL('./out/', import.meta.url).pathname;
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
let ok = true; const chk = (n, c, x = '') => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n + ' ' + x); if (!c) ok = false; };
const B = 'http://localhost:8765/';
await p.goto(B + 'index.html');
await p.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('spComboFiles'); localStorage.setItem('spAmoConfig', JSON.stringify({ url: 'http://localhost:8790', key: 'secret1' }));
  localStorage.setItem('uniCalcState12', JSON.stringify({ orderNumber: '777', clientName: 'Кудухова Марина', clientPhone: '+7 928 666-06-39', clientAddress: 'г. Краснодар, ул. Кудухова 1 к1 кв 373', fabricName: 'ОМЕГА', fabricWidth: '250', fabricColor: 'белый', selectedPrice: 'base', rooms: [{ name: 'Кухня', pk: 'a', items: [{ w: '120', h: '150', qty: '1', ctrl: 'Л' }, { w: '80', h: '140', qty: '2', ctrl: 'П' }] }] }));
  localStorage.setItem('meshCalcState1', JSON.stringify({ orderNumber: 'старый', clientName: 'Другой клиент', meshType: 'standard', meshColor: 'anthracite', selectedPrice: 'base', rooms: [{ name: 'Спальня', pk: 'b', items: [{ w: '75', h: '150', qty: '1' }, { w: '94', h: '147.5', qty: '1' }] }] })); });
// 1) UNI → в общий заказ
await p.goto(B + 'uni.html'); await p.fill('#prepay', '5000');
await p.click('#comboBtn'); await p.waitForFunction(() => /✓|✕/.test(document.getElementById('comboStatus').textContent), null, { timeout: 30000 });
console.log('uni:', await p.textContent('#comboStatus'));
const uniPrice = await p.evaluate(() => window.calcData.priceBase);
chk('баннер общего заказа в UNI', /Общий заказ № 777/.test(await p.textContent('.combo-banner')));
// 2) сетки: клиент подставился
await p.goto(B + 'mesh.html');
const cl = await p.evaluate(() => ['orderNumber', 'clientName', 'clientAddress', 'prepay'].map(id => document.getElementById(id).value));
chk('в сетках подставился клиент из общего заказа', cl[0] === '777' && cl[1] === 'Кудухова Марина' && cl[3] === '5000', JSON.stringify(cl));
await p.click('#comboBtn'); await p.waitForFunction(() => /✓|✕/.test(document.getElementById('comboStatus').textContent), null, { timeout: 30000 });
const meshPrice = await p.evaluate(() => window.calcData.priceBase);
console.log('mesh:', await p.textContent('#comboStatus'));
// изменение после добавления → «обновить»
await p.fill('.item-width >> nth=0', '76'); await p.waitForTimeout(150);
chk('после изменения — кнопка «Обновить»', /Обновить/.test(await p.textContent('#comboBtn')));
await p.fill('.item-width >> nth=0', '75'); await p.waitForTimeout(150);
// 3) общий заказ
await p.goto(B + 'combo.html');
const parts = await p.locator('.part').count();
const totTxt = await p.textContent('.sumrow.big b');
chk('две части', parts === 2);
chk('итог = UNI + сетки', Number(totTxt.replace(/\D/g, '')) === uniPrice + meshPrice, `${totTxt} vs ${uniPrice}+${meshPrice}`);
chk('к доплате = итог − 5000', (await p.textContent('#sums')).replace(/\D/g,'').includes(String(uniPrice + meshPrice - 5000)), await p.textContent('#sums'));
await p.click('.price-row >> nth=1'); await p.waitForTimeout(100);
const t7 = Number((await p.textContent('.sumrow.big b')).replace(/\D/g, ''));
chk('скидка 7% — сумма скидочных цен частей', t7 > 0 && t7 < uniPrice + meshPrice, String(t7));
await p.screenshot({ path: OUT + 'combo.png', fullPage: true });
// КП
await p.evaluate(() => { window.print = () => { window.__p = 1; }; }); await p.click('#kpBtn'); await p.waitForFunction(() => window.__p === 1);
const kpSum = await p.evaluate(() => [...document.querySelectorAll('#printArea td')].filter(td => /₽/.test(td.textContent) && !td.previousElementSibling?.textContent.includes('Итого')).map(td => +td.textContent.replace(/\D/g, '')));
console.log('КП строки:', JSON.stringify(kpSum));
await p.emulateMedia({ media: 'print' }); await p.pdf({ path: OUT + 'combo_kp.pdf', preferCSSPageSize: true, printBackground: true }); await p.emulateMedia({ media: 'screen' });
// amo
const leads = [], files = [];
await p.route('http://localhost:8790/**', async route => { const u = route.request().url(); if (u.endsWith('/lead')) leads.push(JSON.parse(route.request().postData())); if (u.includes('/file')) files.push(decodeURIComponent(route.request().headers()['x-file-name'] || '')); route.continue(); });
await p.click('#amoBtn'); await p.waitForFunction(() => /✓|⚠|✕/.test(document.getElementById('status').textContent) && !/⏳/.test(document.getElementById('status').textContent), null, { timeout: 90000 });
console.log('amo:', await p.innerText('#status'));
chk('две сделки — по воронкам', leads.length === 2 && leads.map(l => l.pipeline).sort().join() === 'Москитные сетки,Солнцезащитные системы', leads.map(l => l.pipeline + ' ' + l.price).join(' | '));
chk('суммы сделок = части (скидка 7%)', leads.reduce((a, l) => a + l.price, 0) === t7);
chk('файлы: КП + заказ-наряд + наклейки в каждую', files.length === 6, files.join(' | '));
console.log(leads[0].note.split('\n').slice(0, 14).join('\n'));
console.log(JSON.stringify(leads[1].fields), JSON.stringify(leads[1].tags));
// изменить → состояние восстанавливается
await p.evaluate(() => localStorage.setItem('meshCalcState1', JSON.stringify({ orderNumber: 'x', rooms: [] })));
await p.click('[data-edit="mesh"]'); await p.waitForURL(/mesh/);
chk('«Изменить» вернул изделия сеток', (await p.locator('.item-row').count()) === 2);
// завершить
await p.goto(B + 'combo.html'); await p.click('#endBtn'); await p.waitForTimeout(200);
chk('после завершения — экран «не начат»', await p.isVisible('#startBtn'));
await p.goto(B + 'mesh.html'); chk('баннер исчез', (await p.textContent('.combo-banner')) === '');
console.log('errors', errs, ok ? 'ALL OK' : 'HAS FAILS'); await b.close();
