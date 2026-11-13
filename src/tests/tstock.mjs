import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const OUT = new URL('./out/', import.meta.url).pathname; (await import('fs')).mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
let ok = true; const chk = (n, c, x = '') => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n + ' ' + x); if (!c) ok = false; };
const B = 'http://localhost:8765/', W = 'http://localhost:8790';
const api = (path, body) => p.evaluate(async ([W, path, body]) => (await fetch(W + path, { method: 'POST', headers: { 'X-App-Key': 'secret1', 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })).json(), [W, path, body]);
const item = async (s, n, u) => (await api('/stock', {})).items[`${s}|${n.toLowerCase()}|${u}`];
await p.goto(B + 'index.html'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('spAmoConfig', JSON.stringify({ url: 'http://localhost:8790', key: 'secret1' })); });
// 1. склад: пусто → «Заполнить позиции» для сеток
await p.goto(B + 'stock.html'); await p.waitForTimeout(800);
chk('пустой раздел предлагает заполнить', await p.isVisible('#seedBtn'));
await p.click('#seedBtn'); await p.waitForTimeout(600);
const n1 = await p.$$eval('#list .it', e => e.length); chk('позиции сеток добавлены', n1 === 18, n1);
// 2. корректировка и мин. остаток для профиля, приход полотна с ценой
await p.click('.it:has-text("Профиль рамочный, белый")'); await p.waitForTimeout(350); await p.screenshot({ path: OUT + 'st_item.png' });
await p.fill('#bsBody [data-m]', '10'); await p.press('#bsBody [data-m]', 'Tab'); await p.waitForTimeout(500);
await p.click('[data-a="fix"]'); await p.waitForTimeout(350); await p.fill('#bsBody [data-q]', '5'); await p.click('[data-ok]'); await p.waitForTimeout(600);
let it = await item('mesh', 'Профиль рамочный, белый', 'м.п.'); chk('остаток 5, мин 10', it.q === 5 && it.m === 10, JSON.stringify(it));
await p.click('#addIn'); await p.waitForTimeout(350); await p.selectOption('#bsBody select[data-i]', 'mesh|полотно «стандарт»|м.п.');
await p.fill('#bsBody [data-q]', '50'); await p.fill('#bsBody [data-s]', '5000'); await p.screenshot({ path: OUT + 'st_in.png' }); await p.click('[data-ok]'); await p.waitForTimeout(600);
it = await item('mesh', 'Полотно «Стандарт»', 'м.п.'); chk('приход 50 по 100 ₽', it.q === 50 && it.p === 100, JSON.stringify(it));
await p.click('#addIn'); await p.waitForTimeout(350); await p.selectOption('#bsBody select[data-i]', 'mesh|полотно «стандарт»|м.п.'); await p.fill('#bsBody [data-q]', '50'); await p.fill('#bsBody [data-p]', '200'); await p.click('[data-ok]'); await p.waitForTimeout(600);
it = await item('mesh', 'Полотно «Стандарт»', 'м.п.'); chk('второй приход: 100 м.п., средняя цена 150', it.q === 100 && it.p === 150, JSON.stringify(it));
await p.screenshot({ path: OUT + 'st_list.png', fullPage: true });
await p.click('#tabs [data-t="buy"]'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + 'st_buy.png', fullPage: true });
chk('«Купить»: профиль, докупить 5', /Профиль рамочный, белый[\s\S]*5/.test(await p.innerText('#buyList')), await p.innerText('#buyList'));
// 3. заказ: сетки 80×170 ×2 — предупреждение о нехватке, отправка
await p.evaluate(() => {
  localStorage.setItem('meshCalcState1@combo:S1', JSON.stringify({ meshType: 'standard', meshColor: 'white', selectedPrice: 'base', rooms: [{ name: 'Кухня', pk: 'a', items: [{ w: '80', h: '170', qty: '2' }] }] }));
  localStorage.setItem('spCombo2', JSON.stringify({ id: 'S1', client: { orderNumber: '801', clientName: 'Складов', addrCity: 'Краснодар', addrStreet: 'ул. Мира', addrHouse: '1' }, parts: ['mesh'], sum: {}, priceSel: 'base', pipeline: '', services: [] }));
});
await p.goto(B + 'combo.html'); await p.waitForFunction(() => { const s = JSON.parse(localStorage.getItem('spCombo2')); return s.sum && s.sum.mesh; }, null, { timeout: 20000 });
await p.waitForFunction(() => !document.getElementById('stockWarn').hidden, null, { timeout: 8000 }).catch(() => {});
const warn = await p.innerText('#stockWarn').catch(() => ''); console.log('warn:', warn.replace(/\n/g, ' | '));
chk('предупреждение: профиля не хватает (позиции без остатка не в счёт)', /Профиль рамочный, белый: нужно 9,52/.test(warn) && !/Ручка/.test(warn));
await p.screenshot({ path: OUT + 'st_combo.png', fullPage: true });
await p.click('#amoBtn'); await p.waitForFunction(() => /\b(ok|warn|err)\b/.test(document.getElementById('status').className), null, { timeout: 60000 });
const leadA = await p.evaluate(() => Number(localStorage.getItem('spComboLead2:S1')));
chk('сделка А создана', leadA > 1000, leadA);
it = await item('mesh', 'Профиль рамочный, белый', 'м.п.'); chk('при отправке не списано', it.q === 5);
// 4. «Готов к установке» → списание; повторно — нет
let r = await api('/move', { lead_id: leadA, to: 'Готов к установке' }); chk('перевод в «Готов к установке» списал позиции', r.stock_used === 9, JSON.stringify(r));
it = await item('mesh', 'Профиль рамочный, белый', 'м.п.'); chk('профиль 5 − 9,52 = −4,52', it.q === -4.52, it.q);
it = await item('mesh', 'Полотно «Стандарт»', 'м.п.'); chk('полотно 100 − 3,74', it.q === 96.26, it.q);
r = await api('/move', { lead_id: leadA, to: 'won' }); chk('повторно не списывает', !r.stock_used, JSON.stringify(r));
// 5. заказ Б (сделка с чётным номером — в amoCRM уже «Готов к установке») списывается при открытии склада
await p.goto(B + 'combo.html?new=1'); await p.waitForTimeout(500);
await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('spCombo2'));
  localStorage.setItem('meshCalcState1@combo:' + st.id, JSON.stringify({ meshType: 'antikoshka', meshColor: 'brown', selectedPrice: 'base', rooms: [{ name: 'Зал', pk: 'a', items: [{ w: '60', h: '100', qty: '1' }] }] }));
  st.parts = ['mesh']; st.client = { orderNumber: '802', clientName: 'Иванов', addrCity: 'Краснодар', addrStreet: 'ул. Мира', addrHouse: '2' }; localStorage.setItem('spCombo2', JSON.stringify(st)); });
