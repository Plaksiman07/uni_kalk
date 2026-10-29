// Фото окон в комбинированном заказе: попадают в заказ-наряд и не стираются обычным калькулятором
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const OUT = new URL('./out/', import.meta.url).pathname, IMG = process.argv[2];
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
let ok = true; const chk = (n, c, x = '') => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n + ' ' + x); if (!c) ok = false; };
const B = 'http://localhost:8765/', ID = 'ph1';
await p.goto(B + 'index.html'); await p.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('uniCalcPhotos'); });
await p.evaluate(([ID]) => {
  localStorage.setItem('uniCalcState12', JSON.stringify({ orderNumber: '1', clientName: 'Обычный', fabricName: 'ОМЕГА', fabricWidth: '250', fabricColor: 'белый', rooms: [{ name: 'Зал', pk: 'zz', items: [{ w: '100', h: '100', qty: '1', ctrl: 'Л' }] }] }));
  localStorage.setItem('uniCalcState12@combo:' + ID, JSON.stringify({ fabricName: 'ОМЕГА', fabricWidth: '250', fabricColor: 'белый', selectedPrice: 'base', rooms: [{ name: 'Кухня', pk: 'kk', items: [{ w: '120', h: '150', qty: '1', ctrl: 'Л' }] }] }));
  localStorage.setItem('spCombo2', JSON.stringify({ id: ID, client: { orderNumber: '777', clientName: 'Фото Тест' }, parts: ['uni'], sum: {}, priceSel: 'base' }));
}, [ID]);
const orderPages = async () => {
  await p.click('#docsBtn'); await p.waitForTimeout(250);
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('.menu .m-i >> nth=1')]);
  await p.waitForFunction(() => !document.getElementById('docsBtn').disabled, null, { timeout: 60000 });
  const f = OUT + 'photo_order.pdf'; await dl.saveAs(f);
  const { execSync } = await import('child_process'); return +execSync(`pdfinfo "${f}" | grep Pages | awk '{print $2}'`).toString().trim();
};
await p.goto(B + 'combo.html'); await p.waitForTimeout(2500);
const n0 = await orderPages();
// добавить фото в раздел UNI (внутри iframe)
await p.click('[data-toggle="uni"]'); await p.waitForTimeout(400); await p.click('[data-edit="uni"]'); await p.waitForTimeout(1200);
const fr = p.frames().find(f => /uni\.html\?embed=/.test(f.url()));
await fr.evaluate(() => { const r = document.querySelector('.room-block'); pickRoomPhoto(r.id); });
await fr.setInputFiles('#roomPhotoInput', IMG); await p.waitForTimeout(1500);
chk('фото в разделе', (await fr.$$('.room-photo img')).length === 1);
await p.click('#shDone'); await p.waitForTimeout(500);
const n1 = await orderPages(); chk('заказ-наряд: +лист с фото', n1 === n0 + 1, `${n0} → ${n1}`);
// обычный UNI открыли и сохранили — фото заказа не должно пропасть
const q = await ctx.newPage(); await q.goto(B + 'uni.html'); await q.waitForTimeout(1500);
await q.evaluate(() => persistPhotos()); await q.waitForTimeout(500); await q.close();
await p.reload(); await p.waitForTimeout(2500);
const n2 = await orderPages(); chk('после обычного UNI фото на месте', n2 === n1, `${n1} → ${n2}`);
console.log('errors', errs, ok ? 'ALL OK' : 'HAS FAILS'); await b.close();
