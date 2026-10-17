import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const OUT = new URL('./out/', import.meta.url).pathname;
const b = await chromium.launch(); const errs=[];
let ok=true; const chk=(n,c,x='')=>{console.log((c?'OK  ':'FAIL')+' '+n+' '+x); if(!c) ok=false;};
const items=[[120,150,1],[80,140,2],[150,200,1],[60,100,3]].map(([w,h,q],i)=>({w:String(w),h:String(h),qty:String(q),ctrl:i%2?'П':'Л'}));
for (const [pg,key] of [['uni','uniCalcState12'],['uni2','uni2CalcState1'],['zebra','zebraCalcState1'],['zebra2','zebra2CalcState1']]) {
  const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage(); p.on('pageerror',e=>errs.push(pg+': '+e.message));
  await p.goto(`http://localhost:8765/${pg}.html`);
  await p.evaluate(([k,st])=>{ localStorage.clear(); localStorage.setItem(k, JSON.stringify(st)); },[key,{orderNumber:'905',clientName:'Хлысты',fabricName:pg.startsWith('zebra')?'РИНО':'ОМЕГА',fabricWidth:pg.startsWith('zebra')?'280':'250',fabricColor:'белый',selectedPrice:'base',rooms:[{name:'Зал',pk:'a',items}]}]);
  await p.reload();
  const r = await p.evaluate(()=>{ calculateTotals(); const o=readOrder(); const plan=barPlan(o);
    const L=SETTINGS.barLen, kerf=SETTINGS.sawKerf;
    const okFit = plan.every(g=>g.bars.every(bb=>{ const used=bb.pieces.reduce((a,pc)=>a+pc.len,0)+kerf*(bb.pieces.length-1); return used<=L+1e-6 && Math.abs((L-used)-bb.left)<0.11; }));
    const cnt = plan.map(g=>({label:g.label, pair:g.pair, pieces:g.pieces.length, bars:g.barsTotal, need:g.needCm}));
    const qty=o.totals.qty;
    return {cnt, okFit, qty, L, kerf, techHas: document.getElementById('techBars').innerHTML.length>500}; });
  console.log(pg, JSON.stringify(r.cnt));
  chk(pg+': хлыст 400 см, пропил 0,3', r.L===400 && r.kerf===0.3);
  chk(pg+': все отрезки помещаются в хлысты, остаток верный', r.okFit);
  chk(pg+': направляющие — парой, деталей = числу изделий, хлыстов чётно', r.cnt.filter(g=>g.pair).every(g=>g.pieces===r.qty && g.bars%2===0));
  const names=r.cnt.map(g=>g.label).join(',');
  chk(pg+': состав профилей', pg==='uni' ? names==='Короб,Труба,Утяжелитель,Направляющие' : pg==='uni2' ? names==='Короб,Труба,Доп. профиль,Утяжелитель,Направляющие типа С' : pg==='zebra' ? names==='Короб,Труба,Доп. профиль,Отвес,Направляющие' : names==='Короб,Труба,Доп. профиль,Отвес,Направляющие типа С', names);
  await p.click('#tabBtnTech'); await p.waitForTimeout(200);
  await p.locator('#blockBars').screenshot({path:OUT+`bars_${pg}.png`});
  if (pg==='uni') { await p.evaluate(()=>{window.print=()=>{window.__p=1;}}); await p.click('#tabBtnOrder'); await p.click('.pdf-btn[data-mode="order"]'); await p.waitForFunction(()=>window.__p===1);
    await p.emulateMedia({media:'print'}); await p.pdf({path:OUT+'bars_uni_order.pdf',preferCSSPageSize:true,printBackground:true}); }
}
console.log('errors', errs, ok?'ALL OK':'HAS FAILS'); await b.close();
