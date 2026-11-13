/**
 * SunProtection → amoCRM: посредник (Cloudflare Worker)
 *
 * Хранит токен amoCRM у себя, калькулятор его не видит.
 * Принимает от калькулятора данные заказа и PDF и создаёт в amoCRM сделку с контактом,
 * примечанием и прикреплённым файлом.
 *
 * Переменные (Cloudflare → Worker → Settings → Variables and Secrets):
 *   AMO_DOMAIN       — адрес вашей amoCRM без https://, например  sunprotection.amocrm.ru
 *   AMO_TOKEN        — долгосрочный токен интеграции amoCRM            (тип Secret)
 *   APP_KEY          — любой придуманный пароль; его же вводите в калькуляторе   (тип Secret)
 *   ALLOWED_ORIGINS  — адрес калькулятора, например  https://plaksiman07.github.io
 *   RESPONSIBLE_ID   — (необязательно) ID ответственного пользователя
 *
 * /orders — текущие заказы (только чтение): сделки этапов «Изготовление», «Готов к установке», «На установку».
 * /state-save, /state-get — данные заказа из калькулятора (для корректировки из «Текущих заказов»).
 * /move — сменить этап сделки («Изготовление», «Готов к установке», «На установку») или закрыть «Успешно реализовано».
 * /docs, /doc — список файлов сделки и сам файл (PDF КП, заказ-наряда, наклеек) — открыть в приложении.
 * /finance, /fin-op, /fin-op-del — «Финансы»: закрытые («Успешно реализовано») сделки + деньги заказа из калькулятора,
 *   ручные операции касс (расходы, выплаты зарплаты, корректировки).
 * /stock, /stock-op — «Склад»: остатки материалов (москитные сетки, рулонные шторы, сетки плиссе), приход, корректировка.
 *   Расход заказа калькулятор присылает при отправке (/state-save → use:<сделка>); списывается один раз,
 *   когда заказ переходит в «Готов к установке» (или дальше) — из приложения или прямо в amoCRM.
 * /doc-save — копия PDF в хранилище приложения (KV) при отправке заказа: «Документы» открываются оттуда,
 *   amoCRM — резерв (из него берутся файлы только старых сделок).
 *   Хранятся в Cloudflare KV (привязка SP_ORDERS, создаётся автоматически из wrangler.jsonc).
 *
 * Воронку и этап калькулятор передаёт по названию («Москитные сетки» / «Изготовление»),
 * поля сделки — по названию («Адрес», «Материал», «Цвет», «Изделие 1»…). Посредник сам находит их номера.
 */

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
    const originOk = !allowed.length || allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': originOk ? (origin || '*') : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-App-Key, X-File-Name',
      'Access-Control-Expose-Headers': 'X-File-Name, Content-Disposition',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });

    // Версия посредника (без ключа, ничего не раскрывает) — чтобы проверить обновление
    if (new URL(request.url).pathname === '/version') return json({ worker_version: 8 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!originOk) return json({ error: 'Запрос не с адреса калькулятора (ALLOWED_ORIGINS)' }, 403);
    if (request.method !== 'POST') return json({ error: 'Только POST' }, 405);
    if (!env.APP_KEY || request.headers.get('X-App-Key') !== env.APP_KEY) return json({ error: 'Неверный ключ доступа' }, 401);
    if (!env.AMO_DOMAIN || !env.AMO_TOKEN) return json({ error: 'В посреднике не заданы AMO_DOMAIN или AMO_TOKEN' }, 500);

    const domain = String(env.AMO_DOMAIN).replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const base = `https://${domain}`;
    const auth = { Authorization: `Bearer ${env.AMO_TOKEN}` };

    async function amo(path, method = 'GET', body) {
      const r = await fetch(path.startsWith('http') ? path : base + path, {
        method,
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const text = await r.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text }; }
      if (!r.ok) {
        const hint = r.status === 401 ? ' (проверьте AMO_TOKEN — токен неверный или истёк)' : '';
        throw new Error(`amoCRM ответил ${r.status}${hint}: ${text.slice(0, 400)}`);
      }
      return data;
    }

    const norm = v => String(v || '').trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
    // «Мягкое» сравнение названий: латинские буквы-двойники → русские, без пробелов и знаков
    const LAT = { a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у' };
    const soft = v => norm(v).replace(/[abcehkmoptxy]/g, ch => LAT[ch]).replace(/[^0-9a-zа-я]/g, '');
    const sameName = (a, b) => norm(a) === norm(b) || soft(a) === soft(b);

    // Воронка и этап по названию
    async function findStatus(pipelineName, statusName) {
      if (!pipelineName) return {};
      const data = await amo('/api/v4/leads/pipelines');
      const pipes = (data._embedded && data._embedded.pipelines) || [];
      const pipe = pipes.find(p => String(p.id) === String(pipelineName)) || pipes.find(p => sameName(p.name, pipelineName));
      if (!pipe) throw new Error(`В amoCRM нет воронки «${pipelineName}». Посредник видит воронки: ${pipes.map(p => `«${p.name}» (id ${p.id})`).join(', ') || 'ни одной'}`);
      const sts = (pipe._embedded && pipe._embedded.statuses) || [];
      let st = statusName ? sts.find(s => sameName(s.name, statusName)) : null;
      let fallback = false;
      if (statusName && !st) {
        // нет такого этапа — ставим в первый рабочий (не «Неразобранное», не «Успешно/Закрыто»)
        st = sts.filter(s => s.type !== 1 && s.id !== 142 && s.id !== 143).sort((a, b) => (a.sort || 0) - (b.sort || 0))[0];
        if (!st) throw new Error(`В воронке «${pipe.name}» нет этапа «${statusName}». Этапы: ${sts.map(s => `«${s.name}»`).join(', ')}`);
        fallback = true;
      }
      return { pipeline_id: pipe.id, status_id: st ? st.id : undefined, status_name: st ? st.name : '', pipeline_name: pipe.name, status_fallback: fallback };
    }

    // Поля сделки по названию → custom_fields_values
    async function buildFields(fields) {
      const names = Object.keys(fields || {}).filter(k => fields[k] !== undefined && fields[k] !== null && String(fields[k]) !== '');
      if (!names.length) return { values: [], missing: [] };
      let all = [];
      for (let page = 1; page <= 5; page++) {
        const d = await amo(`/api/v4/leads/custom_fields?limit=250&page=${page}`);
        const list = (d._embedded && d._embedded.custom_fields) || [];
        all = all.concat(list);
        if (list.length < 250) break;
      }
      const values = [], missing = [];
      for (const name of names) {
        const f = all.find(x => norm(x.name) === norm(name));
        if (!f) { missing.push(name); continue; }
        const val = String(fields[name]);
        if (f.type === 'select' || f.type === 'radiobutton' || f.type === 'multiselect') {
          const en = (f.enums || []).find(e => norm(e.value) === norm(val));
          if (en) values.push({ field_id: f.id, values: [{ enum_id: en.id }] });
          else missing.push(`${name} (нет варианта «${val}»)`);
        } else if (['text', 'textarea', 'streetaddress'].includes(f.type)) {
          values.push({ field_id: f.id, values: [{ value: val.slice(0, 250) }] });
        } else {
          missing.push(`${name} (тип поля ${f.type})`);
        }
      }
      return { values, missing };
    }

    // Существующий контакт по телефону (последние 10 цифр)
    async function findContactByPhone(phone) {
      const digits = String(phone || '').replace(/\D/g, '');
      if (digits.length < 10) return 0;
      const tail = digits.slice(-10);
      const r = await fetch(`${base}/api/v4/contacts?query=${tail}&limit=10`, { headers: auth });
      if (r.status === 204 || !r.ok) return 0;
      const d = await r.json().catch(() => ({}));
      const list = (d._embedded && d._embedded.contacts) || [];
      const hit = list.find(c => (c.custom_fields_values || []).some(f => f.field_code === 'PHONE' &&
        (f.values || []).some(v => String(v.value || '').replace(/\D/g, '').endsWith(tail))));
      return hit ? hit.id : 0;
    }

    const url = new URL(request.url);
    try {
      // Проверка связи
      if (url.pathname === '/ping') {
        const acc = await amo('/api/v4/account');
        return json({ ok: true, account: acc.name || domain, worker_version: 8 });
      }

      // Создать сделку (или обновить существующую) + примечание
      if (url.pathname === '/lead') {
        const d = await request.json();
        const price = Math.max(0, Math.round(Number(d.price) || 0));
        let leadId = Number(d.lead_id) || 0;
        let created = false;

        const fieldsRes = await buildFields(d.fields);
        if (leadId) {
          // корректировка: сумма, название, поля, теги (добавляются к уже стоящим), контакт
          const cur = await amo(`/api/v4/leads/${leadId}?with=contacts`);
          const upd = { price };
          if (d.title) upd.name = String(d.title).slice(0, 250);
          if (fieldsRes.values.length) upd.custom_fields_values = fieldsRes.values;
          if (Array.isArray(d.tags) && d.tags.length) {
            const have = ((cur._embedded && cur._embedded.tags) || []).map(t => t.name);
            const autoQty = /^\d+ шт$/;   // старый тег «N шт» заменяется новым
            const keep = have.filter(t => !(autoQty.test(t) && d.tags.some(x => autoQty.test(x))));
            upd._embedded = { tags: [...new Set([...keep, ...d.tags.filter(Boolean).map(String)])].map(name => ({ name })) };
          }
          await amo(`/api/v4/leads/${leadId}`, 'PATCH', upd);
          const c = d.contact || {};
          const main = ((cur._embedded && cur._embedded.contacts) || []).find(x => x.is_main) || ((cur._embedded && cur._embedded.contacts) || [])[0];
          if (main && (c.name || c.phone)) {
            const cu = {};
            if (c.name) cu.name = String(c.name).slice(0, 250);
            if (c.phone) cu.custom_fields_values = [{ field_code: 'PHONE', values: [{ value: String(c.phone), enum_code: 'WORK' }] }];
            try { await amo(`/api/v4/contacts/${main.id}`, 'PATCH', cu); } catch (e) {}
          } else if (!main && (c.name || c.phone)) {
            const existing = await findContactByPhone(c.phone);
            let cid = existing;
            if (!cid) {
              const contact = { first_name: String(c.name || 'Клиент').slice(0, 250) };
              if (c.phone) contact.custom_fields_values = [{ field_code: 'PHONE', values: [{ value: String(c.phone), enum_code: 'WORK' }] }];
              const cr = await amo('/api/v4/contacts', 'POST', [contact]);
              cid = cr._embedded && cr._embedded.contacts && cr._embedded.contacts[0] ? cr._embedded.contacts[0].id : 0;
            }
            if (cid) try { await amo(`/api/v4/leads/${leadId}/link`, 'POST', [{ to_entity_id: cid, to_entity_type: 'contacts' }]); } catch (e) {}
          }
        } else {
          const lead = { name: String(d.title || 'Заказ из калькулятора').slice(0, 250), price, _embedded: {} };
          const ps = await findStatus(d.pipeline, d.status);
          lead.pipeline_id = ps.pipeline_id; if (ps.status_id) lead.status_id = ps.status_id;
          d.__ps = ps;
          if (Number(env.RESPONSIBLE_ID)) lead.responsible_user_id = Number(env.RESPONSIBLE_ID);
          if (fieldsRes.values.length) lead.custom_fields_values = fieldsRes.values;
          if (Array.isArray(d.tags) && d.tags.length) lead._embedded.tags = d.tags.filter(Boolean).map(name => ({ name: String(name) }));
          const c = d.contact || {};
          const existing = await findContactByPhone(c.phone);
          if (existing) lead._embedded.contacts = [{ id: existing }];
          else if (c.name || c.phone) {
            const contact = { first_name: String(c.name || 'Клиент').slice(0, 250) };
            if (c.phone) contact.custom_fields_values = [{ field_code: 'PHONE', values: [{ value: String(c.phone), enum_code: 'WORK' }] }];
            lead._embedded.contacts = [contact];
          }
          const res = await amo('/api/v4/leads/complex', 'POST', [lead]);
          leadId = Array.isArray(res) && res[0] ? res[0].id : 0;
          if (!leadId) throw new Error('amoCRM не вернул номер сделки: ' + JSON.stringify(res).slice(0, 300));
          created = true;
          d.__contactExisting = !!existing;
        }
        if (d.note) {
          await amo(`/api/v4/leads/${leadId}/notes`, 'POST', [{ note_type: 'common', params: { text: String(d.note).slice(0, 15000) } }]);
        }
        const ps = d.__ps || {};
        return json({ ok: true, lead_id: leadId, created, contact_existing: !!d.__contactExisting, missing_fields: fieldsRes.missing, url: `${base}/leads/detail/${leadId}`,
          pipeline_name: ps.pipeline_name, status_name: ps.status_name, status_fallback: !!ps.status_fallback, worker_version: 8 });
      }

      // Сменить этап сделки / закрыть «Успешно реализовано»
      // === Склад: один документ «stock» { items: { id: позиция }, log: [последние операции] } ===
      const STOCK_SECS = ['mesh', 'roll', 'plisse'];
      const READY_STAGES = ['Готов к установке', 'На установку'];
      const r2 = v => Math.round((Number(v) || 0) * 1000) / 1000;
      const stockKey = (sec, name, unit) => `${sec}|${String(name).trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ')}|${String(unit).trim()}`;
      async function stockGet() { const t = env.SP_ORDERS ? await env.SP_ORDERS.get('stock') : null; const d = t ? JSON.parse(t) : {}; d.items = d.items || {}; d.log = d.log || []; return d; }
      async function stockPut(d) { d.log = d.log.slice(-600); d.at = Date.now(); await env.SP_ORDERS.put('stock', JSON.stringify(d)); }
      const stockLog = (d, e) => d.log.push(Object.assign({ d: Math.floor(Date.now() / 1000) }, e));
      function stockEnsure(d, sec, name, unit) {
        const id = stockKey(sec, name, unit);
        if (!d.items[id]) d.items[id] = { s: sec, n: String(name).trim().slice(0, 120), u: String(unit).trim().slice(0, 12), q: 0, m: 0, p: 0 };
        return id;
      }
      // списать расход заказа (один раз)
      async function stockUse(leadId, d) {
        const raw = JSON.parse((await env.SP_ORDERS.get('use:' + leadId)) || 'null');
        if (!raw || raw.done) return null;
        const doc = d || await stockGet(), used = [];
        for (const l of raw.lines || []) {
          if (!STOCK_SECS.includes(l.s) || !(Number(l.q) > 0)) continue;
          const id = stockEnsure(doc, l.s, l.n, l.u);
          doc.items[id].q = r2(doc.items[id].q - Number(l.q));
          stockLog(doc, { t: 'use', i: id, q: -r2(l.q), l: leadId, n: raw.t || '' });
          used.push(id);
        }
        raw.done = Math.floor(Date.now() / 1000);
        await env.SP_ORDERS.put('use:' + leadId, JSON.stringify(raw), { metadata: { done: 1, t: raw.t || '' } });
        if (!d) await stockPut(doc);
        return used.length;
      }

      if (url.pathname === '/stock' || url.pathname === '/stock-op') {
        if (!env.SP_ORDERS) return json({ error: 'В посреднике не подключено хранилище (KV «SP_ORDERS»)', no_store: true }, 501);
        const d = await request.json().catch(() => ({}));
        const doc = await stockGet();
        let applied = 0;
        if (url.pathname === '/stock-op') {
          const o = d.op || {}, id = String(o.i || ''), it = doc.items[id];
          if (o.type === 'item') {   // новая позиция или настройки позиции
            if (it) { if (o.m !== undefined) it.m = Math.max(0, r2(o.m)); if (o.h !== undefined) it.h = o.h ? 1 : 0; if (o.p !== undefined) it.p = Math.max(0, r2(o.p)); }
            else {
              if (!STOCK_SECS.includes(o.s) || !String(o.n || '').trim() || !String(o.u || '').trim()) return json({ error: 'Укажите раздел, название и единицу' }, 400);
              const nid = stockEnsure(doc, o.s, o.n, o.u);
              const ni = doc.items[nid]; ni.m = Math.max(0, r2(o.m)); ni.q = r2(o.q); ni.p = Math.max(0, r2(o.p)); ni.h = 0;
              stockLog(doc, { t: 'new', i: nid, q: ni.q, p: ni.p });
            }
          } else if (o.type === 'seed') {   // заполнить позиции из калькуляторов (существующие не трогаем)
            let n = 0; (o.list || []).slice(0, 400).forEach(x => { if (STOCK_SECS.includes(x.s) && x.n && x.u && !doc.items[stockKey(x.s, x.n, x.u)]) { stockEnsure(doc, x.s, x.n, x.u); n++; } });
            applied = n;
          } else {
            if (!it) return json({ error: 'Нет такой позиции' }, 404);
            const q = r2(o.q);
            if (o.type === 'in') {   // приход: остаток растёт, цена — средняя
              if (!(q > 0)) return json({ error: 'Укажите количество прихода' }, 400);
              const p = Math.max(0, r2(o.p)), had = Math.max(0, it.q);
              if (p > 0) it.p = r2(had + q > 0 ? (had * (it.p || 0) + q * p) / (had + q) : p);
              it.q = r2(it.q + q);
              stockLog(doc, { t: 'in', i: id, q, p, n: String(o.n || '').slice(0, 200) });
            } else if (o.type === 'fix') {   // корректировка: фактический остаток
              const was = it.q; it.q = q;
              stockLog(doc, { t: 'fix', i: id, q: r2(q - was), v: q, n: String(o.n || '').slice(0, 200) });
            } else if (o.type === 'del') {
              delete doc.items[id];
              stockLog(doc, { t: 'del', i: id, n: it.n });
            } else return json({ error: 'Неверная операция' }, 400);
          }
          await stockPut(doc);
          return json({ ok: true, items: doc.items, log: doc.log, applied, worker_version: 8 });
        }
        // список: заодно списать заказы, которые уже «Готов к установке» (в том числе переведённые прямо в amoCRM)
        try {
          const pend = []; let cursor;
          do { const r = await env.SP_ORDERS.list({ prefix: 'use:', cursor }); r.keys.forEach(k => { if (!(k.metadata && k.metadata.done)) pend.push(Number(k.name.slice(4))); }); cursor = r.list_complete ? null : r.cursor; } while (cursor);
          if (pend.length) {
            const pd = await amo('/api/v4/leads/pipelines');
            const stName = {}; ((pd._embedded && pd._embedded.pipelines) || []).forEach(p => ((p._embedded && p._embedded.statuses) || []).forEach(x => { stName[x.id] = x.name; }));
            for (let i = 0; i < pend.length; i += 40) {
              const r = await fetch(`${base}/api/v4/leads?limit=250&${pend.slice(i, i + 40).map(id => `filter[id][]=${id}`).join('&')}`, { headers: auth });
              if (!r.ok || r.status === 204) continue;
              for (const l of (((await r.json())._embedded || {}).leads || [])) {
                if (l.status_id === 142 || READY_STAGES.some(n => sameName(stName[l.status_id] || '', n))) { if (await stockUse(l.id, doc)) applied++; }
              }
            }
            if (applied) await stockPut(doc);
          }
        } catch (e) {}
        return json({ ok: true, items: doc.items, log: doc.log, applied, worker_version: 8 });
      }

      if (url.pathname === '/move') {
        const d = await request.json().catch(() => ({}));
        const leadId = Number(d.lead_id) || 0, to = String(d.to || '');
        if (!leadId || !to) return json({ error: 'Не указаны сделка или этап' }, 400);
        const lead = await amo(`/api/v4/leads/${leadId}`);
        const pd = await amo('/api/v4/leads/pipelines');
        const pipe = ((pd._embedded && pd._embedded.pipelines) || []).find(p => p.id === lead.pipeline_id);
        if (!pipe) return json({ error: 'Не нашлась воронка сделки' }, 404);
        const sts = (pipe._embedded && pipe._embedded.statuses) || [];
        const st = to === 'won' ? (sts.find(x => x.id === 142) || { id: 142, name: 'Успешно реализовано' }) : sts.find(x => sameName(x.name, to));
        if (!st) return json({ error: `В воронке «${pipe.name}» нет этапа «${to}». Этапы: ${sts.filter(x => x.id !== 142 && x.id !== 143).map(x => `«${x.name}»`).join(', ')}` }, 404);
        if (lead.status_id !== st.id) await amo(`/api/v4/leads/${leadId}`, 'PATCH', { status_id: st.id, pipeline_id: pipe.id });
        // «Готов к установке» и дальше — списать материалы заказа со склада
        let stock = null;
        if (env.SP_ORDERS && (st.id === 142 || READY_STAGES.some(n => sameName(st.name, n)))) { try { stock = await stockUse(leadId); } catch (e) {} }
        return json({ ok: true, lead_id: leadId, status_id: st.id, status_name: st.name, won: st.id === 142, stock_used: stock });
      }

      // Копия PDF в приложении (KV): doc:<сделка>:<kp|order|labels> — новая версия заменяет старую
      if (url.pathname === '/doc-save') {
        if (!env.SP_ORDERS) return json({ error: 'В посреднике не подключено хранилище заказов (KV «SP_ORDERS»)', no_store: true }, 501);
        const leadId = Number(url.searchParams.get('lead_id')) || 0, kind = String(url.searchParams.get('kind') || '');
        if (!leadId || !/^[a-z]{2,12}$/.test(kind)) return json({ error: 'Не указаны сделка или вид документа' }, 400);
        let name = 'zakaz.pdf'; try { name = decodeURIComponent(request.headers.get('X-File-Name') || name); } catch (e) {}
        const bytes = await request.arrayBuffer();
        if (!bytes.byteLength) return json({ error: 'Пустой файл' }, 400);
        if (bytes.byteLength > 24 * 1024 * 1024) return json({ error: 'Файл больше 24 МБ' }, 413);
        await env.SP_ORDERS.put(`doc:${leadId}:${kind}`, bytes, { expirationTtl: 400 * 86400,
          metadata: { name: name.slice(0, 200), size: bytes.byteLength, at: Math.floor(Date.now() / 1000), type: request.headers.get('Content-Type') || 'application/pdf' } });
        return json({ ok: true, size: bytes.byteLength });
      }

      // Файлы сделки: список (/docs) и содержимое (/doc) — сначала копии приложения, для старых сделок — файлы amoCRM
      if (url.pathname === '/docs' || url.pathname === '/doc') {
        const d = await request.json().catch(() => ({}));
        const leadId = Number(d.lead_id) || 0;
        if (!leadId) return json({ error: 'Не указан lead_id' }, 400);
        const ORDER = { kp: 0, order: 1, labels: 2 };
        if (url.pathname === '/docs' && env.SP_ORDERS) {
          const r = await env.SP_ORDERS.list({ prefix: `doc:${leadId}:` });
          const files = r.keys.map(k => { const kind = k.name.split(':')[2], m = k.metadata || {};
            return { uuid: 'app:' + kind, kind, name: m.name || 'файл.pdf', size: Number(m.size) || 0, type: m.type || 'application/pdf', created_at: Number(m.at) || 0, source: 'app' }; })
            .sort((a, b) => (ORDER[a.kind] ?? 9) - (ORDER[b.kind] ?? 9));
          if (files.length) return json({ ok: true, source: 'app', files });
        }
        if (url.pathname === '/doc' && /^app:[a-z]{2,12}$/.test(String(d.uuid || ''))) {
          if (!env.SP_ORDERS) return json({ error: 'Хранилище приложения не подключено' }, 501);
          const r = await env.SP_ORDERS.getWithMetadata(`doc:${leadId}:${String(d.uuid).slice(4)}`, { type: 'stream' });
          if (!r || !r.value) return json({ error: 'Копия документа в приложении не найдена' }, 404);
          const m = r.metadata || {}, name = m.name || 'file.pdf';
          return new Response(r.value, { status: 200, headers: { ...cors, 'Content-Type': m.type || 'application/pdf',
            'X-File-Name': encodeURIComponent(name), 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(name)}`, 'Cache-Control': 'no-store' } });
        }
        const acc = await amo('/api/v4/account?with=drive_url');
        if (!acc.drive_url) throw new Error('amoCRM не вернул адрес файлового хранилища (drive_url)');
        const version = async uuid => {
          const v = await amo(`${acc.drive_url}/v1.0/files/${uuid}/versions`);
          const list = (v._embedded && v._embedded.versions) || [];
          return list.find(x => x.is_main) || list[0] || null;
        };
        if (url.pathname === '/docs') {
          const f = await amo(`/api/v4/leads/${leadId}/files?limit=50`).catch(() => ({}));
          const uuids = [...new Set(((f._embedded && f._embedded.files) || []).map(x => x.file_uuid).filter(Boolean))];
          const files = (await Promise.all(uuids.map(async uuid => {
            try { const x = await version(uuid); if (!x) return null;
              return { uuid, name: x.name || 'файл', size: Number(x.size) || 0, type: (x.metadata && (x.metadata.mime_type || x.metadata.content_type)) || '', ext: (x.metadata && x.metadata.extension) || '', created_at: Number(x.created_at) || 0 };
            } catch (e) { return null; }
          }))).filter(Boolean).sort((a, b) => b.created_at - a.created_at);
          return json({ ok: true, source: 'amo', files });
        }
        const uuid = String(d.uuid || '');
        if (!/^[0-9a-f-]{8,64}$/i.test(uuid)) return json({ error: 'Неверный файл' }, 400);
        const x = await version(uuid);
        const href = x && x._links && x._links.download && x._links.download.href;
        if (!href) return json({ error: 'amoCRM не дал ссылку на скачивание файла' }, 404);
        let r = await fetch(href, { headers: auth });
        if (r.status === 401 || r.status === 403) r = await fetch(href);
        if (!r.ok) return json({ error: `Скачивание файла: amoCRM ответил ${r.status}` }, 502);
        const name = x.name || 'file.pdf';
        return new Response(r.body, { status: 200, headers: { ...cors, 'Content-Type': (x.metadata && x.metadata.mime_type) || r.headers.get('Content-Type') || 'application/pdf',
          'X-File-Name': encodeURIComponent(name), 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(name)}`, 'Cache-Control': 'no-store' } });
      }

      // «Финансы»
      if (url.pathname === '/finance' || url.pathname === '/fin-op' || url.pathname === '/fin-op-del') {
        if (!env.SP_ORDERS) return json({ error: 'В посреднике не подключено хранилище (KV «SP_ORDERS»)', no_store: true }, 501);
        const d = await request.json().catch(() => ({}));
        const kvAll = async prefix => { const out = []; let cursor; do { const r = await env.SP_ORDERS.list({ prefix, cursor }); out.push(...r.keys); cursor = r.list_complete ? null : r.cursor; } while (cursor); return out; };
        if (url.pathname === '/fin-op') {
          const o = d.op || {}, amount = Math.round((Number(o.amount) || 0) * 100) / 100;
          const TYPES = ['expense', 'salary', 'master', 'kassa_in', 'zp_in', 'kassa_fix', 'zp_fix', 'start', 'cfg'];
          if (!TYPES.includes(o.type) || (!amount && !/_fix$/.test(o.type))) return json({ error: 'Неверная операция' }, 400);
          const date = Number(o.date) || Math.floor(Date.now() / 1000);
          const id = `op:${String(date).padStart(11, '0')}:${Math.random().toString(36).slice(2, 8)}`;
          const meta = { type: o.type, a: amount, n: String(o.note || '').slice(0, 300), d: date };
          await env.SP_ORDERS.put(id, JSON.stringify(meta), { metadata: meta });
          return json({ ok: true, id, op: meta });
        }
        if (url.pathname === '/fin-op-del') {
          const id = String(d.id || ''); if (!/^op:\d{11}:[a-z0-9]+$/.test(id)) return json({ error: 'Неверная операция' }, 400);
          await env.SP_ORDERS.delete(id); return json({ ok: true });
        }
        // закрытые сделки (статус 142) в рабочих воронках
        const pd = await amo('/api/v4/leads/pipelines');
        const pipes = ((pd._embedded && pd._embedded.pipelines) || []).filter(p => ['Солнцезащитные системы', 'Москитные сетки'].some(n => sameName(p.name, n)));
        const fq = pipes.map((p, i) => `filter[statuses][${i}][pipeline_id]=${p.id}&filter[statuses][${i}][status_id]=142`).join('&');
        const won = [];
        if (fq) for (let page = 1; page <= 8; page++) {
          const r = await fetch(`${base}/api/v4/leads?limit=250&page=${page}&order[updated_at]=desc&${fq}`, { headers: auth });
          if (r.status === 204) break;
          if (!r.ok) throw new Error(`amoCRM ответил ${r.status}: ${(await r.text()).slice(0, 300)}`);
          const list = ((await r.json())._embedded || {}).leads || [];
          won.push(...list); if (list.length < 250) break;
        }
        const fins = {}; (await kvAll('fin:')).forEach(k => { fins[Number(k.name.slice(4))] = k.metadata || null; });
        const pname = {}; pipes.forEach(p => { pname[p.id] = p.name; });
        const orders = won.map(l => ({ id: l.id, name: l.name || '', price: Number(l.price) || 0, closed_at: Number(l.closed_at) || Number(l.updated_at) || 0, pipeline: pname[l.pipeline_id] || '', fin: fins[l.id] || null, url: `${base}/leads/detail/${l.id}` }));
        const ops = (await kvAll('op:')).map(k => ({ id: k.name, ...(k.metadata || {}) }));
        return json({ ok: true, updated: Date.now(), orders, ops, worker_version: 8 });
      }

      // Данные заказа калькулятора — для корректировки из «Текущих заказов» (Cloudflare KV)
      if (url.pathname === '/state-save' || url.pathname === '/state-get') {
        if (!env.SP_ORDERS) return json({ error: 'В посреднике не подключено хранилище заказов (KV «SP_ORDERS»)', no_store: true }, 501);
        const d = await request.json().catch(() => ({}));
        const leadId = Number(d.lead_id) || 0;
        if (!leadId) return json({ error: 'Не указан lead_id' }, 400);
        if (url.pathname === '/state-save') {
          const text = JSON.stringify(d.state || null);
          if (text.length > 24 * 1024 * 1024) return json({ error: 'Слишком большой заказ (фото) — сохранено не будет' }, 413);
          await env.SP_ORDERS.put('lead:' + leadId, text, { metadata: { at: Date.now(), size: text.length } });
          // расход материалов — для «Склада» (списывается при «Готов к установке»; после списания не меняется)
          if (Array.isArray(d.use)) {
            const old = JSON.parse((await env.SP_ORDERS.get('use:' + leadId)) || 'null');
            if (!old || !old.done) {
              const lines = d.use.filter(l => l && STOCK_SECS.includes(l.s) && l.n && l.u && Number(l.q) > 0).slice(0, 300).map(l => ({ s: l.s, n: String(l.n).slice(0, 120), u: String(l.u).slice(0, 12), q: r2(l.q) }));
              const t = d.fin && d.fin.t ? String(d.fin.t).slice(0, 80) : '';
              await env.SP_ORDERS.put('use:' + leadId, JSON.stringify({ lines, t, at: Date.now() }), { metadata: { done: 0, t } });
              // новые позиции появляются на складе сразу (с нулём), чтобы их можно было заполнить
              if (lines.length) { const doc = await stockGet(); const before = Object.keys(doc.items).length; lines.forEach(l => stockEnsure(doc, l.s, l.n, l.u)); if (Object.keys(doc.items).length !== before) await stockPut(doc); }
            }
          }
          // деньги заказа для «Финансов» (в метаданных — чтобы список читался одним запросом)
          if (d.fin && typeof d.fin === 'object') {
            const f = d.fin, n = v => Math.round(Number(v) || 0);
            const meta = { t: String(f.t || '').slice(0, 80), g: n(f.g), p: n(f.p), sv: n(f.sv), lm: n(f.lm), li: n(f.li), om: f.om ? 1 : 0, oi: f.oi ? 1 : 0, at: n(f.at) || Math.floor(Date.now() / 1000) };
            await env.SP_ORDERS.put('fin:' + leadId, JSON.stringify(meta), { metadata: meta });
          }
          return json({ ok: true, size: text.length });
        }
        const text = await env.SP_ORDERS.get('lead:' + leadId);
        if (!text) return json({ error: 'Для этой сделки нет данных калькулятора — она отправлена до появления корректировки или из отдельного калькулятора', missing: true }, 404);
        return json({ ok: true, state: JSON.parse(text) });
      }

      // Загрузить файл (тело запроса — сам файл) и прикрепить к сделке
      if (url.pathname === '/file') {
        const leadId = Number(url.searchParams.get('lead_id')) || 0;
        if (!leadId) return json({ error: 'Не указан lead_id' }, 400);
        let name = 'zakaz.pdf';
        try { name = decodeURIComponent(request.headers.get('X-File-Name') || name); } catch (e) {}
        const type = request.headers.get('Content-Type') || 'application/pdf';
        const bytes = new Uint8Array(await request.arrayBuffer());
        if (!bytes.length) return json({ error: 'Пустой файл' }, 400);

        const acc = await amo('/api/v4/account?with=drive_url');
        if (!acc.drive_url) throw new Error('amoCRM не вернул адрес файлового хранилища (drive_url)');
        const session = await amo(`${acc.drive_url}/v1.0/sessions`, 'POST', { file_name: name, file_size: bytes.length, content_type: type });
        const part = Number(session.max_part_size) || 131072;
        let uploadUrl = session.upload_url, fileInfo = null;
        for (let off = 0; off < bytes.length; off += part) {
          const r = await fetch(uploadUrl, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/octet-stream' }, body: bytes.subarray(off, Math.min(off + part, bytes.length)) });
          const text = await r.text();
          if (!r.ok) throw new Error(`Загрузка файла: amoCRM ответил ${r.status}: ${text.slice(0, 300)}`);
          const res = text ? JSON.parse(text) : {};
          if (res.next_url) uploadUrl = res.next_url;
          else { fileInfo = res; break; }
        }
        if (!fileInfo || !fileInfo.uuid) throw new Error('Файл загружен не полностью — amoCRM не вернул uuid');
        await amo(`/api/v4/leads/${leadId}/files`, 'PUT', [{ file_uuid: fileInfo.uuid }]);
        // файл ещё и в ленте сделки — примечанием с вложением, чтобы открыть одним нажатием
        let inFeed = true;
        try {
          const params = { file_uuid: fileInfo.uuid, file_name: name, original_name: name };
          if (fileInfo.version_uuid) params.version_uuid = fileInfo.version_uuid;
          await amo(`/api/v4/leads/${leadId}/notes`, 'POST', [{ note_type: 'attachment', params }]);
        } catch (e) { inFeed = false; }
        return json({ ok: true, file_uuid: fileInfo.uuid, name, in_feed: inFeed });
      }

      // Последний номер заказа: номер самой «свежей» сделки (по дате добавления или закрытия), текущей или закрытой
      if (url.pathname === '/last-number') {
        const numOf = l => {
          const m = String(l.name || '').match(/№\s*(\d{1,7})/) || String(l.name || '').match(/^\s*(\d{1,7})(?!\d)(?![.,]\d)/);
          if (m) return Number(m[1]);
          for (const f of l.custom_fields_values || []) {
            if (/номер\s*заказа|№\s*заказа/i.test(f.field_name || '')) for (const v of f.values || []) { const mm = String(v.value || '').match(/\d{1,7}/); if (mm) return Number(mm[0]); }
          }
          return 0;
        };
        const seen = new Map();
        // недавно добавленные и недавно изменённые (туда попадают и недавно закрытые)
        for (const order of ['created_at', 'updated_at']) {
          const r = await fetch(`${base}/api/v4/leads?limit=250&page=1&order[${order}]=desc`, { headers: auth });
          if (r.status === 204) continue;
          if (!r.ok) throw new Error(`amoCRM ответил ${r.status}: ${(await r.text()).slice(0, 300)}`);
          const j = await r.json();
          for (const l of (j._embedded && j._embedded.leads) || []) seen.set(l.id, l);
        }
        let best = null;
        for (const l of seen.values()) {
          const n = numOf(l); if (!n) continue;
          const fresh = Math.max(l.created_at || 0, l.closed_at || 0);
          if (!best || fresh > best.fresh) best = { number: n, lead_id: l.id, name: l.name, fresh, by: (l.closed_at || 0) > (l.created_at || 0) ? 'closed' : 'created' };
        }
        return json({ ok: true, last: best, worker_version: 8 });
      }

      // Текущие заказы: сделки на рабочих этапах выбранных воронок (только чтение)
      if (url.pathname === '/orders') {
        let d = {};
        try { d = await request.json(); } catch (e) {}
        const wantPipes = Array.isArray(d.pipelines) && d.pipelines.length ? d.pipelines : ['Солнцезащитные системы', 'Москитные сетки'];
        const wantSts = Array.isArray(d.statuses) && d.statuses.length ? d.statuses : ['Изготовление', 'Готов к установке', 'На установку'];
        const pd = await amo('/api/v4/leads/pipelines');
        const pipes = (pd._embedded && pd._embedded.pipelines) || [];
        const out = [], filters = [], stIndex = {};
        for (const wp of wantPipes) {
          const pipe = pipes.find(p => sameName(p.name, wp));
          if (!pipe) { out.push({ name: wp, missing: true, statuses: [] }); continue; }
          const sts = (pipe._embedded && pipe._embedded.statuses) || [];
          const po = { id: pipe.id, name: pipe.name, statuses: [] };
          for (const ws of wantSts) {
            const st = sts.find(s => sameName(s.name, ws));
            const so = st ? { id: st.id, name: st.name, color: st.color || '', leads: [] } : { name: ws, missing: true, leads: [] };
            po.statuses.push(so);
            if (st) { filters.push([pipe.id, st.id]); stIndex[pipe.id + ':' + st.id] = so; }
          }
          out.push(po);
        }
        // сделки (до 1000)
        const leads = [];
        if (filters.length) {
          const fq = filters.map(([p, s], i) => `filter[statuses][${i}][pipeline_id]=${p}&filter[statuses][${i}][status_id]=${s}`).join('&');
          for (let page = 1; page <= 4; page++) {
            const r = await fetch(`${base}/api/v4/leads?with=contacts&limit=250&page=${page}&order[updated_at]=desc&${fq}`, { headers: auth });
            if (r.status === 204) break;
            if (!r.ok) throw new Error(`amoCRM ответил ${r.status}: ${(await r.text()).slice(0, 300)}`);
            const j = await r.json();
            const list = (j._embedded && j._embedded.leads) || [];
            leads.push(...list);
            if (list.length < 250) break;
          }
        }
        const chunks = (arr, n) => { const res = []; for (let i = 0; i < arr.length; i += n) res.push(arr.slice(i, i + n)); return res; };
        // контакты: имя и телефон
        const contactIds = [...new Set(leads.flatMap(l => ((l._embedded && l._embedded.contacts) || []).filter(c => c.is_main !== false).map(c => c.id)))];
        const contacts = {};
        for (const part of chunks(contactIds, 50)) {
          const r = await fetch(`${base}/api/v4/contacts?limit=250&${part.map(id => `filter[id][]=${id}`).join('&')}`, { headers: auth });
          if (!r.ok || r.status === 204) continue;
          const j = await r.json().catch(() => ({}));
          for (const c of (j._embedded && j._embedded.contacts) || []) {
            const ph = (c.custom_fields_values || []).find(f => f.field_code === 'PHONE');
            contacts[c.id] = { name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' '), phone: ph && ph.values && ph.values[0] ? String(ph.values[0].value || '') : '' };
          }
        }
        // последнее текстовое примечание (из калькулятора — с позициями и раскладкой цены)
        const notes = {};
        for (const part of chunks(leads.map(l => l.id), 40)) {
          const r = await fetch(`${base}/api/v4/leads/notes?limit=250&filter[note_type]=common&${part.map(id => `filter[entity_id][]=${id}`).join('&')}`, { headers: auth });
          if (!r.ok || r.status === 204) continue;
          const j = await r.json().catch(() => ({}));
          for (const n of (j._embedded && j._embedded.notes) || []) {
            const t = n.params && n.params.text ? String(n.params.text) : '';
            if (!t) continue;
            const o = notes[n.entity_id] = notes[n.entity_id] || {};
            const k = /заказ №|Позиции:/.test(t) ? 'calc' : 'other';   // примечание калькулятора и последнее «ручное»
            if (!o[k] || n.created_at > o[k].at) o[k] = { text: t.slice(0, 6000), at: n.created_at };
          }
        }
        // какие сделки можно скорректировать (есть данные калькулятора)
        const editable = new Set();
        if (env.SP_ORDERS) {
          try { let cursor; do { const r = await env.SP_ORDERS.list({ prefix: 'lead:', cursor }); r.keys.forEach(k => editable.add(Number(k.name.slice(5)))); cursor = r.list_complete ? null : r.cursor; } while (cursor); } catch (e) {}
        }
        for (const l of leads) {
          const so = stIndex[l.pipeline_id + ':' + l.status_id];
          if (!so) continue;
          const fields = {};
          for (const f of l.custom_fields_values || []) fields[f.field_name] = (f.values || []).map(v => v.value).filter(v => v !== undefined && v !== null).join(', ');
          const cs = ((l._embedded && l._embedded.contacts) || []).map(c => contacts[c.id]).filter(Boolean);
          so.leads.push({
            id: l.id, name: l.name || '', price: l.price || 0, created_at: l.created_at, updated_at: l.updated_at,
            tags: ((l._embedded && l._embedded.tags) || []).map(t => t.name), fields, contact: cs[0] || null,
            note: notes[l.id] && notes[l.id].calc ? notes[l.id].calc.text : '',
            lastNote: notes[l.id] && notes[l.id].other ? notes[l.id].other.text : '', url: `${base}/leads/detail/${l.id}`, editable: editable.has(l.id)
          });
        }
        return json({ ok: true, base, updated: Date.now(), pipelines: out, store: !!env.SP_ORDERS, worker_version: 8 });
      }

      return json({ error: 'Неизвестный адрес' }, 404);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 502);
    }
  }
};
