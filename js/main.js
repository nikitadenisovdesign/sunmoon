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
      const idle = cfg.spin; // resting spin (set in data-pattern-config)
      document.querySelectorAll('#services .bracket').forEach((br) => {
        br.addEventListener('pointerenter', () => {
          gsap.to(cfg, { spin: idle + 4, duration: 0.6, ease: 'power2.out' });
        });
        br.addEventListener('pointerleave', () => {
          gsap.to(cfg, { spin: idle, duration: 0.9, ease: 'power2.out' });
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

      // Click anywhere on the section toggles the reveal: first click
      // grows the overlay canvas + slides the mark to centre, second
      // click reverses everything back to the resting state.
      let revealed = false;
      banner.addEventListener('click', () => {
        if (!overlayCanvas || !overlayCfg) return;

        if (!revealed) {
          revealed = true;
          banner.classList.remove('cursor-pointer');

          // Compute how far the mark needs to travel up to land on
          // the section's vertical centre (text + 40px gap go invisible).
          let markShift = 0;
          if (bannerText && bannerMark) {
            const textH = bannerText.getBoundingClientRect().height;
            const markStyle = window.getComputedStyle(bannerMark);
            const gap = parseFloat(markStyle.marginTop) || 0;
            markShift = (textH + gap) / 2;
            bannerMark.dataset.markShift = String(markShift);
          }

          if (bannerText) {
            gsap.killTweensOf(bannerText);
            gsap.to(bannerText, { opacity: 0, y: -24, duration: 0.7, ease: 'power2.in' });
          }
          if (bannerMark && markShift) {
            gsap.killTweensOf(bannerMark);
            gsap.to(bannerMark, { y: -markShift, duration: 1.0, ease: 'power2.inOut', delay: 0.2 });
          }

          gsap.killTweensOf(overlayCanvas);
          gsap.to(overlayCanvas, { opacity: 1, duration: 1.2, ease: 'power2.out' });

          gsap.killTweensOf(overlayCfg);
          overlayCfg.l1len = 0.1;
          overlayCfg.spin = 0;
          gsap.to(overlayCfg, { l1len: 1, duration: 6, ease: 'power2.inOut' });
          gsap.to(overlayCfg, { spin: 3, duration: 6, ease: 'power2.inOut' });
        } else {
          revealed = false;
          banner.classList.add('cursor-pointer');

          // Reverse: pattern shrinks, canvas fades out, text + mark
          // come back to their resting positions.
          gsap.killTweensOf(overlayCfg);
          gsap.killTweensOf(overlayCanvas);
          if (bannerText) gsap.killTweensOf(bannerText);
          if (bannerMark) gsap.killTweensOf(bannerMark);

          gsap.to(overlayCfg, { l1len: 0.1, duration: 1.2, ease: 'power2.inOut' });
          gsap.to(overlayCfg, { spin: 0, duration: 1.2, ease: 'power2.inOut' });
          gsap.to(overlayCanvas, { opacity: 0, duration: 1.0, ease: 'power2.inOut', delay: 0.3 });

          if (bannerMark) {
            gsap.to(bannerMark, { y: 0, duration: 0.9, ease: 'power2.inOut', delay: 0.2 });
          }
          if (bannerText) {
            gsap.to(bannerText, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.5 });
          }
        }
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

  /* ----- HK perspective images entrance (desktop + mobile) ----- */
  if (gsap && window.ScrollTrigger && !reduceMotion) {
    const hkImgs = document.querySelectorAll('.hk-img, .hk-img-m');
    if (hkImgs.length) {
      gsap.from(hkImgs, {
        opacity: 0,
        scale: 0.85,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.04,
        scrollTrigger: { trigger: '.hk', start: 'top 80%', once: true },
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

  /* ----- Work deck: cycle through cases on NEXT WORK + hover title flip ----- */
  const WORKS = [
    {
      title: 'MERIDIAN',
      body: "Dubai Opera's decade anniversary demanded equal parts cultural reverence and spectacle. We built a 90-minute production fusing Arabic classical music with real-time generative visuals — light, sound, and movement as one.",
      meta: '2025, DUBAI',
      image: 'photos/UP-Rectangle 25626.webp',
      alt: 'Meridian — Dubai Opera production',
    },
    {
      title: 'AURORA',
      body: 'Island Records wanted a regional launch for an emerging artist built on cultural heat, not a conventional tour. We produced three site-specific concerts across Singapore, Kuala Lumpur, and Bangkok — each city its own show, no setlist repeated.',
      meta: '2025, SOUTHEAST ASIA',
      image: 'photos/UP-Rectangle 25627.webp',
      alt: 'Aurora — Southeast Asia tour',
    },
    {
      title: 'HOLLOW',
      body: 'Bottega Veneta needed a brand moment in Asia that could bypass the noise of fashion week entirely. We transformed a raw Kennedy Town warehouse for 200 guests — turning material, sound, and silence into a landscape you moved through, not watched.',
      meta: '2025, HONG KONG',
      image: 'photos/UP-Rectangle 25628.webp',
      alt: 'Hollow — Bottega Veneta installation',
    },
    {
      title: 'FORMA',
      body: "Kering's new Shanghai headquarters needed an opening that felt neither corporate nor conventional. We mapped the building's geometry with live projection and an original score performed by a 12-piece ensemble — the architecture became the stage.",
      meta: '2025, SHANGHAI',
      image: 'photos/UP-Rectangle 25629.webp',
      alt: 'Forma — Kering HQ opening',
    },
  ];

  const workDeck = document.querySelector('[data-work-deck]');
  const workTitle = workDeck?.querySelector('[data-work-title]');
  const workBody = workDeck?.querySelector('[data-work-body]');
  const workMeta = workDeck?.querySelector('[data-work-meta]');
  const workImage = workDeck?.querySelector('[data-work-image]');
  const nextWorkBtn = workDeck?.querySelector('[data-next-work]');

  if (workDeck && workTitle && gsap) {
    // Hover anywhere on the deck → title flips light-grey → white
    workDeck.addEventListener('pointerenter', () => gsap.to(workTitle, { color: '#ffffff', duration: 0.4 }));
    workDeck.addEventListener('pointerleave', () => gsap.to(workTitle, { color: '#959595', duration: 0.4 }));
  }

  if (workDeck && workTitle && workBody && workMeta && workImage && nextWorkBtn && gsap) {
    // Warm the cache so swaps don't flash.
    WORKS.forEach((w) => { const i = new Image(); i.src = w.image; });

    const figure = workImage.closest('figure');
    // Prime the figure for clip-path tweening (GSAP can't tween from `none`).
    if (figure) gsap.set(figure, { clipPath: 'inset(0% 0% 0% 0%)' });

    let workIndex = 0;
    let swapping = false;

    nextWorkBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (swapping) return;
      swapping = true;

      const nextIndex = (workIndex + 1) % WORKS.length;
      const next = WORKS[nextIndex];

      const tl = gsap.timeline({
        onComplete: () => {
          workIndex = nextIndex;
          swapping = false;
        },
      });

      // Phase 1 — Out: text scrolls up, the image curtain rolls upward and
      // collapses to the top edge of the figure.
      tl.to([workTitle, workBody, workMeta], {
        y: -36,
        opacity: 0,
        duration: 0.45,
        ease: 'power3.in',
        stagger: 0.05,
      }, 0);
      if (figure) {
        tl.to(figure, {
          clipPath: 'inset(0% 0% 100% 0%)',
          duration: 0.6,
          ease: 'power3.inOut',
        }, 0.05);
      }

      // Phase 2 — Swap content while everything is invisible/clipped.
      tl.add(() => {
        workTitle.textContent = next.title;
        workBody.textContent = next.body;
        workMeta.textContent = next.meta;
        workImage.src = next.image;
        workImage.alt = next.alt;
      });
      if (figure) tl.set(figure, { clipPath: 'inset(100% 0% 0% 0%)' });
      tl.set([workTitle, workBody, workMeta], { y: 36, opacity: 0 });

      // Phase 3 — In: figure unrolls from the bottom up, then text scrolls in
      // from below with a small stagger overlapping the reveal.
      if (figure) {
        tl.to(figure, {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 0.9,
          ease: 'expo.out',
        });
      }
      tl.to([workTitle, workBody, workMeta], {
        y: 0,
        opacity: 1,
        duration: 0.75,
        ease: 'expo.out',
        stagger: 0.07,
      }, '<+0.12');
    });
  }

  /* ----- HK perspective subtle scroll parallax ----- */
  if (gsap && window.ScrollTrigger && !reduceMotion) {
    gsap.utils.toArray('.hk-img, .hk-img-m').forEach((img, i) => {
      const depth = ((i % 5) - 2) * 14;
      gsap.to(img, {
        y: depth,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hk',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6,
        },
      });
    });
  }

  /* ----- Showreel video: fade in once it can actually play ----- */
  {
    const reel = document.querySelector('[data-showreel]');
    if (reel) {
      const reveal = () => reel.classList.remove('opacity-0');
      // HAVE_FUTURE_DATA — already buffered enough to start.
      if (reel.readyState >= 3) reveal();
      else reel.addEventListener('canplay', reveal, { once: true });
    }
  }

  /* ----- Year freshness ----- */
  const y = new Date().getFullYear();
  if (y > 2026) {
    document.querySelectorAll('footer span').forEach((el) => {
      if (el.textContent.trim() === '2026') el.textContent = String(y);
    });
  }
})();
