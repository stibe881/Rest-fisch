/* ============================================================
   Restaurant Fisch Fischbach
   Scroll engine — parallax, depth, reveal, zoom, ambient motion.
   ============================================================ */

(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -----------------------------------------------------------
   * 1. Reveal & zoom on scroll (IntersectionObserver)
   * --------------------------------------------------------- */
  const revealEls = document.querySelectorAll('[data-reveal], [data-zoom]');

  // threshold:0 + rootMargin so we fire as soon as ANY pixel of the element
  // enters the viewport. The previous threshold of 0.18 never fired for
  // elements taller than the viewport (e.g. the menu booklet on mobile).
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const delay = parseInt(el.dataset.delay || '0', 10);
      setTimeout(() => el.classList.add('is-visible'), delay);
      revealObs.unobserve(el);
    });
  }, {
    threshold: 0,
    rootMargin: '0px 0px -10% 0px',
  });

  revealEls.forEach((el) => revealObs.observe(el));

  // Belt-and-suspenders: any element still hidden after 1.5 s gets revealed.
  // Defends against IO edge cases on some mobile browsers.
  setTimeout(() => {
    document.querySelectorAll('[data-reveal]:not(.is-visible), [data-zoom]:not(.is-visible)').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 200) el.classList.add('is-visible');
    });
  }, 1500);

  /* -----------------------------------------------------------
   * 2. Parallax engine — layered depth at different speeds
   *    Uses requestAnimationFrame for smoothness.
   * --------------------------------------------------------- */
  const parallaxLayers = Array.from(document.querySelectorAll('[data-speed]')).map((el) => ({
    el,
    speed: parseFloat(el.dataset.speed) || 0.3,
    section: el.closest('.scene') || document.body,
  }));

  const depthStacks = Array.from(document.querySelectorAll('.depth-stack'));
  const heroTitle   = document.querySelector('.hero-title');
  const heroSection = document.getElementById('hero');

  let scrollY = window.scrollY;
  let ticking = false;

  function onScroll() {
    scrollY = window.scrollY;
    requestTick();
    updateProgress();
    updateNav();
  }

  function requestTick() {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }

  function update() {
    if (reduceMotion) { ticking = false; return; }

    const vh = window.innerHeight;

    /* --- Parallax layers (background, mid, fore) ------------- */
    parallaxLayers.forEach(({ el, speed, section }) => {
      const rect = section.getBoundingClientRect();
      // Only move if section is on/near screen
      if (rect.bottom < -100 || rect.top > vh + 100) return;

      // distance from section center to viewport center
      const sectionCenter = rect.top + rect.height / 2;
      const offset = (vh / 2 - sectionCenter) * speed;

      // Floating fish slide horizontally + drift vertically
      if (el.classList.contains('floating-fish')) {
        const horiz = -offset * 1.4;
        const vert  = Math.sin((scrollY + parseFloat(el.dataset.speed) * 800) / 220) * 16;
        const dir = el.classList.contains('fish-2') ? -1 : 1;
        el.style.transform = `translate3d(${horiz * dir}px, ${vert}px, 0) ${dir < 0 ? 'scaleX(-1)' : ''}`;
        return;
      }

      // Background layers: scale slightly + translate
      if (el.classList.contains('layer-bg')) {
        const scale = 1.15 + Math.max(0, (vh - rect.top) / vh) * 0.03;
        el.style.transform = `translate3d(0, ${offset}px, 0) scale(${scale})`;
        return;
      }

      // Generic layer translate
      el.style.transform = `translate3d(0, ${offset}px, 0)`;
    });

    /* --- Depth stacks (fake-3D layered photos) --------------- */
    depthStacks.forEach((stack) => {
      const rect = stack.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) return;
      const progress = (vh - rect.top) / (vh + rect.height);   // 0 → 1
      const t = Math.max(0, Math.min(1, progress));

      const back  = stack.querySelector('.depth-back');
      const mid   = stack.querySelector('.depth-mid');
      const front = stack.querySelector('.depth-front');

      if (back)  back.style.transform  = `translate3d(0, ${(t - .5) * -40}px, 0) scale(${.95 + t * 0.04})`;
      if (mid)   mid.style.transform   = `translate3d(0, ${(t - .5) *  20}px, 0) scale(${1 + t * 0.02})`;
      if (front) front.style.transform = `translate3d(${(t - .5) * 22}px, ${(t - .5) * 50}px, 0) scale(${1 + t * 0.04})`;
    });

    /* --- Hero title: zoom + parallax-out as you scroll ------- */
    if (heroSection && heroTitle) {
      const rect = heroSection.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -rect.top / rect.height));
      const scale = 1 + p * 0.35;
      const ty    = -p * 90;
      const op    = 1 - p * 1.5;
      heroTitle.style.transform = `translate3d(0, ${ty}px, 0) scale(${scale})`;
      heroTitle.style.opacity = Math.max(0, op);
    }

    ticking = false;
  }

  /* -----------------------------------------------------------
   * 3. Scroll progress rail
   * --------------------------------------------------------- */
  const progressBar = document.getElementById('progressBar');
  function updateProgress() {
    if (!progressBar) return;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const p = total > 0 ? (scrollY / total) * 100 : 0;
    progressBar.style.width = p + '%';
  }

  /* -----------------------------------------------------------
   * 4. Floating nav: scroll background + mobile drawer toggle
   * --------------------------------------------------------- */
  const nav = document.querySelector('.nav');
  const navToggle = document.querySelector('.nav-toggle');
  const navBackdrop = document.querySelector('.nav-backdrop');
  const navLinks = document.querySelectorAll('.nav-links a');

  function updateNav() {
    if (!nav) return;
    nav.classList.toggle('scrolled', scrollY > 60);
  }

  function setNavOpen(open) {
    if (!nav) return;
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    }
  }

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      setNavOpen(!nav.classList.contains('is-open'));
    });
  }
  if (navBackdrop) {
    navBackdrop.addEventListener('click', () => setNavOpen(false));
  }
  navLinks.forEach((a) => a.addEventListener('click', () => setNavOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav && nav.classList.contains('is-open')) setNavOpen(false);
  });

  /* -----------------------------------------------------------
   * 5. Card stagger reveal — extra polish (cinematic timing)
   * --------------------------------------------------------- */
  const cardObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const cards = entry.target.querySelectorAll('.card');
      cards.forEach((card, i) => {
        setTimeout(() => card.classList.add('is-visible'), 120 * i);
      });
      cardObs.unobserve(entry.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.cards').forEach((c) => cardObs.observe(c));

  /* -----------------------------------------------------------
   * 6. Speisekarte — flippable booklet
   * --------------------------------------------------------- */
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

    function flipUpdate() {
      const pct = current * (100 / N);
      track.style.transform = `translateX(-${pct}%)`;
      dots.forEach((d, i) => d.classList.toggle('is-active', i === current));
      if (curEl)   curEl.textContent   = current + 1;
      if (titleEl) titleEl.textContent = pages[current].dataset.title || '';
      if (prevBtn) prevBtn.toggleAttribute('disabled', current <= 0);
      if (nextBtn) nextBtn.toggleAttribute('disabled', current >= N - 1);
    }

    function go(delta) {
      const target = Math.max(0, Math.min(N - 1, current + delta));
      if (target !== current) { current = target; flipUpdate(); }
    }

    if (prevBtn) prevBtn.addEventListener('click', () => go(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => go(+1));
    dots.forEach((dot) => dot.addEventListener('click', () => {
      const t = parseInt(dot.dataset.page, 10);
      if (!Number.isNaN(t)) { current = t; flipUpdate(); }
    }));

    // Keyboard arrows when card focused
    const card = booklet.querySelector('.menu-card');
    if (card) {
      card.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); go(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); go(+1); }
      });
    }

    // Touch swipe
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

  /* -----------------------------------------------------------
   * 6b. Modals with WCAG focus management
   *     (Impressum · Datenschutz · Speisekarte · Reservation · Mittagsmenü)
   * --------------------------------------------------------- */
  const modalTriggers = document.querySelectorAll('[data-modal]');
  const modals = document.querySelectorAll('.modal');
  const modalStack = []; // remembers which element to refocus when each modal closes

  const FOCUSABLE = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  function getFocusable(container) {
    return Array.from(container.querySelectorAll(FOCUSABLE)).filter((el) => {
      // visible & not aria-hidden
      return el.offsetParent !== null && !el.closest('[aria-hidden="true"]');
    });
  }

  function trapTab(e) {
    if (e.key !== 'Tab') return;
    const m = e.currentTarget;
    const focusables = getFocusable(m);
    if (!focusables.length) { e.preventDefault(); return; }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openModal(id) {
    const m = document.getElementById('modal-' + id);
    if (!m) return;
    // Remember the trigger so we can restore focus on close.
    modalStack.push({ modal: m, trigger: document.activeElement });
    m.hidden = false;
    document.body.classList.add('modal-open');
    m.addEventListener('keydown', trapTab);
    requestAnimationFrame(() => {
      const close = m.querySelector('.modal-close');
      if (close) close.focus();
    });
  }

  function closeModal(m) {
    if (!m || m.hidden) return;
    m.hidden = true;
    m.removeEventListener('keydown', trapTab);
    if (!document.querySelector('.modal:not([hidden])')) {
      document.body.classList.remove('modal-open');
    }
    // Restore focus to whatever opened this modal.
    const entry = modalStack.pop();
    if (entry && entry.trigger && typeof entry.trigger.focus === 'function') {
      try { entry.trigger.focus({ preventScroll: true }); } catch (_) { entry.trigger.focus(); }
    }
  }

  modalTriggers.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = btn.dataset.modal;
      if (!id) return;
      e.preventDefault();
      // If we're inside another modal that contains this trigger, close it first
      // so the back-link feels like a transition, not a stack of overlays.
      const enclosingOpenModal = btn.closest('.modal:not([hidden])');
      if (enclosingOpenModal) closeModal(enclosingOpenModal);
      openModal(id);
    });
  });

  modals.forEach((m) => {
    m.querySelectorAll('[data-modal-close]').forEach((el) => {
      el.addEventListener('click', () => closeModal(m));
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = document.querySelector('.modal:not([hidden])');
    if (open) closeModal(open);
  });

  /* -----------------------------------------------------------
   * 7. Reservation form — mailto handoff
   * --------------------------------------------------------- */
  const resForm = document.querySelector('.reservation-form');
  if (resForm) {
    const status = resForm.querySelector('.form-status');

    // Set min date = today
    const dateInput = resForm.querySelector('input[name="date"]');
    if (dateInput) {
      const t = new Date();
      const yyyy = t.getFullYear();
      const mm = String(t.getMonth() + 1).padStart(2, '0');
      const dd = String(t.getDate()).padStart(2, '0');
      dateInput.min = `${yyyy}-${mm}-${dd}`;
    }

    function showStatus(msg, isError) {
      if (!status) return;
      status.hidden = false;
      status.textContent = msg;
      status.classList.toggle('is-error', !!isError);
    }

    // Clear aria-invalid as soon as the user starts correcting a field.
    resForm.querySelectorAll('input, select, textarea').forEach((field) => {
      field.addEventListener('input', () => {
        if (field.value && field.value.toString().trim()) {
          field.setAttribute('aria-invalid', 'false');
        }
      });
    });

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

      // Mark missing fields with aria-invalid (WCAG SC 3.3.1)
      const fieldsRequired = { date, time, guests, name, email, phone };
      let firstInvalid = null;
      Object.entries(fieldsRequired).forEach(([key, value]) => {
        const field = resForm.querySelector(`[name="${key}"]`);
        if (!field) return;
        const invalid = !value;
        field.setAttribute('aria-invalid', invalid ? 'true' : 'false');
        if (invalid && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        showStatus('Bitte füllen Sie alle Pflichtfelder aus.', true);
        try { firstInvalid.focus({ preventScroll: false }); } catch (_) { firstInvalid.focus(); }
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
      if (notes) { body.push('', 'Bemerkungen:', notes); }

      const mailto = `mailto:info@fischfischbach.ch`
        + `?subject=${encodeURIComponent(subject)}`
        + `&body=${encodeURIComponent(body.join('\n'))}`;

      showStatus('Vielen Dank! Ihr E-Mail-Programm öffnet sich nun. Senden Sie die Anfrage ab — wir bestätigen Ihre Reservation umgehend.', false);
      window.location.href = mailto;
    });
  }

  /* -----------------------------------------------------------
   * 6. Init
   * --------------------------------------------------------- */
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => requestTick(), { passive: true });

  // Set year in footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* -----------------------------------------------------------
   * 8. Cookie banner — only technical cookies, simple ack
   * --------------------------------------------------------- */
  const cookieBanner = document.getElementById('cookie-banner');
  const cookieAccept = document.getElementById('cookie-accept');
  const cookieReopen = document.getElementById('cookie-reopen');
  const COOKIE_KEY   = 'fisch-cookies-acked';

  function showCookieBanner() {
    if (!cookieBanner) return;
    cookieBanner.hidden = false;
    requestAnimationFrame(() => cookieBanner.classList.add('is-visible'));
  }
  function hideCookieBanner() {
    if (!cookieBanner) return;
    cookieBanner.classList.remove('is-visible');
    setTimeout(() => { cookieBanner.hidden = true; }, 1000);
  }

  // First visit? Show after a short pause so the page settles.
  let alreadyAcked = false;
  try { alreadyAcked = localStorage.getItem(COOKIE_KEY) === '1'; } catch (_) {}
  if (!alreadyAcked) setTimeout(showCookieBanner, 1100);

  if (cookieAccept) {
    cookieAccept.addEventListener('click', () => {
      try { localStorage.setItem(COOKIE_KEY, '1'); } catch (_) {}
      hideCookieBanner();
    });
  }
  if (cookieReopen) {
    cookieReopen.addEventListener('click', () => {
      try { localStorage.removeItem(COOKIE_KEY); } catch (_) {}
      showCookieBanner();
    });
  }

  // First paint
  update();
  updateProgress();
  updateNav();

  // Smooth-scroll cue: pause animation a beat after load (prevents flash)
  window.addEventListener('load', () => {
    document.body.classList.add('is-loaded');
    update();
  });

  /* -----------------------------------------------------------
   * 9. Land on hero on every fresh visit
   *    (suppress browser scroll-restoration to last position)
   * --------------------------------------------------------- */
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
  window.addEventListener('load', () => {
    if (!window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  });

  /* -----------------------------------------------------------
   * 10. Mittagsmenü pop-up — opens on every visit
   *     + marks today's row if the visit date matches a menu day
   * --------------------------------------------------------- */
  const lunchModal = document.getElementById('modal-mittagsmenu');
  if (lunchModal) {
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    lunchModal.querySelectorAll('.lunch-day').forEach((day) => {
      if (day.dataset.date === todayIso) day.classList.add('is-today');
    });

    // Always open on page load (give the page a moment to settle)
    setTimeout(() => openModal('mittagsmenu'), 800);
  }

  /* -----------------------------------------------------------
   * 11. Anchor links inside a modal close the modal first, so the
   *     user actually sees what they navigated to (e.g. the
   *     "Jetzt reservieren" link in the Mittagsmenü → #reservation).
   * --------------------------------------------------------- */
  modals.forEach((m) => {
    m.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', () => closeModal(m));
    });
  });
})();
