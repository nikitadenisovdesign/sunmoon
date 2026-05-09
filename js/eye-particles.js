/* ---------------------------------------------------------------
   SUNMOON — Eye Particles (MVP)
   Particles drift across the screen and scatter from the user's
   gaze. Iris position is read with MediaPipe FaceLandmarker, which
   is loaded as an ES module from a CDN — no install required.

   Falls back to mouse movement if the camera is unavailable.
--------------------------------------------------------------- */

/* =============================================================
   CONFIG — tweak everything here.
   ============================================================= */
const CONFIG = {
  /* Visual */
  count:         520,                       // total particles
  sizeMin:       1.0,                       // px
  sizeMax:       3.4,                       // px
  colors: [                                  // sampled per particle
    '#ff5b1f', '#ffb04a', '#4f7dff',
    '#ff8acb', '#b27dff', '#ffffff',
  ],
  background:    '#0a0a0b',
  trailFade:     0.10,                      // 0 = infinite trail, 1 = no trail
  glow:          14,                        // shadowBlur, 0 to disable

  /* Ambient motion */
  drift:         0.18,                      // home-point wander speed
  jitter:        0.05,                      // per-frame random nudge
  damping:       0.93,                      // velocity friction (0..1)
  returnForce:   0.0007,                    // pull back toward home
  maxSpeed:      24,

  /* Eye interaction */
  gazeRadius:    260,                       // px — gaze repulsion field
  gazeForce:     0.55,                      // continuous push strength
  saccadeThreshold: 0.018,                  // normalized iris speed to fire burst
  saccadeForce:  22,                        // burst push magnitude
  saccadeDecay:  0.84,                      // burst impulse decay per frame
  smoothing:     0.30,                      // gaze smoothing (0 = none, 1 = frozen)
  gazeSensitivity: 1.6,                     // amplifies iris→screen mapping

  /* Camera & tracking */
  flipCamera:    true,                      // mirror so you see yourself naturally
  showCamera:    true,                      // small preview in the corner
  modelUrl:      'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  visionUrl:     'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/vision_bundle.mjs',
  wasmUrl:       'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm',
};

/* =============================================================
   Canvas + particle field
   ============================================================= */
const canvas = document.getElementById('stage');
const ctx    = canvas.getContext('2d');
const video  = document.getElementById('cam');
const startBtn = document.getElementById('start');
const statusEl = document.getElementById('status');

let W = 0, H = 0;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width  = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const particles = [];
function spawn() {
  particles.length = 0;
  for (let i = 0; i < CONFIG.count; i++) {
    const x = rand(0, W), y = rand(0, H);
    particles.push({
      x, y,
      hx: x, hy: y,                        // home (slowly drifting anchor)
      vx: 0, vy: 0,
      size:  rand(CONFIG.sizeMin, CONFIG.sizeMax),
      color: pick(CONFIG.colors),
      seed:  Math.random() * 1000,
    });
  }
}
spawn();

/* Re-seed home positions on resize so the field fills the screen */
let lastResizeW = W, lastResizeH = H;
window.addEventListener('resize', () => {
  const sx = W / lastResizeW, sy = H / lastResizeH;
  for (const p of particles) {
    p.hx *= sx; p.hy *= sy;
    p.x  *= sx; p.y  *= sy;
  }
  lastResizeW = W; lastResizeH = H;
});

/* =============================================================
   Gaze state
   ============================================================= */
const gaze     = { x: W / 2, y: H / 2, active: false };
const smoothed = { x: W / 2, y: H / 2 };
const saccade  = { x: 0, y: 0, life: 0 };
let lastIris   = null;
let tracking   = false;

/* =============================================================
   Render loop
   ============================================================= */
