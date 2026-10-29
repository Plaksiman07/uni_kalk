
    // === Режим раздела «Комбинированного заказа» (страница открыта внутри него: ?embed=…) ===
    // Свои данные клиента, цены, PDF и amoCRM прячутся — всё это общее и делается на странице комбинированного заказа.
    (function () {
      if (!window.SP_EMBED) return;
      const hideBlock = el => { const b = el && (el.closest('.app-block') || el); if (b) b.style.display = 'none'; };
      hideBlock(document.getElementById('orderNumber'));
      hideBlock(document.querySelector('.client-price-row'));
      ['.pdf-btns', '#amoBtn', '#amoStatus', '.amo-settings-row', '.home-btn', '.labels-btn', '#labelsStatus'].forEach(sel =>
        document.querySelectorAll(sel).forEach(el => { el.style.display = 'none'; }));
      // данные клиента и номер — от комбинированного заказа (для шапок заказ-наряда и наклеек)
      window.spEmbedSetClient = function (c) {
        ['orderNumber', 'clientName', 'clientPhone', 'clientAddress'].forEach(id => {
          const el = document.getElementById(id), v = (c && c[id]) || '';
          if (el && el.value !== v) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
        });
        ['prepay', 'orderNote'].forEach(id => { const el = document.getElementById(id); if (el && el.value) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); } });
      };
      window.spEmbedSetPrice = function (sel) {
        const r = document.querySelector(`input[name="selectedPrice"][value="${sel}"]`);
        if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
      };
      // сообщать странице заказа об изменениях
      const notify = () => { try { parent.postMessage({ type: 'sp-embed-change', id: window.SP_EMBED, calc: AMO_CALC_ID }, location.origin); } catch (e) {} };
      const orig = calculateTotals;
      calculateTotals = function () { const r = orig.apply(this, arguments); notify(); return r; };
    })();
