import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const OUT = new URL('./out/', import.meta.url).pathname; (await import('fs')).mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
let ok = true; const chk = (n, c, x = '') => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n + ' ' + x); if (!c) ok = false; };
const B = 'http://localhost:8765/';
const mk = ([ID, num, name, w]) => {
  localStorage.setItem('meshCalcState1@combo:' + ID, JSON.stringify({ meshType: 'standard', meshColor: 'white', selectedPrice: 'base', rooms: [{ name: 'Кухня', pk: 'a', items: [{ w: String(w), h: '150', qty: '2' }] }] }));
  localStorage.setItem('spCombo2', JSON.stringify({ id: ID, client: { orderNumber: num, clientName: name, addrCity: 'Краснодар', addrStreet: 'ул. Мира', addrHouse: '5' }, parts: ['mesh'], sum: {}, priceSel: 'base', pipeline: '', services: [] }));
};
const loadCombo = async () => { await p.waitForFunction(() => { const s = JSON.parse(localStorage.getItem('spCombo2') || '{}'); return s.sum && s.sum.mesh; }, null, { timeout: 20000 }); await p.waitForTimeout(500); };
const drafts = () => p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('spDrafts') || '{}')));
await p.goto(B + 'index.html'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('spAmoConfig', JSON.stringify({ url: 'http://localhost:8790', key: 'secret1' })); });
// 1. заказ А → «Сохранить в черновики»
await p.evaluate(mk, ['A1', '701', 'Иванов', 80]);
await p.goto(B + 'index.html'); await p.click('#newBtn'); await p.click('#dCont'); await p.waitForURL(/combo/); await loadCombo();
await p.screenshot({ path: OUT + 'dr_combo.png', fullPage: true });
await p.click('#draftRow'); await p.waitForURL(/index/); await p.waitForTimeout(400);
chk('А сохранён в черновики, открытый заказ пустой', (await drafts()).join() === 'A1' && await p.evaluate(() => !JSON.parse(localStorage.getItem('spCombo2')).parts.length));
chk('на главном список черновиков: 1', (await p.$$eval('#draftsList [data-d]', e => e.length)) === 1);
chk('тост «сохранён»', /сохранён/.test(await p.textContent('#itoast')));
chk('данные раздела А на месте', await p.evaluate(() => !!localStorage.getItem('meshCalcState1@combo:A1')));
// 2. заказ Б: «Новый заказ» → заполнить → «Начать новый» из меню → Б тоже в черновиках
await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('spCombo2')); localStorage.setItem('meshCalcState1@combo:' + st.id, JSON.stringify({ meshType: 'standard', meshColor: 'white', selectedPrice: 'base', rooms: [{ name: 'Зал', pk: 'a', items: [{ w: '100', h: '150', qty: '1' }] }] }));
  st.parts = ['mesh']; st.client.orderNumber = '702'; st.client.clientName = 'Петров'; localStorage.setItem('spCombo2', JSON.stringify(st)); });
await p.goto(B + 'combo.html'); await loadCombo();
await p.click('#moreBtn'); await p.waitForTimeout(250); await p.screenshot({ path: OUT + 'dr_menu.png' });
await p.click('text=Начать новый заказ'); await p.waitForTimeout(400);
chk('«Начать новый» — Б ушёл в черновики, не удалился', (await drafts()).length === 2);
// 3. заказ В открыт (незаконченный) — на главном 3 черновика, В первым и «открыт»
await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('spCombo2')); st.client.clientName = 'Сидоров'; localStorage.setItem('spCombo2', JSON.stringify(st)); });
await p.goto(B + 'index.html'); await p.waitForTimeout(300);
const rows = await p.$$eval('#draftsList [data-d]', e => e.map(x => x.innerText.replace(/\s+/g, ' ')));
console.log(rows);
chk('3 черновика, открытый первым', rows.length === 3 && /Сидоров/.test(rows[0]) && /открыт/.test(rows[0]));
await p.screenshot({ path: OUT + 'dr_home.png', fullPage: true });
// 4. «Изменить» черновик А: открывается А, открытый В уходит в черновики
await p.click('#draftsList [data-d="A1"]'); await p.waitForTimeout(350); await p.screenshot({ path: OUT + 'dr_sheet.png' });
await p.click('#dsEdit'); await p.waitForURL(/combo/); await loadCombo();
const cur = await p.evaluate(() => JSON.parse(localStorage.getItem('spCombo2')));
chk('открыт А с изделиями', cur.id === 'A1' && cur.client.orderNumber === '701' && (cur.sum.mesh.items || []).length === 1, JSON.stringify(cur.sum.mesh.items));
chk('В и Б в черновиках, А — нет', (await drafts()).length === 2 && !(await drafts()).includes('A1'));
// 5. «Удалить» Б
await p.goto(B + 'index.html'); await p.waitForTimeout(300);
const idB = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('spDrafts'))).find(x => x.client.clientName === 'Петров').id);
// свайп влево по Б → «Удалить»
const swipe = async (sel, dist) => { const bx = await p.locator(sel).boundingBox(); const y = bx.y + bx.height / 2, x = bx.x + bx.width - 30;
  await p.mouse.move(x, y); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(x - dist * i / 8, y); await p.mouse.up(); await p.waitForTimeout(350); };
