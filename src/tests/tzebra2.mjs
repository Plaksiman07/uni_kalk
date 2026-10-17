import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const OUT = new URL('./out/', import.meta.url).pathname;
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:390,height:844}, acceptDownloads:true})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const chk=(n,c,x='')=>{console.log((c?'OK  ':'FAIL')+' '+n+' '+x); if(!c) ok=false;};
const near=(a,b,e=0.01)=>Math.abs(a-b)<e;
const items=[[74.5,135,'Л'],[66,128,'П']].map(([w,h,c])=>({w:String(w),h:String(h),qty:'1',ctrl:c}));
await p.goto('http://localhost:8765/zebra2.html');
await p.evaluate(([st])=>{ localStorage.clear(); localStorage.setItem('spAmoConfig', JSON.stringify({url:'http://localhost:8790', key:'secret1'})); localStorage.setItem('zebra2CalcState1', JSON.stringify(st)); },
  [{orderNumber:'904',clientName:'Тест Зебра II',clientAddress:'ул. Речная 7',fabricName:'РИНО',fabricWidth:'280',fabricColor:'белый',selectedPrice:'base',noInstall:false,rooms:[{name:'Кухня',pk:'pk1',items}]}]);
await p.reload();
const r = await p.evaluate(()=>{ calculateTotals(); const o=readOrder(); const d=window.calcData; return {title:document.title, n:fabricDB.length, cuts:o.items.map(i=>cutParts(i.w,i.h)), comps:componentsList(o.totals), items:d.costItems, fab:d.costFabric, len:d.fabricLength, problem:d.problem, S:SETTINGS}; });
console.log(r.title, 'тканей', r.n);
const c0=r.cuts[0];
chk('74,5×135: короб 73,5, доп.профиль 73,5, ткань/отвес 72,8, длина ткани 280, цепь 202,5, направл. С 128', [c0.boxLen,c0.profile,c0.fabricBot,c0.fabricLen,c0.chain,c0.guides].join()==='73.5,73.5,72.8,280,202.5,128', JSON.stringify(c0));
chk('66×128: длина ткани 266', r.cuts[1].fabricLen===266);
const c=Object.fromEntries(r.comps.map(x=>[x[0],x[2]]));
chk('отвес 72,8+64,3 = 1,37 м', c['Отвес для зебры UNI 10 мм']==='1.37', c['Отвес для зебры UNI 10 мм']);
chk('один доп. профиль 73,5+65 = 1,39 м', c['Доп. профиль высокий универсальный UNI II']==='1.39' && !('Доп. профиль UNI' in c));
chk('накладки 4 шт, направл. С 4,98 м', c['Накладки']===4 && c['Направляющая типа С']==='4.98');
chk('нет утяжелителя', !('Утяжелитель ткани' in c));
chk('цены: отвес 208,24, профиль 213,98, направл. 70, накладки 50', r.S.weight===208.24 && r.S.profile===213.98 && r.S.guide===70 && r.S.overlayPair===50);
const S=r.S; let hw=0;
for (const k of r.cuts){ const wm=k.fabricBot/100, box=k.boxLen/100, pr=k.profile/100, g=k.guides*2/100, ch=k.chain/100;
  hw+= box*S.box+box*S.tube+pr*S.profile+wm*S.weight+g*S.guide+S.overlayPair+S.mechanism+ch*S.chain+S.chainWeight+S.chainConnector+2*S.chainStopper+S.chainFixator+wm*S.seal+2*S.weightCap+wm*S.tape7+wm*S.tapeTube+g*S.tape9; }
chk('фурнитура + работы', near(r.items, hw+2*(S.laborMake+S.laborInstall)+S.tripFee), r.items);
chk('раскрой ткани: один ряд 2,80 м.п.', near(r.len, 2.80), r.len);
chk('ткань = 2,80 × 11,4107 $ × курс', near(r.fab, 2.80*11.4107*S.exchangeRate, 0.05), r.fab);
chk('нет ошибок', !r.problem, r.problem);
await p.click('#tabBtnTech'); await p.screenshot({path:OUT+'z2_tech.png', fullPage:true}); await p.click('#tabBtnOrder');
const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(()=>printLabels())]); await dl.saveAs(OUT+'z2_labels.pdf');
await p.evaluate(()=>{window.print=()=>{window.__p=(window.__p||0)+1;}});
for (const [m,n] of [['kp',1],['order',2]]) { await p.click(`.pdf-btn[data-mode="${m}"]`); await p.waitForFunction(k=>window.__p===k,n);
  await p.emulateMedia({media:'print'}); await p.pdf({path:OUT+`z2_${m}.pdf`,preferCSSPageSize:true,printBackground:true}); await p.emulateMedia({media:'screen'}); }
await p.evaluate(()=>{ const of=window.fetch; window.fetch=(u,o)=>{ if(String(u).endsWith('/lead')) window.__lead=JSON.parse(o.body); return of(u,o); }; });
await p.click('#amoBtn'); await p.waitForFunction(()=>{ const t=document.getElementById('amoStatus').textContent; return /✓|⚠|✕/.test(t) && !/⏳/.test(t); },null,{timeout:60000});
console.log('amo:', await p.innerText('#amoStatus'));
const lead=await p.evaluate(()=>window.__lead); console.log(lead.pipeline, JSON.stringify(lead.tags)); console.log(lead.note.split('\n').slice(0,4).join('\n'));
console.log('errors', errs, ok?'ALL OK':'HAS FAILS'); await b.close();
