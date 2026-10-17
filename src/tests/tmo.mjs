import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const ctx = await b.newContext({viewport:{width:390,height:844}}); const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const chk=(n,c,x='')=>{console.log((c?'OK  ':'FAIL')+' '+n+' '+x); if(!c) ok=false;};
const near=(a,b,e=0.01)=>Math.abs(a-b)<e;
const it=(w,h,qty,t='',c='')=>({w:String(w),h:String(h),qty:String(qty),t,c});
async function run(page, type, color, rooms, settings={}, sel='base') {
  await p.goto('http://localhost:8765/'+page);
  await p.evaluate(([st,s])=>{ localStorage.clear(); localStorage.setItem('meshCalcState1', JSON.stringify(st)); if(Object.keys(s).length) localStorage.setItem('meshCalcSettings3', JSON.stringify(s)); },
    [{orderNumber:'7',clientName:'T',meshType:type,meshColor:color,selectedPrice:sel,rooms:rooms.map((r,i)=>({name:r[0],pk:'pk'+i,items:r[1]}))}, settings]);
  await p.reload();
  return p.evaluate(()=>{ calculateTotals(); const d=window.calcData; return {total:d.costTotal, prof:d.costProfile, cloth:d.costCloth, parts:d.costParts, labor:d.costLabor, price:d.priceBase, p7:d.price7, p12:d.price12, b2b:d.priceB2B,
    raw:d.items.reduce((a,i)=>a+(i.lineWeight||0),0), lines:d.items.map(i=>i.lineWeight), comp:componentsList(), bars:(d.barGroups||[]).map(g=>g.color+':'+g.frame.bars.length+'/'+g.imp.bars.length)}; });
}
// 1) старый заказ (без t/c) — цены как в прежней версии
for (const [type,color] of [['standard','white'],['antikoshka','brown'],['antipyl','anthracite']]) {
  const rooms=[['Кухня',[it(60,140,1),it(80,150,2)]],['Спальня',[it(55,120,1)]]];
  for (const S of [{}, {laborMarkup:1, tripFee:500}, {colorExtra:20, minOrder:3000}]) {
    const o = await run('mesh_old.html',type,color,rooms,S); const n = await run('mesh.html',type,color,rooms,S);
    chk(`прежний расчёт ${type}/${color} ${JSON.stringify(S)}`, ['total','price','p7','p12','b2b'].every(k=>near(o[k],n[k])), `${o.price}/${n.price} b2b ${o.b2b}/${n.b2b}`);
  }
}
// 2) смешанный заказ = сумма отдельных
const S2 = {tripFee:0};
const mixed = await run('mesh.html','standard','white',[['Кухня',[it(60,140,1),it(80,150,2,'antikoshka')]],['Спальня',[it(55,120,1,'','brown'),it(70,130,1,'antipyl','anthracite')]]],S2);
const a = await run('mesh.html','standard','white',[['Кухня',[it(60,140,1)]]],S2);
const bb = await run('mesh.html','antikoshka','white',[['Кухня',[it(80,150,2)]]],S2);
const c = await run('mesh.html','standard','brown',[['Спальня',[it(55,120,1)]]],S2);
const dd = await run('mesh.html','antipyl','anthracite',[['Спальня',[it(70,130,1)]]],S2);
const parts=[a,bb,c,dd];
console.log('mixed', JSON.stringify(mixed));
chk('себестоимость = сумма', near(mixed.total, parts.reduce((s,x)=>s+x.total,0)), mixed.total.toFixed(2));
chk('цена до округления = сумма', near(mixed.raw, parts.reduce((s,x)=>s+x.raw,0)), mixed.raw.toFixed(2));
chk('позиции по своей цене', parts.every((x,i)=>near(mixed.lines[i], x.raw)), JSON.stringify(mixed.lines.map(Math.round))+' vs '+JSON.stringify(parts.map(x=>Math.round(x.raw))));
chk('хлысты по цветам', mixed.bars.join()==='white:1/1,brown:1/1,anthracite:1/1', mixed.bars.join());
console.log(mixed.comp.map(r=>r.join(' ')).join('\n'));
// с выездом: выезд в себестоимости один раз
const mt = await run('mesh.html','standard','white',[['Кухня',[it(60,140,1),it(80,150,2,'antikoshka')]]],{tripFee:700});
const m0 = await run('mesh.html','standard','white',[['Кухня',[it(60,140,1),it(80,150,2,'antikoshka')]]],{tripFee:0});
chk('выезд +700 в себестоимости один раз', near(mt.total-m0.total,700));
// скидки/Р-С: разбивка строк под выбранную цену
for (const sel of ['discount7','b2b']) { const r = await run('mesh.html','standard','white',[['Кухня',[it(60,140,1),it(80,150,2,'antikoshka')]]],{roundStep:0},sel);
  chk(`строки = цена ${sel}`, near(r.raw, sel==='b2b'?r.b2b:r.p7)); }
console.log('errors', errs, ok?'ALL OK':'HAS FAILS'); await b.close();
