/* ==========================================================================
   Z&Z — welcome / entrance screen
   · golden 3D logo turning smoothly in ONE direction (watch-hand motion)
   · glass bubbles in the BACKGROUND only (never over the brand face)
   · bubbles: 38 by default, denser at the sides, fewer in the centre
   ========================================================================== */
(function () {
  'use strict';

  const welcome = document.getElementById('welcome');
  if (!welcome) return;

  const cv = document.getElementById('bubbleCanvas');
  const ctx = cv.getContext('2d', { alpha: true });
  const inner = welcome.querySelector('.wi');
  const logoImgEl = welcome.querySelector('.lw img');
  const LOGO_SRC = (logoImgEl && logoImgEl.getAttribute('src')) || '/assets/img/logo-3d@2x.png';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, DPR = 1;
  let TARGET = 38;

  /* owner-controlled: speed, quality (device pixels + particle budget), glitter */
  const CFG = { count: 38, speed: 1, quality: 'high', glitter: true, glitterAmount: 260, glitterFall: 1 };

  function applyCfg(b) {
    const c = b || {};
    CFG.count = Math.max(6, Math.min(80, Number(c.count) || 38));
    CFG.speed = Math.max(0.25, Math.min(3, Number(c.speed) || 1));
    CFG.quality = ['low', 'medium', 'high'].includes(c.quality) ? c.quality : 'high';
    CFG.glitter = c.glitter !== false;
    CFG.glitterAmount = Math.max(0, Math.min(1200, Number(c.glitterAmount == null ? 260 : c.glitterAmount)));
    CFG.glitterFall = Math.max(0.3, Math.min(2.5, Number(c.glitterFall) || 1));
    TARGET = c.sideBias === false ? CFG.count : CFG.count;
    if (reduce) TARGET = Math.round(TARGET * 0.6);
  }

  const QCAP = { low: 1, medium: 1.5, high: 2 };
  const QBUDGET = { low: 900, medium: 1700, high: 2600 };

  const logoImg = new Image();
  logoImg.decoding = 'async';
  logoImg.src = LOGO_SRC;

  /* ------------------------------ sprites ------------------------------ */
  const spriteCache = new Map();

  function bubbleSprite(r) {
    const key = Math.round(r);
    if (spriteCache.has(key)) return spriteCache.get(key);
    const pad = 6;
    const size = Math.ceil(r * 2 + pad * 2);
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(size * DPR);
    const g = c.getContext('2d');
    g.scale(DPR, DPR);
    const cx = size / 2, cy = size / 2;

    const body = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    body.addColorStop(0, 'rgba(255,255,255,0.52)');
    body.addColorStop(0.62, 'rgba(255,253,246,0.12)');
    body.addColorStop(0.88, 'rgba(255,255,255,0.22)');
    body.addColorStop(1, 'rgba(255,255,255,0.60)');
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = body; g.fill();

    if (logoImg.complete && logoImg.naturalWidth) {
      g.save();
      g.beginPath(); g.arc(cx, cy, r * 0.92, 0, Math.PI * 2); g.clip();
      const lw = r * 1.2, lh = lw * (logoImg.naturalHeight / logoImg.naturalWidth || 1.1);
      g.globalAlpha = 0.5;
      g.drawImage(logoImg, cx - lw / 2, cy - lh / 2, lw, lh);
      g.restore();
    }

    const rim = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    rim.addColorStop(0, 'rgba(255,255,255,1)');
    rim.addColorStop(0.4, 'rgba(255,255,255,0.30)');
    rim.addColorStop(1, 'rgba(196,162,92,0.95)');
    g.beginPath(); g.arc(cx, cy, r - 0.6, 0, Math.PI * 2);
    g.strokeStyle = rim; g.lineWidth = Math.max(1.1, r * 0.09); g.stroke();

    g.save();
    g.translate(cx - r * 0.36, cy - r * 0.4);
    g.rotate(-0.6);
    const hl = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.42);
    hl.addColorStop(0, 'rgba(255,255,255,0.95)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.beginPath(); g.ellipse(0, 0, r * 0.34, r * 0.19, 0, 0, Math.PI * 2);
    g.fillStyle = hl; g.fill();
    g.restore();

    g.beginPath();
    g.ellipse(cx + r * 0.16, cy + r * 0.5, r * 0.3, r * 0.12, 0.3, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();

    spriteCache.set(key, c);
    return c;
  }

  /* ------------------------------ bubbles ------------------------------ */
  const bubbles = [];
  const sparks = [];
  let raf = 0;
  let running = true;
  let spawnTimer = 0;
  let sideBias = true;

  function measure() {
    DPR = Math.min(QCAP[CFG.quality] || 2, window.devicePixelRatio || 1);
    W = cv.clientWidth || window.innerWidth;
    H = cv.clientHeight || window.innerHeight;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const area = W * H;
    /* owner's bubble count wins; small screens get a gentle cap */
    const cap = W < 620 ? Math.max(14, Math.round(CFG.count * 0.7)) : CFG.count;
    TARGET = reduce ? Math.round(cap * 0.6) : Math.round(cap * Math.min(1, Math.max(0.55, area / (1440 * 900))));
  }

  function baseRadius() {
    const m = Math.min(W, H);
    return Math.max(8, Math.min(26, m * (reduce ? 0.028 : 0.031)));
  }

  /** bubbles only live in the two side bands: 6%–34% and 66%–94% of the width */
  function pickX() {
    const side = Math.random() < 0.5 ? 0 : 1;
    const t = Math.pow(Math.random(), 1.35);          // clusters near the edge
    const band = W * (0.06 + 0.28 * t);
    return side === 0 ? band : W - band;
  }

  /* keep bubbles (and therefore their bursts) out of the central column */
  function keepSide(b) {
    const inner = W * 0.17;                            // half-width of the clear centre
    const cx = W / 2;
    if (b.x > cx - inner && b.x < cx + inner) {
      b.x = b.x < cx ? cx - inner : cx + inner;
      b.vx = b.x < cx ? -Math.abs(b.vx) : Math.abs(b.vx);
    }
  }

  function spawn(x, y) {
    const r = baseRadius() * (0.55 + Math.random() * 0.95);
    const a = Math.random() * Math.PI * 2;
    const speed = (W < 620 ? 7 : 11) * (0.4 + Math.random() * 0.9) * CFG.speed;
    bubbles.push({
      x: x != null ? x : pickX(),
      y: y != null ? y : Math.random() * H,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 5,
      r, base: r,
      age: 0,
      ttl: 4800 + Math.random() * 1800,
      fadeIn: reduce ? 500 : 1400 + Math.random() * 1400,
      alpha: 0,
      wob: Math.random() * Math.PI * 2,
      wobAmp: (6 + Math.random() * 12) * Math.min(1.6, CFG.speed),
      sprite: null
    });
  }

  function pop(b) {
    const n = reduce ? 4 : 9;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const sp = 40 + Math.random() * 90;
      sparks.push({
        x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: 1 + Math.random() * 2.1, age: 0, ttl: 520 + Math.random() * 380,
        hue: Math.random() < 0.4 ? 'gold' : 'white'
      });
    }
    if (CFG.glitter && CFG.glitterAmount > 0) burstGlitter(b);
  }

  /* ------------------------------ glitter ------------------------------ */
  /* real glitter: tiny four-point stars that catch the light, drift down,
     twinkle, then dissolve wherever they happen to be */
  const glitter = [];
  const glitterCache = new Map();

  /* soft bokeh dot, used only for the handful of bigger flecks */
  function glitterSprite(size, tone) {
    const key = size + tone;
    if (glitterCache.has(key)) return glitterCache.get(key);
    const ss = 2;
    const pad = 3;
    const box = Math.ceil(size * 2 + pad * 2);
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(box * DPR * ss);
    const g = c.getContext('2d');
    g.scale(DPR * ss, DPR * ss);
    const cx = box / 2, cy = box / 2;
    const col = tone === 'gold' ? '212,166,72' : tone === 'champagne' ? '234,210,158' : '255,253,246';
    const halo = g.createRadialGradient(cx, cy, 0, cx, cy, size * 1.6);
    halo.addColorStop(0, `rgba(${col},0.85)`);
    halo.addColorStop(0.45, `rgba(${col},0.30)`);
    halo.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = halo;
    g.beginPath(); g.arc(cx, cy, size * 1.6, 0, Math.PI * 2); g.fill();
    const core = g.createRadialGradient(cx, cy, 0, cx, cy, size);
    core.addColorStop(0, `rgba(255,252,240,0.95)`);
    core.addColorStop(0.35, `rgba(${col},0.92)`);
    core.addColorStop(0.75, `rgba(${col},0.55)`);
    core.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = core;
    g.beginPath(); g.arc(cx, cy, size, 0, Math.PI * 2); g.fill();
    glitterCache.set(key, c);
    return c;
  }

  /* ---------------------------------------------------------------------------
     BUBBLE BURST — a fine golden glitter explosion, then the dust rains down
     · hundreds of hair-thin specks fly out in straight rays (like the reference)
     · a hot core flash lights the burst for a moment
     · the dust loses speed, gravity takes it down, it settles low on the screen
       and dissolves — total life about 5–6 seconds
     --------------------------------------------------------------------------- */
  const flashes = [];                          // bright core at the burst point
  const GLITTER_TONES = {
    gold: '216,168,76',
    deep: '176,130,44',
    champagne: '240,220,176',
    white: '255,254,250'
  };

  function burstGlitter(b) {
    const q = CFG.quality;
    const qmul = q === 'low' ? 0.45 : q === 'medium' ? 0.72 : 1;

    /* everything scales with the bubble itself, so the burst stays a small
       sparkle sitting exactly on top of the bubble that just popped */
    const scale = Math.max(0.55, Math.min(1.5, b.r / 20));
    const budget = QBUDGET[q] || 2600;
    const load = Math.min(1, glitter.length / budget);          // how busy the screen already is
    const soften = Math.max(0.34, 1 - load * 0.9);
    const want = Math.round((CFG.glitterAmount || 260) * qmul * soften * (0.5 + scale * 0.5));
    const room = Math.max(0, budget - glitter.length);
    const n = Math.max(18, Math.min(want, room || 18));
    const floorMin = H * 0.80, floorMax = H * 0.965;

    /* small, short-lived flash right on the bubble */
    flashes.push({ x: b.x, y: b.y, age: 0, ttl: 380, r0: b.r * 1.05, r1: b.r * 3.1 });

    for (let i = 0; i < n; i++) {
      const core = Math.random() < 0.30;                        // dense inner cloud
      const spoke = !core && Math.random() < 0.66;
      const spokes = 26;
      const ang = spoke
        ? (Math.floor(Math.random() * spokes) / spokes) * Math.PI * 2 + (Math.random() - 0.5) * 0.12
        : Math.random() * Math.PI * 2;
      /* reach ≈ 2–3.5× the bubble radius — a compact little firework */
      const speed = (core
        ? 5 + Math.random() * 22
        : 34 + Math.pow(Math.random(), 0.72) * 120) * scale * CFG.speed;
      const big = Math.random() < 0.022;                        // a few larger bokeh flecks
      const size = big ? 1.5 + Math.random() * 1.1 : 0.45 + Math.random() * (core ? 0.65 : 0.85);
      const r0 = Math.random();
      const tone = r0 < 0.34 ? 'deep' : r0 < 0.72 ? 'gold' : r0 < 0.9 ? 'champagne' : 'white';
      glitter.push({
        x: b.x + (Math.random() - 0.5) * b.r * 1.1,
        y: b.y + (Math.random() - 0.5) * b.r * 1.1,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed * 0.94,
        damp: 2.2 + Math.random() * 1.4,                        // short rays, quick stall
        g: core ? 6 + Math.random() * 26 : 26 + Math.random() * 74,
        size, tone, big,
        tw: Math.random() * 6.283,
        tws: 4 + Math.random() * 7,
        sway: Math.random() * 6.283,
        swayAmp: 2 + Math.random() * 7,
        floorY: floorMin + Math.random() * (floorMax - floorMin),
        resting: false,
        restTtl: 1100 + Math.random() * 1500,
        ttl: 2900 + Math.random() * 2200,
        age: 0
      });
    }
  }

  /* keep the brand block clear: bubbles fade out near the centre column */
  let brandRect = null;
  function updateBrandRect() {
    if (!inner) return;
    const wr = welcome.getBoundingClientRect();
    const ir = inner.getBoundingClientRect();
    brandRect = { x: ir.left - wr.left, y: ir.top - wr.top, w: ir.width, h: ir.height };
  }

  function dimFactor(x, y, r) {
    if (!brandRect) return 1;
    const cx = brandRect.x + brandRect.w / 2;
    const dx = Math.abs(x - cx) / (brandRect.w / 2 + r);
    const dy = Math.max(0, Math.abs(y - (brandRect.y + brandRect.h / 2)) - brandRect.h / 2) / (r + 60);
    const d = Math.max(dx * 0.85, dy);
    if (d < 1) return 0.05;             // essentially invisible behind the logo
    if (d < 1.45) return 0.05 + (d - 1) * 1.25;
    return 1;
  }

  let last = 0;
  function frame(t) {
    if (!running) return;
    if (!last) last = t;
    const dt = Math.min(48, t - last) / 1000;
    last = t;

    ctx.clearRect(0, 0, W, H);

    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.age += dt * 1000;
      b.wob += dt * 1.4;

      b.x += (b.vx + Math.cos(b.wob) * b.wobAmp) * dt;
      b.y += (b.vy + Math.sin(b.wob * 0.8) * b.wobAmp * 0.6) * dt;

      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
      keepSide(b);
      if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
      if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy); }

      const fadeInP = Math.min(1, b.age / b.fadeIn);
      const fadeOutP = Math.min(1, Math.max(0, (b.ttl - b.age) / 700));
      b.alpha = Math.min(fadeInP, fadeOutP);
      b.r = b.base * (1 + Math.sin(b.wob * 1.7) * 0.03);
      if (!b.sprite) b.sprite = bubbleSprite(b.base);

      const dim = dimFactor(b.x, b.y, b.r);
      const a = b.alpha * dim;
      if (a > 0.012) {
        ctx.globalAlpha = a;
        const s = b.sprite.width / DPR;
        ctx.drawImage(b.sprite, b.x - s / 2, b.y - s / 2, s, s);
      }

      if (b.age >= b.ttl) {
        pop(b);
        bubbles.splice(i, 1);
        spawnTimer = Math.min(spawnTimer, 0.12 + Math.random() * 0.4);
      }
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.age += dt * 1000;
      const p = s.age / s.ttl;
      if (p >= 1) { sparks.splice(i, 1); continue; }
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.vy += 40 * dt; s.vx *= 0.98;
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * (1 - p * 0.6), 0, Math.PI * 2);
      ctx.fillStyle = s.hue === 'gold' ? 'rgba(214,178,104,0.95)' : 'rgba(255,255,255,0.95)';
      ctx.fill();
    }

    /* ---- burst flash: a hot golden core that dies in ~0.45 s ---- */
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.age += dt * 1000;
      const k = f.age / f.ttl;
      if (k >= 1) { flashes.splice(i, 1); continue; }
      const r = f.r0 + (f.r1 - f.r0) * Math.min(1, k * 1.35);
      const a = Math.pow(1 - k, 1.5) * 0.95 * (brandRect ? Math.max(0.18, dimFactor(f.x, f.y, r * 0.4)) : 1);
      const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      grd.addColorStop(0, `rgba(255,252,240,${a})`);
      grd.addColorStop(0.22, `rgba(240,214,150,${a * 0.85})`);
      grd.addColorStop(0.55, `rgba(214,170,80,${a * 0.32})`);
      grd.addColorStop(1, 'rgba(214,170,80,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();
    }

    /* ---- glitter dust: fly out in rays, rain down, settle, dissolve ---- */
    if (glitter.length) {
      /* bucketed so the whole burst is only a handful of draw calls */
      const buckets = { gold: [[], [], []], deep: [[], [], []], champagne: [[], [], []], white: [[], [], []] };

      for (let i = glitter.length - 1; i >= 0; i--) {
        const p = glitter[i];
        p.age += dt * 1000;
        const secs = p.age / 1000;

        if (!p.resting) {
          const damp = Math.exp(-p.damp * dt);
          p.vx *= damp;
          p.vy *= damp;
          /* the radial blast slows first, then gravity pulls the dust down */
          const pull = Math.min(1, Math.max(0, (secs - 0.26) / 0.55));
          p.vy += p.g * pull * dt;
          p.sway += dt * 2.3;
          p.x += (p.vx + Math.cos(p.sway) * p.swayAmp * 0.5) * dt;
          p.y += p.vy * dt;
          p.tw += dt * p.tws;

          if (p.y >= p.floorY) {                    // never leaves the screen — it settles low
            p.y = p.floorY;
            p.resting = true;
            p.ttl = p.age + p.restTtl;
            p.vx *= 0.12; p.vy = 0;
          }
        } else {
          p.tw += dt * p.tws * 0.5;
          p.x += Math.cos(p.sway + p.age / 900) * 1.1 * dt;
        }

        if (p.x < 1) p.x = 1;
        if (p.x > W - 1) p.x = W - 1;
        if (p.y > H - 1) p.y = H - 1;

        if (p.age >= p.ttl) { glitter.splice(i, 1); continue; }

        /* alpha: quick ignite, twinkle, smooth dissolve at the end */
        const fadeIn = Math.min(1, p.age / 90);
        const fadeOut = Math.min(1, Math.max(0, (p.ttl - p.age) / 620));
        const twinkle = 0.55 + 0.45 * Math.sin(p.tw);
        const dim = brandRect ? 0.14 + 0.86 * dimFactor(p.x, p.y, p.size * 3) : 1;
        const a = Math.max(0, Math.min(1, fadeIn * fadeOut * twinkle * dim));
        if (a < 0.03) continue;

        /* ray trail — a hair line behind every speck, like the reference burst */
        const trail = p.resting ? 0 : Math.min(0.055, 1 / 18);
        const tx = p.x - p.vx * trail;
        const ty = p.y - p.vy * trail;

        if (p.big) {
          const sp = glitterSprite(Math.max(2, Math.round(p.size)), p.tone);
          const w = sp.width / DPR;
          ctx.globalAlpha = a;
          ctx.drawImage(sp, p.x - w / 2, p.y - w / 2, w, w);
          continue;
        }

        const band = a > 0.62 ? 2 : a > 0.3 ? 1 : 0;
        buckets[p.tone][band].push(tx, ty, p.x, p.y, p.size);
      }

      /* thin rays first, then the bright heads — grouped by tone & brightness */
      Object.keys(buckets).forEach((tone) => {
        const rgb = GLITTER_TONES[tone];
        buckets[tone].forEach((arr, band) => {
          if (!arr.length) return;
          const alpha = [0.46, 0.70, 0.95][band];

          /* the tail line */
          ctx.globalAlpha = alpha * 0.72;
          ctx.strokeStyle = `rgba(${rgb},1)`;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          for (let i = 0; i < arr.length; i += 5) {
            const tx = arr[i], ty = arr[i + 1], x = arr[i + 2], y = arr[i + 3];
            if (Math.abs(x - tx) < 0.4 && Math.abs(y - ty) < 0.4) continue;
            ctx.moveTo(tx, ty); ctx.lineTo(x, y);
          }
          ctx.stroke();

          /* the speck itself */
          ctx.globalAlpha = alpha;
          ctx.fillStyle = `rgba(${rgb},1)`;
          ctx.beginPath();
          for (let i = 0; i < arr.length; i += 5) {
            const x = arr[i + 2], y = arr[i + 3], sz = arr[i + 4];
            const s2 = sz * 1.15;
            ctx.rect(x - s2, y - s2, s2 * 2, s2 * 2);
          }
          ctx.fill();

          /* resting specks get a tiny halo so they still sparkle softly */
          if (band === 2) {
            ctx.globalAlpha = alpha * 0.42;
            ctx.fillStyle = `rgba(${rgb},1)`;
            ctx.beginPath();
            for (let i = 0; i < arr.length; i += 5) {
              const x = arr[i + 2], y = arr[i + 3], sz = arr[i + 4];
              ctx.rect(x - sz * 2.2, y - sz * 2.2, sz * 4.4, sz * 4.4);
            }
            ctx.fill();
          }
        });
      });
      ctx.globalAlpha = 1;
    }

    spawnTimer -= dt;
    if (bubbles.length < TARGET && spawnTimer <= 0) {
      spawn();
      spawnTimer = reduce ? 0.5 : 0.10 + Math.random() * 0.22;
    }

    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  function start() {
    applyCfg(CFG);
    measure();
    updateBrandRect();
    const boot = Math.round(TARGET * 0.85);
    for (let i = 0; i < boot; i++) setTimeout(() => running && spawn(), i * (3400 / Math.max(1, boot)));
    raf = requestAnimationFrame(frame);
  }

  let rz;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { measure(); updateBrandRect(); spriteCache.clear(); bubbles.forEach((b) => (b.sprite = null)); }, 180);
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; cancelAnimationFrame(raf); }
    else if (!welcome.classList.contains('leaving')) { running = true; last = 0; raf = requestAnimationFrame(frame); }
  });

  welcome.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.hint')) return;
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let hit = null;
    for (const b of bubbles) if (Math.hypot(b.x - x, b.y - y) < b.r * 1.35) hit = b;
    if (hit) { pop(hit); bubbles.splice(bubbles.indexOf(hit), 1); }
  }, { passive: true });

  if (logoImg.decode) logoImg.decode().then(() => spriteCache.clear()).catch(() => {});
  else logoImg.onload = () => spriteCache.clear();

  window.addEventListener('load', () => { measure(); updateBrandRect(); }, { once: true });
  start();


  /* ------------------ entrance top bar: currency + day/night ------------------ */
  (function topBar() {
    const sel = document.getElementById('wCur');
    const btn = document.getElementById('wTheme');
    if (!sel || !btn) return;
    const paintTheme = () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      btn.textContent = dark ? '☀' : '☾';
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    };
    let saved = 'PKR', theme = 'light';
    try { saved = localStorage.getItem('zz_cur') || 'PKR'; theme = localStorage.getItem('zz_theme') || 'light'; } catch (e) {}
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    paintTheme();

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('zz_theme', next); } catch (err) {}
      paintTheme();
      window.dispatchEvent(new CustomEvent('zz:theme', { detail: next }));
    });

    sel.addEventListener('click', (e) => e.stopPropagation());
    sel.addEventListener('change', () => {
      try { localStorage.setItem('zz_cur', sel.value); } catch (err) {}
      window.dispatchEvent(new CustomEvent('zz:currency', { detail: sel.value }));
      if (window.__znzSetCurrency) window.__znzSetCurrency(sel.value);
    });

    fetch('/api/bootstrap', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (j.data && j.data.bubbles) {
          applyCfg(j.data.bubbles);
          measure();
          updateBrandRect();
          spriteCache.clear();
          glitterCache.clear();
          bubbles.forEach((b) => (b.sprite = null));
        }
        const list = (j.data && j.data.currency && j.data.currency.list) || [{ code: 'PKR', symbol: 'Rs', rate: 1 }];
        sel.innerHTML = list.map((c) => `<option value="${c.code}">${c.symbol || c.code} ${c.code}</option>`).join('');
        sel.value = list.some((c) => c.code === saved) ? saved : (list[0] || {}).code || 'PKR';
        fetch('/api/rates').then((r) => r.json()).then((rt) => {
          if (!rt || !rt.ok) return;
          sel.title = 'Live rates · 1 PKR = ' + (rt.rates.USD || 0).toFixed(4) + ' USD';
        }).catch(() => {});
      })
      .catch(() => {});
  })();

  /* --------------------------- enter the store --------------------------- */
  let entered = false;
  function enter() {
    if (entered) return;
    entered = true;
    running = false;
    cancelAnimationFrame(raf);
    welcome.classList.add('leaving');
    document.body.classList.remove('locked');
    try { sessionStorage.setItem('zz_entered', '1'); } catch (e) {}
    window.dispatchEvent(new CustomEvent('zz:enter'));
    setTimeout(() => { welcome.style.display = 'none'; }, 900);
  }

  welcome.addEventListener('click', enter);
  window.addEventListener('keydown', (e) => { if (!entered && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) enter(); });

  const deepLink = location.pathname !== '/' && location.pathname !== '/welcome';
  try {
    if (sessionStorage.getItem('zz_entered') === '1') setTimeout(enter, 700);
    else if (deepLink) setTimeout(enter, reduce ? 1200 : 2400);
  } catch (e) {}

  window.__znzEnter = enter;
  /* small hook: lets the owner panel preview a burst (and lets us test it) */
  window.__zzBurst = (x, y) => {
    const b = { x: x == null ? W / 2 : x, y: y == null ? H / 2 : y, r: 16 };
    pop(b);
  };
  /* pop live bubbles for a visual check */
  window.__zzPopLive = (howMany) => {
    const k = Math.max(1, Math.min(6, howMany || 1));
    for (let i = 0; i < k && bubbles.length; i++) {
      const b = bubbles[Math.floor(Math.random() * bubbles.length)];
      pop(b);
      const ix = bubbles.indexOf(b);
      if (ix >= 0) bubbles.splice(ix, 1);
    }
  };
})();