function frame() {
  /* Smooth the gaze cursor */
  const s = 1 - CONFIG.smoothing;
  smoothed.x += (gaze.x - smoothed.x) * s;
  smoothed.y += (gaze.y - smoothed.y) * s;

  /* Trail fade */
  ctx.fillStyle = hexWithAlpha(CONFIG.background, CONFIG.trailFade);
  ctx.fillRect(0, 0, W, H);

  if (CONFIG.glow > 0) ctx.shadowBlur = CONFIG.glow;

  const t  = performance.now();
  const r  = CONFIG.gazeRadius;
  const r2 = r * r;

  for (const p of particles) {
    /* Wander home position with smooth noise */
    p.hx += Math.cos(t * 0.00022 + p.seed)        * CONFIG.drift;
    p.hy += Math.sin(t * 0.00018 + p.seed * 1.31) * CONFIG.drift;
    if (p.hx < 0) p.hx += W; else if (p.hx > W) p.hx -= W;
    if (p.hy < 0) p.hy += H; else if (p.hy > H) p.hy -= H;

    /* Spring back to home */
    p.vx += (p.hx - p.x) * CONFIG.returnForce;
    p.vy += (p.hy - p.y) * CONFIG.returnForce;

    /* Continuous gaze repulsion */
    if (gaze.active) {
      const dx = p.x - smoothed.x;
      const dy = p.y - smoothed.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 > 0.5) {
        const d = Math.sqrt(d2);
        const f = (1 - d / r) * CONFIG.gazeForce;
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }
    }

    /* Saccade impulse — directional kick from rapid eye movement */
    if (saccade.life > 0.01) {
      const k = saccade.life * (0.6 + Math.random() * 0.4);
      p.vx += saccade.x * k;
      p.vy += saccade.y * k;
    }

    /* Brownian jitter */
    p.vx += (Math.random() - 0.5) * CONFIG.jitter;
    p.vy += (Math.random() - 0.5) * CONFIG.jitter;

    /* Damping + speed cap */
    p.vx *= CONFIG.damping;
    p.vy *= CONFIG.damping;
    const sp2 = p.vx * p.vx + p.vy * p.vy;
    if (sp2 > CONFIG.maxSpeed * CONFIG.maxSpeed) {
      const sp = Math.sqrt(sp2);
      p.vx *= CONFIG.maxSpeed / sp;
      p.vy *= CONFIG.maxSpeed / sp;
    }

    p.x += p.vx;
    p.y += p.vy;

    /* Wrap edges */
    if (p.x < -10) p.x += W + 20; else if (p.x > W + 10) p.x -= W + 20;
    if (p.y < -10) p.y += H + 20; else if (p.y > H + 10) p.y -= H + 20;

    /* Draw */
    ctx.fillStyle   = p.color;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  if (CONFIG.glow > 0) ctx.shadowBlur = 0;

  saccade.life *= CONFIG.saccadeDecay;

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* =============================================================
   Helpers
   ============================================================= */
function hexWithAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function setStatus(text, html = false) {
  if (!statusEl) return;
  if (html) statusEl.innerHTML = text;
  else statusEl.textContent = text;
}

function fireSaccade(dx, dy, magnitude) {
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return;
  saccade.x = (dx / len) * magnitude;
  saccade.y = (dy / len) * magnitude;
  saccade.life = 1;
}

/* =============================================================
   Mouse fallback (also active before camera grant)
   ============================================================= */
window.addEventListener('mousemove', (e) => {
  if (tracking) return;
  const dx = e.clientX - gaze.x;
  const dy = e.clientY - gaze.y;
  const speed = Math.hypot(dx, dy);
  if (speed > 24) fireSaccade(dx, dy, CONFIG.saccadeForce * 0.55);
  gaze.x = e.clientX;
  gaze.y = e.clientY;
  gaze.active = true;
});

/* =============================================================
   Eye tracking — MediaPipe FaceLandmarker
   ============================================================= */
async function startTracking() {
  startBtn.disabled = true;
  setStatus('Requesting camera…');

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
  } catch (err) {
    setStatus('Camera blocked. Move your <b>mouse</b> instead — particles still react.', true);
    startBtn.textContent = 'Camera unavailable';
    return;
  }

  video.srcObject = stream;
  await video.play();
  if (CONFIG.showCamera) video.classList.add('show');

  setStatus('Loading face model…');

  let FaceLandmarker, FilesetResolver;
  try {
    ({ FaceLandmarker, FilesetResolver } = await import(CONFIG.visionUrl));
  } catch (err) {
    setStatus('Could not load MediaPipe (offline?). Mouse fallback active.');
    startBtn.textContent = 'Tracking offline';
    return;
  }

  let landmarker;
  try {
    const fileset = await FilesetResolver.forVisionTasks(CONFIG.wasmUrl);
    landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: CONFIG.modelUrl, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numFaces: 1,
    });
  } catch (err) {
    setStatus('Model failed to load. Mouse fallback active.');
    startBtn.textContent = 'Tracking offline';
    return;
  }

  tracking = true;
  startBtn.textContent = 'Tracking · live';
  setStatus('Look around — particles flee where your gaze lands.');

  let lastTs = -1;
  function loop() {
    if (video.readyState >= 2 && video.currentTime !== lastTs) {
      lastTs = video.currentTime;
      const t = performance.now();
      let result;
      try { result = landmarker.detectForVideo(video, t); } catch { result = null; }

      const lms = result?.faceLandmarks?.[0];
      if (lms && lms.length >= 478) {
        /* Iris centers in 478-point mesh: 468 (left), 473 (right) */
        const li = lms[468], ri = lms[473];
        let ix = (li.x + ri.x) * 0.5;
        let iy = (li.y + ri.y) * 0.5;
        if (CONFIG.flipCamera) ix = 1 - ix;

        /* Map normalized iris position to screen with sensitivity */
        const cx = (ix - 0.5) * CONFIG.gazeSensitivity * 2;
        const cy = (iy - 0.5) * CONFIG.gazeSensitivity * 2;
        const targetX = W * 0.5 + cx * W * 0.5;
        const targetY = H * 0.5 + cy * H * 0.5;
        gaze.x = targetX;
        gaze.y = targetY;
        gaze.active = true;

        /* Detect saccade — push particles in the direction of motion */
        if (lastIris) {
          const dx = ix - lastIris.x;
          const dy = iy - lastIris.y;
          const speed = Math.hypot(dx, dy);
          if (speed > CONFIG.saccadeThreshold) {
            fireSaccade(dx * W, dy * H, CONFIG.saccadeForce);
          }
        }
        lastIris = { x: ix, y: iy };
      } else {
        gaze.active = false;
        lastIris = null;
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

startBtn.addEventListener('click', startTracking);
