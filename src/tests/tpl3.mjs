import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/plisse.html'); await p.evaluate(()=>localStorage.clear()); await p.reload();
const out={};
for (const [w,h] of [[90,120],[60,200],[150,230]]) for (const col of ['white','brown','anthracite']) {
  await p.evaluate(([st])=>{ localStorage.setItem('plisseCalcState1', JSON.stringify(st)); }, [{orderNumber:'1',meshColor:col,selectedPrice:'base',rooms:[{name:'К',pk:'a',items:[{w:String(w),h:String(h),qty:'1'}]}]}]);
  await p.reload();
  out[`${w}x${h} ${col}`] = await p.evaluate(()=>{ const d=window.calcData; return {prof:d.costProfile, cloth:d.costCloth, parts:d.costParts, labor:d.costLabor, total:d.costTotal, price:d.priceBase}; });
}
console.log(JSON.stringify(out)); console.log('errors', errs); await b.close();
