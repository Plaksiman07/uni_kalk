import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await (await b.newContext({serviceWorkers:'block'})).newPage();
let ok=true; const chk=(n,c,x='')=>{console.log((c?'OK  ':'FAIL')+' '+n+' '+x); if(!c) ok=false;};
const where = async () => { await p.waitForTimeout(300); const u = new URL(p.url()); return u.pathname.split('/').pop() + u.hash; };
const view = () => p.evaluate(() => document.getElementById('viewSettings') && !document.getElementById('viewSettings').hidden ? 'settings' : 'home');
// главный → настройки → калькулятор → «назад» в калькуляторе → «назад» в настройках → главный; системная «назад» не возвращает в настройки
await p.goto('http://localhost:8765/index.html');
await p.click('a[href="#settings"]'); chk('открылись настройки', await view()==='settings');
await p.click('#viewSettings a[href="mesh.html"]'); await p.waitForLoadState(); chk('открылся калькулятор', (await where()).startsWith('mesh.html'));
await p.click('.home-btn'); await p.waitForLoadState(); chk('назад из калькулятора → настройки', (await where())==='index.html#settings' && await view()==='settings', await where());
await p.click('#backBtn'); chk('назад из настроек → главный', await view()==='home', await where());
await p.goBack().catch(()=>{}); await p.waitForTimeout(300);
chk('системная «назад» с главного не открывает настройки/калькулятор', !(await where()).includes('settings') && !(await where()).startsWith('mesh'), await where());
// несколько калькуляторов подряд
await p.goto('http://localhost:8765/index.html'); 
for (const c of ['uni.html','pleat.html','vsn.html']) { await p.click('a[href="#settings"]').catch(()=>{}); await p.click(`#viewSettings a[href="${c}"]`); await p.waitForLoadState(); await p.click('.home-btn'); await p.waitForLoadState(); await p.click('#backBtn'); }
chk('3 калькулятора подряд — на главном', await view()==='home', await where());
await p.goBack().catch(()=>{}); chk('и системная «назад» не крутит по кругу', !(await where()).includes('settings'), await where());
// сразу открыли настройки по ссылке
await p.goto('http://localhost:8765/index.html#settings'); await p.click('#backBtn'); chk('прямая ссылка на настройки → «назад» на главный', await view()==='home');
// финансы и заказы
await p.goto('http://localhost:8765/index.html'); await p.click('a[href="finance.html"]'); await p.waitForLoadState(); await p.click('a[data-back]'); await p.waitForLoadState();
chk('финансы → назад → главный', await view()==='home' && (await where())==='index.html', await where());
console.log(ok?'ALL OK':'HAS FAILS'); await b.close();
