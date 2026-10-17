# SunProtection — исходники калькуляторов

Сайт: https://plaksiman07.github.io/uni_kalk/ (GitHub Pages из корня репозитория).
Готовые страницы в корне (`uni.html`, `mesh.html`, `plisse.html`, `vert.html`, `horiz.html`) **собираются** из этой папки — правьте исходники здесь и запускайте сборку, а не готовые файлы.

## Калькуляторы
| Страница | Изделие | Основа |
|---|---|---|
| `uni.html` | Рулонные шторы UNI I (своё производство, ткани по курсу) | `uni_pre_amo.html` |
| `mesh.html` | Москитные сетки рамочные | `mesh_pre_amo.html` |
| `plisse.html` | Сетки плиссе, узкая серия (прайс ТБМ) | `build_plisse.py` поверх `mesh_pre_amo.html` |
| `vert.html` | Вертикальные жалюзи (дилер Amigo, $) | `build_vert.py` поверх `mesh_pre_amo.html` |
| `horiz.html` | Горизонтальные жалюзи, алюминий (дилер Amigo, $) | `build_horiz.py` поверх `vert_pre_amo.html`, цены цветов — `horiz_data.json` |

## Сборка
```sh
sh src/build.sh
```
Порядок: `build_plisse.py` → `build_vert.py` → `build_horiz.py` → `insert_amo.py`.
`insert_amo.py` добавляет во все страницы общие части:
- `amo-client.js` — отправка в amoCRM (сделка, примечание, 3 PDF: заказ-наряд, КП, наклейки);
- `extras.js` — предоплата, доп. информация, блок оплаты в заказ-наряде;
- `polish.css` / `polish.js` — общая полировка интерфейса;
- `mesh_icon.svg`, `vert_icon.svg`, `horiz_icon.svg` — картинки в КП/заказ-наряде.

После изменений поднимите версию: `sw.js` (`CACHE = 'sp-calc-vX.Y'`) и подпись в `index.html` — иначе телефоны держат старую копию.

## amoCRM
Посредник — Cloudflare Worker `sp-amo`, код: `../amo-worker.js` (секреты AMO_TOKEN и APP_KEY — только в Cloudflare). Настройка — `Инструкция_amoCRM.md`.

## Тесты (Playwright + Chromium)
1. Сайт локально: из корня репозитория `python3 -m http.server 8765`.
2. Тестовый посредник amo: `node src/tests/mock_worker_server.mjs` (порт 8790, ответы amo подменены, файлы пишутся в `src/tests/out/`).
3. Тесты (`node src/tests/<имя>.mjs`):
   - `tcost.mjs` — шторы: несколько тканей, суммы групп = отдельным заказам;
   - `tmo.mjs` — сетки: цены как в прежней версии (скопируйте `tests/mesh_ref_v1.html` в корень как `mesh_old.html`), смешанные полотна/цвета;
   - `tpl3.mjs` — плиссе: себестоимость по прайсу ТБМ (эталон `pl3.json`);
   - `tvert.mjs`, `thoriz.mjs` — жалюзи: цены по прайсу дилера, опции, пределы размеров, PDF, наклейки, amo;
   - `tpay.mjs` — предоплата и доп. информация; `tkp.mjs` — КП и заказ-наряд раздельно; `t3f.mjs` — 3 PDF в amo.
   В тестах путь к Playwright указан для среды, где их запускали — поправьте `import` под свою.

## В работе
Калькулятор «Вставная сетка» (дилер, calc.plisse.ltd): цены дилера для 800×1500 известны
(Стандарт 1892/1986/1948, Антимошка 2461/2555/2517, Антикошка серая 2696/2790/2752, Антипыль 3335/3429/3391 — белый/коричневый/антрацит),
зависимость от размера нужно снять с калькулятора дилера.
