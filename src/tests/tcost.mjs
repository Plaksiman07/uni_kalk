import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const ctx = await b.newContext({viewport:{width:1100,height:900}}); const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/uni.html');
const OM = {name:'ОМЕГА',width:250,color:'белый'};
const AL = await p.evaluate(()=>{ const r=fabricDB.filter(f=>f.name==='АЛЬФА'&&f.width===200); return r.map(x=>({price:x.price, colors:x.colors.slice(0,3)})); });
console.log('АЛЬФА 200 rows', JSON.stringify(AL));
const AL1 = {name:'АЛЬФА',width:200,color:AL[0].colors[0]}; // дешёвая группа
const AL2 = {name:'АЛЬФА',width:200,color:AL[1].colors[0]}; // дорогая группа
const room=(name,items,fabric=null)=>({name,pk:'pk'+name,fabric,items:items.map(([w,h,qty])=>({w:String(w),h:String(h),qty:String(qty),ctrl:'Л'}))});
async function run(orderFab, rooms, settings={}) {
  await p.evaluate(([st,s])=>{ localStorage.clear(); localStorage.setItem('uniCalcState12', JSON.stringify(st)); if (Object.keys(s).length) localStorage.setItem('uniCalcSettings1', JSON.stringify(s)); },
    [{orderNumber:'1',clientName:'T',fabricName:orderFab.name,fabricWidth:String(orderFab.width),fabricColor:orderFab.color,selectedPrice:'base',noInstall:false,rooms}, settings]);
  await p.reload();
  return p.evaluate(()=>{ calculateTotals(); const c=window.calcData; return {len:c.fabricLength, fab:c.costFabric, items:c.costItems, total:c.costTotal, trip:c.tripFee, price:c.priceBase, p7:c.price7, b2b:c.priceB2B, problem:c.problem,
     groups:c.fabricGroups.map(g=>({k:g.spec.key, price:g.spec.price, len:g.lengthM, cost:g.cost, rooms:g.rooms, n:g.items.length})),
     lineSum:c.items.reduce((a,i)=>a+i.lineCost,0), screen:{fab:costFabricOnly.textContent,total:costTotal.textContent,price:priceBase.textContent,br:fabricBreakdown.innerText}}; });
}
const R = {
  gost: room('Гостиная',[[150,160,1],[120,180,1]]),
  det: room('Детская',[[80,120,2]],AL1),
  spal: room('Спальня',[[100,150,1]],OM),      // своя, но такая же как в заказе → должна слиться
  kuh: room('Кухня',[[60,100,3],[90,140,1]],AL2),
};
const near=(a,b)=>Math.abs(a-b)<0.01;
let ok=true; const chk=(name,cond,extra='')=>{ console.log((cond?'OK  ':'FAIL')+' '+name+' '+extra); if(!cond) ok=false; };
for (const mode of [0,1]) {
  const S = mode? {fabricMode:1, fabricWaste:10}: {};
  console.log(`\n===== режим ткани: ${mode? 'по площади + отход':'по раскрою'} =====`);
  const multi = await run(OM,[R.gost,R.det,R.spal,R.kuh],S);
  console.log(JSON.stringify(multi,null,0));
  // по отдельности: каждая ткань как обычный однотканевый заказ
  const sA = await run(OM,[R.gost,{...R.spal,fabric:null}],S);
  const sB = await run(AL1,[{...R.det,fabric:null}],S);
  const sC = await run(AL2,[{...R.kuh,fabric:null}],S);
  const singles=[sA,sB,sC];
  chk('групп 3 (Спальня слилась с Гостиной)', multi.groups.length===3, JSON.stringify(multi.groups.map(g=>g.rooms)));
  singles.forEach((s,i)=>{ const g=multi.groups[i]; chk(`группа ${g.k}: длина ${g.len.toFixed(2)} = отдельно ${s.len.toFixed(2)}`, near(g.len,s.len)); chk(`группа ${g.k}: ткань ${g.cost.toFixed(2)} = отдельно ${s.fab.toFixed(2)}`, near(g.cost,s.fab)); });
  chk('ткань всего = сумма', near(multi.fab, singles.reduce((a,s)=>a+s.fab,0)));
  chk('метраж всего = сумма', near(multi.len, singles.reduce((a,s)=>a+s.len,0)));
  chk('фурнитура+работа: выезд один раз', near(multi.items, singles.reduce((a,s)=>a+s.items,0) - 2*multi.trip), `${multi.items.toFixed(2)}`);
  chk('себестоимость = ткань + изделия', near(multi.total, multi.fab+multi.items));
  chk('сумма строк = себестоимость', near(multi.lineSum, multi.total));
  chk('цена ткани АЛЬФА группы разная', multi.groups[1].price!==multi.groups[2].price, `${multi.groups[1].price} / ${multi.groups[2].price}`);
  chk('нет ошибок', !multi.problem, multi.problem);
}
// курс: смена курса пересчитывает и ткань комнаты
const r95 = await run(OM,[R.gost,R.det],{exchangeRate:95});
const r100 = await run(OM,[R.gost,R.det],{exchangeRate:100});
chk('курс 95→100: ткань Детской ×100/95', near(r100.groups[1].price, r95.groups[1].price*100/95), `${r95.groups[1].price.toFixed(2)} → ${r100.groups[1].price.toFixed(2)}`);
chk('курс 95→100: ткань Гостиной ×100/95', near(r100.groups[0].price, r95.groups[0].price*100/95));
// PDF: суммы по строкам КП = итоговой цене
await run(OM,[R.gost,R.det,R.spal,R.kuh]);
await p.evaluate(()=>{window.print=()=>{window.__p=1}}); await p.click('#savePdfBtn'); await p.waitForFunction(()=>window.__p===1);
const pdf = await p.evaluate(()=>{ const t=document.getElementById('printArea').innerText; return t; });
const price = await p.evaluate(()=>window.calcData.priceBase);
console.log('\nprice', price);
console.log(pdf.split('\n').filter(l=>/₽|Ткань|ткан|Итого|ИТОГО/.test(l)).slice(0,60).join('\n'));
console.log('errors', errs, ok?'\nALL OK':'\nHAS FAILS');
await b.close();
