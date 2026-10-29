import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const OUT = new URL('./out/', import.meta.url).pathname;
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:390,height:844}, acceptDownloads:true})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const chk=(n,c,x='')=>{console.log((c?'OK  ':'FAIL')+' '+n+' '+x); if(!c) ok=false;};
const near=(a,b,e=0.01)=>Math.abs(a-b)<e;
const OM={name:'ОМЕГА',width:250,color:'белый'};
const items=[[74.5,135,'Л'],[66,128,'Л'],[66,128,'П'],[74.5,135,'П']].map(([w,h,c])=>({w:String(w),h:String(h),qty:'1',ctrl:c}));
await p.goto('http://localhost:8765/uni2.html');
await p.evaluate(([st])=>{ localStorage.clear(); localStorage.setItem('spAmoConfig', JSON.stringify({url:'http://localhost:8790', key:'secret1'})); localStorage.setItem('uni2CalcState1', JSON.stringify(st)); },
  [{orderNumber:'902',clientName:'Тест UNI II',clientAddress:'ул. Садовая 5',fabricName:OM.name,fabricWidth:String(OM.width),fabricColor:OM.color,selectedPrice:'base',noInstall:false,rooms:[{name:'Зал',pk:'pk1',items}]}]);
await p.reload();
const r = await p.evaluate(()=>{ calculateTotals(); const o=readOrder(); return {cuts:o.items.map(i=>cutParts(i.w,i.h)), totals:o.totals, comps:componentsList(o.totals), d:{items:window.calcData.costItems, fab:window.calcData.costFabric, len:window.calcData.fabricLength, problem:window.calcData.problem}, S:SETTINGS}; });
// по таблице «Раскрой UNI II»
const exp=[[73.5,72.8,145,202.5,128],[65,64.3,138,192,121]];
chk('изд.1 74,5×135: короб 73,5 / ткань 72,8 / длина 145 / цепь 202,5 / направл. 128', JSON.stringify([r.cuts[0].boxLen,r.cuts[0].fabricBot,r.cuts[0].fabricLen,r.cuts[0].chain,r.cuts[0].guides])===JSON.stringify(exp[0]), JSON.stringify(r.cuts[0]));
chk('изд.2 66×128: 65 / 64,3 / 138 / 192 / 121', JSON.stringify([r.cuts[1].boxLen,r.cuts[1].fabricBot,r.cuts[1].fabricLen,r.cuts[1].chain,r.cuts[1].guides])===JSON.stringify(exp[1]));
chk('доп. профиль = Ш − 1', r.cuts[0].profile===73.5 && r.cuts[1].profile===65);
const c=Object.fromEntries(r.comps.map(x=>[x[0],x[2]]));
chk('доп. профиль 2,77 м.п.', c['Доп. профиль UNI']==='2.77', c['Доп. профиль UNI']);
chk('направляющая С 2×(128+121+121+128)=9,96 м', c['Направляющая типа С']==='9.96', c['Направляющая типа С']);
chk('накладки 8 шт', c['Накладки']===8);
chk('утяжелитель по ширине ткани 2,74', c['Утяжелитель ткани']==='2.74', c['Утяжелитель ткани']);
chk('нет «Направляющие UNI»', !('Направляющие UNI' in c));
// себестоимость фурнитуры вручную
const S=r.S; let hw=0;
for (const k of r.cuts){ const wm=k.fabricBot/100, box=k.boxLen/100, pr=k.profile/100, g=k.guides*2/100, ch=k.chain/100;
  hw+= box*S.box+box*S.tube+pr*200+wm*S.weight+g*70+50+S.mechanism+ch*S.chain+S.chainWeight+S.chainConnector+2*S.chainStopper+S.chainFixator+wm*S.seal+2*S.weightCap+wm*S.tape7+wm*S.tapeTube+g*S.tape9; }
const labor=4*(S.laborMake+S.laborInstall);
chk('фурнитура+работы', near(r.d.items, hw+labor+S.tripFee), r.d.items+' vs '+(hw+labor));
chk('цены по умолчанию: профиль 200, направл. 70, накладки 50/пара', S.profile===200 && S.guide===70 && S.overlayPair===50);
chk('нет ошибок расчёта', !r.d.problem, r.d.problem);
console.log('ткань', r.d.len, 'м.п.', r.d.fab, '₽');
// ткань шире рулона — по Ш − 1,7
await p.evaluate(()=>{ const i=document.querySelector('.item-width'); i.value='251.5'; calculateTotals(); });
chk('251,5 по штапику → ткань 249,8 влезает в 250', !(await p.evaluate(()=>window.calcData.blocked)));
await p.evaluate(()=>{ const i=document.querySelector('.item-width'); i.value='252'; calculateTotals(); });
chk('252 → ткань 250,3 шире рулона', await p.evaluate(()=>window.calcData.blocked));
await p.evaluate(()=>{ const i=document.querySelector('.item-width'); i.value='74.5'; calculateTotals(); });
await p.screenshot({path:OUT+'u2_order.png', fullPage:true});
await p.click('#tabBtnTech'); await p.screenshot({path:OUT+'u2_tech.png', fullPage:true}); await p.click('#tabBtnOrder');
const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(()=>printLabels())]); await dl.saveAs(OUT+'u2_labels.pdf');
await p.evaluate(()=>{window.print=()=>{window.__p=(window.__p||0)+1;}});
for (const [m,n] of [['kp',1],['order',2]]) { await p.click(`.pdf-btn[data-mode="${m}"]`); await p.waitForFunction(k=>window.__p===k,n);
  await p.emulateMedia({media:'print'}); await p.pdf({path:OUT+`u2_${m}.pdf`,preferCSSPageSize:true,printBackground:true}); await p.emulateMedia({media:'screen'}); }
await p.evaluate(()=>{ const of=window.fetch; window.fetch=(u,o)=>{ if(String(u).endsWith('/lead')) window.__lead=JSON.parse(o.body); return of(u,o); }; });
await p.click('#amoBtn'); await p.waitForFunction(()=>{ return /\b(ok|warn|err)\b/.test(document.getElementById('amoStatus').className); },null,{timeout:60000});
console.log('amo:', await p.innerText('#amoStatus'));
const lead=await p.evaluate(()=>window.__lead); console.log(lead.pipeline||'', JSON.stringify(lead.tags), JSON.stringify(lead.fields)); console.log(lead.note.split('\n').slice(0,8).join('\n'));
// UNI I не затронут: отдельное хранилище
await p.goto('http://localhost:8765/uni.html'); chk('UNI I хранит своё', await p.evaluate(()=>localStorage.getItem('uniCalcState12')===null || !localStorage.getItem('uniCalcState12').includes('UNI II')));
console.log('errors', errs, ok?'ALL OK':'HAS FAILS'); await b.close();
