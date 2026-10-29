import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:390,height:844}, acceptDownloads:true})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const chk=(n,c,x='')=>{console.log((c?'OK  ':'FAIL')+' '+n+' '+x); if(!c) ok=false;};
const near=(a,b,e=0.0005)=>Math.abs(a-b)<e;
async function run(mat, items) {
  await p.goto('http://localhost:8765/horiz.html');
  await p.evaluate(([st])=>{ localStorage.clear(); localStorage.setItem('spAmoConfig', JSON.stringify({url:'http://localhost:8790', key:'secret1'})); localStorage.setItem('horizCalcState1', JSON.stringify(st)); },
    [{orderNumber:'901', clientName:'Олег', clientAddress:'ул. Лесная 9', meshType:mat, meshColor:'', selectedPrice:'base', rooms:[{name:'Кухня',pk:'p1',items}]}]);
  await p.reload();
  return p.evaluate(()=>{ calculateTotals(); const d=window.calcData; return {usd:d.totals.usd, items:d.items.map(i=>({usd:i.usd, area:i.areaCalc})), total:d.costTotal, price:d.priceBase, problem:d.problem, err:document.getElementById('orderError').textContent}; });
}
let r = await run('l25:1852', [{w:'120',h:'150',qty:'1'},{w:'60',h:'100',qty:'2'}]);
chk('25 мм 1852: 1,8 м² × 16,93', near(r.items[0].usd, 1.8*16.93), r.items[0].usd);
chk('60×100 → мин. 1 м²', near(r.items[1].usd, 16.93));
chk('себестоимость', near(r.total, (1.8*16.93+2*16.93)*95 + 1500 + 1500, 0.01), r.total);
r = await run('l25:0225', [{w:'100',h:'130',qty:'1'}]);  chk('0225 — 14,00 $/м²', near(r.items[0].usd, 1.3*14.001081), r.items[0].usd);
r = await run('l25:7718', [{w:'100',h:'130',qty:'1'}]);  chk('7718 — 35,46 $/м²', near(r.items[0].usd, 1.3*35.462231), r.items[0].usd);
r = await run('l16:6012', [{w:'100',h:'130',qty:'1'}]);  chk('16 мм 6012 — 34,82 $/м²', near(r.items[0].usd, 1.3*34.818441), r.items[0].usd);
r = await run('l50:1908 ЧЕРНЫЙ', [{w:'150',h:'200',qty:'1',o:JSON.stringify({side:1, ladder:1, holderM:2})}]);
chk('50 мм + бок. фиксация 50 + лесенка + 2 магн. держателя', near(r.items[0].usd, 3*42.352069 + 3*10.17 + 3*4.87143 + 2*2.3391), r.items[0].usd);
r = await run('l25:1852', [{w:'100',h:'150',qty:'1',o:JSON.stringify({side:1, holderB:2, pvc:1, complex:1, arch:'2'})}]);
chk('25 мм + фикс. 16/25 + держ. «В» 2 + ПВХ, сложная +100% и 2 ленты +50%', near(r.items[0].usd, (1.5*16.93 + 1.5*7.4241 + 2*0.1307862 + 15.65163)*2.5), r.items[0].usd);
r = await run('l25:1852', [{w:'100',h:'150',qty:'1',o:JSON.stringify({multi:'classic'})}]);
chk('межрамные классические +2,72/м²', near(r.items[0].usd, 1.5*(16.93+2.72)), r.items[0].usd);
r = await run('l25:1852', [{w:'160',h:'150',qty:'1',o:JSON.stringify({multi:'lever'})}]);
chk('межрамные 160 см — вне пределов (до 150)', /150/.test(r.err), r.err);
r = await run('l16:0225', [{w:'250',h:'150',qty:'1'}]);
chk('16 мм 250 см — вне пределов (до 210)', /210/.test(r.err), r.err);
r = await run('l25:1852', [{w:'280',h:'290',qty:'1'}]);
chk('25 мм 280×290 = 8,12 м² > 7', /7 м²/.test(r.err), r.err);
// UI, PDF, наклейки, amo
r = await run('l25:1852', [{w:'120',h:'150',qty:'1'},{w:'80',h:'140',qty:'2',t:'l50:0120 БЕЛЫЙ',ctrl:'П',mount:'На створку',o:JSON.stringify({side:1})}]);
await p.screenshot({path:'h_order.png', fullPage:true});
await p.click('.item-opt-btn >> nth=1'); await p.screenshot({path:'h_modal.png'}); await p.click('.settings-panel [data-x] >> nth=1');
await p.click('#tabBtnTech'); await p.screenshot({path:'h_tech.png', fullPage:true}); await p.click('#tabBtnOrder');
const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(()=>printLabels())]); await dl.saveAs('h_labels.pdf'); console.log('labels', dl.suggestedFilename());
await p.evaluate(()=>{window.print=()=>{window.__p=(window.__p||0)+1;}});
for (const [m,n] of [['kp',1],['order',2]]) { await p.click(`.pdf-btn[data-mode="${m}"]`); await p.waitForFunction(k=>window.__p===k,n);
  await p.emulateMedia({media:'print'}); await p.pdf({path:`h_${m}.pdf`,preferCSSPageSize:true,printBackground:true}); await p.emulateMedia({media:'screen'}); }
await p.evaluate(()=>{ const of=window.fetch; window.fetch=(u,o)=>{ if(String(u).endsWith('/lead')) window.__lead=JSON.parse(o.body); return of(u,o); }; });
await p.click('#amoBtn'); await p.waitForFunction(()=>{ return /\b(ok|warn|err)\b/.test(document.getElementById('amoStatus').className); },null,{timeout:60000});
console.log('amo:', await p.innerText('#amoStatus'));
console.log(JSON.stringify((await p.evaluate(()=>window.__lead)).fields));
console.log((await p.evaluate(()=>window.__lead.note)).split('\n').slice(0,10).join('\n'));
console.log('errors', errs, ok?'ALL OK':'HAS FAILS'); await b.close();
