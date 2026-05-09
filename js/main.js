/* ---------------------------------------------------------------
   SUNMOON
   Interactions: header shrink, scroll reveals, count-up,
   showreel toggle, parallax tilt, custom cursor, mobile menu.
--------------------------------------------------------------- */

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----- Header shrink on scroll ----- */
  const header = document.querySelector('[data-header]');
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('is-shrunk', window.scrollY > 60);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ----- Mobile menu ----- */
  const menuBtn = document.querySelector('[data-menu-btn]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  if (menuBtn && mobileMenu) {
    const closeMenu = () => {
      menuBtn.classList.remove('is-open');
      mobileMenu.hidden = true;
      document.body.style.overflow = '';
    };
    menuBtn.addEventListener('click', () => {
      const opening = !menuBtn.classList.contains('is-open');
      menuBtn.classList.toggle('is-open', opening);
      mobileMenu.hidden = !opening;
      document.body.style.overflow = opening ? 'hidden' : '';
    });
    mobileMenu.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') closeMenu();
    });
  }

  /* ----- Reveal on scroll ----- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ----- Count-up stats ----- */
  const counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const co = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        const duration = 1600;
        const start = performance.now();
        const ease = (t) => 1 - Math.pow(1 - t, 3);
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const v = Math.floor(ease(t) * target);
          el.textContent = v + suffix;
          if (t < 1) requestAnimationFrame(tick);
          else el.textContent = target + suffix;
        };
        requestAnimationFrame(tick);
        co.unobserve(el);
      }
    }, { threshold: 0.4 });
    counters.forEach((el) => co.observe(el));
  } else {
    counters.forEach((el) => {
      el.textContent = el.dataset.count + (el.dataset.suffix || '');
    });
  }

  /* ----- Showreel ----- */
  const reel = document.querySelector('[data-showreel]');
  const reelFrame = reel ? reel.closest('.showreel-frame') : null;
  const reelBtn = document.querySelector('[data-showreel-btn]');
  if (reel && reelFrame && reelBtn) {
    let playing = false;
    const toggle = () => {
      playing = !playing;
      reelFrame.classList.toggle('is-playing', playing);
      if (playing) {
        reel.play().catch(() => {});
        reelBtn.querySelector('.showreel-label').textContent = 'PAUSE';
      } else {
        reel.pause();
        reelBtn.querySelector('.showreel-label').textContent = 'SEE SHOWREEL';
      }
    };
    reelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });
    reelFrame.addEventListener('click', toggle);
  }

  /* ----- Tilt / parallax on cards ----- */
  const tiltEls = document.querySelectorAll('[data-tilt]');
  if (!reduceMotion) {
    tiltEls.forEach((el) => {
      let raf = 0;
      const onMove = (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transform = `perspective(1100px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`;
        });
      };
      const reset = () => {
        cancelAnimationFrame(raf);
        el.style.transform = '';
      };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', reset);
    });
  }

  /* ----- Custom cursor ----- */
  const cursor = document.querySelector('.cursor');
  if (cursor && window.matchMedia('(hover: hover)').matches) {
    let cx = 0, cy = 0, tx = 0, ty = 0;
    document.addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
    });
    const tick = () => {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    const hoverables = document.querySelectorAll('a, button, [data-tilt], [data-cursor]');
    hoverables.forEach((el) => {
      el.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
    });
  }

  /* ----- Subtle scroll parallax for HK panes ----- */
  const hkPanes = document.querySelectorAll('.hk-pane .pane');
  if (hkPanes.length && !reduceMotion) {
    const stage = document.querySelector('.hk-stage');
    let ticking = false;
    const scrollHandler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (stage) {
          const rect = stage.getBoundingClientRect();
          const center = rect.top + rect.height / 2 - window.innerHeight / 2;
          const t = Math.max(-1, Math.min(1, -center / window.innerHeight));
          hkPanes.forEach((pane, i) => {
            const depth = (i % 4) * 6;
            pane.style.setProperty('--tparx', `${t * depth}px`);
            pane.style.transform += '';
          });
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });
  }

  /* ----- Year ----- */
  const yearEl = document.querySelector('.year');
  if (yearEl) {
    const y = new Date().getFullYear();
    if (y > 2026) yearEl.textContent = String(y);
  }
})();
