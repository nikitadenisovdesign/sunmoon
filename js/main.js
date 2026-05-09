/* ---------------------------------------------------------------
   SUNMOON — interactions powered by GSAP + ScrollTrigger
--------------------------------------------------------------- */

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // GSAP must have loaded from CDN
  const { gsap } = window;
  if (gsap && window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  /* ----- Header shrink on scroll ----- */
  const header = document.querySelector('[data-header]');
  if (header && gsap?.ScrollTrigger || window.ScrollTrigger) {
    ScrollTrigger.create({
      start: 60,
      end: 99999,
      onUpdate: (self) => header.classList.toggle('is-shrunk', self.scroll() > 60),
    });
  }

  /* ----- Mobile menu toggle ----- */
  const menuBtn = document.querySelector('[data-menu-btn]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  if (menuBtn && mobileMenu) {
    const close = () => {
      menuBtn.classList.remove('is-open');
      mobileMenu.hidden = true;
      document.body.style.overflow = '';
    };
    menuBtn.addEventListener('click', () => {
      const opening = !menuBtn.classList.contains('is-open');
      menuBtn.classList.toggle('is-open', opening);
      mobileMenu.hidden = !opening;
      document.body.style.overflow = opening ? 'hidden' : '';
      if (opening && gsap) {
        gsap.from(mobileMenu.querySelectorAll('a'), {
          y: 30, opacity: 0, stagger: 0.06, duration: 0.5, ease: 'power3.out'
        });
      }
    });
    mobileMenu.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') close();
    });
  }

  /* ----- Hero title rise ----- */
  if (gsap && !reduceMotion) {
    gsap.from('.hero-title .line', {
      yPercent: 110,
      opacity: 0,
      duration: 1.1,
      ease: 'power3.out',
      stagger: 0.12,
      delay: 0.25,
    });
    gsap.from('.hero-tagline', {
      y: 18, opacity: 0, duration: 1, delay: 0.9, ease: 'power2.out'
    });
    gsap.from('.scroll-cue', {
      opacity: 0, duration: 1, delay: 1.2, ease: 'power2.out'
    });
  }

  /* ----- Scroll reveals ----- */
  if (gsap && window.ScrollTrigger) {
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      if (el.classList.contains('hero')) return; // hero already animated
      gsap.from(el, {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true,
        },
      });
    });
  }

  /* ----- Stats count-up ----- */
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    if (!gsap || !window.ScrollTrigger || reduceMotion) {
      el.textContent = target + suffix;
      return;
    }
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 1.8,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate: () => { el.textContent = Math.round(obj.v) + suffix; },
    });
  });

  /* ----- Bracket service-card stagger ----- */
  if (gsap && window.ScrollTrigger && !reduceMotion) {
    document.querySelectorAll('.bracket').forEach((el) => {
      gsap.from(el.querySelectorAll('.b'), {
        scale: 0.4,
        opacity: 0,
        duration: 0.6,
        stagger: 0.06,
        ease: 'back.out(1.6)',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      });
    });
  }

  /* ----- Services brackets nudge the pattern with a gentle spin on hover ----- */
  if (gsap && !reduceMotion && window.matchMedia('(hover: hover)').matches) {
    const cfg = document.querySelector('#services canvas[data-pattern]')?._patternConfig;
    if (cfg) {
      document.querySelectorAll('#services .bracket').forEach((br, i) => {
        const dir = i === 0 ? 3 : -3; // top: +3°/s, bottom: -3°/s
        br.addEventListener('pointerenter', () => {
          gsap.to(cfg, { spin: dir, duration: 0.6, ease: 'power2.out' });
        });
        br.addEventListener('pointerleave', () => {
          gsap.to(cfg, { spin: 0, duration: 0.9, ease: 'power2.out' });
        });
      });
    }
  }

  /* ----- Banner: hover the mark spins the base pattern; click fades text and overlays a second canvas ----- */
  if (gsap && !reduceMotion) {
    const banner = document.querySelector('[data-banner]');
    const baseCanvas = banner?.querySelector('canvas[data-pattern]:not([data-banner-overlay])');
    const overlayCanvas = banner?.querySelector('[data-banner-overlay]');
    const baseCfg = baseCanvas?._patternConfig;
    const overlayCfg = overlayCanvas?._patternConfig;
    const bannerMark = banner?.querySelector('.banner-mark');
    const bannerText = banner?.querySelector('[data-banner-text]');

    if (banner && baseCfg) {
      // Hover the mark → gentle spin on the base canvas (the horizontal strip
      // pattern that's always on). Stays active even after the click reveal.
      if (bannerMark && window.matchMedia('(hover: hover)').matches) {
        bannerMark.addEventListener('pointerenter', () => {
          gsap.to(baseCfg, { spin: 3, duration: 0.6, ease: 'power2.out' });
        });
        bannerMark.addEventListener('pointerleave', () => {
          gsap.to(baseCfg, { spin: 0, duration: 0.9, ease: 'power2.out' });
        });
      }

      // Click anywhere on the section → fade the paragraph out (logo stays),
      // fade the overlay canvas in, and slowly grow its strip length + spin.
      let revealed = false;
      banner.addEventListener('click', () => {
        if (revealed || !overlayCanvas || !overlayCfg) return;
        revealed = true;
        banner.classList.remove('cursor-pointer');

        if (bannerText) {
          gsap.to(bannerText, { opacity: 0, y: -24, duration: 0.7, ease: 'power2.in' });
        }

        gsap.to(overlayCanvas, { opacity: 1, duration: 1.2, ease: 'power2.out' });

        gsap.killTweensOf(overlayCfg);
        overlayCfg.l1len = 0.1;
        overlayCfg.spin = 0;
        gsap.to(overlayCfg, { l1len: 1, duration: 6, ease: 'power2.inOut' });
        gsap.to(overlayCfg, { spin: 3, duration: 6, ease: 'power2.inOut' });
      });
    }
  }

  /* ----- Process steps crank Layer 1 phase animation while hovered ----- */
  if (gsap && !reduceMotion && window.matchMedia('(hover: hover)').matches) {
    const procCfg = document.querySelector('.process canvas[data-pattern]')?._patternConfig;
    if (procCfg) {
      const idle = procCfg.l1phSpd; // resting Phase Anim (set in data-pattern-config)
      document.querySelectorAll('.process .bracket').forEach((br) => {
        br.addEventListener('pointerenter', () => {
          gsap.to(procCfg, { l1phSpd: 10, duration: 0.6, ease: 'power2.out' });
        });
        br.addEventListener('pointerleave', () => {
          gsap.to(procCfg, { l1phSpd: idle, duration: 0.9, ease: 'power2.out' });
        });
      });
    }
  }

  /* ----- Process graphic gentle float ----- */
  if (gsap && !reduceMotion) {
    const procImg = document.querySelector('.process-graphic img');
    if (procImg) {
      gsap.to(procImg, {
        y: -6,
        duration: 3.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
      gsap.from(procImg, {
        opacity: 0,
        scale: 0.9,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: procImg, start: 'top 85%', once: true },
      });
    }
  }

  /* ----- HK perspective images entrance ----- */
  if (gsap && window.ScrollTrigger && !reduceMotion) {
    const hkImgs = document.querySelectorAll('.hk-img');
    if (hkImgs.length) {
      gsap.from(hkImgs, {
        opacity: 0,
        scale: 0.85,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.04,
        scrollTrigger: { trigger: '.hk-stage', start: 'top 80%', once: true },
      });
    }
  }

/* ----- Tilt parallax (GSAP quickTo for buttery interpolation) ----- */
  if (gsap && !reduceMotion) {
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      const setX = gsap.quickTo(el, 'rotateY', { duration: 0.6, ease: 'power2.out' });
      const setY = gsap.quickTo(el, 'rotateX', { duration: 0.6, ease: 'power2.out' });
      el.style.transformPerspective = '1100px';
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        setX(x * 6);
        setY(-y * 4);
      });
      el.addEventListener('pointerleave', () => { setX(0); setY(0); });
    });
  }

  /* ----- Custom cursor (GSAP quickTo follow) ----- */
  const cursor = document.querySelector('.cursor');
  if (cursor && gsap && window.matchMedia('(hover: hover)').matches) {
    const setX = gsap.quickTo(cursor, 'x', { duration: 0.25, ease: 'power3.out' });
    const setY = gsap.quickTo(cursor, 'y', { duration: 0.25, ease: 'power3.out' });
    document.addEventListener('pointermove', (e) => { setX(e.clientX); setY(e.clientY); });
    document.querySelectorAll('a, button, [data-tilt]').forEach((el) => {
      el.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
    });
  }

  /* ----- Work title color flip on hover (Tailwind couldn't reach inside) ----- */
  const workCard = document.querySelector('[data-work-title]')?.closest('article');
  const workTitle = document.querySelector('[data-work-title]');
  if (workCard && workTitle && gsap) {
    workCard.addEventListener('pointerenter', () => gsap.to(workTitle, { color: '#ffffff', duration: 0.4 }));
    workCard.addEventListener('pointerleave', () => gsap.to(workTitle, { color: '#525252', duration: 0.4 }));
  }

  /* ----- HK perspective subtle scroll parallax ----- */
  if (gsap && window.ScrollTrigger && !reduceMotion) {
    gsap.utils.toArray('.hk-img').forEach((img, i) => {
      const depth = ((i % 5) - 2) * 14;
      gsap.to(img, {
        y: depth,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hk-stage',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6,
        },
      });
    });
  }

  /* ----- Year freshness ----- */
  const y = new Date().getFullYear();
  if (y > 2026) {
    document.querySelectorAll('footer span').forEach((el) => {
      if (el.textContent.trim() === '2026') el.textContent = String(y);
    });
  }
})();
