import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
const done = () => p.waitForFunction(()=>{ const t=document.getElementById('amoStatus').textContent; return /✓|⚠|✕/.test(t) && !/⏳/.test(t); },null,{timeout:60000});
for (const [page,setup] of [['uni.html', async()=>{
    await p.click('#fabricSearch'); await p.fill('#fabricSearch','омега'); await p.keyboard.press('Enter'); await p.selectOption('#fabricWidthSelect','250'); await p.selectOption('#fabricColor','белый');
    await p.fill('.item-width','150'); await p.fill('.item-height','160'); await p.fill('.item-qty','2'); await p.dispatchEvent('.item-qty','input'); }],
  ['mesh.html', async()=>{ await p.fill('.item-width','60'); await p.fill('.item-height','140'); await p.fill('.item-qty','3'); await p.dispatchEvent('.item-qty','input'); }]]) {
  await p.goto('http://localhost:8765/'+page); await p.evaluate(()=>{localStorage.clear(); localStorage.setItem('spAmoConfig', JSON.stringify({url:'http://localhost:8790', key:'secret1'}));}); await p.reload();
  await p.fill('#orderNumber','91'); await p.dispatchEvent('#orderNumber','input'); await p.fill('#clientName','Олег'); await p.dispatchEvent('#clientName','input');
  await p.fill('#clientAddress','ул. Лесная 4'); await p.dispatchEvent('#clientAddress','input');
  await setup();
  await p.click('#amoBtn'); await done();
  console.log(page, 'amo:', await p.innerText('#amoStatus'));
  const [dl] = await Promise.all([p.waitForEvent('download',{timeout:10000}).catch(()=>null), p.evaluate(()=>printLabels())]);
  console.log('  download labels:', dl && dl.suggestedFilename());
}
await p.evaluate(()=>{ document.getElementById('amoStatus').textContent=''; const of=window.fetch; window.fetch=(u,o)=>{ if(String(u).includes('/file') && o && o.headers && decodeURIComponent(o.headers['X-File-Name']||'').startsWith('Наклейки')) return Promise.resolve(new Response(JSON.stringify({error:'тестовая ошибка'}),{status:502})); return of(u,o); }; });
await p.click('#amoBtn'); await done();
console.log('fail case:', await p.innerText('#amoStatus'));
console.log('errors', errs); await b.close();
