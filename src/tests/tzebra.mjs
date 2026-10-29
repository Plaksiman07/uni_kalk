import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const OUT = new URL('./out/', import.meta.url).pathname;
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:390,height:844}, acceptDownloads:true})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const chk=(n,c,x='')=>{console.log((c?'OK  ':'FAIL')+' '+n+' '+x); if(!c) ok=false;};
const near=(a,b,e=0.01)=>Math.abs(a-b)<e;
const items=[[120,150,'Л'],[80,140,'П']].map(([w,h,c])=>({w:String(w),h:String(h),qty:'1',ctrl:c}));
await p.goto('http://localhost:8765/zebra.html');
await p.evaluate(([st])=>{ localStorage.clear(); localStorage.setItem('spAmoConfig', JSON.stringify({url:'http://localhost:8790', key:'secret1'})); localStorage.setItem('zebraCalcState1', JSON.stringify(st)); },
  [{orderNumber:'903',clientName:'Тест Зебра',clientAddress:'ул. Полевая 3',fabricName:'ЛОТОС',fabricWidth:'280',fabricColor:'белый',selectedPrice:'base',noInstall:false,rooms:[{name:'Спальня',pk:'pk1',items}]}]);
await p.reload();
const r = await p.evaluate(()=>{ calculateTotals(); const o=readOrder(); const d=window.calcData; return {n:fabricDB.length, cuts:o.items.map(i=>cutParts(i.w,i.h)), comps:componentsList(o.totals), items:d.costItems, fab:d.costFabric, len:d.fabricLength, problem:d.problem, S:SETTINGS, title:document.title}; });
console.log(r.title, 'тканей', r.n);
const c0=r.cuts[0];
chk('120×150: ГИ 124, короб 121, доп.профиль 121, ткань/отвес 120, длина ткани 310, цепь 225, направл. 144', [c0.wFinished,c0.boxLen,c0.profile,c0.fabricBot,c0.fabricLen,c0.chain,c0.guides].join()==='124,121,121,120,310,225,144', JSON.stringify(c0));
chk('80×140: длина ткани 290', r.cuts[1].fabricLen===290);
const c=Object.fromEntries(r.comps.map(x=>[x[0],x[2]]));
chk('отвес = ширина ткани 2,00 м', c['Отвес для зебры UNI 10 мм']==='2.00', c['Отвес для зебры UNI 10 мм']);
chk('доп. профиль = короб 121+81 = 2,02 м', c['Доп. профиль UNI зебра']==='2.02', c['Доп. профиль UNI зебра']);
chk('нет утяжелителя', !('Утяжелитель ткани' in c));
chk('цены: отвес 208,24, доп. профиль 133,61', r.S.weight===208.24 && r.S.profile===133.61);
const S=r.S; let hw=0;
for (const k of r.cuts){ const wm=k.fabricBot/100, box=k.boxLen/100, pr=k.profile/100, g=k.guides*2/100, ch=k.chain/100;
  hw+= box*S.box+box*S.tube+pr*S.profile+wm*S.weight+g*S.guide+S.mechanism+ch*S.chain+S.chainWeight+S.chainConnector+2*S.chainStopper+S.chainFixator+wm*S.seal+2*S.weightCap+wm*S.tape7+wm*S.tapeTube+g*S.tape9; }
chk('фурнитура + работы', near(r.items, hw+2*(S.laborMake+S.laborInstall)+S.tripFee), r.items+' vs '+hw);
// ткань: ЛОТОС 280, 120 и 80 в один ряд (200 ≤ 280) → ряд высотой 3,10 м
chk('раскрой: один ряд 3,10 м.п.', near(r.len, 3.10), r.len);
chk('ткань = 3,10 × 14,4923 $ × курс', near(r.fab, 3.10*14.4923*S.exchangeRate, 0.05), r.fab);
chk('нет ошибок', !r.problem, r.problem);
await p.screenshot({path:OUT+'z_order.png', fullPage:true});
await p.click('#tabBtnTech'); await p.screenshot({path:OUT+'z_tech.png', fullPage:true}); await p.click('#tabBtnOrder');
const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(()=>printLabels())]); await dl.saveAs(OUT+'z_labels.pdf');
await p.evaluate(()=>{window.print=()=>{window.__p=(window.__p||0)+1;}});
for (const [m,n] of [['kp',1],['order',2]]) { await p.click(`.pdf-btn[data-mode="${m}"]`); await p.waitForFunction(k=>window.__p===k,n);
  await p.emulateMedia({media:'print'}); await p.pdf({path:OUT+`z_${m}.pdf`,preferCSSPageSize:true,printBackground:true}); await p.emulateMedia({media:'screen'}); }
await p.evaluate(()=>{ const of=window.fetch; window.fetch=(u,o)=>{ if(String(u).endsWith('/lead')) window.__lead=JSON.parse(o.body); return of(u,o); }; });
await p.click('#amoBtn'); await p.waitForFunction(()=>{ return /\b(ok|warn|err)\b/.test(document.getElementById('amoStatus').className); },null,{timeout:60000});
console.log('amo:', await p.innerText('#amoStatus'));
const lead=await p.evaluate(()=>window.__lead); console.log(lead.pipeline, JSON.stringify(lead.tags), JSON.stringify(lead.fields)); console.log(lead.note.split('\n').slice(0,6).join('\n'));
// поиск ткани
await p.fill('#fabricSearch','лот'); await p.waitForTimeout(200); console.log('поиск «лот»:', await p.locator('#fabricSearchList .fabric-search-item').allInnerTexts());
console.log('errors', errs, ok?'ALL OK':'HAS FAILS'); await b.close();
