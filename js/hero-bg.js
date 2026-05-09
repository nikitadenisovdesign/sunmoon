/* ---------------------------------------------------------------
   SUNMOON — Hero kaleidoscope background
   Procedural mirrored gradient strips on canvas.
--------------------------------------------------------------- */

(function () {
  const cv = document.getElementById('hero-canvas');
  if (!cv) return;
  const cx = cv.getContext('2d');
  if (!cx) return;

  /* Settings baked from Pattern Studio session */
  const C = {
    speed:    0.03,
    noise:    0.25,
    grain:    64,
    spin:     4,        // °/s global rotation

    n1:       23,
    ga1:      15,       // Grad° L1
    sa1:      -75,      // Rot°  L1
    l1phase:  0,
    l1phSpd:  0,        // Ph.Anim L1
    l1len:    1,

    n2:       22,
    ga2:      -20,      // Grad° L2
    sa2:      60,       // Rot°  L2
    l2phase:  0,
    l2phSpd:  0,        // Ph.Anim L2
    l2len:    1,
  };

  const STOPS = [
    [0,    '#020100'],
    [0.16, '#0A66FB'],
    [0.33, '#F89BD9'],
    [0.49, '#FFFFFF'],
    [0.65, '#FFBE27'],
    [0.82, '#FF4400'],
    [1,    '#020100'],
  ];

  let W = 0, H = 0, t = 0, ra = 0, p1 = 0, p2 = 0, last = null;
  const oA = { c: null, x: null, w: 0, h: 0 };
  const oB = { c: null, x: null, w: 0, h: 0 };
  const oT = { c: null, x: null, d: 0 };

  /* Noise texture */
  const NC = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const nx = c.getContext('2d');
    const id = nx.createImageData(512, 512);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = d[i + 1] = d[i + 2] = 0;
      d[i + 3] = Math.random() < 0.6 ? Math.floor(Math.random() * 200) : 0;
    }
    nx.putImageData(id, 0, 0);
    return c;
  })();

  function resize() {
    const pr = window.devicePixelRatio || 1;
    const r = cv.getBoundingClientRect();
    const w = Math.floor(r.width);
    const h = Math.floor(r.height);
    if (!w || !h) return;
    cv.width = w * pr;
    cv.height = h * pr;
    cx.setTransform(pr, 0, 0, pr, 0, 0);
    W = w; H = h;
    oA.w = oA.h = oB.w = oB.h = oT.d = 0;
  }
  window.addEventListener('resize', resize);
  resize();

  function makeGrad(g, x, y, w, h, deg) {
    const r = deg * Math.PI / 180;
    const cx2 = x + w / 2, cy2 = y + h / 2;
    const L = Math.abs(Math.cos(r)) * w / 2 + Math.abs(Math.sin(r)) * h / 2;
    const gd = g.createLinearGradient(
      cx2 - Math.cos(r) * L, cy2 - Math.sin(r) * L,
      cx2 + Math.cos(r) * L, cy2 + Math.sin(r) * L
    );
    STOPS.forEach(([p, c]) => gd.addColorStop(p, c));
    return gd;
  }

  function ensOff(ref, qW, qH) {
    if (ref.w === qW && ref.h === qH) return;
    ref.c = document.createElement('canvas');
    ref.c.width = qW; ref.c.height = qH;
    ref.x = ref.c.getContext('2d');
    ref.w = qW; ref.h = qH;
  }

  function ensTemp(D) {
    if (oT.d === D) return;
    oT.c = document.createElement('canvas');
    oT.c.width = oT.c.height = D;
    oT.x = oT.c.getContext('2d');
    oT.d = D;
  }

  function drawStrips(ctx, w, h, ti, N, gAng, len) {
    for (let i = 0; i < N; i++) {
      const sy = Math.round(i * h / N);
      const sh = Math.round((i + 1) * h / N) - sy;
      const base = w * (N - i) / N;
      const pulse = 0.5 + 0.5 * Math.abs(Math.sin(ti * C.speed + i * 0.71));
      const sw = Math.max(2, base * pulse * len) + 1;
      const sx = Math.max(0, w - sw);
      const swa = w - sx;
      ctx.fillStyle = makeGrad(ctx, sx, sy, swa, sh, gAng);
      ctx.fillRect(sx, sy, swa, sh);
    }
  }

  function drawRotated(ctx, qW, qH, ti, N, gAng, sAng, len) {
    const D = Math.ceil(Math.hypot(qW, qH));
    if (!D) return;
    ensTemp(D);
    oT.x.clearRect(0, 0, D, D);
    drawStrips(oT.x, D, D, ti, N, gAng, len);
    ctx.save();
    ctx.translate(qW * 0.5, qH * 0.5);
    ctx.rotate(sAng * Math.PI / 180);
    ctx.drawImage(oT.c, -D * 0.5, -D * 0.5);
    ctx.restore();
  }

  function mirror4(src, dst, dW, dH) {
    dst.drawImage(src, 0, 0);
    dst.save(); dst.translate(dW, 0); dst.scale(-1, 1); dst.drawImage(src, 0, 0); dst.restore();
    dst.save(); dst.translate(0, dH); dst.scale(1, -1); dst.drawImage(src, 0, 0); dst.restore();
    dst.save(); dst.translate(dW, dH); dst.scale(-1, -1); dst.drawImage(src, 0, 0); dst.restore();
  }

  let running = true;
  // Pause when off-screen to save battery / cycles
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) running = e.isIntersecting;
    }, { threshold: 0 });
    io.observe(cv);
  }
  // Respect reduced-motion: render a single still frame
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function frame(ts) {
    if (!W || !H) { resize(); requestAnimationFrame(frame); return; }
    if (last !== null && running && !reduceMotion) {
      const dt = (ts - last) * 0.001;
      t  += dt;
      ra += C.spin * Math.PI / 180 * dt;
      p1 += C.l1phSpd * dt;
      p2 += C.l2phSpd * dt;
    }
    last = ts;

    cx.fillStyle = '#0a0a0b';
    cx.fillRect(0, 0, W, H);

    const qW = Math.ceil(W / 2), qH = Math.ceil(H / 2);
    if (!qW || !qH) { requestAnimationFrame(frame); return; }

    ensOff(oA, qW, qH);
    ensOff(oB, qW, qH);
    oA.x.clearRect(0, 0, qW, qH);
    oB.x.clearRect(0, 0, qW, qH);

    const a1 = C.sa1 + ra * (180 / Math.PI);
    const a2 = C.sa2 - ra * (180 / Math.PI);

    drawRotated(oA.x, qW, qH, t + (C.l1phase + p1), C.n1, C.ga1, a1, C.l1len);
    drawRotated(oB.x, qW, qH, t + (C.l2phase + p2), C.n2, C.ga2, a2, C.l2len);

    mirror4(oA.c, cx, W, H);
    mirror4(oB.c, cx, W, H);

    /* Noise overlay */
    if (C.noise > 0) {
      const g = C.grain;
      cx.save();
      cx.globalCompositeOperation = 'multiply';
      cx.globalAlpha = C.noise;
      for (let x = 0; x <= W; x += g)
        for (let y = 0; y <= H; y += g)
          cx.drawImage(NC, x, y, g, g);
      cx.restore();
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
