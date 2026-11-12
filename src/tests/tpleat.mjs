import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:390,height:844}, acceptDownloads:true})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const chk=(n,c,x='')=>{console.log((c?'OK  ':'FAIL')+' '+n+' '+x); if(!c) ok=false;};
async function run(items, mat) {
  await p.goto('http://localhost:8765/pleat.html');
  await p.evaluate(([st])=>{ localStorage.clear(); localStorage.setItem('spAmoConfig', JSON.stringify({url:'http://localhost:8790', key:'secret1'})); localStorage.setItem('pleatCalcState1', JSON.stringify(st)); },
    [{orderNumber:'903', clientName:'Анна', clientAddress:'ул. Мира 5', meshType:mat, meshColor:'', ord:{color:'white'}, selectedPrice:'base', rooms:[{name:'Зал',pk:'p1',items}]}]);
  await p.reload();
  return p.evaluate(()=>{ calculateTotals(); const d=window.calcData; return {items:d.items.map(i=>({usd:i.usd, retail:i.pl&&i.pl.retail})), total:d.costTotal, price:d.priceBase, err:document.getElementById('orderError').textContent}; });
}
const H='honeycomb|BLACK OUT HONEYCOMB 1601 (белый)', LI='lina|LINA 1050 (WHITE)';
let r = await run([{w:'100',h:'150',qty:'1'}], H); chk('honeycomb 1000×1500: моя 7972, розница 10619 (как у дилера)', r.items[0].usd===7972 && r.items[0].retail===10619, JSON.stringify(r.items[0]));
for (const [w,h,m] of [['100','150',LI],['120','250',LI],['40','80',LI],['70','190','honeycomb_premium|HONEYCOMB PREMIUM 001'],['90','120','black_out|BLACK OUT BO 11']]) { r = await run([{w,h,qty:'1'}], m); console.log('CASE', m.split('|')[0], w*10, h*10, JSON.stringify(r.items[0])); }
r = await run([{w:'110',h:'150',qty:'1'}], H); chk('honeycomb шире 100 см — предупреждение «без гарантии», цена считается', /без гарантии/.test(r.err) && r.items[0].usd>0, r.err);
r = await run([{w:'100',h:'240',qty:'1'}], 'PELIKAN|PELIKAN 1405'); chk('PELIKAN 1000×2400: моя 8430, розница 11230 (как у дилера)', r.items[0].usd===8430 && r.items[0].retail===11230, JSON.stringify(r.items[0]));
r = await run([{w:'100',h:'150',qty:'1'}], 'PELIKAN|PELIKAN 1405'); chk('PELIKAN 1000×1500: моя 6183', r.items[0].usd===6183, JSON.stringify(r.items[0]));
r = await run([{w:'100',h:'150',qty:'2'},{w:'60',h:'120',qty:'1',t:LI,o:JSON.stringify({pc:'anthracite'})}], H);
await p.screenshot({path:'pl_order.png', fullPage:true});
await p.click('.item-opt-btn >> nth=1'); await p.screenshot({path:'pl_modal.png'}); await p.click('.settings-panel [data-x] >> nth=1');
await p.click('#tabBtnTech'); await p.screenshot({path:'pl_tech.png', fullPage:true}); await p.click('#tabBtnOrder');
const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(()=>printLabels())]); await dl.saveAs('pl_labels.pdf');
await p.evaluate(()=>{window.print=()=>{window.__p=(window.__p||0)+1;}});
for (const [m,n] of [['kp',1],['order',2]]) { await p.click(`.pdf-btn[data-mode="${m}"]`); await p.waitForFunction(k=>window.__p===k,n);
  await p.emulateMedia({media:'print'}); await p.pdf({path:`pl_${m}.pdf`,preferCSSPageSize:true,printBackground:true}); await p.emulateMedia({media:'screen'}); }
await p.evaluate(()=>{ const of=window.fetch; window.fetch=(u,o)=>{ if(String(u).endsWith('/lead')) window.__lead=JSON.parse(o.body); return of(u,o); }; });
await p.click('#amoBtn'); await p.waitForFunction(()=>/\b(ok|warn|err)\b/.test(document.getElementById('amoStatus').className),null,{timeout:60000});
const lead = await p.evaluate(()=>window.__lead); console.log('amo:', await p.innerText('#amoStatus')); console.log(JSON.stringify(lead.fields), JSON.stringify(lead.tags));
console.log('errors', errs, ok?'ALL OK':'HAS FAILS'); await b.close();
