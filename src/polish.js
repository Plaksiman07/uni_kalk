
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
