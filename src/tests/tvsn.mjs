import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:390,height:844}, acceptDownloads:true})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const chk=(n,c,x='')=>{console.log((c?'OK  ':'FAIL')+' '+n+' '+x); if(!c) ok=false;};
async function run(items, ord={color:'white',prof:'lite',corner:'metal',jump:'yes'}, mat='standard') {
  await p.goto('http://localhost:8765/vsn.html');
  await p.evaluate(([st])=>{ localStorage.clear(); localStorage.setItem('spAmoConfig', JSON.stringify({url:'http://localhost:8790', key:'secret1'})); localStorage.setItem('vsnCalcState1', JSON.stringify(st)); },
    [{orderNumber:'902', clientName:'Ирина', clientAddress:'ул. Садовая 3', meshType:mat, meshColor:'', ord, selectedPrice:'base', rooms:[{name:'Спальня',pk:'p1',items}]}]);
  await p.reload();
  return p.evaluate(()=>{ calculateTotals(); const d=window.calcData; return {usd:d.totals.usd, items:d.items.map(i=>({usd:i.usd, j:i.jumpOn})), total:d.costTotal, price:d.priceBase, problem:d.problem, err:document.getElementById('orderError').textContent}; });
}
// эталоны — калькулятор дилера (Стандарт, белый, Лайт, металл. угол, перемычка)
let r = await run([{w:'80',h:'150',qty:'1'}]); chk('800×1500 = 1892 ₽ (как у дилера)', r.items[0].usd===1892, r.items[0].usd);
r = await run([{w:'50',h:'50',qty:'1'}]); chk('500×500 = 994 ₽', r.items[0].usd===994, r.items[0].usd);
r = await run([{w:'130',h:'240',qty:'1'}]); chk('1300×2400 = 2929 ₽', r.items[0].usd===2929, r.items[0].usd);
r = await run([{w:'50',h:'50',qty:'1'}], {color:'white',prof:'lite',corner:'metal',jump:'no'}); chk('500×500 без перемычки = 943 ₽', r.items[0].usd===943, r.items[0].usd);
r = await run([{w:'80',h:'150',qty:'1'}], {color:'white',prof:'lite',corner:'metal',jump:'no'}); chk('выше 140 см перемычка обязательна', r.items[0].j && r.items[0].usd===1892, r.items[0].usd);
r = await run([{w:'80',h:'150',qty:'2'}]); chk('себестоимость = дилер×2 + установка 300×2', r.total===1892*2+600, r.total);
chk('цена клиента = дилер×2×2 + установка, округл. до 10', r.price===Math.ceil((1892*2*2+600)/10)*10, r.price);
r = await run([{w:'140',h:'150',qty:'1'}]); chk('ширина 140 — вне пределов (до 130)', /130/.test(r.err), r.err);
r = await run([{w:'80',h:'150',qty:'1',o:JSON.stringify({pc:'anthracite',pr:'prem',co:'plastic'})},{w:'60',h:'100',qty:'1',t:'antikoshka_g'}]);
console.log('mixed', JSON.stringify(r.items));
await p.screenshot({path:'v_order.png', fullPage:true});
await p.click('.item-opt-btn >> nth=0'); await p.screenshot({path:'v_modal.png'}); await p.click('.settings-panel [data-x] >> nth=1');
await p.click('#tabBtnTech'); await p.screenshot({path:'v_tech.png', fullPage:true}); await p.click('#tabBtnOrder');
const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(()=>printLabels())]); await dl.saveAs('v_labels.pdf');
await p.evaluate(()=>{window.print=()=>{window.__p=(window.__p||0)+1;}});
for (const [m,n] of [['kp',1],['order',2]]) { await p.click(`.pdf-btn[data-mode="${m}"]`); await p.waitForFunction(k=>window.__p===k,n);
  await p.emulateMedia({media:'print'}); await p.pdf({path:`v_${m}.pdf`,preferCSSPageSize:true,printBackground:true}); await p.emulateMedia({media:'screen'}); }
await p.evaluate(()=>{ const of=window.fetch; window.fetch=(u,o)=>{ if(String(u).endsWith('/lead')) window.__lead=JSON.parse(o.body); return of(u,o); }; });
await p.click('#amoBtn'); await p.waitForFunction(()=>/\b(ok|warn|err)\b/.test(document.getElementById('amoStatus').className),null,{timeout:60000});
const lead = await p.evaluate(()=>window.__lead);
console.log('amo:', await p.innerText('#amoStatus')); console.log(JSON.stringify(lead.fields), JSON.stringify(lead.tags)); console.log(lead.note.split('\n').slice(0,8).join('\n'));
console.log('errors', errs, ok?'ALL OK':'HAS FAILS'); await b.close();