await p.goto(B + 'combo.html'); await p.waitForFunction(() => { const s = JSON.parse(localStorage.getItem('spCombo2')); return s.sum && s.sum.mesh; }, null, { timeout: 20000 }); await p.waitForTimeout(400);
await p.click('#amoBtn'); await p.waitForFunction(() => /\b(ok|warn|err)\b/.test(document.getElementById('status').className), null, { timeout: 60000 });
it = await item('mesh', 'Профиль рамочный, коричневый', 'м.п.');
chk('сделка Б (в amoCRM уже «Готов к установке») списана при открытии склада', it && it.q < 0, JSON.stringify(it));
it = await item('mesh', 'Полотно «Антикошка»', 'м.п.'); chk('позиция полотна Б есть', !!it);
// 6. главный: «Склад» показывает, сколько заканчивается
await p.goto(B + 'index.html'); await p.waitForTimeout(1200);
const desc = await p.innerText('#stockDesc'); chk('на главном: «Заканчивается»', /Заканчивается/.test(desc), desc);
await p.screenshot({ path: OUT + 'st_home.png', fullPage: true });
await p.goto(B + 'stock.html'); await p.waitForTimeout(800); await p.click('#tabs [data-t="mesh"]'); await p.click('#moreBtn'); await p.waitForTimeout(300); await p.click('[data-a="log"]'); await p.waitForTimeout(300);
await p.screenshot({ path: OUT + 'st_log.png' });
chk('журнал: списано в заказ', /Списано в заказ/.test(await p.innerText('#bsBody')));
console.log('errors', errs, ok ? 'ALL OK' : 'HAS FAILS'); await b.close();
