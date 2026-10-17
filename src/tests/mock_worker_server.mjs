const OUT = new URL('./out/', import.meta.url).pathname;
import fsInit from 'fs'; fsInit.mkdirSync(new URL('./out/', import.meta.url).pathname, { recursive: true });
import http from 'http';
import fs from 'fs';
import worker from '../../amo-worker.js';
const realFetch = globalThis.fetch;
let up = []; let leadN = 1000; const log = [];
globalThis.fetch = async (url, opts = {}) => {
  const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s });
  log.push((opts.method || 'GET') + ' ' + url);
  if (url.endsWith('/api/v4/account')) return J({ name: 'Тестовый аккаунт' });
  if (url.endsWith('/api/v4/leads/pipelines')) return J({ _embedded: { pipelines: [
    { id: 1987228, name: 'Москитные сетки', _embedded: { statuses: [{ id: 11, name: 'Изготовление' }, { id: 12, name: 'Готов к установке' }, { id: 13, name: 'На установку' }] } },
    { id: 9662970, name: 'Солнцезащитные системы', _embedded: { statuses: [{ id: 21, name: 'Изготовление' }, { id: 22, name: 'Готов к установке' }] } },
    { id: 5550001, name: 'Cетки  плиcсе ', _embedded: { statuses: [{ id: 40, name: 'Неразобранное', type: 1, sort: 10 }, { id: 41, name: 'Первичный контакт', type: 0, sort: 20 }, { id: 142, name: 'Успешно', type: 0, sort: 10000 }] } },
    { id: 10087634, name: 'Замеры', _embedded: { statuses: [{ id: 31, name: 'Новый' }] } } ] } });
  if (url.includes('/api/v4/leads/custom_fields')) return J({ _embedded: { custom_fields: [
    { id: 100, name: 'Дата', type: 'date' }, { id: 101, name: 'Материал', type: 'text' },
    { id: 102, name: 'Цвет', type: 'select', enums: [{ id: 1, value: 'Белый' }, { id: 2, value: 'Коричневый' }, { id: 3, value: 'Антрацит' }] },
    { id: 103, name: 'Адрес', type: 'text' },
    ...[1,2,3,4,5,6,7,8].map(i => ({ id: 110 + i, name: 'Изделие ' + i, type: 'text' })) ] } });
  if (url.includes('/api/v4/contacts?query=')) { return url.includes('9186913293') ? J({ _embedded: { contacts: [{ id: 555, custom_fields_values: [{ field_code: 'PHONE', values: [{ value: '+7 918 691-32-93' }] }] }] } }) : new Response(null, { status: 204 }); }
  if (url.endsWith('/api/v4/account?with=drive_url')) return J({ drive_url: 'https://drive-x.amocrm.ru' });
  if (url.endsWith('/api/v4/leads/complex')) { fs.writeFileSync(OUT + 'amo_lead.json', opts.body); return J([{ id: ++leadN }]); }
  if (/notes$/.test(url)) { fs.writeFileSync(OUT + 'amo_note.json', opts.body); return J({}); }
  if (/leads\/\d+$/.test(url)) { fs.writeFileSync(OUT + 'amo_patch.json', opts.body); return J({}); }
  if (url.endsWith('/v1.0/sessions')) { up = []; fs.writeFileSync(OUT + 'amo_session.json', opts.body); fs.appendFileSync(OUT + 'amo_files.log', opts.body + '\n'); return J({ upload_url: 'https://drive-x.amocrm.ru/upload/T0', max_part_size: 131072 }); }
  if (url.includes('/upload/T')) { up.push(Buffer.from(opts.body)); const total = JSON.parse(fs.readFileSync(OUT + 'amo_session.json')).file_size; const got = up.reduce((a, b) => a + b.length, 0);
    if (got < total) return J({ next_url: 'https://drive-x.amocrm.ru/upload/T' + up.length }); fs.writeFileSync(OUT + 'amo_uploaded.pdf', Buffer.concat(up)); return J({ uuid: 'u-1' }); }
  if (/files$/.test(url)) return J({});
  return J({ e: 'nomock' }, 404);
};
const env = { AMO_DOMAIN: 'test.amocrm.ru', AMO_TOKEN: 'T', APP_KEY: 'secret1', ALLOWED_ORIGINS: 'http://localhost:8765' };
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const r = await worker.fetch(new Request('http://localhost:8790' + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : body }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
  fs.writeFileSync(OUT + 'amo_log.txt', log.join('\n'));
}).listen(8790, () => console.log('mock worker on 8790'));
