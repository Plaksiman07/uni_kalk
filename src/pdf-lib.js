    // === Сборка PDF из HTML (общая для калькуляторов и «Общего заказа») ===
    function loadScriptOnce(src) {
      return new Promise((res, rej) => {
        if ([...document.scripts].some(s => s.src === src)) return res();
        const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('нет интернета или CDN недоступен'));
        document.head.appendChild(s);
      });
    }
    function buildPrintAreaSilently() {
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => { window.__onPrintReady = null; reject(new Error('не удалось подготовить заказ-наряд')); }, 20000);
        window.__onPrintReady = () => { clearTimeout(t); resolve(); };
        document.getElementById('savePdfBtn').click();
      });
    }
    // Найти по горизонтали «пустую» строку пикселей, чтобы не резать текст между страницами
    function findCutRow(ctx, w, yEnd, yMin) {
      for (let y = yEnd; y > yMin; y -= 2) {
        const row = ctx.getImageData(0, y, w, 1).data;
        let blank = true;
        for (let i = 0; i < row.length; i += 16) { if (row[i] < 235 || row[i + 1] < 235 || row[i + 2] < 235) { blank = false; break; } }
        if (blank) return y;
      }
      return yEnd;
    }

    // Стили, которые нужны макету заказ-наряда вне режима печати
    function captureCss() {
      let css = '';
      for (const sh of document.styleSheets) {
        try { for (const r of sh.cssRules) if (r.selectorText && /\.pdf-capture/.test(r.selectorText)) css += r.cssText + '\n'; } catch (e) {}
      }
      return css;
    }
    const blobToDataUrl = b => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); });
    async function inlineImages(el) {
      for (const img of el.querySelectorAll('img')) {
        const src = img.getAttribute('src') || '';
        if (!src || src.startsWith('data:')) continue;
        try { img.setAttribute('src', await blobToDataUrl(await (await fetch(src)).blob())); } catch (e) { img.remove(); }
      }
    }
    // Своя отрисовка HTML → canvas через SVG foreignObject (без внешних библиотек)
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    // Свой рендер HTML → canvas через SVG foreignObject (без внешних библиотек)
    async function renderBoxToCanvas(box, scale) {
      const w = Math.ceil(box.scrollWidth), h = Math.ceil(box.scrollHeight);
      // у iPhone предел размера canvas (~16 млн точек): высокие листы рисуем чуть мельче, иначе получится пустая страница
      const sc = Math.min(scale, Math.sqrt(15e6 / Math.max(1, w * h)));
      const clone = box.cloneNode(true);
      await inlineImages(clone);
      clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      const xhtml = new XMLSerializer().serializeToString(clone);
      const style = `<style>${captureCss().replace(/</g, '&lt;')} *{box-sizing:border-box;} </style>`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * sc}" height="${h * sc}" viewBox="0 0 ${w} ${h}"><foreignObject x="0" y="0" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" class="pdf-capture">${style}${xhtml}</div></foreignObject></svg>`;
      const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      const load = () => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('svg render')); im.src = src; });
      let img = await load();
      // Safari/iPhone с первого раза часто не дорисовывает картинки (фото, логотип) — даём время и рисуем повторно
      if (clone.querySelector('img')) { await sleep(400); img = await load(); await sleep(200); }
      const cv = document.createElement('canvas');
      cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      cv.toDataURL('image/jpeg', 0.1);   // проверка: если браузер «запачкал» canvas, здесь будет ошибка
      return cv;
    }
    // Запасной путь — библиотека html2canvas с CDN (для браузеров, где foreignObject не рисуется)
    async function renderBoxWithLib(box, scale) {
      if (!window.html2canvas) await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      const sc = Math.min(scale, Math.sqrt(15e6 / Math.max(1, box.scrollWidth * box.scrollHeight)));
      return window.html2canvas(box, { scale: sc, backgroundColor: '#ffffff', logging: false, useCORS: true });
    }

    // Минимальный PDF из JPEG-картинок: одна картинка на страницу A4 (книжная или альбомная)
    function buildJpegPdf(pages) {
      const enc = new TextEncoder();
      const chunks = []; let len = 0; const offs = [];
      const push = x => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); len += b.length; };
      const obj = (id, body) => { offs[id] = len; push(`${id} 0 obj\n`); body(); push('\nendobj\n'); };
      const pt = mm => (mm * 72 / 25.4);
      const n = pages.length;
      const pageId = i => 3 + i * 3, contId = i => 4 + i * 3, imgId = i => 5 + i * 3;
      push('%PDF-1.4\n');
      obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
      obj(2, () => push(`<< /Type /Pages /Count ${n} /Kids [${pages.map((_, i) => pageId(i) + ' 0 R').join(' ')}] >>`));
      pages.forEach((pg, i) => {
        const PW = pt(pg.land ? 297 : 210), PH = pt(pg.land ? 210 : 297);
        obj(pageId(i), () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW.toFixed(2)} ${PH.toFixed(2)}] /Resources << /XObject << /Im0 ${imgId(i)} 0 R >> >> /Contents ${contId(i)} 0 R >>`));
        const iw = pt(pg.wMm), ih = pt(pg.hMm), x = pt(10), y = PH - pt(10) - ih;
        const cs = `q ${iw.toFixed(2)} 0 0 ${ih.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`;
        obj(contId(i), () => { push(`<< /Length ${cs.length} >>\nstream\n`); push(cs); push('\nendstream'); });
        obj(imgId(i), () => {
          push(`<< /Type /XObject /Subtype /Image /Width ${pg.pxW} /Height ${pg.pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpeg.length} >>\nstream\n`);
          push(pg.jpeg); push('\nendstream');
        });
      });
      const total = 3 + n * 3, xref = len;
      let xr = `xref\n0 ${total}\n0000000000 65535 f \n`;
      for (let id = 1; id < total; id++) xr += String(offs[id]).padStart(10, '0') + ' 00000 n \n';
      push(xr + `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
      return new Blob(chunks, { type: 'application/pdf' });
    }
    const dataUrlToBytes = du => { const b = atob(du.split(',')[1]); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

    async function printAreaToPdfBlob(filter) {
      const root = document.getElementById('printArea').firstElementChild;
      const host = document.createElement('div');
      host.className = 'pdf-capture';
      host.style.cssText = 'position:fixed; left:-20000px; top:0; background:#fff;';
      document.body.appendChild(host);
      const pages = [];
      let useLib = false;
      const SCALE = 2;
      try {
        for (const sec of [...root.children].filter(x => !filter || filter(x))) {
          if (!sec.innerHTML.trim()) continue;
          const land = sec.classList.contains('print-landscape');
          const W = land ? 277 : 190, H = land ? 190 : 277;
          host.innerHTML = '';
          const box = document.createElement('div');
          box.style.cssText = `width:${W}mm; background:#fff; font-family:Arial, sans-serif; color:#2c3e50; line-height:1.4; padding:0; margin:0;`;
          box.appendChild(sec.cloneNode(true));
          host.appendChild(box);
          await Promise.all([...box.querySelectorAll('img')].map(i => i.decode ? i.decode().catch(() => {}) : 0));
          let canvas;
          if (!useLib) {
            try { canvas = await renderBoxToCanvas(box, SCALE); }
            catch (e) { useLib = true; }
          }
          if (useLib) canvas = await renderBoxWithLib(box, SCALE);
          const ctx = canvas.getContext('2d');
          const pxPerMm = canvas.width / W, pageH = Math.floor(H * pxPerMm);
          let y = 0;
          while (y < canvas.height - 3 * pxPerMm) {
            let end = Math.min(canvas.height, y + pageH);
            if (end < canvas.height) end = findCutRow(ctx, canvas.width, end, y + pageH * 0.7);
            const part = document.createElement('canvas');
            part.width = canvas.width; part.height = end - y;
            const pctx = part.getContext('2d');
            pctx.fillStyle = '#fff'; pctx.fillRect(0, 0, part.width, part.height);
            pctx.drawImage(canvas, 0, y, canvas.width, end - y, 0, 0, canvas.width, end - y);
            pages.push({ land, jpeg: dataUrlToBytes(part.toDataURL('image/jpeg', 0.8)), pxW: part.width, pxH: part.height, wMm: W, hMm: (end - y) / pxPerMm });
            y = end;
          }
        }
      } finally { host.remove(); }
      if (!pages.length) throw new Error('пустой заказ-наряд');
      return buildJpegPdf(pages);
    }

