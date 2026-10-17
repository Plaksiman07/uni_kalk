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
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });

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
        return json({ ok: true, account: acc.name || domain, worker_version: 2 });
      }

      // Создать сделку (или обновить существующую) + примечание
      if (url.pathname === '/lead') {
        const d = await request.json();
        const price = Math.max(0, Math.round(Number(d.price) || 0));
        let leadId = Number(d.lead_id) || 0;
        let created = false;

        const fieldsRes = await buildFields(d.fields);
        if (leadId) {
          const upd = { price };
          if (fieldsRes.values.length) upd.custom_fields_values = fieldsRes.values;
          await amo(`/api/v4/leads/${leadId}`, 'PATCH', upd);
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
          pipeline_name: ps.pipeline_name, status_name: ps.status_name, status_fallback: !!ps.status_fallback, worker_version: 2 });
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

      return json({ error: 'Неизвестный адрес' }, 404);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 502);
    }
  }
};
