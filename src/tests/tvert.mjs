import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:390,height:844}, acceptDownloads:true})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const chk=(n,c,x='')=>{console.log((c?'OK  ':'FAIL')+' '+n+' '+x); if(!c) ok=false;};
const near=(a,b,e=0.005)=>Math.abs(a-b)<e;
async function run(mat, items, extra={}) {
  await p.goto('http://localhost:8765/vert.html');
  await p.evaluate(([st])=>{ localStorage.clear(); localStorage.setItem('spAmoConfig', JSON.stringify({url:'http://localhost:8790', key:'secret1'})); localStorage.setItem('vertCalcState1', JSON.stringify(st)); },
    [{orderNumber:'900', clientName:'Анна', clientAddress:'ул. Мира 1', meshType:mat, meshColor:'0225 белый', selectedPrice:'base', ...extra, rooms:[{name:'Зал',pk:'p1',items}]}]);
  await p.reload();
  return p.evaluate(()=>{ calculateTotals(); const d=window.calcData; return {usd:d.totals.usd, items:d.items.map(i=>({usd:i.usd, area:i.areaCalc})), dealer:d.costProfile, opts:d.costCloth, trip:d.tripFee, labor:d.costLabor, total:d.costTotal, price:d.priceBase, problem:d.problem, err:document.getElementById('orderError').textContent}; });
}
const R=95;
// 1) ткань кат.3 150×200 + 50×80 (мин. 1 м²)
let r = await run('fabric:ВЕНЕРА', [{w:'150',h:'200',qty:'1'},{w:'50',h:'80',qty:'2'}]);
chk('кат.3 150×200 = 3 м² × 17,06', near(r.items[0].usd, 3*17.06), r.items[0].usd);
chk('50×80 → мин. 1 м²', near(r.items[1].usd, 17.06) && r.items[1].area===1);
chk('себестоимость = дилер×95 + доставка 1500 + установка 3×500', near(r.total, (3*17.06+2*17.06)*R + 1500 + 1500, 0.01), r.total);
chk('цена = (дилер+доставка)×2 + установка, округл. до 10', r.price === Math.ceil((((3*17.06+2*17.06)*R + 1500)*2 + 1500)/10 - 1e-9)*10, r.price);
// 2) Бриз — за погонный метр ширины
r = await run('breeze:БРИЗ DOUBLE', [{w:'180',h:'250',qty:'1'}]);
chk('Бриз DOUBLE 180 см = 1,8 × 105,93', near(r.items[0].usd, 1.8*105.93), r.items[0].usd);
// 3) опции: металл + декор. карниз + прозрачная + наклонные
r = await run('fabric:БОН', [{w:'200',h:'150',qty:'1',o:JSON.stringify({metal:1,deco:1,clear:1,tilt:1})}]);
const exp3 = (3*13.87 + 3*10.17 + 2*1.824498 + 1.979082)*2;
chk('опции + наклонные ×2', near(r.items[0].usd, exp3), r.items[0].usd+' vs '+exp3);
chk('опции отдельной строкой', near(r.opts, (exp3 - 3*13.87)*R, 0.01));
// 4) только ламели и мультифактура
r = await run('fabric:БОН', [{w:'200',h:'150',qty:'1',o:JSON.stringify({onlySlats:1, multi:'multiF2'})}]);
chk('только ламели −1,125/м² + мультифактура 2 слоя + эскиз', near(r.items[0].usd, 3*13.87 - 3*1.125 + 3*35.925525 + 11.404638), r.items[0].usd);
// 5) предельные размеры
r = await run('alu:ЗОЛОТО', [{w:'500',h:'200',qty:'1'}]);
chk('алюминий 500 см — ошибка', !!r.problem && /450/.test(r.err), r.err);
r = await run('', [{w:'100',h:'100',qty:'1'}]);
chk('без материала — ошибка', /материал/i.test(r.problem), r.problem);
// 6) пластик + своё изделие, UI, PDF, наклейки, amo
r = await run('plastic:ФРОСТ', [{w:'120',h:'180',qty:'1'},{w:'90',h:'160',qty:'2',t:'fabric:СКРИН',c:'2870 серый',ctrl:'П',stack:'К центру',mount:'Стена'}]);
chk('изделие со своим материалом (кат.5)', near(r.items[1].usd, 1.44*30.07), r.items[1].usd);
await p.screenshot({path:'v_order.png', fullPage:true});
await p.click('.item-opt-btn >> nth=0'); await p.screenshot({path:'v_modal.png'}); await p.click('.settings-panel [data-x] >> nth=1');
await p.click('#tabBtnTech'); await p.screenshot({path:'v_tech.png', fullPage:true}); await p.click('#tabBtnOrder');
const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(()=>printLabels())]); await dl.saveAs('v_labels.pdf'); console.log('labels', dl.suggestedFilename());
await p.evaluate(()=>{window.print=()=>{window.__p=(window.__p||0)+1;}});
for (const [m,n] of [['kp',1],['order',2]]) { await p.click(`.pdf-btn[data-mode="${m}"]`); await p.waitForFunction(k=>window.__p===k,n);
  await p.emulateMedia({media:'print'}); await p.pdf({path:`v_${m}.pdf`,preferCSSPageSize:true,printBackground:true}); await p.emulateMedia({media:'screen'}); }
await p.evaluate(()=>{ const of=window.fetch; window.fetch=(u,o)=>{ if(String(u).endsWith('/lead')) window.__lead=JSON.parse(o.body); return of(u,o); }; });
await p.click('#amoBtn'); await p.waitForFunction(()=>{ const t=document.getElementById('amoStatus').textContent; return /✓|⚠|✕/.test(t) && !/⏳/.test(t); },null,{timeout:60000});
console.log('amo:', await p.innerText('#amoStatus'));
console.log(JSON.stringify((await p.evaluate(()=>window.__lead)).fields));
console.log((await p.evaluate(()=>window.__lead.note)));
console.log('errors', errs, ok?'ALL OK':'HAS FAILS'); await b.close();
