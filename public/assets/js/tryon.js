/* ==========================================================================
   Z&Z — Try-On Studio  (round 7)
   • instruction cards first (face only ✗ / dupatta ✗ / full body no dupatta ✓)
   • one tap = automatic body fit, no manual work for the customer
   • optional "Customise" sliders for anyone who wants it
   • 3 backgrounds, 4K / 8K download badge, private gallery
   Customer-facing text is professional Urdu; direction is RTL.
   ========================================================================== */
(function () {
  'use strict';

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var PW = 760, PH = 1013;            /* internal render size, 3:4 portrait */
  var MAX_PHOTO = 1600;

  /* ------------------------------- helpers ------------------------------- */
  function cv(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    return c;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function loadImg(src) {
    return new Promise(function (res, rej) {
      var i = new Image();
      if (/^https?:/.test(src) && src.indexOf(location.origin) !== 0) i.crossOrigin = 'anonymous';
      i.onload = function () { res(i); };
      i.onerror = function () { rej(new Error('image')); };
      i.src = src;
    });
  }

  /* ---------------- automatic wall removal (plain backgrounds) ------------ */
  function autoCutMask(img, tol, follow) {
    var sw = 320, sh = Math.max(1, Math.round(img.height / img.width * sw));
    var c = cv(sw, sh), x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, sw, sh);
    var d = x.getImageData(0, 0, sw, sh).data;
    var n = sw * sh, i;

    var rs = [], gs = [], bs = [];
    function acc(px, py) { var o = (py * sw + px) * 4; rs.push(d[o]); gs.push(d[o + 1]); bs.push(d[o + 2]); }
    for (i = 0; i < sw; i++) { acc(i, 0); acc(i, sh - 1); }
    for (i = 0; i < sh; i++) { acc(0, i); acc(sw - 1, i); }
    var med = function (a) { a.sort(function (p, q) { return p - q; }); return a[a.length >> 1]; };
    var br = med(rs), bg = med(gs), bb = med(bs);

    /* local edge strength (0-255) so the flood cannot leak into the person */
    var EDGE = new Float32Array(n);
    for (var yy0 = 1; yy0 < sh - 1; yy0++) {
      for (var xx0 = 1; xx0 < sw - 1; xx0++) {
        var o0 = (yy0 * sw + xx0) * 4;
        var gx = Math.abs(d[o0 + 4] - d[o0 - 4]) + Math.abs(d[o0 + 5] - d[o0 - 3]) + Math.abs(d[o0 + 6] - d[o0 - 2]);
        var gy = Math.abs(d[o0 + sw * 4] - d[o0 - sw * 4]);
        EDGE[yy0 * sw + xx0] = (gx + gy) / 2;
      }
    }
    var seen = new Uint8Array(n), acc2 = new Uint8Array(n), stack = new Int32Array(n), sp = 0;
    var out = new Uint8ClampedArray(n * 4);
    for (i = 0; i < n; i++) { out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = 255; out[i * 4 + 3] = 255; }
    function near(o, r, g, b, t) {
      var dr = d[o] - r, dg = d[o + 1] - g, db = d[o + 2] - b;
      return Math.sqrt(dr * dr + dg * dg + db * db) < t;
    }
    for (i = 0; i < sw; i++) { stack[sp++] = i; stack[sp++] = (sh - 1) * sw + i; }
    for (i = 0; i < sh; i++) { stack[sp++] = i * sw; stack[sp++] = i * sw + sw - 1; }

    while (sp > 0) {
      var p = stack[--sp];
      if (seen[p]) continue;
      seen[p] = 1;
      var o4 = p * 4, px = p % sw, py = (p - px) / sw;
      var isBg = near(o4, br, bg, bb, tol * 1.35);
      /* never cross a visible edge: clothes that are the same shade as the wall
         still have a soft outline, and that outline must survive */
      if (isBg && EDGE && EDGE[p] > 26) isBg = false;
      if (!isBg) {
        var nb = [(px > 0 ? p - 1 : -1), (px < sw - 1 ? p + 1 : -1), (py > 0 ? p - sw : -1), (py < sh - 1 ? p + sw : -1)];
        var reach = follow ? tol * 0.55 : tol * 0.3;
        for (var k = 0; k < 4; k++) {
          var q = nb[k]; if (q < 0 || !acc2[q]) continue;
          var qo = q * 4;
          if (near(o4, d[qo], d[qo + 1], d[qo + 2], reach)) { isBg = true; break; }
        }
      }
      if (!isBg) continue;
      out[o4] = out[o4 + 1] = out[o4 + 2] = 0; out[o4 + 3] = 0;
      acc2[p] = 1;
      if (px > 0) stack[sp++] = p - 1;
      if (px < sw - 1) stack[sp++] = p + 1;
      if (py > 0) stack[sp++] = p - sw;
      if (py < sh - 1) stack[sp++] = p + sw;
    }

    /* fill holes that are enclosed by the person (light clothes on a light wall) */
    for (var fy = 0; fy < sh; fy++) {
      var first = -1, last = -1, fx;
      for (fx = 0; fx < sw; fx++) { if (out[(fy * sw + fx) * 4 + 3] > 0) { if (first < 0) first = fx; last = fx; } }
      if (first < 0) continue;
      var keepRun = 0;
      for (fx = first; fx <= last; fx++) if (out[(fy * sw + fx) * 4 + 3] > 0) keepRun++;
      if (keepRun < (last - first + 1) * 0.25) continue;   /* a stray line, not a body */
      var maxGap = Math.max(4, Math.round(sw * 0.11));      /* only close real holes */
      var gapStart = -1;
      for (fx = first; fx <= last + 1; fx++) {
        var onNow = fx <= last && out[(fy * sw + fx) * 4 + 3] > 0;
        if (!onNow) { if (gapStart < 0) gapStart = fx; continue; }
        if (gapStart >= 0) {
          if (fx - gapStart <= maxGap) {
            for (var gx = gapStart; gx < fx; gx++) {
              var fo = (fy * sw + gx) * 4;
              out[fo] = 255; out[fo + 1] = 255; out[fo + 2] = 255; out[fo + 3] = 255;
            }
          }
          gapStart = -1;
        }
      }
    }

    /* ---- second pass: the floor / backdrop strip at the bottom ---------- */
    var fseed = [];
    var fr = 0, fg = 0, fb = 0, fc = 0;
    for (i = 0; i < sw; i++) { var bo = ((sh - 1) * sw + i) * 4; fr += d[bo]; fg += d[bo + 1]; fb += d[bo + 2]; fc++; }
    fr /= fc; fg /= fc; fb /= fc;
    var seen2 = new Uint8Array(n), sp2 = 0, stack2 = new Int32Array(n);
    for (i = 0; i < sw; i++) stack2[sp2++] = (sh - 1) * sw + i;
    while (sp2 > 0) {
      var p2 = stack2[--sp2];
      if (seen2[p2]) continue;
      seen2[p2] = 1;
      var o2 = p2 * 4, px2 = p2 % sw, py2 = (p2 - px2) / sw;
      if (!near(o2, fr, fg, fb, tol * 1.15)) continue;
      out[o2] = out[o2 + 1] = out[o2 + 2] = 0; out[o2 + 3] = 0;
      if (px2 > 0) stack2[sp2++] = p2 - 1;
      if (px2 < sw - 1) stack2[sp2++] = p2 + 1;
      if (py2 > 0) stack2[sp2++] = p2 - sw;
      if (py2 < sh - 1) stack2[sp2++] = p2 + sw;
    }

    /* ---- silhouette band: the outline never lies, use it to close the body */
    var LUM = new Float32Array(n);
    for (i = 0; i < n; i++) LUM[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11);
    for (var by = 1; by < sh - 1; by++) {
      var e0 = -1, e1 = -1, bx;
      for (bx = 1; bx < sw - 1; bx++) {
        var idx2 = by * sw + bx;
        if (EDGE[idx2] > 30) { if (e0 < 0) e0 = bx; e1 = bx; }
      }
      if (e0 < 0 || e1 - e0 < 3) continue;
      if (e1 - e0 > sw * 0.9) continue;
      var cnt2 = 0;
      for (bx = e0; bx <= e1; bx++) if (out[(by * sw + bx) * 4 + 3] > 0) cnt2++;
      if (cnt2 < (e1 - e0 + 1) * 0.2) continue;      /* not the figure */
      var maxGap2 = Math.max(4, Math.round(sw * 0.11));
      var gs2 = -1;
      for (bx = e0; bx <= e1 + 1; bx++) {
        var on2 = bx <= e1 && out[(by * sw + bx) * 4 + 3] > 0;
        if (!on2) { if (gs2 < 0) gs2 = bx; continue; }
        if (gs2 >= 0) {
          if (bx - gs2 <= maxGap2) {
            for (var gx2 = gs2; gx2 < bx; gx2++) {
              var oo = (by * sw + gx2) * 4;
              out[oo] = 255; out[oo + 1] = 255; out[oo + 2] = 255; out[oo + 3] = 255;
            }
          }
          gs2 = -1;
        }
      }
    }

    /* only the largest connected piece survives: stray wall or floor patches go */
    var lab = new Int32Array(n), best = 0, bestSize = 0, cur = 0, q = new Int32Array(n);
    for (i = 0; i < n; i++) {
      if (out[i * 4 + 3] === 0 || lab[i]) continue;
      cur++;
      var head = 0, tail = 0, size = 0;
      q[tail++] = i; lab[i] = cur;
      while (head < tail) {
        var pv = q[head++]; size++;
        var px3 = pv % sw, py3 = (pv - px3) / sw;
        var nb3 = [px3 > 0 ? pv - 1 : -1, px3 < sw - 1 ? pv + 1 : -1, py3 > 0 ? pv - sw : -1, py3 < sh - 1 ? pv + sw : -1];
        for (var k3 = 0; k3 < 4; k3++) {
          var q3 = nb3[k3];
          if (q3 < 0 || lab[q3] || out[q3 * 4 + 3] === 0) continue;
          lab[q3] = cur; q[tail++] = q3;
        }
      }
      if (size > bestSize) { bestSize = size; best = cur; }
    }
    /* keep every sizeable piece that sits in the same vertical column as her,
       so a two-piece outfit never loses its top — stray wall/floor patches go */
    if (best) {
      var bL = sw, bR = 0, s2;
      for (i = 0; i < n; i++) if (lab[i] === best) { s2 = i % sw; if (s2 < bL) bL = s2; if (s2 > bR) bR = s2; }
      var allow = Math.max(6, Math.round(sw * 0.08));
      var sizes = {}, lft = {}, rgt = {};
      for (i = 0; i < n; i++) {
        var L2 = lab[i]; if (!L2) continue;
        sizes[L2] = (sizes[L2] || 0) + 1;
        var x4 = i % sw;
        if (lft[L2] === undefined || x4 < lft[L2]) lft[L2] = x4;
        if (rgt[L2] === undefined || x4 > rgt[L2]) rgt[L2] = x4;
      }
      for (i = 0; i < n; i++) {
        var L3 = lab[i]; if (!L3 || !out[i * 4 + 3]) continue;
        var big = sizes[L3] >= bestSize * 0.02;
        var inCol = rgt[L3] >= bL - allow && lft[L3] <= bR + allow;
        if (!big || !inCol) out[i * 4 + 3] = 0;
      }
    }

    /* a grey studio floor / cast shadow under her feet must not follow her in */
    var bandY = Math.round(sh * 0.84);
    for (var by2 = bandY; by2 < sh; by2++) {
      for (var bx2 = 0; bx2 < sw; bx2++) {
        var o5 = (by2 * sw + bx2) * 4;
        if (out[o5 + 3] === 0) continue;
        var r5 = d[o5], g5 = d[o5 + 1], b5 = d[o5 + 2];
        var mx5 = Math.max(r5, g5, b5), mn5 = Math.min(r5, g5, b5);
        var lum5 = r5 * 0.3 + g5 * 0.59 + b5 * 0.11;
        if (mx5 - mn5 < 16 && lum5 < 208) out[o5 + 3] = 0;
      }
    }

    var mc = cv(sw, sh);
    mc.getContext('2d').putImageData(new ImageData(out, sw, sh), 0, 0);
    var big = cv(img.width, img.height), bx = big.getContext('2d');
    bx.imageSmoothingQuality = 'high';
    bx.filter = 'blur(' + Math.max(1, Math.round(img.width / 400)) + 'px)';
    bx.drawImage(mc, 0, 0, big.width, big.height);
    bx.filter = 'none';
    return big;
  }

  /* -------------------- garment silhouette from a studio shot -------------- */
  function garmentMask(img) {
    var m = autoCutMask(img, 26, true);
    var s = cv(160, Math.max(1, Math.round(img.height / img.width * 160)));
    var x = s.getContext('2d', { willReadFrequently: true });
    x.drawImage(m, 0, 0, s.width, s.height);
    var d = x.getImageData(0, 0, s.width, s.height).data;
    var x0 = s.width, y0 = s.height, x1 = 0, y1 = 0, hits = 0, i;
    for (var yy = 0; yy < s.height; yy++) {
      for (var xx = 0; xx < s.width; xx++) {
        if (d[(yy * s.width + xx) * 4] > 100) {
          hits++;
          if (xx < x0) x0 = xx; if (xx > x1) x1 = xx;
          if (yy < y0) y0 = yy; if (yy > y1) y1 = yy;
        }
      }
    }
    var cols = [], rows = [], yy2, xx2;
    for (xx2 = 0; xx2 < s.width; xx2++) { var cn = 0; for (yy2 = 0; yy2 < s.height; yy2++) if (d[(yy2 * s.width + xx2) * 4] > 100) cn++; cols.push(cn); }
    for (yy2 = 0; yy2 < s.height; yy2++) { var rn = 0; for (xx2 = 0; xx2 < s.width; xx2++) if (d[(yy2 * s.width + xx2) * 4] > 100) rn++; rows.push(rn); }
    var colMax = Math.max.apply(null, cols) || 1, rowMax = Math.max.apply(null, rows) || 1;
    for (i = 0; i < cols.length; i++) if (cols[i] > colMax * 0.03) { x0 = Math.min(x0, i); break; }
    for (i = cols.length - 1; i >= 0; i--) if (cols[i] > colMax * 0.03) { x1 = Math.max(x1, i); break; }
    for (i = 0; i < rows.length; i++) if (rows[i] > rowMax * 0.03) { y0 = Math.min(y0, i); break; }
    for (i = rows.length - 1; i >= 0; i--) if (rows[i] > rowMax * 0.03) { y1 = Math.max(y1, i); break; }

    var frac = hits / (s.width * s.height);
    if (frac < 0.10 || frac > 0.94) {
      m = cv(img.width, img.height);
      var g = m.getContext('2d');
      g.translate(img.width / 2, img.height / 2);
      g.scale(1, img.height / img.width);
      var r = img.width * 0.46;
      var grd = g.createRadialGradient(0, 0, r * 0.72, 0, 0, r);
      grd.addColorStop(0, '#fff'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(0, 0, r, 0, 6.2832); g.fill();
      x0 = img.width * 0.08; x1 = img.width * 0.92; y0 = img.height * 0.02; y1 = img.height * 0.98;
    } else {
      x0 = (x0 / s.width) * img.width; x1 = ((x1 + 1) / s.width) * img.width;
      y0 = (y0 / s.height) * img.height; y1 = ((y1 + 1) / s.height) * img.height;
    }

    /* start the blouse at the neckline, not on the mannequin's head */
    var rowW = [];
    for (var ry = Math.floor(y0); ry <= Math.ceil(y1); ry++) {
      var cn2 = 0, sc = 0;
      for (var rx = Math.floor(x0); rx <= Math.ceil(x1); rx++) {
        cn2++;
        if (d[((ry * s.height / img.height) | 0) * s.width + ((rx * s.width / img.width) | 0) * 4] > 100) sc++;
      }
      rowW.push(cn2 ? sc / cn2 : 0);
    }
    var cut = 0;
    for (var k2 = 0; k2 < rowW.length; k2++) { if (rowW[k2] >= 0.42) { cut = k2; break; } }
    if (rowW.length && cut / rowW.length < 0.34) y0 = y0 + (cut / rowW.length) * (y1 - y0);

    return { mask: m, box: { x0: x0, y0: y0, x1: x1, y1: y1 } };
  }

  /* smooth row-by-row spans of the garment (no wobble, no banding) */
  function garmentSpans(baked, box) {
    var N = 140, x0 = box.x0, y0 = box.y0, x1 = box.x1, y1 = box.y1;
    var w = Math.max(1, Math.round(x1 - x0)), h = Math.max(1, Math.round(y1 - y0));
    var probe = cv(Math.min(200, w), Math.min(400, h));
    var px = probe.getContext('2d', { willReadFrequently: true });
    px.drawImage(baked, x0, y0, w, h, 0, 0, probe.width, probe.height);
    var d = px.getImageData(0, 0, probe.width, probe.height).data;
    var L = [], R = [], i, y;
    for (i = 0; i < N; i++) {
      y = Math.min(probe.height - 1, Math.round((i / (N - 1)) * (probe.height - 1)));
      var l = probe.width, r = -1, X;
      for (X = 0; X < probe.width; X++) if (d[(y * probe.width + X) * 4 + 3] > 30) { if (X < l) l = X; if (X > r) r = X; }
      L.push(r < 0 ? probe.width * 0.18 : l);
      R.push(r < 0 ? probe.width * 0.82 : r + 1);
    }
    /* 4 passes of [1,2,1] smoothing + a slope limit */
    for (var pass = 0; pass < 4; pass++) {
      var L2 = L.slice(), R2 = R.slice();
      for (i = 1; i < N - 1; i++) {
        L2[i] = (L[i - 1] + 2 * L[i] + L[i + 1]) / 4;
        R2[i] = (R[i - 1] + 2 * R[i] + R[i + 1]) / 4;
      }
      L = L2; R = R2;
    }
    var maxStep = probe.width * 0.05;
    for (i = 1; i < N; i++) {
      if (Math.abs(L[i] - L[i - 1]) > maxStep) L[i] = L[i - 1] + (L[i] > L[i - 1] ? maxStep : -maxStep);
      if (Math.abs(R[i] - R[i - 1]) > maxStep) R[i] = R[i - 1] + (R[i] > R[i - 1] ? maxStep : -maxStep);
    }
    var k = w / probe.width;
    return {
      n: N,
      l: L.map(function (v) { return x0 + v * k; }),
      r: R.map(function (v) { return x0 + v * k; })
    };
  }

  /* the studio dummy's hands and neck are skin coloured — take them out and let
     the surrounding fabric flow over the gap, so the dress looks worn, not displayed */
  function deSkin(c) {
    var w = c.width, h = c.height;
    var x = c.getContext('2d', { willReadFrequently: true });
    var img = x.getImageData(0, 0, w, h), d = img.data;
    var y, X;
    for (y = 0; y < h; y++) {
      var skin = [];
      for (X = 0; X < w; X++) {
        var o = (y * w + X) * 4;
        if (d[o + 3] < 40) continue;
        var R = d[o], G = d[o + 1], B = d[o + 2];
        var light = (R + G + B) / 3;
        /* skin: warm, mid-bright, red > green > blue */
        if (R > 95 && R < 250 && R > G + 12 && G > B - 4 && R - B > 24 && R - B < 110 && light > 80 && light < 235) skin.push(X);
      }
      if (!skin.length || skin.length > w * 0.6) continue;
      for (var k = 0; k < skin.length; k++) {
        var sx = skin[k];
        /* nearest non-skin neighbour on either side */
        var l = sx - 1, r = sx + 1;
        while (l >= 0 && (d[(y * w + l) * 4 + 3] < 40 || isSkin(d, (y * w + l) * 4))) l--;
        while (r < w && (d[(y * w + r) * 4 + 3] < 40 || isSkin(d, (y * w + r) * 4))) r++;
        var o2 = (y * w + sx) * 4;
        if (l >= 0 && r < w) {
          var tt = (sx - l) / (r - l);
          var lo = (y * w + l) * 4, ro = (y * w + r) * 4;
          d[o2] = d[lo] + (d[ro] - d[lo]) * tt;
          d[o2 + 1] = d[lo + 1] + (d[ro + 1] - d[lo + 1]) * tt;
          d[o2 + 2] = d[lo + 2] + (d[ro + 2] - d[lo + 2]) * tt;
        } else if (l >= 0) {
          var lo2 = (y * w + l) * 4; d[o2] = d[lo2]; d[o2 + 1] = d[lo2 + 1]; d[o2 + 2] = d[lo2 + 2];
        } else if (r < w) {
          var ro2 = (y * w + r) * 4; d[o2] = d[ro2]; d[o2 + 1] = d[ro2 + 1]; d[o2 + 2] = d[ro2 + 2];
        }
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  function isSkin(d, o) {
    var R = d[o], G = d[o + 1], B = d[o + 2], light = (R + G + B) / 3;
    return R > 95 && R < 250 && R > G + 12 && G > B - 4 && R - B > 24 && R - B < 110 && light > 80 && light < 235;
  }

  function bakeGarment(img, mask) {
    var c = cv(img.width, img.height), x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(mask, 0, 0);
    x.globalCompositeOperation = 'source-over';
    return c;
  }

  /* seam-free textured triangle */
  function tri(ctx, img, sx0, sy0, sx1, sy1, sx2, sy2, dx0, dy0, dx1, dy1, dx2, dy2) {
    var den = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1);
    if (!den) return;
    var a = (dx0 * (sy1 - sy2) + dx1 * (sy2 - sy0) + dx2 * (sy0 - sy1)) / den;
    var b2 = (dy0 * (sy1 - sy2) + dy1 * (sy2 - sy0) + dy2 * (sy0 - sy1)) / den;
    var c = (dx0 * (sx2 - sx1) + dx1 * (sx0 - sx2) + dx2 * (sx1 - sx0)) / den;
    var d2 = (dy0 * (sx2 - sx1) + dy1 * (sx0 - sx2) + dy2 * (sx1 - sx0)) / den;
    var e = (dx0 * (sx1 * sy2 - sx2 * sy1) + dx1 * (sx2 * sy0 - sx0 * sy2) + dx2 * (sx0 * sy1 - sx1 * sy0)) / den;
    var f = (dy0 * (sx1 * sy2 - sx2 * sy1) + dy1 * (sx2 * sy0 - sx0 * sy2) + dy2 * (sx0 * sy1 - sx1 * sy0)) / den;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dx0, dy0); ctx.lineTo(dx1, dy1); ctx.lineTo(dx2, dy2); ctx.closePath();
    ctx.clip();
    ctx.transform(a, b2, c, d2, e, f);
    var bx = Math.min(sx0, sx1, sx2), by = Math.min(sy0, sy1, sy2);
    var bw = Math.max(sx0, sx1, sx2) - bx, bh = Math.max(sy0, sy1, sy2) - by;
    ctx.drawImage(img, bx, by, Math.max(1, bw), Math.max(1, bh), bx, by, Math.max(1, bw), Math.max(1, bh));
    ctx.restore();
  }

  /* ============================== the studio ============================== */
  function mount(root, api) {
    var T = {
      U: function (a) { return a; }   /* placeholder so old refs never break */
    };
    var S = {
      photo: null, person: null, cutMask: null, autoOn: true,
      dressItems: api.items || [], dressIdx: -1, dressImg: null, dressBaked: null, dressBox: null,
      dressName: '', backgrounds: api.backgrounds || [], bgIdx: 0,
      guides: true, quality: '4k', busy: false,
      /* fit state: 1.00 = automatic, perfect fit */
      fit: { size: 100, width: 100, length: 100, lift: 0, zoom: 100 },
      customOpen: false,
      lm: null, rect: null, saved: [], measured: false
    };

    /* ------------------------------ markup -------------------------------- */
    root.innerHTML = [
      '<div class="to-studio" dir="ltr">',
      '  <header class="to-head" id="toHead">',
      '    <h2 class="to-title">Try-On Studio</h2>',
      '    <p class="to-lead">See our couture on your own photo — fitted to your body in moments.</p>',
      '    <div class="to-guidebox">',
      '      <p class="to-gtitle">Instructions for your photo</p>',
      '      <div class="to-gbody">',
      '        <div class="to-guide">',
      '          <figure class="ok"><img src="/assets/img/look/guide-3-full.webp" alt="Full length without a dupatta is correct" loading="lazy" decoding="async"><figcaption>Full length, no dupatta<br><b>Correct photo</b></figcaption></figure>',
      '          <figure class="bad"><img src="/assets/img/look/guide-1-face.webp" alt="A face-only photo is not suitable" loading="lazy" decoding="async"><figcaption>Face only<br><b>Not suitable</b></figcaption></figure>',
      '          <figure class="bad"><img src="/assets/img/look/guide-2-dupatta.webp" alt="A photo with a dupatta is not suitable" loading="lazy" decoding="async"><figcaption>Photo with a dupatta<br><b>Not suitable</b></figcaption></figure>',
      '        </div>',
      '        <div class="to-copy">',
      '          <ul class="to-rules">',
      '            <li>Whole body from head to feet, face and eyes clearly visible.</li>',
      '            <li>No dupatta, shawl or scarf, so the design shows clearly on you.</li>',
      '            <li>Stand straight with your arms slightly away from the body, against a plain, bright wall.</li>',
      '            <li>The photo is processed in your own device and is only shared with our stylists when you save a look.</li>',
      '          </ul>',
      '          <label class="btn btn-gold to-pick">Choose your photo<input type="file" id="toFile" accept="image/*" hidden></label>',
      '          <p class="to-tiny">JPG or PNG · up to 25 MB</p>',
      '        </div>',
      '      </div>',
      '    </div>',
      '  </header>',
      '  <div class="to-workspace" id="toWork" hidden>',
      '    <div class="to-stagewrap">',
      '      <div class="to-stage" id="toStage">',
      '        <canvas id="toCanvas"></canvas>',
      '        <canvas id="toOverlay"></canvas>',
      '        <button class="to-dl" id="toDownload" title="Download your picture">',
      '          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3v11m0 0 4.2-4.2M12 14 7.8 9.8M4.5 17.5V19a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      '          <span id="toDlTag">4K</span>',
      '        </button>',
      '        <div class="to-busy" id="toBusy" hidden><span class="spin"></span><em>Preparing your picture…</em></div>',
      '      </div>',
      '      <div class="to-bgstrip" id="toBgs" hidden></div>',
      '    </div>',
      '    <aside class="to-side">',
      '      <section class="to-card">',
      '        <h3>Choose a design</h3>',
      '        <div class="to-colls" id="toColls"></div>',
      '        <div class="to-dresses" id="toDresses"></div>',
      '        <p class="to-next" id="toDressName"></p>',
      '      </section>',
      '      <section class="to-card to-fitcard">',
      '        <div class="to-fitrow">',
      '          <span class="to-fitbadge" id="toFitBadge">Auto-fit</span>',
      '          <button class="chip" id="toCustomToggle">Customise</button>',
      '        </div>',
      '        <p class="to-advice" id="toSleeve" hidden></p>',
      '        <p class="to-tiny" id="toFitNote">The design is fitted to your body automatically — no adjustment needed.</p>',
      '        <div class="to-custom" id="toCustomPanel" hidden>',
      '          <label class="to-slide">Length<input type="range" id="fitLength" min="88" max="112" value="100"></label>',
      '          <label class="to-slide">Width<input type="range" id="fitWidth" min="88" max="118" value="100"></label>',
      '          <label class="to-slide">Flare<input type="range" id="fitSize" min="90" max="115" value="100"></label>',
      '          <label class="to-slide">Up / down<input type="range" id="fitLift" min="-6" max="6" value="0"></label>',
      '          <button class="chip" id="fitReset">Back to auto-fit</button>',
      '        </div>',
      '        <div class="to-fitrow" style="margin-top:10px">',
      '          <button class="chip on" data-q="4k">4K</button>',
      '          <button class="chip" data-q="8k">8K</button>',
      '          <button class="chip" id="toGuides">Guide lines</button>',
      '        </div>',
      '      </section>',
      '      <section class="to-card">',
      '        <h3>Choose a background</h3>',
      '        <p class="to-tiny">Pick one of the three boxes under the picture.</p>',
      '        <div class="actions" style="margin-top:8px">',
      '          <button class="btn btn-gold btn-sm" id="toSave">Save to my gallery</button>',
      '          <a class="btn btn-ghost btn-sm" id="toWa" target="_blank" rel="noopener">Ask a stylist</a>',
      '        </div>',
      '        <div id="toGallery" class="to-gallery"></div>',
      '      </section>',
      '    </aside>',
      '  </div>',
      '</div>'].join('');

    var $ = function (s) { return root.querySelector(s); };
    var $$ = function (s) { return Array.prototype.slice.call(root.querySelectorAll(s)); };
    var canvas = $('#toCanvas'), octx = canvas.getContext('2d');
    var overlay = $('#toOverlay');

    /* --------------------------- the photograph ---------------------------- */
    function setPhoto(file) {
      if (!file) return;
      if (!/^image\//.test(file.type)) return api.toast('Please choose an image file.');
      var url = URL.createObjectURL(file);
      loadImg(url).then(function (img) {
        var w = Math.min(MAX_PHOTO, img.naturalWidth);
        var h = Math.round(img.naturalHeight * (w / img.naturalWidth));
        var c = cv(w, h);
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        S.photo = c;
        S.measured = false;
        S.fit = { size: 100, width: 100, length: 100, lift: 0, zoom: 100 };
        setFitInputs(100, 100, 100, 0);
        $('#toWork').hidden = false;
        $('#toDownload').hidden = false;
        $('#toBusy').hidden = false;
        var head = $('#toHead');
        if (head) {
          head.classList.add('compact');
          var pick = head.querySelector('.to-pick');
          if (pick && pick.firstChild) pick.firstChild.nodeValue = 'Choose another photo';
        }
        setTimeout(function () {
          preparePerson();
          $('#toBusy').hidden = true;
          window.setTimeout(function () {
            var st = $('#toStage');
            if (st && st.scrollIntoView) st.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 80);
        }, 30);
        URL.revokeObjectURL(url);
      }).catch(function () { api.toast('That photo could not be read — please try another one.'); });
    }

    /* remove the plain wall behind her (silent, automatic) */
    function preparePerson() {
      if (!S.photo) return;
      S.cutMask = autoCutMask(S.photo, 30, false);
      S.autoOn = true;
      composePerson();
      if (keptFraction() < 0.06) { S.autoOn = false; composePerson(); }
      measurePerson();
      render();
      checkSleeveAdvice();
    }

    function composePerson() {
      var c = cv(S.photo.width, S.photo.height), x = c.getContext('2d');
      x.drawImage(S.photo, 0, 0);
      if (S.autoOn && S.cutMask) {
        x.globalCompositeOperation = 'destination-in';
        x.drawImage(S.cutMask, 0, 0);
        x.globalCompositeOperation = 'source-over';
      }
      var out = cv(c.width, c.height), ox = out.getContext('2d');
      ox.filter = 'blur(0.6px)';
      ox.drawImage(c, 0, 0);
      ox.filter = 'none';
      S.person = out;
    }

    function keptFraction() {
      if (!S.person) return 1;
      var w = 60, h = Math.max(1, Math.round(S.person.height / S.person.width * w));
      var c = cv(w, h), x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(S.person, 0, 0, w, h);
      var d = x.getImageData(0, 0, w, h).data, n = 0;
      for (var i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
      return n / (w * h);
    }

    /* ---- read her proportions so the dress fits by itself ----------------
       Everything is anchored on the head: it is the one part that is always
       clearly separated from the wall, so the fit never depends on how well
       the background was removed. Classic 7.5-head proportions are used for
       the shoulder / waist / hip lines and widths. */
    function measurePerson() {
      if (!S.person) return;
      var w = 150, h = Math.max(1, Math.round(S.person.height / S.person.width * w));
      var c = cv(w, h), x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(S.person, 0, 0, w, h);
      var d = x.getImageData(0, 0, w, h).data;

      /* vertical extent of the figure */
      var top = -1, bot = -1, y, X, rows = [];
      for (y = 0; y < h; y++) {
        var l = w, r = -1, n = 0;
        for (X = 0; X < w; X++) if (d[(y * w + X) * 4 + 3] > 60) { n++; if (X < l) l = X; if (X > r) r = X; }
        rows.push(n > 2 ? [l, r] : null);
        if (n > 2) { if (top < 0) top = y; bot = y; }
      }
      if (top < 0) { S.lm = defaultLandmarks(); S.measured = false; return; }
      var HF = bot - top + 1;
      if (HF < h * 0.3) { S.lm = defaultLandmarks(); S.measured = false; return; }

      /* head box: widest row in the first 12 % of the figure */
      var headW = 0, headCx = w / 2, hy0 = Math.round(top + HF * 0.022), hy1 = Math.round(top + HF * 0.115);
      for (y = hy0; y <= hy1; y++) {
        var rr = rows[clamp(y, 0, h - 1)];
        if (!rr) continue;
        var ww = rr[1] - rr[0] + 1;
        if (ww > headW && ww < w * 0.55) { headW = ww; headCx = (rr[0] + rr[1]) / 2; }
      }
      if (!headW) { S.lm = defaultLandmarks(); S.measured = false; return; }

      var U = function (px) { return px / w; };          /* pixel -> 0..1 of the photo */
      var V = function (py) { return py / h; };
      var half = function (k) { return U(headW * k / 2); };

      var shoulderY = top + HF * 0.145, waistY = top + HF * 0.330, hipY = top + HF * 0.430;
      var hemY = bot - HF * 0.005;
      S.lm = {};
      var sw2 = half(1.78);      /* shoulder width  = 1.78 head widths */
      var ww2 = half(1.38);
      var hw2 = half(1.72);
      S.lm.shoulderL = { u: U(headCx) - sw2, v: V(shoulderY) };
      S.lm.shoulderR = { u: U(headCx) + sw2, v: V(shoulderY) };
      S.lm.waistL = { u: U(headCx) - ww2, v: V(waistY) };
      S.lm.waistR = { u: U(headCx) + ww2, v: V(waistY) };
      S.lm.hipL = { u: U(headCx) - hw2, v: V(hipY) };
      S.lm.hipR = { u: U(headCx) + hw2, v: V(hipY) };
      S.lm.hem = { u: U(headCx), v: V(hemY) };
      S.measured = true;
    }

    function defaultLandmarks() {
      return {
        shoulderL: { u: 0.335, v: 0.205 }, shoulderR: { u: 0.665, v: 0.205 },
        waistL: { u: 0.385, v: 0.335 }, waistR: { u: 0.615, v: 0.335 },
        hipL: { u: 0.355, v: 0.435 }, hipR: { u: 0.645, v: 0.435 },
        hem: { u: 0.5, v: 0.975 }
      };
    }

    /* ------------------------------ dress pick ---------------------------- */
    var activeColl = 'all';

    function buildCollChips() {
      var wrap = $('#toColls');
      if (!wrap) return;
      var seen = {};
      var chips = ['<button class="chip on" data-coll="all">All designs</button>'];
      S.dressItems.forEach(function (it) {
        var c = it.collectionName || it.collectionId || '';
        if (!c || seen[c]) return;
        seen[c] = 1;
        chips.push('<button class="chip" data-coll="' + api.esc(c) + '">' + api.esc(c) + '</button>');
      });
      wrap.innerHTML = chips.join('');
      wrap.addEventListener('click', function (e) {
        var b = e.target.closest('[data-coll]');
        if (!b) return;
        activeColl = b.dataset.coll;
        $$('#toColls .chip').forEach(function (x) { x.classList.toggle('on', x === b); });
        buildDressGrid();
        var first = S.dressItems.filter(matchesColl)[0];
        if (first) pickDress(S.dressItems.indexOf(first));
      });
    }
    function matchesColl(it) {
      return activeColl === 'all' || (it.collectionName || it.collectionId) === activeColl;
    }

    function buildDressGrid() {
      var wrap = $('#toDresses');
      wrap.innerHTML = S.dressItems.map(function (it, i) {
        if (!matchesColl(it)) return '';
        return '<button data-dress="' + i + '" class="' + (i === S.dressIdx ? 'on' : '') + '" title="' + api.esc(it.name) + '">' +
          '<img src="' + api.esc((it.thumbs && it.thumbs[0]) || it.images[0]) + '" alt="' + api.esc(it.name) + '" loading="lazy" decoding="async"></button>';
      }).join('');
      wrap.addEventListener('click', function (e) {
        var b = e.target.closest('[data-dress]');
        if (!b) return;
        pickDress(Number(b.dataset.dress));
      });
    }

    /* the pre-cut studio version of a dress (mannequin removed, design untouched) */
    function cutUrlOf(u) {
      if (!/\/assets\/img\/dresses\//.test(u)) return '';
      return u.replace('/assets/img/dresses/', '/assets/img/dresses/cut/');
    }

    /* alpha sanity check — a broken cut-out is rejected in favour of the real photo */
    function cutQuality(c) {
      var w = 80, h = Math.max(1, Math.round(c.height / c.width * w));
      var t = cv(w, h), x = t.getContext('2d', { willReadFrequently: true });
      x.drawImage(c, 0, 0, w, h);
      var d = x.getImageData(0, 0, w, h).data;
      var on = 0, rowsOn = 0, blocks = 0, prev = false, widest = 0;
      for (var y = 0; y < h; y++) {
        var cnt = 0;
        for (var X = 0; X < w; X++) if (d[(y * w + X) * 4 + 3] > 60) cnt++;
        var has = cnt > 2;
        if (has) { rowsOn++; if (!prev) blocks++; }
        if (cnt > widest) widest = cnt;
        prev = has;
        on += cnt;
      }
      var cover = on / (w * h);
      /* the bodice must be part of the cut: no "skirt-only" cut-outs */
      var ys = [], y2, X2;
      for (y2 = 0; y2 < h; y2++) { var any = false; for (X2 = 0; X2 < w; X2++) if (d[(y2 * w + X2) * 4 + 3] > 60) { any = true; break; } if (any) ys.push(y2); }
      if (!ys.length) return false;
      var t0 = ys[0], t1 = ys[ys.length - 1], HH = Math.max(1, t1 - t0);
      var bandCover = function (a, b) {
        var on2 = 0;
        for (var yy = Math.round(t0 + a * HH); yy < Math.round(t0 + b * HH); yy++)
          for (var xx = 0; xx < w; xx++) if (d[(yy * w + xx) * 4 + 3] > 60) on2++;
        return on2 / Math.max(1, (Math.round(t0 + b * HH) - Math.round(t0 + a * HH)) * w);
      };
      return cover >= 0.14 && cover <= 0.88 && rowsOn >= h * 0.55 && blocks <= 3 &&
             widest >= w * 0.25 && bandCover(0, 0.30) >= 0.30 && bandCover(0.30, 0.60) >= 0.30;
    }

    function pickDress(i) {
      var it = S.dressItems[i];
      if (!it) return;
      S.dressIdx = i;
      $$('#toDresses [data-dress]').forEach(function (b) { b.classList.toggle('on', Number(b.dataset.dress) === i); });
      /* the dress photo itself — never the collection cover */
      var src = (it.images || []).filter(function (u) { return /\/img\/dresses\/|\/uploads\//.test(u); })[0] ||
                (it.images || [])[0] || '';
      var idx = (it.images || []).indexOf(src);
      var cut = (it.cuts && it.cuts[idx]) || (it.cuts && it.cuts[0]) || cutUrlOf(src);
      var done = function (img, preCut) {
        var w = Math.min(900, img.naturalWidth), h = Math.round(img.naturalHeight * w / img.naturalWidth);
        var c = cv(w, h); c.getContext('2d').drawImage(img, 0, 0, w, h);
        S.dressImg = c;
        var g;
        if (preCut) {
          var bb = alphaBox(c);
          g = { mask: null, box: bb };
          S.dressBaked = c;
        } else {
          g = garmentMask(c);
          S.dressBaked = bakeGarment(c, g.mask);
          deSkin(S.dressBaked);
        }
        S.dressBox = g.box;
        S.dressSpans = garmentSpans(S.dressBaked, g.box);
        S.dressName = it.name;
        S.dressSleeves = sleevesOf(S.dressSpans);
        var nm = $('#toDressName');
        if (nm) {
          nm.innerHTML = '<b>' + api.esc(it.name) + '</b>' + (it.price ? ' · ' + api.money(it.price) : '') +
            ' · <span>' + (S.dressSleeves ? 'sleeved design' : 'sleeveless design') + '</span>';
        }
        if (S.person) { $('#toDownload').hidden = false; }
        render();
        checkSleeveAdvice();
        var wa = $('#toWa');
        if (wa) wa.href = api.waLink('Hello! I am looking at "' + it.name + '" in the Try-On Studio and would like sizing advice.') || '#';
      };

      var fallback = function () {
        loadImg(src).then(function (img) { done(img, false); }).catch(function () {});
      };
      if (cut) {
        loadImg(cut).then(function (img) {
          var w = Math.min(900, img.naturalWidth), h = Math.round(img.naturalHeight * w / img.naturalWidth);
          var t = cv(w, h); t.getContext('2d').drawImage(img, 0, 0, w, h);
          if (cutQuality(t)) done(img, true); else fallback();
        }).catch(fallback);
      } else fallback();
    }

    /* does this cut-out have sleeves? (fabric wide at the upper-arm level) */
    function sleevesOf(spans) {
      if (!spans) return true;
      var a = Math.round(spans.n * 0.20), b = Math.round(spans.n * 0.30);
      var wide = 0, cnt = 0;
      for (var i = a; i <= b; i++) {
        var w = Math.abs(spans.r[i] - spans.l[i]);
        if (w > 0) { cnt++; wide += w; }
      }
      if (!cnt) return true;
      var mid = Math.abs(spans.r[Math.round(spans.n * 0.5)] - spans.l[Math.round(spans.n * 0.5)]) || 1;
      return (wide / cnt) > mid * 0.95;
    }

    /* how much bare skin is visible on her arms in the photo */
    function armSkin() {
      if (!S.person) return 1;
      var w = 90, h = Math.max(1, Math.round(S.person.height / S.person.width * w));
      var c = cv(w, h), x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(S.person, 0, 0, w, h);
      var d = x.getImageData(0, 0, w, h).data;
      var on = 0, skin = 0;
      for (var y = Math.round(h * 0.24); y < Math.round(h * 0.46); y++) {
        for (var X = 0; X < w; X++) {
          var o = (y * w + X) * 4;
          if (d[o + 3] < 60) continue;
          on++;
          var R = d[o], G = d[o + 1], B = d[o + 2];
          if (R > 90 && R > G + 12 && R - B > 22 && R - B < 130) skin++;
        }
      }
      return on ? skin / on : 1;
    }

    function checkSleeveAdvice() {
      var el = $('#toSleeve');
      if (!el) return;
      if (!S.person || !S.dressSpans) { el.hidden = true; return; }
      var sleeveless = !S.dressSleeves;
      var covered = armSkin() < 0.34;
      if (sleeveless && covered) {
        el.hidden = false;
        el.innerHTML = '<b>Sleeveless design</b> — in your photo your arms appear to be covered by the clothes you were wearing. ' +
          'For the neatest result, upload a photo with bare arms (a sleeveless top), so this design does not show your previous outfit on the arms.';
      } else el.hidden = true;
    }

    /* bounding box of everything that is not transparent */
    function alphaBox(c) {
      var w = 160, h = Math.max(1, Math.round(c.height / c.width * w));
      var t = cv(w, h), x = t.getContext('2d', { willReadFrequently: true });
      x.drawImage(c, 0, 0, w, h);
      var d = x.getImageData(0, 0, w, h).data, X, y;
      var x0 = w, x1 = 0, y0 = h, y1 = 0;
      for (y = 0; y < h; y++) {
        for (X = 0; X < w; X++) {
          if (d[(y * w + X) * 4 + 3] > 40) {
            if (X < x0) x0 = X; if (X > x1) x1 = X;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
      }
      if (x1 <= x0 || y1 <= y0) return { x0: 0, y0: 0, x1: c.width, y1: c.height };
      return {
        x0: x0 / w * c.width, y0: y0 / h * c.height,
        x1: (x1 + 1) / w * c.width, y1: (y1 + 1) / h * c.height
      };
    }

    /* --------------------------- geometry helpers ------------------------- */
    function lmPt(k) {
      var r = S.rect, p = S.lm[k];
      return { x: r.x + p.u * r.w, y: r.y + p.v * r.h };
    }
    function bodyWidths() {
      var sl = lmPt('shoulderL'), sr = lmPt('shoulderR');
      var wl = lmPt('waistL'), wr = lmPt('waistR');
      var hl = lmPt('hipL'), hr = lmPt('hipR');
      var hem = lmPt('hem');
      return {
        shoulderY: (sl.y + sr.y) / 2, shoulderW: Math.abs(sr.x - sl.x),
        waistY: (wl.y + wr.y) / 2, waistW: Math.abs(wr.x - wl.x),
        hipY: (hl.y + hr.y) / 2, hipW: Math.abs(hr.x - hl.x),
        hemY: hem.y, cx: (sl.x + sr.x + hl.x + hr.x) / 4
      };
    }

    /* --------------------------- render pipeline -------------------------- */
    function renderTo(ctx, W, H, withGuides) {
      ctx.clearRect(0, 0, W, H);
      var bg = S.backgrounds[S.bgIdx];
      if (bg && bg.img) {
        var bi = bg.img;
        var s = Math.max(W / bi.width, H / bi.height);
        var dw = bi.width * s, dh = bi.height * s;
        ctx.drawImage(bi, (W - dw) / 2, (H - dh) / 2, dw, dh);
        var vg = ctx.createLinearGradient(0, 0, 0, H);
        vg.addColorStop(0, 'rgba(255,255,255,.08)');
        vg.addColorStop(0.55, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,.12)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = '#e9e3d3'; ctx.fillRect(0, 0, W, H);
      }

      var rect = null;
      if (S.person) {
        var pw = S.person.width, ph = S.person.height;
        var fitH = H * 0.962 * (S.fit.zoom / 100);
        var k = fitH / ph;
        var dw2 = pw * k, dh2 = ph * k;
        var dx = (W - dw2) / 2, dy = H - dh2 - H * 0.006;
        rect = { x: dx, y: dy, w: dw2, h: dh2 };
        ctx.drawImage(S.person, dx, dy, dw2, dh2);
      }
      S.rect = rect || { x: W * 0.28, y: H * 0.03, w: W * 0.44, h: H * 0.94 };
      if (!S.lm) S.lm = defaultLandmarks();

      var b = bodyWidths();
      /* contact shadow on the lawn */
      var gy = b.hemY + (rect ? rect.h * 0.012 : H * 0.01);
      var sh = ctx.createRadialGradient(b.cx, gy, 0, b.cx, gy, Math.max(20, b.hipW * 0.95));
      sh.addColorStop(0, 'rgba(24,32,14,.34)');
      sh.addColorStop(1, 'rgba(24,32,14,0)');
      ctx.save();
      ctx.fillStyle = sh;
      ctx.beginPath();
      ctx.ellipse(b.cx, gy, Math.max(24, b.hipW * 1.12), Math.max(8, b.hipW * 0.26), 0, 0, 6.2832);
      ctx.fill();
      ctx.restore();

      if (S.dressBaked && S.dressBox) drawDress(ctx, W, H, b);
      if (withGuides) drawRails(ctx, W, H, b);
    }

    function drawDress(ctx, W, H, b) {
      var box = S.dressBox, src = S.dressBaked, spans = S.dressSpans;
      if (!box || !spans) return;
      var sy0 = box.y0, sy1 = box.y1;
      var srcH = Math.max(1, sy1 - sy0);
      var bodyH = Math.max(1, b.hemY - b.shoulderY);

      var lift = S.fit.lift * bodyH * 0.01;
      var topY = b.shoulderY - bodyH * 0.02 + lift;
      var botY = b.hemY + lift + bodyH * (S.fit.length / 100 - 1) * 0.5;
      var span = botY - topY;
      if (span < 20) return;

      var waistT = clamp((b.waistY - b.shoulderY) / bodyH, 0.08, 0.45);
      var hipT = clamp((b.hipY - b.shoulderY) / bodyH, waistT + 0.08, 0.75);
      var bustT = waistT * 0.55;

      /* the silhouette the dress must take on her body */
      var sizeK = S.fit.size / 100, widthK = S.fit.width / 100;
      var half = {
        top: (b.shoulderW / 2) * 0.96 * widthK,
        bust: (b.waistW / 2) * 1.06 * widthK,
        waist: (b.waistW / 2) * 0.98 * widthK,
        hip: (b.hipW / 2) * 1.08 * widthK,
        hem: (b.hipW / 2) * 2.05 * sizeK
      };
      var at = [
        [0, half.top], [bustT, half.bust], [waistT, half.waist], [hipT, half.hip], [1, half.hem]
      ];
      function targetHalf(t) {
        for (var j = 1; j < at.length; j++) {
          if (t <= at[j][0]) {
            var u = (t - at[j - 1][0]) / Math.max(0.0001, at[j][0] - at[j - 1][0]);
            return lerp(at[j - 1][1], at[j][1], u);
          }
        }
        return at[at.length - 1][1];
      }

      var ROWS = 90, i;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      var cx = b.cx, pad = 0.8;
      for (i = 0; i < ROWS; i++) {
        var t0 = i / ROWS, t1 = (i + 1) / ROWS;
        var a0 = Math.min(spans.n - 1, Math.round(t0 * (spans.n - 1)));
        var a1 = Math.min(spans.n - 1, Math.round(t1 * (spans.n - 1)));
        var l0 = spans.l[a0], r0 = spans.r[a0], l1 = spans.l[a1], r1 = spans.r[a1];
        if (r0 - l0 < 4 || r1 - l1 < 4) continue;
        var h0 = Math.max(5, targetHalf(t0)), h1 = Math.max(5, targetHalf(t1));
        var y0 = topY + t0 * span - pad, y1 = topY + t1 * span + pad;
        var sA = sy0 + t0 * srcH, sB = sy0 + t1 * srcH;
        tri(ctx, src, l0, sA, r0, sA, l1, sB, cx - h0, y0, cx + h0, y0, cx - h1, y1);
        tri(ctx, src, r0, sA, r1, sB, l1, sB, cx + h0, y0, cx + h1, y1, cx - h1, y1);
      }
      ctx.restore();
    }

    /* road-signal rails drawn on the overlay only (never in the download) */
    function drawRails(ctx, W, H, b) {
      ctx.save();
      var rails = [
        [b.shoulderY, 'rgba(47,191,106,.75)'],
        [b.waistY, 'rgba(240,189,53,.8)'],
        [b.hipY, 'rgba(47,191,106,.75)'],
        [b.hemY, 'rgba(228,87,76,.8)']
      ];
      rails.forEach(function (r) {
        ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = Math.max(3, W / 260);
        ctx.beginPath(); ctx.moveTo(W * 0.05, r[0]); ctx.lineTo(W * 0.95, r[0]); ctx.stroke();
        ctx.strokeStyle = r[1]; ctx.lineWidth = Math.max(1.4, W / 520);
        ctx.beginPath(); ctx.moveTo(W * 0.05, r[0]); ctx.lineTo(W * 0.95, r[0]); ctx.stroke();
      });
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.lineWidth = Math.max(1.2, W / 700);
      ctx.beginPath(); ctx.moveTo(b.cx, b.shoulderY); ctx.lineTo(b.cx, b.hemY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    /* ----------------------------- overlay dots --------------------------- */
    var HANDLES = ['shoulderL', 'shoulderR', 'waistL', 'waistR', 'hipL', 'hipR', 'hem'];
    var HLABEL = { shoulderL: 'Shoulder', shoulderR: 'Shoulder', waistL: 'Waist', waistR: 'Waist', hipL: 'Hip', hipR: 'Hip', hem: 'Hem' };

    function signalFor(k) {
      var l = S.lm[k];
      if (!l || l.u < 0.04 || l.u > 0.96 || l.v < 0.02 || l.v > 0.99) return 'r';
      if (k === 'shoulderL' && !(S.lm.shoulderL.u < S.lm.shoulderR.u - 0.06)) return 'r';
      if (k === 'waistL' && !(S.lm.waistL.u < S.lm.waistR.u - 0.05)) return 'r';
      if (k === 'hipL' && !(S.lm.hipL.u < S.lm.hipR.u - 0.05)) return 'r';
      var sy = (S.lm.shoulderL.v + S.lm.shoulderR.v) / 2;
      var wy = (S.lm.waistL.v + S.lm.waistR.v) / 2;
      var hy = (S.lm.hipL.v + S.lm.hipR.v) / 2;
      if (!(sy < wy && wy < hy)) return 'a';
      if (Math.abs(S.lm.shoulderR.u - S.lm.shoulderL.u) < 0.12) return 'a';
      return 'g';
    }

    function drawOverlay() {
      var r = overlay.getBoundingClientRect();
      overlay.width = Math.round(r.width * DPR);
      overlay.height = Math.round(r.height * DPR);
      var c = overlay.getContext('2d');
      c.setTransform(DPR, 0, 0, DPR, 0, 0);
      c.clearRect(0, 0, r.width, r.height);
      if (!S.photo || !S.guides || !S.lm) return;
      HANDLES.forEach(function (k) {
        if (!S.lm[k]) return;
        var p = lmPt(k);
        var x = (p.x / PW) * r.width, y = (p.y / PH) * r.height;
        var sig = signalFor(k);
        var col = sig === 'g' ? '#2fbf6a' : sig === 'a' ? '#f0bd35' : '#e4574c';
        c.beginPath(); c.arc(x, y, 12, 0, 6.2832);
        c.fillStyle = 'rgba(12,10,6,.3)'; c.fill();
        c.beginPath(); c.arc(x, y, 9, 0, 6.2832);
        c.fillStyle = col; c.fill();
        c.lineWidth = 2.2; c.strokeStyle = '#fff'; c.stroke();
        c.beginPath(); c.arc(x, y, 2.8, 0, 6.2832); c.fillStyle = '#fff'; c.fill();
      });
    }

    /* ------------------------------- render ------------------------------- */
    function render() {
      canvas.width = PW; canvas.height = PH;
      octx.setTransform(1, 0, 0, 1, 0, 0);
      renderTo(octx, PW, PH, false);
      drawOverlay();
    }

    /* --------------------------- background boxes ------------------------- */
    function buildBgStrip() {
      var strip = $('#toBgs');
      strip.innerHTML = S.backgrounds.map(function (b, i) {
        return '<button class="to-bg' + (i === S.bgIdx ? ' on' : '') + '" data-bg="' + i + '" title="' + api.esc(b.name) + '">' +
          '<img src="' + api.esc(b.small || b.url) + '" alt="' + api.esc(b.name) + '" loading="lazy" decoding="async">' +
          '<span>' + api.esc(b.name) + '</span></button>';
      }).join('');
      strip.addEventListener('click', function (e) {
        var b = e.target.closest('[data-bg]');
        if (!b) return;
        S.bgIdx = Number(b.dataset.bg);
        $$('#toBgs .to-bg').forEach(function (x, i) { x.classList.toggle('on', i === S.bgIdx); });
        render();
        api.toast('Background changed.');
      });
    }

    function loadBgs() {
      return Promise.all(S.backgrounds.map(function (b) {
        return loadImg(b.url).then(function (img) { b.img = img; }).catch(function () {});
      })).then(function () {
        buildBgStrip();
        $('#toBgs').hidden = S.backgrounds.length === 0;
        render();
      });
    }

    /* ------------------------------ export ------------------------------- */
    var SIZES = { '4k': [2880, 3840], '8k': [4320, 5760] };

    function exportCanvas(quality) {
      var dim = SIZES[quality] || SIZES['4k'];
      var c = cv(dim[0], dim[1]);
      var x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      renderTo(x, dim[0], dim[1], false);
      return c;
    }

    function download() {
      if (!S.person) return api.toast('Please choose your photo first.');
      var q = S.quality;
      if (q === '8k' && /Mobi|Android/i.test(navigator.userAgent)) {
        api.toast('8K is heavy on a phone — downloading in 4K instead.');
        q = '4k';
      }
      $('#toBusy').hidden = false;
      setTimeout(function () {
        try {
          var dim = SIZES[q] || SIZES['4k'];
          var c = exportCanvas(q);
          c.toBlob(function (blob) {
            $('#toBusy').hidden = true;
            if (!blob) return api.toast('Could not render — please try again.');
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'ZZ-tryon-' + Date.now() + '-' + dim[0] + 'x' + dim[1] + '.jpg';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 8000);
            api.toast('Your picture has been downloaded.');
            saveToServer(true);
          }, 'image/jpeg', 0.94);
        } catch (err) {
          $('#toBusy').hidden = true;
          api.toast('Please try 4K.');
        }
      }, 40);
    }

    /* --------------------------- save + gallery --------------------------- */
    function saveToServer(silent) {
      if (!S.person) return Promise.resolve();
      var small = cv(1200, 1600), sx = small.getContext('2d');
      renderTo(sx, 1200, 1600, false);
      var w2 = Math.min(900, S.person.width);
      var orig = cv(w2, Math.round(S.person.height * (w2 / S.person.width)));
      orig.getContext('2d').drawImage(S.person, 0, 0, orig.width, orig.height);
      return Promise.all([
        new Promise(function (r) { small.toBlob(r, 'image/jpeg', 0.9); }),
        new Promise(function (r) { orig.toBlob(r, 'image/jpeg', 0.88); })
      ]).then(function (blobs) {
        var fd = new FormData();
        fd.append('result', blobs[0], 'look.jpg');
        fd.append('photo', blobs[1], 'photo.jpg');
        var it = S.dressItems[S.dressIdx] || {};
        fd.append('itemId', it.id || '');
        fd.append('collectionId', it.collectionId || '');
        fd.append('itemName', it.name || '');
        fd.append('bgName', (S.backgrounds[S.bgIdx] || {}).name || '');
        fd.append('quality', S.quality);
        return fetch('/api/tryon/save', { method: 'POST', body: fd }).then(function (r) { return r.json(); }).then(function (j) {
          if (j && j.ok) {
            S.saved.unshift(j.look);
            paintGallery();
            if (!silent) api.toast('Saved to your gallery.');
          } else if (!silent) api.toast('Could not save — please try again.');
        }).catch(function () { if (!silent) api.toast('Saved locally only — the download still worked.'); });
      });
    }

    function paintGallery() {
      var g = $('#toGallery');
      if (!S.saved.length) { g.innerHTML = '<p class="to-tiny">Your saved looks will appear here.</p>'; return; }
      g.innerHTML = '<p class="eyebrow" style="margin:14px 0 8px">My gallery</p><div class="to-thumbs">' +
        S.saved.map(function (l) {
          return '<a href="' + api.esc(l.url) + '" target="_blank" rel="noopener"><img src="' + api.esc(l.thumb) + '" alt="Saved look" loading="lazy"></a>';
        }).join('') + '</div>';
    }

    function loadGallery() {
      fetch('/api/tryon/mine').then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.ok) { S.saved = j.looks || []; paintGallery(); }
      }).catch(function () {});
    }

    /* ------------------------------- wiring ------------------------------ */
    var fileIn = $('#toFile');
    if (fileIn) fileIn.addEventListener('change', function (e) { setPhoto(e.target.files && e.target.files[0]); e.target.value = ''; });

    function setFitInputs(size, width, length, lift) {
      var a = $('#fitSize'), b2 = $('#fitWidth'), c2 = $('#fitLength'), d2 = $('#fitLift');
      if (a) a.value = size; if (b2) b2.value = width; if (c2) c2.value = length; if (d2) d2.value = lift;
    }

    $('#toCustomToggle').addEventListener('click', function () {
      S.customOpen = !S.customOpen;
      $('#toCustomPanel').hidden = !S.customOpen;
      $('#toCustomToggle').classList.toggle('on', S.customOpen);
      $('#toFitNote').hidden = S.customOpen;
    });
    $('#fitReset').addEventListener('click', function () {
      S.fit = { size: 100, width: 100, length: 100, lift: 0, zoom: 100 };
      setFitInputs(100, 100, 100, 0);
      render();
      api.toast('Auto-fit restored.');
    });
    $('#fitLength').addEventListener('input', function (e) { S.fit.length = Number(e.target.value); render(); });
    $('#fitWidth').addEventListener('input', function (e) { S.fit.width = Number(e.target.value); render(); });
    $('#fitSize').addEventListener('input', function (e) { S.fit.size = Number(e.target.value); render(); });
    $('#fitLift').addEventListener('input', function (e) { S.fit.lift = Number(e.target.value); render(); });
    $('#toGuides').addEventListener('click', function () {
      S.guides = !S.guides;
      $('#toGuides').classList.toggle('on', S.guides);
      drawOverlay();
    });
    $$('[data-q]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.quality = b.dataset.q;
        $$('[data-q]').forEach(function (x) { x.classList.toggle('on', x === b); });
        $('#toDlTag').textContent = S.quality.toUpperCase();
      });
    });
    $('#toDownload').addEventListener('click', download);
    $('#toSave').addEventListener('click', function () { saveToServer(false); });

    /* optional fine dragging of the guide dots */
    var dragging = null;
    overlay.addEventListener('pointerdown', function (e) {
      if (!S.guides || !S.lm) return;
      var r = overlay.getBoundingClientRect();
      var best = null, bd = 1e9;
      HANDLES.forEach(function (k) {
        if (!S.lm[k]) return;
        var p = lmPt(k);
        var d = Math.hypot((p.x / PW) * r.width - (e.clientX - r.left), (p.y / PH) * r.height - (e.clientY - r.top));
        if (d < 26 && d < bd) { bd = d; best = k; }
      });
      if (best) { dragging = best; overlay.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    overlay.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var r = overlay.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width) * PW, y = ((e.clientY - r.top) / r.height) * PH;
      S.lm[dragging].u = clamp((x - S.rect.x) / S.rect.w, 0, 1);
      S.lm[dragging].v = clamp((y - S.rect.y) / S.rect.h, 0, 1);
      render();
    });
    ['pointerup', 'pointercancel'].forEach(function (t) { overlay.addEventListener(t, function () { dragging = null; }); });

    root.addEventListener('click', function (e) { e.stopPropagation(); });
    window.addEventListener('resize', function () { if (S.photo) render(); });

    /* -------------------------------- start ------------------------------ */
    buildCollChips();
    buildDressGrid();
    if (S.dressItems.length) pickDress(S.dressItems.findIndex(matchesColl));
    loadBgs();
    loadGallery();
    $('#toDlTag').textContent = '4K';
    $('#toGuides').classList.add('on');
    render();
    window.__ZZto = S;   /* QA hook */
    return S;
  }

  window.ZZTryOn = { mount: mount };
})();
