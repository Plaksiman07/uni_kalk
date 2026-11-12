import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
let ok=true; const chk=(n,c,x='')=>{console.log((c?'OK  ':'FAIL')+' '+n+' '+x); if(!c) ok=false;};
await p.goto('http://localhost:8765/mesh.html');
await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('meshCalcState1', JSON.stringify({meshType:'standard',meshColor:'white',selectedPrice:'base',rooms:[{name:'К',pk:'a',items:[
 {w:'80',h:'150',qty:'1'},{w:'80',h:'160',qty:'1'},{w:'80',h:'120',qty:'1',t:'antipyl'},{w:'80',h:'120',qty:'2',t:'antikoshka'}]}]})); });
await p.reload();
const r = await p.evaluate(()=>{ calculateTotals(); const d=window.calcData; return { it:d.items.map(i=>({impN:i.cut.impN, mount:i.cut.impMount, make:i.labMake, lab:i.lab})), imp:d.barGroups[0].imp.bars.reduce((a,b)=>a+b.pieces.length,0), conn:componentsList().find(x=>x[0]==='Соединитель импоста')[2] }; });
console.log(JSON.stringify(r));
chk('150 см — 1 импост', r.it[0].impN===1); chk('160 см — 2 импоста', r.it[1].impN===2, r.it[1].mount);
chk('импостов в раскрое 1+2+1+2 = 6', r.imp===6, r.imp); chk('соединителей 12', r.conn===12, r.conn);
chk('стандарт 150', r.it[0].make===150); chk('антипыль 200', r.it[2].make===200); chk('антикошка 200 ×2 + установка', r.it[3].lab===(200+200)*2, r.it[3].lab);
console.log('errors', errs, ok?'ALL OK':'HAS FAILS'); await b.close();
