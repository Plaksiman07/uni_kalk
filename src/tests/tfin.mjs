// «Финансы»: деление денег заказа, кассы, расходы и выплаты; переключатели «сами» в заказе
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = new URL('./out/', import.meta.url).pathname, B = 'http://localhost:8765/';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
let ok = true; const chk = (n, c, x = '') => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n + ' ' + x); if (!c) ok = false; };
const num = s => Number(String(s).replace(/[^\d−-]/g, '').replace('−', '-'));
await p.goto(B + 'index.html'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('spAmoConfig', JSON.stringify({ url: 'http://localhost:8790', key: 'secret1' })); });
await p.reload(); chk('на главном есть «Финансы»', await p.isVisible('a[href="finance.html"]'));
await p.click('a[href="finance.html"]'); await p.waitForSelector('.b-card', { timeout: 15000 }); await p.waitForTimeout(400);
// удалить следы прошлых прогонов (операции)
await p.evaluate(async () => { for (const o of JSON.parse(localStorage.getItem('spFinCache')).ops) await fetch('http://localhost:8790/fin-op-del', { method: 'POST', headers: { 'X-App-Key': 'secret1', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: o.id }) }); });
await p.reload(); await p.waitForSelector('.b-card'); await p.waitForTimeout(400);
const bal = async () => (await p.$$eval('.b-card .b-sum', e => e.map(x => x.textContent))).map(num);
let [k, z, m] = await bal();
chk('касса: ⅓ от 10000 + 8000 + 6000', k === 8000, String(k));
chk('зарплатная: ⅓ + своя работа (1100 и 200)', z === 9300, String(z));
chk('мастерам: сборка 300', m === 300, String(m));
const kpi = await p.$$eval('.kpi b', e => e.map(x => x.textContent));
chk('период: 3 заказа, 24 000 грязными, 9 300 в зарплату', kpi[0] === '3' && num(kpi[1]) === 24000 && num(kpi[2]) === 9300, kpi.join(' | '));
chk('старый заказ — подсказка', /не из калькулятора/.test(await p.textContent('#stats')));
await p.screenshot({ path: OUT + 'fin_main.png', fullPage: true });
// расход из кассы
await p.click('#addExpense'); await p.waitForTimeout(400); await p.fill('#opA', '1000'); await p.click('.chip[data-c="Материал"]'); await p.screenshot({ path: OUT + 'fin_expense.png' });
await p.click('#opSave'); await p.waitForSelector('#toast.show'); await p.waitForTimeout(300);
[k, z, m] = await bal(); chk('расход 1000 → касса 7000', k === 7000, String(k));
// выплата зарплаты
await p.click('#addSalary'); await p.waitForTimeout(400); await p.fill('#opA', '5000'); await p.click('.chip[data-c="Мне"]'); await p.click('#opSave'); await p.waitForSelector('#toast.show'); await p.waitForTimeout(300);
[k, z, m] = await bal(); chk('выплата 5000 → зарплатная 4300', z === 4300, String(z));
// выплата мастерам и корректировка
await p.click('#moreOps'); await p.waitForTimeout(400); await p.screenshot({ path: OUT + 'fin_more.png' }); await p.click('[data-k="master"]'); await p.waitForTimeout(300); await p.fill('#opA', '300'); await p.click('#opSave'); await p.waitForSelector('#toast.show'); await p.waitForTimeout(300);
await p.click('#moreOps'); await p.waitForTimeout(300); await p.click('[data-k="fix"]'); await p.waitForTimeout(300); await p.fill('#opA', '20000'); await p.click('#opSave'); await p.waitForSelector('#toast.show'); await p.waitForTimeout(300);
[k, z, m] = await bal(); chk('мастерам 0; корректировка: в кассе фактически 20000', m === 0 && k === 20000, `${k} / ${m}`);
// после обновления — всё сохранено у посредника
await p.reload(); await p.waitForTimeout(1500); [k, z, m] = await bal(); chk('после обновления то же', k === 20000 && z === 4300, `${k} / ${z}`);
await p.click('#moreOps'); await p.waitForTimeout(300); await p.click('[data-k="fix"]'); await p.waitForTimeout(300);
chk('в шторке видно текущий остаток', /20 000/.test((await p.textContent('#bsBody .bs-sub')).replace(/\s/g, ' ')));
await p.fill('#opA', '5974'); await p.click('#opSave'); await p.waitForSelector('#toast.show'); await p.waitForTimeout(300);
[k, z, m] = await bal(); chk('повторная корректировка ставит сумму, а не прибавляет', k === 5974, String(k));
await p.screenshot({ path: OUT + 'fin_fix.png', fullPage: true });
// удаление операции
await p.click('[data-op] >> nth=0'); await p.waitForTimeout(300); await p.click('#opDel'); await p.waitForSelector('#toast.show'); await p.waitForTimeout(300);
chk('операция удалена', (await p.$$('[data-op]')).length === 4);
// карточка заказа
await p.click('[data-order="603"]'); await p.waitForTimeout(400); await p.screenshot({ path: OUT + 'fin_order.png' });
{ const t = (await p.textContent('#bsBody')).replace(/\s/g, ' '); chk('разбор заказа 603: в зарплату 2 200, касса 2 000', /2 200/.test(t) && /2 000/.test(t) && /работа мастеров/.test(t)); }
await p.click('#veil', { position: { x: 20, y: 20 } }); await p.waitForTimeout(400);
await p.click('#moreOps'); await p.waitForTimeout(400); await p.click('[data-k="shares"]'); await p.waitForTimeout(300);
await p.screenshot({ path: OUT + 'fin_shares.png' });
await p.click('.chip[data-v="40,30,30"]'); await p.click('#shSave'); await p.waitForSelector('#toast.show'); await p.waitForTimeout(300);
{ const kp = await p.$$eval('.kpi b', e => e.map(x => x.textContent)); chk('доли 40/30/30: в зарплату 30% + своя работа = 8 500', num(kp[2]) === 8500, kp[2]); }
await p.click('#moreOps'); await p.waitForTimeout(300); await p.click('[data-k="shares"]'); await p.waitForTimeout(300); await p.click('.chip[data-v="33.3,33.3,33.4"]'); await p.click('#shSave'); await p.waitForTimeout(800);
console.log('errors', errs, ok ? 'ALL OK' : 'HAS FAILS'); await b.close();