await swipe(`#draftsList [data-d="${idB}"]`, 110);
await p.screenshot({ path: OUT + 'dr_swipe.png' });
chk('свайп открыл «Удалить», шторка не открылась', await p.isVisible(`[data-del="${idB}"]`) && !(await p.evaluate(() => document.getElementById('dsheet').classList.contains('show'))));
// тап по строке — закрывает, ещё раз свайп и «Удалить» → отмена
await p.click(`#draftsList [data-d="${idB}"]`); await p.waitForTimeout(300);
chk('тап по открытой строке закрыл её', await p.evaluate(id => !document.querySelector(`[data-d="${id}"]`).style.transform, idB));
await swipe(`#draftsList [data-d="${idB}"]`, 110); await p.click(`[data-del="${idB}"]`); await p.waitForTimeout(400);
await p.screenshot({ path: OUT + 'dr_undo.png' });
chk('после удаления строки нет, есть «Отменить»', (await p.$$(`#draftsList [data-d="${idB}"]`)).length === 0 && await p.isVisible('#itoast button'));
await p.click('#itoast button'); await p.waitForTimeout(400);
chk('«Отменить» вернул черновик', (await p.$$(`#draftsList [data-d="${idB}"]`)).length === 1 && (await drafts()).includes(idB));
// длинный свайп — удаление сразу, через 4,5 с — насовсем
await swipe(`#draftsList [data-d="${idB}"]`, 300); await p.waitForTimeout(5000);
chk('Б удалён вместе с разделом', !(await drafts()).includes(idB) && await p.evaluate(id => !localStorage.getItem('meshCalcState1@combo:' + id), idB));
// 6. «Добавить в amoCRM» для А (он открыт) → сделка создана, А пропал из черновиков
await p.click('#draftsList [data-d="A1"]'); await p.waitForTimeout(300); await p.click('#dsSend'); await p.waitForURL(/combo/);
await p.waitForFunction(() => /\b(ok|warn|err)\b/.test(document.getElementById('status').className) && !/Готовлю/.test(document.getElementById('status').textContent), null, { timeout: 60000 });
console.log('status:', await p.textContent('#status'));
chk('сделка создана', await p.evaluate(() => !!localStorage.getItem('spComboLead2:A1')));
await p.goto(B + 'index.html'); await p.waitForTimeout(300);
const rows2 = await p.$$eval('#draftsList [data-d]', e => e.map(x => x.innerText.replace(/\s+/g, ' ')));
chk('после отправки А не черновик, остался только В', rows2.length === 1 && /Сидоров/.test(rows2[0]), JSON.stringify(rows2));
// 7. В — «Добавить в amoCRM» из сохранённого: пустой, кнопка неактивна
await p.click('#draftsList [data-d]'); await p.waitForTimeout(300);
chk('у черновика без изделий «в amoCRM» неактивна', await p.isDisabled('#dsSend'));
console.log('errors', errs, ok ? 'ALL OK' : 'HAS FAILS'); await b.close();
