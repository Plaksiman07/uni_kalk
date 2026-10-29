import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const chk=(n,c,x='')=>{console.log((c?'OK  ':'FAIL')+' '+n+' '+x); if(!c) ok=false;};
const setups = {
  'uni.html': async()=>{ await p.click('#fabricSearch'); await p.fill('#fabricSearch','омега'); await p.keyboard.press('Enter'); await p.selectOption('#fabricWidthSelect','250'); await p.selectOption('#fabricColor','белый'); await p.fill('.item-width','150'); await p.fill('.item-height','160'); },
  'mesh.html': async()=>{ await p.fill('.item-width','60'); await p.fill('.item-height','140'); },
  'plisse.html': async()=>{ await p.fill('.item-width','90'); await p.fill('.item-height','120'); },
};
for (const [page, setup] of Object.entries(setups)) {
  console.log('== '+page);
  await p.goto('http://localhost:8765/'+page); await p.evaluate(()=>{localStorage.clear(); localStorage.setItem('spAmoConfig', JSON.stringify({url:'http://localhost:8790', key:'secret1'}));}); await p.reload();
  await p.fill('#orderNumber','321'); await p.dispatchEvent('#orderNumber','input'); await p.fill('#clientName','Пётр'); await p.dispatchEvent('#clientName','input');
  await p.fill('#clientAddress','ул. Речная 2'); await p.dispatchEvent('#clientAddress','input');
  await setup();
  console.log('  hint без предоплаты:', await p.textContent('#prepayHint'));
  await p.fill('#prepay','3000'); await p.fill('#orderNote','Установка через неделю\nОплата в рассрочку');
  await p.waitForTimeout(50);
  const price = await p.evaluate(()=>window.calcData.priceBase);
  const hint = await p.textContent('#prepayHint');
  chk('подсказка', hint.includes((price-3000).toLocaleString('ru-RU')), hint);
  await p.click('input[name="selectedPrice"][value="discount7"]'); await p.waitForTimeout(50);
  const p7 = await p.evaluate(()=>window.calcData.price7);
  chk('подсказка при скидке', (await p.textContent('#prepayHint')).includes((p7-3000).toLocaleString('ru-RU')));
  await p.reload();
  chk('сохранилось', (await p.inputValue('#prepay'))==='3000' && (await p.inputValue('#orderNote')).includes('рассрочку'));
  await p.evaluate(()=>{window.print=()=>{window.__p=(window.__p||0)+1;}});
  await p.click('.pdf-btn[data-mode="order"]'); await p.waitForFunction(()=>window.__p===1);
  let txt = await p.evaluate(()=>document.getElementById('printArea').innerText);
  chk('заказ-наряд: предоплата', /Предоплата:\s*3\s?000 ₽/.test(txt)); chk('заказ-наряд: к доплате', txt.includes('К доплате после установки: ' + (p7-3000).toLocaleString('ru-RU'))); chk('заказ-наряд: доп. инфо', txt.includes('Установка через неделю') && txt.includes('Оплата в рассрочку'));
  if (page==='plisse.html') { await p.emulateMedia({media:'print'}); await p.pdf({path:'pay_order.pdf',preferCSSPageSize:true,printBackground:true}); await p.emulateMedia({media:'screen'}); }
  await p.click('.pdf-btn[data-mode="kp"]'); await p.waitForFunction(()=>window.__p===2);
  txt = await p.evaluate(()=>document.getElementById('printArea').innerText);
  chk('КП без предоплаты/доп.инфо', !/Предоплата|рассрочку/.test(txt));
  // amo: перехватываем текст примечания
  await p.evaluate(()=>{ const of=window.fetch; window.fetch=(u,o)=>{ if(String(u).endsWith('/lead')) window.__lead=JSON.parse(o.body); return of(u,o); }; });
  await p.click('#amoBtn'); await p.waitForFunction(()=>{ return /\b(ok|warn|err)\b/.test(document.getElementById('amoStatus').className); },null,{timeout:60000});
  const note = await p.evaluate(()=>window.__lead && window.__lead.note);
  chk('amo: статус', /✓|⚠/.test(await p.textContent('#amoStatus')), await p.textContent('#amoStatus'));
  chk('amo: предоплата и доплата', /Предоплата: 3\s000 ₽/.test(note) && /К доплате после установки: /.test(note));
  chk('amo: доп. инфо', note.includes('Доп. информация:\nУстановка через неделю\nОплата в рассрочку'));
  if (page==='mesh.html') console.log(note);
  // без предоплаты
  await p.fill('#prepay',''); await p.waitForTimeout(30);
  const n2 = await p.evaluate(()=>spPayLines().join(' | '));
  chk('без предоплаты', n2.startsWith('Предоплата: без предоплаты'), n2);
}
await p.screenshot({path:'pay_form.png', clip:{x:0,y:0,width:390,height:600}});
console.log('errors', errs, ok?'ALL OK':'HAS FAILS'); await b.close();
