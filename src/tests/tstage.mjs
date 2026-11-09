// «Текущие заказы»: смена этапа, «Успешно реализовано», документы сделки и просмотр PDF
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = new URL('./out/', import.meta.url).pathname, B = 'http://localhost:8765/';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
let ok = true; const chk = (n, c, x = '') => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n + ' ' + x); if (!c) ok = false; };
const log = () => fs.readFileSync(OUT + 'amo_log.txt', 'utf8');
await p.goto(B + 'index.html'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('spAmoConfig', JSON.stringify({ url: 'http://localhost:8790', key: 'secret1' })); });
await p.goto(B + 'orders.html'); await p.waitForSelector('[data-stage-of="504"]', { timeout: 15000 }); await p.waitForTimeout(400);
await p.screenshot({ path: OUT + 'st_card.png' });
// смена этапа
await p.click('[data-stage-of="504"]'); await p.waitForTimeout(400); await p.screenshot({ path: OUT + 'st_sheet.png' });
chk('шторка этапов: 3 этапа + успешно', (await p.$$('#bsBody .opt')).length === 4 && /Изготовление/.test(await p.textContent('#bsBody .opt .ck >> xpath=..')));
await p.click('#bsBody [data-to="Готов к установке"]'); await p.waitForSelector('#toast.show', { timeout: 10000 });
chk('этап сменён (тост)', /Готов к установке/.test(await p.textContent('#toast')), await p.textContent('#toast'));
chk('PATCH status_id 12', /"status_id":12/.test(fs.readFileSync(OUT + 'amo_patch.json', 'utf8')));
chk('карточка в колонке «Готов к установке»', await p.$eval('[data-stage-of="504"]', el => el.closest('.col').dataset.stage) === 'Готов к установке');
// у солнцезащитной воронки нет этапа «На установку» — пункт выключен
await p.waitForTimeout(2000); await p.click('[data-stage-of="501"]'); await p.waitForTimeout(400);
chk('нет этапа — пункт выключен', await p.isDisabled('#bsBody [data-to="На установку"]'));
// успешно реализовано
await p.click('#bsBody [data-to="won"]'); await p.waitForSelector('#toast.show', { timeout: 10000 }); await p.waitForTimeout(300);
chk('успешно реализовано: 142', /"status_id":142/.test(fs.readFileSync(OUT + 'amo_patch.json', 'utf8')) && /успешно реализовано/.test(await p.textContent('#toast')));
chk('карточка ушла из текущих', !(await p.$('[data-stage-of="501"]')));
// документы
await p.waitForTimeout(2000); await p.click('[data-docs="504"]'); await p.waitForSelector('#docList [data-doc]', { timeout: 10000 }); await p.waitForTimeout(300);
await p.screenshot({ path: OUT + 'st_docs.png' });
const src = await p.textContent('#bsBody .bs-sub'); console.log('   docs:', src, '|', (await p.$$eval('#docList .o-t', e => e.map(x => x.textContent))).join(' / '));
chk('список документов', (await p.$$('#docList [data-doc]')).length >= 2 && /хранятся в приложении|из amoCRM/.test(src));
await p.click('#docList [data-doc] >> nth=0');
await p.waitForFunction(() => document.querySelector('#vBody canvas') || /Не /.test(document.getElementById('vBody').textContent), null, { timeout: 30000 }); await p.waitForTimeout(1500);
const nc = (await p.$$('#vBody canvas')).length;
console.log('   viewer:', nc ? nc + ' стр.' : await p.textContent('#vBody'));
await p.screenshot({ path: OUT + 'st_viewer.png' });
chk('PDF открыт в приложении (или понятная подсказка)', nc > 0 || /Сохранить/.test(await p.textContent('#vBody')));
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 10000 }).catch(() => null), p.click('#vShare')]);
const dlBytes = dl ? fs.readFileSync(await dl.path()) : Buffer.alloc(0);   // имя кириллицей headless-Chromium показывает как «download»
chk('«Сохранить» отдаёт PDF', dlBytes.slice(0, 4).toString() === '%PDF', dlBytes.length + ' байт');
console.log('errors', errs, ok ? 'ALL OK' : 'HAS FAILS'); await b.close();
