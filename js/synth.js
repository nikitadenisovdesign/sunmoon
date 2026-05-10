/* ---------------------------------------------------------------
   SUNMOON — footer mini-synth
   16 chord-keys with the same Sunmoon gradient palette + an FM-ish
   pad voice (carrier + sine modulator) routed through a convolution
   reverb and a feedback delay. Audio context is lazily created on
   the first interaction.
--------------------------------------------------------------- */

(function () {
  const kb = document.getElementById('synth-kb');
  if (!kb) return;

  const ST = [
    [0,    '#020100'],
    [0.16, '#0A66FB'],
    [0.33, '#F89BD9'],
    [0.49, '#FFFFFF'],
    [0.65, '#FFBE27'],
    [0.82, '#FF4400'],
    [1,    '#020100'],
  ];

  function shiftedGrad(offset) {
    const shifted = ST.slice(1, -1).map(([pos, col]) => {
      const p = (pos + offset) % 1;
      return [p, col];
    });
    shifted.sort((a, b) => a[0] - b[0]);
    const stops = [[0, '#020100'], ...shifted, [1, '#020100']];
    return `linear-gradient(to bottom, ${stops
      .map((s) => `${s[1]} ${(s[0] * 100).toFixed(1)}%`)
      .join(', ')})`;
  }

  const OFFSETS = [
    0,    0.06, 0.13, 0.19,
    0.25, 0.32, 0.38, 0.44,
    0.50, 0.56, 0.63, 0.69,
    0.75, 0.81, 0.88, 0.94,
  ];

  /* All chords sit diatonically inside D major / B minor — anything
     you press together stays consonant. */
  const CHORDS = [
    { n: 'Dmaj9',     midi: [38, 45, 50, 54, 61] },
    { n: 'Em9',       midi: [40, 47, 50, 55, 59] },
    { n: 'F#m7',      midi: [42, 49, 52, 57] },
    { n: 'Gmaj7',     midi: [43, 50, 54, 59, 62] },
    { n: 'Asus4',     midi: [45, 52, 57, 62] },
    { n: 'Bm9',       midi: [47, 54, 57, 62, 66] },
    { n: 'C#m7b5',    midi: [49, 52, 55, 59] },
    { n: 'Dmaj7',     midi: [50, 57, 61, 66] },
    { n: 'Em11',      midi: [52, 59, 62, 69] },
    { n: 'F#m9',      midi: [54, 57, 61, 64] },
    { n: 'Gmaj9',     midi: [55, 59, 62, 66, 69] },
    { n: 'Asus2',     midi: [57, 62, 64, 69] },
    { n: 'Bm7',       midi: [59, 62, 66, 69] },
    { n: 'C#m7b5_hi', midi: [61, 64, 67, 71] },
    { n: 'Dmaj',      midi: [62, 66, 69, 74] },
    { n: 'Em7',       midi: [64, 67, 71, 74] },
  ];

  /* One-shot 512x512 random-alpha grain texture, reused on every key. */
  const GRAIN = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const cx = c.getContext('2d');
    const id = cx.createImageData(512, 512);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = d[i + 1] = d[i + 2] = 0;
      d[i + 3] = Math.random() < 0.6 ? Math.floor(Math.random() * 200) : 0;
    }
    cx.putImageData(id, 0, 0);
    return c.toDataURL();
  })();

  let actx, master;
  const midiFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function buildIR(ac) {
    const sr = ac.sampleRate;
    const len = sr * 2.6;
    const buf = ac.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] =
          (Math.random() * 2 - 1) *
          Math.exp(-i / (sr * 0.75)) *
          (c ? 0.82 : 1);
      }
    }
    const cv = ac.createConvolver();
    cv.buffer = buf;
    return cv;
  }

  function bootAudio() {
    if (actx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    master = actx.createGain();
    master.gain.value = 0.52;

    const shelf = actx.createBiquadFilter();
    shelf.type = 'highshelf';
    shelf.frequency.value = 3200;
    shelf.gain.value = -9;
    const bass = actx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 180;
    bass.gain.value = 2.5;
    master.connect(bass);
    bass.connect(shelf);
    shelf.connect(actx.destination);

    const rvbNode = buildIR(actx);
    const rvbSend = actx.createGain();
    rvbSend.gain.value = 0.42;
    master.connect(rvbSend);
    rvbSend.connect(rvbNode);
    rvbNode.connect(actx.destination);

    const dlyNode = actx.createDelay(1.2);
    dlyNode.delayTime.value = 0.38;
    const dlyFb = actx.createGain();
    dlyFb.gain.value = 0.34;
    const dlySend = actx.createGain();
    dlySend.gain.value = 0.24;
    const dlyLP = actx.createBiquadFilter();
    dlyLP.type = 'lowpass';
    dlyLP.frequency.value = 2800;
    master.connect(dlySend);
    dlySend.connect(dlyNode);
    dlyNode.connect(dlyFb);
    dlyFb.connect(dlyNode);
    dlyNode.connect(dlyLP);
    dlyLP.connect(actx.destination);
  }

  function playNote(f, vel, t) {
    const now = actx.currentTime + t;
    const carrier = actx.createOscillator();
    const modOsc = actx.createOscillator();
    const modGain = actx.createGain();
    const ampEnv = actx.createGain();
    const lpf = actx.createBiquadFilter();

    modOsc.type = 'sine';
    modOsc.frequency.value = f;
    const mp = (f * 0.95 + 55) * vel;
    modGain.gain.setValueAtTime(mp, now);
    modGain.gain.exponentialRampToValueAtTime(mp * 0.05, now + 0.28);
    modGain.gain.exponentialRampToValueAtTime(0.001, now + 4.2);

    carrier.type = 'sine';
    carrier.frequency.value = f;
    ampEnv.gain.setValueAtTime(0, now);
    ampEnv.gain.linearRampToValueAtTime(vel * 0.52, now + 0.008);
    ampEnv.gain.exponentialRampToValueAtTime(vel * 0.21, now + 0.28);
    ampEnv.gain.exponentialRampToValueAtTime(0.001, now + 6.0);

    lpf.type = 'lowpass';
    lpf.frequency.value = Math.min(f * 9, 5500);
    lpf.Q.value = 0.45;

    modOsc.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(lpf);
    lpf.connect(ampEnv);
    ampEnv.connect(master);

    const end = now + 7;
    modOsc.start(now);
    modOsc.stop(end);
    carrier.start(now);
    carrier.stop(end);
  }

  function triggerChord(idx) {
    bootAudio();
    if (!actx) return;
    CHORDS[idx].midi.forEach((m, i) => {
      const vel = i === 0 ? 0.70 : i === 1 ? 0.54 : Math.max(0.42 - i * 0.025, 0.30);
      playNote(midiFreq(m), vel, i * 0.013);
    });
  }

  const keyEls = [];

  CHORDS.forEach((_, i) => {
    const key = document.createElement('div');
    key.className = 'synth-key';
    key.style.backgroundImage = shiftedGrad(OFFSETS[i]);
    key.style.backgroundSize = '100% 280%';
    const dur = (8 + i * 1.3) * 4;
    key.style.animationDuration = dur + 's';
    key.style.animationDelay = -(i * 1.1 * 4) + 's';

    const grain = document.createElement('div');
    grain.className = 'synth-grain';
    grain.style.backgroundImage = `url(${GRAIN})`;
    const over = document.createElement('div');
    over.className = 'synth-over';
    const line = document.createElement('div');
    line.className = 'synth-line';
    key.append(grain, over, line);

    const fire = (e) => {
      triggerChord(i);
      key.classList.add('active');
      const rect = key.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      const rpl = document.createElement('div');
      rpl.className = 'synth-ripple';
      rpl.style.left = src.clientX - rect.left + 'px';
      rpl.style.top = src.clientY - rect.top + 'px';
      key.appendChild(rpl);
      rpl.addEventListener('animationend', () => rpl.remove());
      clearTimeout(key._t);
      key._t = setTimeout(() => key.classList.remove('active'), 420);
    };

    key.addEventListener('mousedown', fire);
    key.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        fire(e);
      },
      { passive: false }
    );
    kb.appendChild(key);
    keyEls.push(key);
  });

  kb.addEventListener('contextmenu', (e) => e.preventDefault());

  const KEY_MAP = {
    a: 0, s: 1, d: 2,  f: 3,  g: 4,  h: 5,  j: 6,  k: 7,
    z: 8, x: 9, c: 10, v: 11, b: 12, n: 13, m: 14, l: 15,
  };

  document.addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    // Skip when the user is typing into an input / textarea / contenteditable.
    const t = e.target;
    if (t && t.matches && t.matches('input, textarea, [contenteditable], [contenteditable=""], [contenteditable="true"]')) return;
    const idx = KEY_MAP[e.key.toLowerCase()];
    if (idx === undefined) return;
    triggerChord(idx);
    const el = keyEls[idx];
    if (!el) return;
    el.classList.add('active');
    const rpl = document.createElement('div');
    rpl.className = 'synth-ripple';
    rpl.style.left = '50%';
    rpl.style.top = '40%';
    el.appendChild(rpl);
    rpl.addEventListener('animationend', () => rpl.remove());
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('active'), 420);
  });
})();
