// Доп. услуги в заказе + корректировка заказа из «Текущих заказов» (данные заказа у посредника)
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = new URL('./out/', import.meta.url).pathname, B = 'http://localhost:8765/';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
let ok = true; const chk = (n, c, x = '') => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n + ' ' + x); if (!c) ok = false; };
const rd = f => JSON.parse(fs.readFileSync(OUT + f, 'utf8'));
['amo_lead.json', 'amo_patch.json', 'amo_note.json', 'amo_contact_patch.json'].forEach(f => { try { fs.unlinkSync(OUT + f); } catch (e) {} });
await p.goto(B + 'index.html');
await p.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('spAmoConfig', JSON.stringify({ url: 'http://localhost:8790', key: 'secret1' }));
  localStorage.setItem('uniCalcState12@combo:s1', JSON.stringify({ fabricName: 'ОМЕГА', fabricWidth: '250', fabricColor: 'белый', selectedPrice: 'base', rooms: [{ name: 'Кухня', pk: 'a', items: [{ w: '120', h: '150', qty: '1', ctrl: 'Л' }] }] }));
  localStorage.setItem('spCombo2', JSON.stringify({ id: 's1', client: { orderNumber: '900', clientName: 'Далёкий Клиент', clientPhone: '+7 900 000-00-01', clientAddress: 'ст. Дальняя, ул. Лесная 5' }, parts: ['uni'], sum: {}, priceSel: 'base', pipeline: '' }));
});
await p.goto(B + 'combo.html'); await p.waitForFunction(() => document.querySelectorAll('.part .it').length === 1, null, { timeout: 20000 }); await p.waitForTimeout(600);
const base = +(await p.textContent('#dockSum')).replace(/\D/g, '');
// адрес бланком: старая строка ушла в «Улицу»; заполняем заново
await p.click('#clientSum'); await p.waitForTimeout(350);
chk('старый адрес — в поле «Улица», город пуст', (await p.inputValue('#addrStreet')) === 'ст. Дальняя, ул. Лесная 5' && (await p.inputValue('#addrCity')) === '');
await p.fill('#addrCity', 'Краснодар'); await p.fill('#addrStreet', 'ул. Ставропольская'); await p.fill('#addrHouse', '150 к2');
await p.fill('#addrEntr', '3'); await p.fill('#addrFloor', '6'); await p.fill('#addrFlat', '88'); await p.waitForTimeout(300);
await p.screenshot({ path: OUT + 'addr_form.png' });
chk('адрес собран', /Ставропольская, д\. 150 к2, под\. 3, эт\. 6, кв\. 88/.test(await p.textContent('#clientSum')), await p.textContent('#clientSum'));
await p.click('#clientSum'); await p.waitForTimeout(300);
// доп. услуга через «Добавить изделие или услугу»
await p.click('#addBtn'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + 'svc_menu.png' });
await p.click('.menu .m-i:has-text("Дальний заказ")'); await p.waitForTimeout(300);
chk('без суммы — ошибка, отправка закрыта', await p.isDisabled('#amoBtn') && /укажите стоимость/.test(await p.textContent('#sums')));
await p.fill('.sv-pr', '600'); await p.fill('.sv-note', 'Динская, 40 км'); await p.waitForTimeout(400);
const tot = +(await p.textContent('#dockSum')).replace(/\D/g, '');
chk('итог = изделия + 600', tot === base + 600, `${base} → ${tot}`);
await p.click('#addBtn'); await p.waitForTimeout(300); await p.click('.menu .m-i:has-text("Демонтаж")'); await p.fill('.sv-pr[data-i="1"]', '1 500'); await p.waitForTimeout(400);
chk('две услуги', +(await p.textContent('#dockSum')).replace(/\D/g, '') === base + 2100);
await p.screenshot({ path: OUT + 'svc_combo.png', fullPage: true });
// работа: собираем сами, устанавливает мастер
chk('по умолчанию «сами» включено', await p.isChecked('#ownMake') && await p.isChecked('#ownInstall'));
await p.click('#ownInstall'); await p.waitForTimeout(300);
chk('установка → мастерам', /мастерам/.test(await p.textContent('#ownInstallSub')), await p.textContent('#ownInstallSub'));
await p.click('#marginRow'); await p.waitForTimeout(400);
await p.locator('#ownMake').scrollIntoViewIfNeeded(); await p.screenshot({ path: OUT + 'fin_combo.png', fullPage: true });
chk('распределение в заказе', /Куда пойдут деньги/.test(await p.textContent('#marginBody')) && /Зарплата мастерам/.test(await p.textContent('#marginBody')));
// КП: таблица услуг и итог
await p.evaluate(() => { document.getElementById('printArea').innerHTML = kpHtml(); });
const kp = await p.textContent('#printArea');
chk('КП: услуги и итог', /Дополнительные услуги/.test(kp) && /Дальний заказ — Динская, 40 км/.test(kp) && kp.includes((base + 2100).toLocaleString('ru-RU')), '');
await p.evaluate(() => { document.getElementById('printArea').innerHTML = orderHeadHtml(); });
chk('заказ-наряд: услуги', /Доп. услуги \(выполнить на установке\)/.test(await p.textContent('#printArea')));
// отправка: сумма, примечание, теги, данные заказа у посредника
await p.click('#amoBtn'); await p.waitForFunction(() => /\b(ok|warn|err)\b/.test(document.getElementById('status').className), null, { timeout: 90000 });
console.log('  ', await p.innerText('#status'));
const lead = rd('amo_lead.json')[0], note = rd('amo_note.json')[0].params.text.replace(/\s/g, ' ');
chk('сделка: цена с услугами', lead.price === base + 2100, String(lead.price));
chk('сделка: название «№ 900 Ставропольская 150 к2»', lead.name === '№ 900 Ставропольская 150 к2', lead.name);
chk('поле «Адрес» полностью', /^г\. Краснодар, ул\. Ставропольская, д\. 150 к2, под\. 3, эт\. 6, кв\. 88$/.test(JSON.stringify(lead.custom_fields_values || []).match(/г\. Краснодар[^"]*/)?.[0] || ''), JSON.stringify(lead.custom_fields_values || '').slice(0, 160));
chk('сделка: теги услуг', lead._embedded.tags.some(t => t.name === 'Дальний заказ') && lead._embedded.tags.some(t => t.name === 'Демонтаж'));
chk('примечание: услуги', /Доп. услуги — 2 100 ₽/.test(note) && /Дальний заказ \(Динская, 40 км\) — 600 ₽/.test(note));
const kvFile = fs.readdirSync(OUT).filter(f => /^kv_lead_\d+\.json$/.test(f)).map(f => [f, fs.statSync(OUT + f).mtimeMs]).sort((a, c) => c[1] - a[1])[0][0];
const kv = rd(kvFile);
chk('данные заказа у посредника', kv.combo.services.length === 2 && Object.keys(kv.ls).some(k => k.startsWith('uniCalcState12@combo:')), kvFile);
const LID = Number(kvFile.match(/(\d+)/)[1]);
{ const f = JSON.parse(fs.readFileSync(OUT + 'kv_fin_' + LID + '.json', 'utf8'));
  chk('деньги заказа для «Финансов»', f.g === lead.price && f.p > 0 && f.lm === 300 && f.li === 250 && f.om === 1 && f.oi === 0, JSON.stringify(f)); }
const api = (path, body) => p.evaluate(async ([path, body]) => { const r = await fetch('http://localhost:8790' + path, { method: 'POST', headers: { 'X-App-Key': 'secret1', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (/json/.test(r.headers.get('Content-Type'))) return r.json(); const ab = await r.arrayBuffer(); return { bytes: ab.byteLength, head: new TextDecoder().decode(ab.slice(0, 4)) }; }, [path, body]);
const dl = await api('/docs', { lead_id: LID });
chk('документы в приложении (KV): КП, заказ-наряд, наклейки', dl.source === 'app' && dl.files.map(f => f.kind).join() === 'kp,order,labels', JSON.stringify(dl.files.map(f => f.name)));
const one = await api('/doc', { lead_id: LID, uuid: 'app:kp' });
chk('КП отдаётся из приложения', one.head === '%PDF' && one.bytes > 1000, one.bytes + ' байт');
chk('копии на телефоне (IndexedDB)', await p.evaluate(LID => new Promise(res => { const r = indexedDB.open('spDocs', 1); r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').getAllKeys(); q.onsuccess = () => res(q.result.filter(k => String(k).startsWith(LID + ':')).length); }; }), LID) === 3);
await p.goto(B + 'index.html'); chk('после отправки — не черновик', !(await p.isVisible('#draftChip')));
// «Текущие заказы» → «Изменить» у заказа 504
await p.goto(B + 'orders.html'); await p.waitForSelector('[data-edit="504"]', { timeout: 15000 });
chk('кнопка «Изменить» только у сохранённых', (await p.$$('[data-edit]')).length === 1);
await p.screenshot({ path: OUT + 'edit_orders.png' });
await p.click('[data-edit="504"]'); await p.waitForURL(/combo\.html/); await p.waitForFunction(() => document.querySelectorAll('.part .it').length === 2, null, { timeout: 20000 }); await p.waitForTimeout(800);
chk('корректировка: баннер, клиент, изделия', await p.isVisible('#editBanner') && /504/.test(await p.textContent('#editBanner')) && /Кузнецов/.test(await p.textContent('#clientSum')));
await p.screenshot({ path: OUT + 'edit_combo.png', fullPage: true });
await p.goto(B + 'index.html'); chk('открыт без изменений — не черновик', !(await p.isVisible('#draftChip')));
await p.goto(B + 'combo.html'); await p.waitForTimeout(1500);
await p.click('#clientSum'); await p.waitForTimeout(300); const NEWNAME = 'Кузнецов Олег ' + Date.now().toString(36); await p.fill('#clientName', NEWNAME);
await p.click('#addBtn'); await p.waitForTimeout(300); await p.click('.menu .m-i:has-text("Ремонт")'); await p.fill('.sv-pr', '800'); await p.waitForTimeout(500);
await p.goto(B + 'index.html'); chk('изменён и не отправлен — «Не отправлено»', /Не отправлено/.test(await p.textContent('#draftChip')) && await p.isVisible('#draftChip'));
await p.click('#newBtn'); await p.waitForTimeout(400); await p.screenshot({ path: OUT + 'edit_sheet.png' });
chk('шторка: продолжить корректировку', /Продолжить корректировку/.test(await p.textContent('#dCont')));
await p.click('#dCont'); await p.waitForURL(/combo\.html/); await p.waitForTimeout(1500);
const t2 = +(await p.textContent('#dockSum')).replace(/\D/g, '');
await p.click('#amoBtn'); await p.waitForFunction(() => /\b(ok|warn|err)\b/.test(document.getElementById('status').className), null, { timeout: 90000 });
console.log('  ', await p.innerText('#status'));
const pt = rd('amo_patch.json'), cp = rd('amo_contact_patch.json'), n2 = rd('amo_note.json')[0].params.text;
chk('сделка 504 обновлена: сумма, название', pt.price === t2 && /1210/.test(pt.name), JSON.stringify({ price: pt.price, name: pt.name }));
const tg = pt._embedded.tags.map(t => t.name);
chk('теги: ручной остался, «N шт» один, + услуга', tg.includes('Ручной тег') && tg.filter(t => / шт$/.test(t)).length === 1 && tg.includes('Ремонт / регулировка'), tg.join(', '));
chk('контакт обновлён', cp.name === NEWNAME);
chk('примечание: «скорректирован»', /ЗАКАЗ СКОРРЕКТИРОВАН/.test(n2));
await p.goto(B + 'index.html'); chk('после повторной отправки — не черновик', !(await p.isVisible('#draftChip')));
console.log('errors', errs, ok ? 'ALL OK' : 'HAS FAILS'); await b.close();
