
    // === Полировка интерфейса (общая) ===
    (function () {
      // шестерёнка настроек — в ряд вкладок
      const tabs = document.querySelector('.tabs'), gear = document.getElementById('settingsToggle');
      if (tabs && gear) tabs.appendChild(gear);
      // строка цены целиком выбирает цену (не только маленький кружок)
      document.querySelectorAll('.client-price-row').forEach(row => row.addEventListener('click', e => {
        if (e.target.closest('button') || e.target.matches('input')) return;
        const r = row.querySelector('input[type="radio"]');
        if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
      }));
      // подписи над полями клиента: после заполнения видно, что где
      const CF = { orderNumber: 'Номер заказа', clientName: 'Клиент', clientPhone: 'Телефон', clientAddress: 'Адрес объекта', prepay: 'Предоплата', orderNote: 'Доп. информация' };
      Object.keys(CF).forEach(id => {
        const el = document.getElementById(id);
        if (!el || (el.previousElementSibling && el.previousElementSibling.classList.contains('cf-label'))) return;
        const l = document.createElement('label'); l.className = 'cf-label'; l.htmlFor = id; l.textContent = CF[id];
        el.insertAdjacentElement('beforebegin', l);
      });
      // подсказки внутри полей — примеры, а не повтор подписи
      const PH = { orderNumber: 'например, 35', clientName: 'Имя', clientPhone: '+7 …', clientAddress: 'Улица, дом, квартира', prepay: '0 ₽' };
      Object.keys(PH).forEach(id => { const el = document.getElementById(id); if (el) el.placeholder = PH[id]; });
    })();

    // === Проверка количества: целое число от 1 (иначе расчёт блокируется) ===
    (function () {
      if (typeof calculateTotals !== 'function') return;
      const orig = calculateTotals;
      calculateTotals = function () {
        const r = orig.apply(this, arguments);
        const bad = [];
        document.querySelectorAll('.item-row').forEach(row => {
          const q = row.querySelector('.item-qty'); if (!q) return;
          const w = parseFloat((row.querySelector('.item-width') || {}).value) || 0, h = parseFloat((row.querySelector('.item-height') || {}).value) || 0;
          const v = String(q.value).trim().replace(',', '.'), num = Number(v);
          const isBad = w > 0 && h > 0 && v !== '' && !(Number.isInteger(num) && num >= 1);
          q.classList.toggle('input-error', isBad);
          if (isBad) bad.push(row);
        });
        const d = window.calcData;
        if (bad.length && d) {
          d.problem = 'Количество должно быть целым числом от 1.';
          d.blocked = true;
          const err = document.getElementById('widthError') || document.getElementById('orderError');
          if (err) { err.textContent = 'Проверьте количество: допускается целое число от 1 (сейчас — ' + bad.map(r => '«' + r.querySelector('.item-qty').value + '»').join(', ') + ').'; err.style.display = 'block'; }
          ['costTotal', 'priceBase', 'price7', 'price12', 'priceB2B', 'marginBase', 'margin7', 'margin12', 'marginB2B'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
        }
        return r;
      };
    })();
