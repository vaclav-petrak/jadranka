/* ============================================================
   Rezervační kalendář (index.html + apartman-*.html)
   Frontend demo — dostupnost i odeslání formuláře jsou zatím
   nastubované v loadReservations()/submitReservation(), aby se
   později dalo napojit skutečné API bez zásahu do UI.

   Použití: <div class="cal-preview" data-calendar data-apartment="a1"></div>
   (volitelně data-show-select="false" pro skrytí výběru apartmánu)
   ============================================================ */
(function () {
  'use strict';

  // ---- Konfigurace a data ------------------------------------

  // Sezóna: 3. týden května – konec října (měsíce 0-based)
  const SEASON = { year: 2026, startMonth: 4, startDay: 15, endMonth: 9, endDay: 31 };

  // Cenová pásma odpovídají ceníku na apartman-1.html
  const PRICE_TIERS = [
    { from: '2026-05-01', to: '2026-06-30', key: 'low' },  // Předsezóna
    { from: '2026-07-01', to: '2026-09-03', key: 'peak' }, // Hlavní sezóna
    { from: '2026-09-04', to: '2026-10-31', key: 'post' }, // Posezóna
  ];

  const APARTMENTS = [
    { id: 'a1', label: 'Apartmán 1', prices: { low: 90, peak: 130, post: 90 } },
    { id: 'a2', label: 'Apartmán 2', prices: { low: 90, peak: 130, post: 90 } },
    { id: 'a3', label: 'Apartmán 3', prices: { low: 120, peak: 180, post: 120 } },
    { id: 'a4', label: 'Apartmán 4', prices: { low: 90, peak: 130, post: 90 } },
    { id: 'a5', label: 'Apartmán 5', prices: { low: 90, peak: 130, post: 90 } },
    { id: 'a6', label: 'Studio 6', prices: { low: 70, peak: 90, post: 70 } },
  ];

  // Obsazené termíny — inkluzivní rozsahy [od, do] (ukázková data)
  const RESERVATIONS = {
    a1: [
      ['2026-05-29', '2026-06-05'], ['2026-06-20', '2026-06-26'],
      ['2026-07-04', '2026-07-11'], ['2026-07-17', '2026-07-26'],
      ['2026-08-01', '2026-08-15'], ['2026-09-05', '2026-09-11'],
      ['2026-10-02', '2026-10-08'],
    ],
    a2: [
      ['2026-06-12', '2026-06-19'], ['2026-07-03', '2026-07-17'],
      ['2026-07-25', '2026-08-08'], ['2026-08-21', '2026-08-28'],
      ['2026-09-18', '2026-09-25'],
    ],
    a3: [
      ['2026-05-22', '2026-05-29'], ['2026-06-26', '2026-07-03'],
      ['2026-07-11', '2026-07-24'], ['2026-08-08', '2026-08-22'],
      ['2026-10-09', '2026-10-16'],
    ],
    a4: [
      ['2026-06-05', '2026-06-12'], ['2026-07-01', '2026-07-08'],
      ['2026-07-18', '2026-08-01'], ['2026-08-14', '2026-08-28'],
      ['2026-09-11', '2026-09-18'],
    ],
    a5: [
      ['2026-05-18', '2026-05-25'], ['2026-06-19', '2026-06-26'],
      ['2026-07-10', '2026-07-24'], ['2026-08-07', '2026-08-21'],
      ['2026-09-04', '2026-09-11'], ['2026-10-16', '2026-10-23'],
    ],
    a6: [
      ['2026-06-27', '2026-07-04'], ['2026-07-11', '2026-07-18'],
      ['2026-08-01', '2026-08-08'], ['2026-08-22', '2026-09-05'],
      ['2026-09-25', '2026-10-02'],
    ],
  };

  // Jediná vstupní/výstupní místa pro data — budoucí napojení na API:
  async function loadReservations(apartmentId) {
    // později: return (await fetch(`/api/availability/${apartmentId}`)).json();
    return RESERVATIONS[apartmentId] || [];
  }

  async function submitReservation(payload) {
    // později: return fetch('/api/reservations', { method: 'POST', body: JSON.stringify(payload) });
    console.log('DEMO — poptávka rezervace:', payload);
    return { ok: true };
  }

  // ---- Datumové pomůcky (lokální čas, žádné toISOString) ------

  const pad = n => String(n).padStart(2, '0');
  const toIso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (isoStr, n) => { const d = fromIso(isoStr); d.setDate(d.getDate() + n); return toIso(d); };
  const daysBetween = (a, b) => Math.round((fromIso(b) - fromIso(a)) / 864e5);
  const fmtCz = isoStr => { const [y, m, d] = isoStr.split('-').map(Number); return `${d}. ${m}. ${y}`; };
  const nightsCz = n => `${n} ${n === 1 ? 'noc' : n <= 4 ? 'noci' : 'nocí'}`;

  const SEASON_FROM = toIso(new Date(SEASON.year, SEASON.startMonth, SEASON.startDay));
  const SEASON_TO = toIso(new Date(SEASON.year, SEASON.endMonth, SEASON.endDay));
  const TODAY = toIso(new Date());

  const apartment = id => APARTMENTS.find(a => a.id === id);

  function priceFor(apartmentId, isoDate) {
    const tier = PRICE_TIERS.find(t => isoDate >= t.from && isoDate <= t.to);
    return tier ? apartment(apartmentId).prices[tier.key] : null;
  }

  // Cena pobytu: noci od příjezdu do dne před odjezdem (zvládá hranice pásem)
  function totalFor(apartmentId, from, to) {
    let sum = 0;
    for (let d = from; d < to; d = addDays(d, 1)) sum += priceFor(apartmentId, d) || 0;
    return sum;
  }

  function expandRanges(ranges) {
    const set = new Set();
    for (const [from, to] of ranges) {
      for (let d = from; d <= to; d = addDays(d, 1)) set.add(d);
    }
    return set;
  }

  // ---- Komponenta --------------------------------------------

  function initCalendar(container, { apartmentId = 'a1', showSelect = true } = {}) {
    // Zobrazují se jen měsíce sezóny (květen–říjen), které ještě neproběhly celé.
    const months = [];
    for (let m = SEASON.startMonth; m <= SEASON.endMonth; m++) {
      const lastDay = toIso(new Date(SEASON.year, m + 1, 0));
      if (lastDay >= TODAY) months.push(m);
    }
    if (months.length === 0) months.push(SEASON.endMonth); // sezóna už skončila – ukázat poslední měsíc

    // Na desktopu vždy dva měsíce vedle sebe (nikdy jeden samostatný),
    // na mobilu jeden — podle stejného zlomu jako CSS (768px).
    const twoUp = window.matchMedia('(min-width: 769px)');
    const maxIndex = () => Math.max(0, twoUp.matches ? months.length - 2 : months.length - 1);

    const state = {
      apartmentId,
      monthIndex: 0, // months[0] je aktuální (nebo první nadcházející) měsíc
      selStart: null,
      selEnd: null,
      booked: new Set(),
    };

    container.innerHTML = `
      <div class="cal-header">
        <div class="cal-controls">
          ${showSelect ? `<select class="cal-filter" aria-label="Výběr apartmánu">
            ${APARTMENTS.map(a => `<option value="${a.id}"${a.id === state.apartmentId ? ' selected' : ''}>${a.label}</option>`).join('')}
          </select>` : ''}
          <div class="cal-nav">
            <button type="button" class="cal-prev" aria-label="Předchozí měsíc">&#8249;</button>
            <button type="button" class="cal-next" aria-label="Další měsíc">&#8250;</button>
          </div>
        </div>
      </div>
      <div class="cal-body"></div>
      <div class="cal-msg" hidden></div>
      <div class="cal-summary" hidden></div>
      <div class="cal-legend">
        <div class="cal-legend-item"><span class="cal-legend-dot cal-legend-dot--free"></span>Volné</div>
        <div class="cal-legend-item"><span class="cal-legend-dot cal-legend-dot--booked"></span>Obsazeno</div>
      </div>
      <div class="res-form-wrap" hidden>
        <form class="res-form" novalidate>
          <div class="res-summary"></div>
          <label class="res-field">Jméno a příjmení
            <input type="text" name="name" autocomplete="name">
            <span class="res-field-error">Zadejte prosím jméno.</span>
          </label>
          <label class="res-field">E-mail
            <input type="email" name="email" autocomplete="email">
            <span class="res-field-error">Zadejte platný e-mail.</span>
          </label>
          <label class="res-field">Telefon
            <input type="tel" name="phone" autocomplete="tel">
            <span class="res-field-error">Zadejte platné telefonní číslo.</span>
          </label>
          <label class="res-field res-full">Text vašeho dotazu…
            <textarea name="message" rows="4" placeholder="Text vašeho dotazu"></textarea>
          </label>
          <label class="res-consent res-full">
            <input type="checkbox" name="consent">
            <span>Souhlasím s <a href="podminky.html" target="_blank" rel="noopener">podmínkami ubytování</a>.</span>
            <span class="res-field-error">Bez souhlasu s podmínkami nelze poptávku odeslat.</span>
          </label>
          <div class="res-actions res-full">
            <button type="submit" class="btn btn-primary">Odeslat poptávku</button>
          </div>
        </form>
        <div class="res-success" hidden>
          <h3>Děkujeme za vaši poptávku!</h3>
          <p>Ozveme se vám do 24 hodin na uvedený e-mail.</p>
          <p class="res-success-dates"></p>
          <button type="button" class="btn btn-outline res-reset">Nová poptávka</button>
        </div>
      </div>
    `;

    const el = sel => container.querySelector(sel);
    const bodyEl = el('.cal-body');
    const msgEl = el('.cal-msg');
    const summaryEl = el('.cal-summary');
    const prevBtn = el('.cal-prev');
    const nextBtn = el('.cal-next');
    const selectEl = el('.cal-filter');
    const formWrap = el('.res-form-wrap');
    const form = el('.res-form');
    const resSummary = el('.res-summary');
    const successEl = el('.res-success');

    function classify(isoDate) {
      if (isoDate < SEASON_FROM || isoDate > SEASON_TO) return 'out';
      if (isoDate < TODAY) return 'past';
      // Demo: obsazený rozsah blokuje všechny dny včetně dne odjezdu;
      // reálný systém by den odjezdu uvolnil pro nový příjezd.
      if (state.booked.has(isoDate)) return 'booked';
      return 'available';
    }

    function selectionClass(isoDate) {
      if (!state.selStart) return '';
      if (isoDate === state.selStart) return ' sel-start';
      if (!state.selEnd) return '';
      if (isoDate === state.selEnd) return ' sel-end';
      if (isoDate > state.selStart && isoDate < state.selEnd) return ' in-range';
      return '';
    }

    function rangeIsFree(from, to) {
      for (let d = from; d <= to; d = addDays(d, 1)) {
        if (classify(d) !== 'available') return false;
      }
      return true;
    }

    function buildMonthPanel(month) {
      const first = new Date(SEASON.year, month, 1);
      const label = first.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
      const title = label.charAt(0).toUpperCase() + label.slice(1);

      const cells = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
        .map(n => `<div class="cal-day-name">${n}</div>`);

      const lead = (first.getDay() + 6) % 7; // týden začíná pondělím
      for (let i = 0; i < lead; i++) cells.push('<div class="cal-day empty"></div>');

      const dayCount = new Date(SEASON.year, month + 1, 0).getDate();
      for (let day = 1; day <= dayCount; day++) {
        const isoDate = toIso(new Date(SEASON.year, month, day));
        const cls = classify(isoDate);
        const dateCz = fromIso(isoDate).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' });
        const todayCls = isoDate === TODAY ? ' today' : '';
        if (cls === 'available') {
          const price = priceFor(state.apartmentId, isoDate);
          const todayNote = isoDate === TODAY ? ' (dnes)' : '';
          cells.push(
            `<button type="button" class="cal-day available${selectionClass(isoDate)}${todayCls}" data-date="${isoDate}" aria-label="${dateCz} — volné, ${price} € za noc${todayNote}">` +
            `<span class="cal-day-num">${day}</span><span class="cal-day-price">${price} €</span></button>`
          );
        } else {
          const stateLabels = { booked: 'obsazeno', out: 'mimo sezónu', past: 'nelze rezervovat' };
          const priceCell = cls === 'past' ? '<span class="cal-day-price">–</span>' : '';
          cells.push(
            `<button type="button" class="cal-day ${cls}${todayCls}" disabled aria-label="${dateCz} — ${stateLabels[cls]}">` +
            `<span class="cal-day-num">${day}</span>${priceCell}</button>`
          );
        }
      }
      return `<div class="cal-month-block">` +
        `<div class="cal-month-label">${title}</div>` +
        `<div class="cal-grid">${cells.join('')}</div></div>`;
    }

    function renderMonths() {
      // Přepočet po změně velikosti okna (desktop zobrazí dvojici, mobil jeden)
      if (state.monthIndex > maxIndex()) state.monthIndex = maxIndex();
      prevBtn.disabled = state.monthIndex === 0;
      nextBtn.disabled = state.monthIndex >= maxIndex();
      // Vykreslíme aktuální měsíc a (pokud existuje) i následující;
      // na mobilu druhý panel skryje CSS.
      let html = buildMonthPanel(months[state.monthIndex]);
      if (state.monthIndex + 1 < months.length) {
        html += buildMonthPanel(months[state.monthIndex + 1]);
      }
      bodyEl.innerHTML = html;
    }

    function renderSummary() {
      if (!state.selStart) {
        summaryEl.hidden = true;
        return;
      }
      summaryEl.hidden = false;
      const clearBtn = '<button type="button" class="cal-summary-clear">Zrušit výběr</button>';
      if (!state.selEnd) {
        summaryEl.innerHTML =
          `Příjezd: <strong>${fmtCz(state.selStart)}</strong> — vyberte den odjezdu ${clearBtn}`;
      } else {
        const nights = daysBetween(state.selStart, state.selEnd);
        const total = totalFor(state.apartmentId, state.selStart, state.selEnd);
        summaryEl.innerHTML =
          `<strong>${fmtCz(state.selStart)} – ${fmtCz(state.selEnd)}</strong> · ${nightsCz(nights)} · ${total} € ${clearBtn}`;
      }
    }

    function updateForm() {
      if (state.selStart && state.selEnd) {
        const nights = daysBetween(state.selStart, state.selEnd);
        const total = totalFor(state.apartmentId, state.selStart, state.selEnd);
        resSummary.textContent =
          `${apartment(state.apartmentId).label} · ${fmtCz(state.selStart)} – ${fmtCz(state.selEnd)} · ${nightsCz(nights)} · ${total} €`;
        form.hidden = false;
        successEl.hidden = true;
        formWrap.hidden = false;
      } else {
        formWrap.hidden = true;
      }
    }

    function update() {
      renderMonths();
      renderSummary();
      updateForm();
    }

    let msgTimer = null;
    function flashMsg(text) {
      msgEl.textContent = text;
      msgEl.hidden = false;
      clearTimeout(msgTimer);
      msgTimer = setTimeout(() => { msgEl.hidden = true; }, 5000);
    }

    function clearSelection() {
      state.selStart = null;
      state.selEnd = null;
      update();
    }

    // --- Výběr rozsahu ---

    bodyEl.addEventListener('click', e => {
      const btn = e.target.closest('.cal-day[data-date]');
      if (!btn || btn.disabled) return;
      const d = btn.dataset.date;

      if (!state.selStart || state.selEnd) {
        state.selStart = d;
        state.selEnd = null;
      } else if (d === state.selStart) {
        state.selStart = null;
      } else if (d < state.selStart) {
        state.selStart = d;
      } else if (rangeIsFree(state.selStart, d)) {
        state.selEnd = d;
      } else {
        state.selStart = d;
        state.selEnd = null;
        flashMsg('Vybraný termín obsahuje obsazené dny — vyberte prosím jiný.');
      }
      update();
    });

    // Náhled rozsahu při najetí myší (jen přepínání tříd, bez překreslení)
    function clearPreview() {
      bodyEl.querySelectorAll('.preview').forEach(c => c.classList.remove('preview'));
    }

    bodyEl.addEventListener('mouseover', e => {
      clearPreview();
      if (!state.selStart || state.selEnd) return;
      const btn = e.target.closest('.cal-day.available[data-date]');
      if (!btn) return;
      const d = btn.dataset.date;
      if (d <= state.selStart || !rangeIsFree(state.selStart, d)) return;
      bodyEl.querySelectorAll('.cal-day[data-date]').forEach(c => {
        const cd = c.dataset.date;
        if (cd > state.selStart && cd <= d) c.classList.add('preview');
      });
    });
    bodyEl.addEventListener('mouseleave', clearPreview);

    summaryEl.addEventListener('click', e => {
      if (e.target.closest('.cal-summary-clear')) clearSelection();
    });

    // --- Navigace a výběr apartmánu ---

    prevBtn.addEventListener('click', () => {
      state.monthIndex = Math.max(0, state.monthIndex - 1);
      renderMonths();
    });
    nextBtn.addEventListener('click', () => {
      state.monthIndex = Math.min(maxIndex(), state.monthIndex + 1);
      renderMonths();
    });

    // Po překročení zlomu (desktop ↔ mobil) překreslit a doladit rozsah
    twoUp.addEventListener('change', renderMonths);

    if (selectEl) {
      selectEl.addEventListener('change', async () => {
        state.apartmentId = selectEl.value;
        state.selStart = null;
        state.selEnd = null;
        state.booked = expandRanges(await loadReservations(state.apartmentId));
        update();
      });
    }

    // --- Formulář ---

    const VALIDATORS = {
      name: v => v.trim().length > 0,
      email: v => /^\S+@\S+\.\S+$/.test(v.trim()),
      phone: v => /^\d{9,}$/.test(v.replace(/[\s()+-]/g, '')),
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      let firstInvalid = null;
      for (const [name, isValid] of Object.entries(VALIDATORS)) {
        const input = form.elements[name];
        const ok = isValid(input.value);
        input.closest('.res-field').classList.toggle('invalid', !ok);
        if (!ok && !firstInvalid) firstInvalid = input;
      }
      const consent = form.elements.consent;
      const consentOk = consent.checked;
      consent.closest('.res-consent').classList.toggle('invalid', !consentOk);
      if (!consentOk && !firstInvalid) firstInvalid = consent;
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      const payload = {
        apartmentId: state.apartmentId,
        from: state.selStart,
        to: state.selEnd,
        nights: daysBetween(state.selStart, state.selEnd),
        totalPrice: totalFor(state.apartmentId, state.selStart, state.selEnd),
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        message: form.elements.message.value.trim(),
        consent: form.elements.consent.checked,
      };
      const res = await submitReservation(payload);
      if (res.ok) {
        el('.res-success-dates').textContent = resSummary.textContent;
        form.hidden = true;
        successEl.hidden = false;
      }
    });

    // Chybové zvýraznění zmizí, jakmile uživatel pole opraví
    form.addEventListener('input', e => {
      const field = e.target.closest('.res-field, .res-consent');
      if (field) field.classList.remove('invalid');
    });

    el('.res-reset').addEventListener('click', () => {
      form.reset();
      state.selStart = null;
      state.selEnd = null;
      update();
    });

    // --- Start ---

    loadReservations(state.apartmentId).then(ranges => {
      state.booked = expandRanges(ranges);
      update();
    });
  }

  // Auto-inicializace všech kalendářů na stránce
  document.querySelectorAll('[data-calendar]').forEach(elm => {
    initCalendar(elm, {
      apartmentId: elm.dataset.apartment || 'a1',
      showSelect: elm.dataset.showSelect !== 'false',
    });
  });
})();
