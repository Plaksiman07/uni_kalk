
    // === Предоплата и доп. информация (общие для всех калькуляторов) ===
    const SP_EXTRA_KEY = 'spExtra:' + AMO_CALC_ID;
    const spRub = v => `${Math.round(v || 0).toLocaleString('ru-RU')} ₽`;
    function spPay() {
      const d = window.calcData || {};
      const sel = document.querySelector('input[name="selectedPrice"]:checked');
      const price = sel && !d.problem ? ({ base: d.priceBase, discount7: d.price7, discount12: d.price12, b2b: d.priceB2B }[sel.value] || 0) : 0;
      const prepay = Math.max(0, parseFloat(String(document.getElementById('prepay').value).replace(',', '.')) || 0);
      return { price, prepay, rest: price - prepay, note: document.getElementById('orderNote').value.trim() };
    }
    // «К доплате»: если предоплата больше стоимости — 0 и пометка о переплате
    const spRestTxt = p => p.rest >= 0 ? spRub(p.rest) : `0 ₽ (предоплата больше стоимости на ${spRub(-p.rest)})`;
    function spPayLines() {   // строки для примечания в amoCRM
      const p = spPay();
      return [
        `Предоплата: ${p.prepay > 0 ? spRub(p.prepay) : 'без предоплаты'}`,
        `К доплате после установки: ${spRestTxt(p)}`,
        ...(p.note ? ['', 'Доп. информация:', p.note] : [])
      ];
    }
    function spPayHint() {
      const el = document.getElementById('prepayHint');
      if (!el) return;
      const p = spPay();
      el.innerHTML = p.price > 0
        ? `${p.prepay > 0 ? 'Предоплата ' + spRub(p.prepay) : 'Без предоплаты'} · к доплате после установки: <b>${spRestTxt(p)}</b>`
        : '';
      el.classList.toggle('neg', p.rest < 0);
    }
    (function () {
      let x = {};
      try { x = JSON.parse(localStorage.getItem(SP_EXTRA_KEY) || '{}') || {}; } catch (e) {}
      document.getElementById('prepay').value = x.prepay || '';
      document.getElementById('orderNote').value = x.note || '';
      const save = () => { try { localStorage.setItem(SP_EXTRA_KEY, JSON.stringify({ prepay: document.getElementById('prepay').value, note: document.getElementById('orderNote').value })); } catch (e) {} };
      ['prepay', 'orderNote'].forEach(id => document.getElementById(id).addEventListener('input', save));
      // подсказка «к доплате» — после пересчёта цены (любое изменение в форме или настройках)
      ['input', 'change', 'click'].forEach(ev => document.addEventListener(ev, () => setTimeout(spPayHint, 0)));
      spPayHint();
    })();
    // Блок «Оплата и доп. информация» во внутреннем заказ-наряде (после данных клиента)
    window.spDecoratePrint = function (root) {
      if (window.SP_EMBED) return;   // в комбинированном заказе оплата — общая, в его заказ-наряде
      const sec = root.querySelector('.print-section:not(.kp-part)');
      if (!sec) return;
      const info = [...sec.querySelectorAll('table')].find(t => /Адрес:/.test(t.textContent));
      if (!info) return;
      const p = spPay();
      const box = document.createElement('table');
      box.setAttribute('style', 'width: 100%; margin: 0 0 15px; font-size: 14px; border-collapse: collapse;');
      box.innerHTML = `<tr><td style="background: #fef9e7; border-left: 4px solid #f39c12; padding: 10px; border-radius: 4px; vertical-align: top;">
          <table style="border-collapse: collapse; font-size: 14px;"><tr>
            <td style="padding: 0 24px 0 0; white-space: nowrap;"><strong>Стоимость для клиента:</strong> ${spRub(p.price)}</td>
            <td style="padding: 0 24px 0 0; white-space: nowrap;"><strong>Предоплата:</strong> ${p.prepay > 0 ? spRub(p.prepay) : 'без предоплаты'}</td>
            <td style="padding: 0; white-space: nowrap;"><strong>К доплате после установки:</strong> <span style="color: #c0392b; font-weight: 800;">${spRestTxt(p)}</span></td>
          </tr></table>
          ${p.note ? `<div style="margin-top: 6px;"><strong>Доп. информация:</strong> ${esc(p.note).replace(/\n/g, '<br>')}</div>` : ''}
        </td></tr>`;
      info.parentNode.insertBefore(box, info.nextSibling);
    };
