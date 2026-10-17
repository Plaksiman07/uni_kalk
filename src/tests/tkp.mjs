import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
for (const [page,setup] of [['uni.html', async()=>{
    await p.click('#fabricSearch'); await p.fill('#fabricSearch','омега'); await p.keyboard.press('Enter'); await p.selectOption('#fabricWidthSelect','250'); await p.selectOption('#fabricColor','белый');
    await p.fill('.item-width','150'); await p.fill('.item-height','160'); }],
  ['mesh.html', async()=>{ await p.fill('.item-width','60'); await p.fill('.item-height','140'); }]]) {
  await p.goto('http://localhost:8765/'+page); await p.evaluate(()=>{localStorage.clear(); localStorage.setItem('spAmoConfig', JSON.stringify({url:'http://localhost:8790', key:'secret1'}));}); await p.reload();
  console.log('== '+page, 'buttons disabled before:', await p.$$eval('.pdf-btn', bs=>bs.map(b=>b.disabled)));
  await p.fill('#orderNumber','88'); await p.dispatchEvent('#orderNumber','input'); await p.fill('#clientName','Анна'); await p.dispatchEvent('#clientName','input');
  await p.fill('#clientAddress','ул. Мира 10'); await p.dispatchEvent('#clientAddress','input');
  await setup();
  console.log('enabled after:', await p.$$eval('.pdf-btn', bs=>bs.map(b=>!b.disabled)));
  await p.evaluate(()=>{window.print=()=>{window.__p=(window.__p||0)+1; window.__t=document.title;}});
  for (const mode of ['kp','order']) {
    await p.click(`.pdf-btn[data-mode="${mode}"]`); await p.waitForFunction(n=>window.__p===n, mode==='kp'?1:2);
    const info = await p.evaluate(()=>({title:window.__t, secs:[...document.getElementById('printArea').firstElementChild.children].map(e=>e.className||'div'), text:document.getElementById('printArea').innerText.slice(0,3000)}));
    console.log(mode, info.title, JSON.stringify(info.secs), 'себест в тексте:', /СЕБЕСТОИМОСТЬ|Маржа|ВНУТРЕННИЙ/.test(info.text), 'КП в тексте:', /Коммерческое предложение/i.test(info.text));
    await p.emulateMedia({media:'print'}); await p.pdf({path:`kp_${page}_${mode}.pdf`,preferCSSPageSize:true,printBackground:true}); await p.emulateMedia({media:'screen'});
  }
  await p.screenshot({path:`kp_btns_${page}.png`, clip:{x:0,y:0,width:390,height:844}, fullPage:true});
  await p.click('#amoBtn'); await p.waitForFunction(()=>/✓|⚠|✕/.test(document.getElementById('amoStatus').textContent),null,{timeout:60000}); console.log('amo', await p.textContent('#amoStatus'));
  console.log('pdfMode after amo:', await p.evaluate(()=>window.__pdfMode));
}
console.log('errors',errs); await b.close();
