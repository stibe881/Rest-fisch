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

  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const delay = parseInt(el.dataset.delay || '0', 10);
      setTimeout(() => el.classList.add('is-visible'), delay);
      revealObs.unobserve(el);
    });
  }, {
    threshold: 0.18,
    rootMargin: '0px 0px -8% 0px',
  });

  revealEls.forEach((el) => revealObs.observe(el));

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
  const heroLogo    = document.querySelector('.hero-logo');
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

    /* --- Hero logo: zoom + parallax-out as you scroll -------- */
    if (heroSection && heroLogo) {
      const rect = heroSection.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -rect.top / rect.height));
      const scale = 1 + p * 0.5;
      const ty    = -p * 100;
      const op    = 1 - p * 1.4;
      heroLogo.style.transform = `translate3d(0, ${ty}px, 0) scale(${scale})`;
      heroLogo.style.opacity = Math.max(0, op);
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
   * 4. Floating nav background after scroll
   * --------------------------------------------------------- */
  const nav = document.querySelector('.nav');
  function updateNav() {
    if (!nav) return;
    nav.classList.toggle('scrolled', scrollY > 60);
  }

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
  }, { threshold: 0.2 });
  document.querySelectorAll('.cards').forEach((c) => cardObs.observe(c));

  /* -----------------------------------------------------------
   * 6. Init
   * --------------------------------------------------------- */
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => requestTick(), { passive: true });

  // Set year in footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // First paint
  update();
  updateProgress();
  updateNav();

  // Smooth-scroll cue: pause animation a beat after load (prevents flash)
  window.addEventListener('load', () => {
    document.body.classList.add('is-loaded');
    update();
  });
})();
