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
  if (url.includes('/api/v4/leads?limit=250&page=')) {
    if (!url.includes('page=1')) return new Response(null, { status: 204 });
    return J({ _embedded: { leads: [ { id: 1, name: '№ 1212 ул. Красная 12' }, { id: 2, name: '1215 Иванов, сетки' }, { id: 3, name: 'Сделка без номера' },
      { id: 4, name: 'Заказ', custom_fields_values: [{ field_name: 'Номер заказа', values: [{ value: '1209' }] }] }, { id: 5, name: '3.5 м карниз' } ] } });
  }
  if (url.includes('/api/v4/leads?with=contacts')) {
    if (!url.includes('page=1')) return new Response(null, { status: 204 });
    const now = Math.floor(Date.now() / 1000), day = 86400;
    const L = (id, name, price, pid, sid, ago, cid, fields, tags) => ({ id, name, price, pipeline_id: pid, status_id: sid, created_at: now - ago * day - 3 * day, updated_at: now - ago * day,
      custom_fields_values: Object.entries(fields).map(([k, v]) => ({ field_name: k, values: [{ value: v }] })), _embedded: { tags: tags.map(t => ({ name: t })), contacts: [{ id: cid, is_main: true }] } });
    return J({ _embedded: { leads: [
      L(501, 'Рулонные шторы UNI I · заказ №1203', 28790, 9662970, 21, 1, 701, { 'Адрес': 'г. Краснодар, ул. Красная 12, кв. 5', 'Материал': 'Омега', 'Цвет': 'Белый', 'Изделие 1': '120×150 л', 'Изделие 2': '80×140 п, 2 шт' }, ['UNI I', '3 шт']),
      L(502, 'Вертикальные жалюзи · заказ №1207', 41500, 9662970, 21, 4, 702, { 'Адрес': 'ст. Динская, ул. Мира 3', 'Материал': 'Вертикальные: Венера', 'Изделие 1': '200×250 п' }, ['Вертикальные', '1 шт']),
      L(503, 'Зебра UNI II · заказ №1199', 19400, 9662970, 22, 2, 703, { 'Адрес': 'г. Краснодар, ул. Северная 300', 'Материал': 'Рино', 'Цвет': 'Белый', 'Изделие 1': '74,5×135 л', 'Изделие 2': '66×128 п' }, ['UNI II зебра', '2 шт']),
      L(504, 'Москитные сетки · заказ №1210', 12600, 1987228, 11, 0, 704, { 'Адрес': 'г. Краснодар, ул. Ставропольская 150, кв. 88', 'Материал': 'Антикошка', 'Цвет': 'Белый', 'Изделие 1': '60×120', 'Изделие 2': '58×118, 2 шт' }, ['Рамные МС', 'Антикошка', 'Белый', '3 шт']),
      L(505, 'Сетки плиссе · заказ №1195', 46470, 1987228, 13, 6, 705, { 'Адрес': 'п. Яблоновский, ул. Гагарина 1', 'Материал': 'Плиссе', 'Цвет': 'Коричневый', 'Изделие 1': '95×215' }, ['Плиссе', 'Коричневый', '1 шт']),
    ] } });
  }
  if (url.includes('/api/v4/contacts?limit=250')) return J({ _embedded: { contacts: [
    { id: 701, name: 'Иванова Анна', custom_fields_values: [{ field_code: 'PHONE', values: [{ value: '+7 918 111-22-33' }] }] },
    { id: 702, name: 'Петров Сергей', custom_fields_values: [{ field_code: 'PHONE', values: [{ value: '+7 928 444-55-66' }] }] },
    { id: 703, name: 'Сидорова Мария' }, { id: 704, name: 'Кузнецов Олег', custom_fields_values: [{ field_code: 'PHONE', values: [{ value: '89186913293' }] }] },
    { id: 705, name: 'Смирнова Елена', custom_fields_values: [{ field_code: 'PHONE', values: [{ value: '+7 961 000-11-22' }] }] } ] } });
  if (url.includes('/api/v4/leads/notes?')) return J({ _embedded: { notes: [
    { entity_id: 501, created_at: 1, params: { text: 'Рулонные шторы UNI I · заказ №1203\nКлиент: Иванова Анна, +7 918 111-22-33\nАдрес: г. Краснодар, ул. Красная 12, кв. 5\nТкань: ОМЕГА — 250 см, белый\nМонтаж: включён\n\nПозиции:\n1. Кухня: 120×150 см (Ш гот. 124), упр. Л, 1 шт — 10 220 ₽\n2. Спальня: 80×140 см (Ш гот. 84), упр. П, 2 шт — 18 570 ₽\n\nИтого для клиента (Базовая): 28 790 ₽\nПредоплата: 10 000 ₽\nК доплате после установки: 18 790 ₽\n\nДоп. информация:\nУстановка после 18:00' } },
    { entity_id: 501, created_at: 2, params: { text: 'Позвонить за час' } },
    { entity_id: 504, created_at: 5, params: { text: 'Москитные сетки · заказ №1210\nПозиции:\n1. Кухня: 60×120 см, 1 шт — 4 200 ₽\n2. Детская: 58×118 см, 2 шт — 8 400 ₽\n\nИтого для клиента (Базовая): 12 600 ₽\nПредоплата: без предоплаты\nК доплате после установки: 12 600 ₽' } } ] } });
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
