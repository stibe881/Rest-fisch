/* ============================================================
   Restaurant Fisch — minimal · slow · mysterious
   ============================================================ */
(() => {
  'use strict';

  /* -------- 1. Slow fade-in observer -------- */
  const fadeEls = document.querySelectorAll('[data-fade], [data-fade-bg]');
  const fadeObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const delay = parseInt(el.dataset.delay || '0', 10);
      setTimeout(() => el.classList.add('is-visible'), delay);
      fadeObs.unobserve(el);
    });
  }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });

  fadeEls.forEach((el) => fadeObs.observe(el));

  // Belt-and-suspenders fallback
  setTimeout(() => {
    document.querySelectorAll('[data-fade]:not(.is-visible), [data-fade-bg]:not(.is-visible)').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight + 200) el.classList.add('is-visible');
    });
  }, 1800);


  /* -------- 2. Hidden navigation toggle -------- */
  const navmark = document.querySelector('.navmark');
  const navToggle = document.querySelector('.navmark-toggle');
  const navList = document.querySelector('.navmark-list');

  function setNavOpen(open) {
    if (!navmark) return;
    navmark.classList.toggle('is-open', open);
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Inhalt schliessen' : 'Inhalt anzeigen');
    }
  }

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      setNavOpen(!navmark.classList.contains('is-open'));
    });
  }
  if (navList) {
    navList.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => setNavOpen(false));
    });
  }
  document.addEventListener('click', (e) => {
    if (!navmark) return;
    if (!navmark.contains(e.target) && navmark.classList.contains('is-open')) {
      setNavOpen(false);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navmark && navmark.classList.contains('is-open')) {
      setNavOpen(false);
    }
  });


  /* -------- 3. Modal overlays -------- */
  const modalTriggers = document.querySelectorAll('[data-modal]');
  const modals = document.querySelectorAll('.modal');

  function openModal(id) {
    const m = document.getElementById('modal-' + id);
    if (!m) return;
    m.hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => {
      const close = m.querySelector('.modal-close');
      if (close) close.focus();
    });
  }
  function closeModal(m) {
    if (!m) return;
    m.hidden = true;
    if (!document.querySelector('.modal:not([hidden])')) {
      document.body.classList.remove('modal-open');
    }
  }

  modalTriggers.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = btn.dataset.modal;
      if (id) { e.preventDefault(); openModal(id); }
    });
  });
  modals.forEach((m) => {
    m.querySelectorAll('[data-modal-close]').forEach((el) => {
      el.addEventListener('click', () => closeModal(m));
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const open = document.querySelector('.modal:not([hidden])');
      if (open) closeModal(open);
    }
  });


  /* -------- 4. Speisekarte — flippable booklet -------- */
  const booklet = document.querySelector('.booklet');
  if (booklet) {
    const track   = booklet.querySelector('.menu-pages-track');
    const pages   = booklet.querySelectorAll('.menu-page-card');
    const prevBtn = booklet.querySelector('.flip-prev');
    const nextBtn = booklet.querySelector('.flip-next');
    const viewport= booklet.querySelector('.menu-pages-viewport');
    const pager   = document.querySelector('.menu-pager');
    const dots    = pager ? pager.querySelectorAll('.page-dot') : [];
    const curEl   = pager ? pager.querySelector('.page-current') : null;
    const totEl   = pager ? pager.querySelector('.page-total')   : null;
    const titleEl = pager ? pager.querySelector('.page-title')   : null;
    const N       = pages.length;

    if (totEl) totEl.textContent = N;
    let current = 0;

    function decode(s) {
      const t = document.createElement('textarea');
      t.innerHTML = s; return t.value;
    }

    function flipUpdate() {
      const pct = current * (100 / N);
      track.style.transform = `translateX(-${pct}%)`;
      dots.forEach((d, i) => d.classList.toggle('is-active', i === current));
      if (curEl)   curEl.textContent   = current + 1;
      if (titleEl) titleEl.textContent = decode(pages[current].dataset.title || '');
      if (prevBtn) prevBtn.toggleAttribute('disabled', current <= 0);
      if (nextBtn) nextBtn.toggleAttribute('disabled', current >= N - 1);
    }
    function go(d) {
      const t = Math.max(0, Math.min(N - 1, current + d));
      if (t !== current) { current = t; flipUpdate(); }
    }

    if (prevBtn) prevBtn.addEventListener('click', () => go(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => go(+1));
    dots.forEach((dot) => dot.addEventListener('click', () => {
      const t = parseInt(dot.dataset.page, 10);
      if (!Number.isNaN(t)) { current = t; flipUpdate(); }
    }));

    const card = booklet.querySelector('.menu-card');
    if (card) {
      card.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); go(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); go(+1); }
      });
    }
    if (viewport) {
      let tx = 0, ty = 0;
      viewport.addEventListener('touchstart', (e) => {
        tx = e.touches[0].clientX; ty = e.touches[0].clientY;
      }, { passive: true });
      viewport.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - tx;
        const dy = e.changedTouches[0].clientY - ty;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
          go(dx < 0 ? +1 : -1);
        }
      });
    }
    flipUpdate();
  }


  /* -------- 5. Reservation form — mailto handoff -------- */
  const resForm = document.querySelector('.reservation-form');
  if (resForm) {
    const status = resForm.querySelector('.form-status');

    const dateInput = resForm.querySelector('input[name="date"]');
    if (dateInput) {
      const t = new Date();
      const y = t.getFullYear();
      const m = String(t.getMonth() + 1).padStart(2, '0');
      const d = String(t.getDate()).padStart(2, '0');
      dateInput.min = `${y}-${m}-${d}`;
    }

    function showStatus(msg, isError) {
      if (!status) return;
      status.hidden = false;
      status.textContent = msg;
      status.classList.toggle('is-error', !!isError);
    }

    resForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(resForm);
      const date   = (data.get('date')   || '').trim();
      const time   = (data.get('time')   || '').trim();
      const guests = (data.get('guests') || '').trim();
      const name   = (data.get('name')   || '').trim();
      const email  = (data.get('email')  || '').trim();
      const phone  = (data.get('phone')  || '').trim();
      const notes  = (data.get('notes')  || '').trim();

      if (!date || !time || !guests || !name || !email || !phone) {
        showStatus('Bitte füllen Sie alle Pflichtfelder aus.', true);
        return;
      }

      const subject = `Reservation ${date} ${time} · ${guests} Personen`;
      const body = [
        'Reservation-Anfrage über fischfischbach.ch',
        '',
        `Datum:    ${date}`,
        `Uhrzeit:  ${time}`,
        `Personen: ${guests}`,
        '',
        `Name:     ${name}`,
        `E-Mail:   ${email}`,
        `Telefon:  ${phone}`,
      ];
      if (notes) body.push('', 'Bemerkungen:', notes);

      const mailto = `mailto:info@fischfischbach.ch`
        + `?subject=${encodeURIComponent(subject)}`
        + `&body=${encodeURIComponent(body.join('\n'))}`;

      showStatus('Vielen Dank — Ihr E-Mail-Programm öffnet sich. Senden Sie die Anfrage ab; wir bestätigen umgehend.', false);
      window.location.href = mailto;
    });
  }


  /* -------- 6. Year in footer -------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
