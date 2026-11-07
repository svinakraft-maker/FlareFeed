/* =========================================================
   FlareFeed · globe.js
   3D Earth on a plain 2D canvas — no libraries, no WebGL.
   Orthographic projection of:
     • a dot-matrix land mask      (/globe.json → land)
     • country outlines            (/globe.json → borders)
     • config-count markers        (/geo.json  → countries)
   Interaction: drag to spin, wheel/buttons to zoom, hover to
   inspect a country, click a row to fly there.
   ========================================================= */
(function (global) {
  'use strict';

  var D2R = Math.PI / 180;
  var R2D = 180 / Math.PI;

  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function Globe(canvas, hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.hooks = hooks || {};

    this.yaw = -0.55;          // radians
    this.pitch = 0.20;
    this.tZoom = 1;
    this.zoom = 1;
    this.autoSpin = true;
    this.drag = null;
    this.inertia = 0;
    this.spinSpeed = 0.0016;   // rad per ms

    this.geo = null;
    this.gd = null;
    this.markers = [];
    this.rings = null;
    this.land = null;
    this.landStride = 1;

    this.hover = null;
    this.active = null;        // country code from the side list
    this.pulse = {};           // cc -> timestamp of last highlight
    this.filter = 'all';

    this.visible = false;
    this.t0 = performance.now();
    this._raf = null;
    this._fpsAcc = 0;
    this._fpsN = 0;
    this._bind();
  }

  /* ---------------- data ---------------- */

  Globe.prototype.load = function (geoUrl, globeUrl) {
    var self = this;
    if (typeof fetch !== 'function') return Promise.reject(new Error('no fetch'));
    return Promise.all([
      fetch(geoUrl, { cache: 'force-cache' }).then(function (r) { return r.json(); }),
      fetch(globeUrl, { cache: 'force-cache' }).then(function (r) { return r.json(); })
    ]).then(function (res) {
      self.geo = res[0];
      self.gd = res[1];
      self.decode();
      self.buildMarkers();
      self.resize();
      return self.geo;
    });
  };

  Globe.prototype.decode = function () {
    var g = this.gd;
    if (this.land || !g) return;

    /* ---- land dots → unit sphere vectors ---- */
    var bin = atob(g.land);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    var W = g.w, H = g.h, pts = [];
    for (var y = 0; y < H; y++) {
      var latR = (90 - (y + 0.5) * 180 / H) * D2R;
      var cl = Math.cos(latR), sl = Math.sin(latR);
      for (var x = 0; x < W; x++) {
        var idx = y * W + x;
        if (((bytes[idx >> 3] >> (7 - (idx & 7))) & 1) === 0) continue;
        var lonR = (-180 + (x + 0.5) * 360 / W) * D2R;
        pts.push(cl * Math.sin(lonR), sl, cl * Math.cos(lonR));
      }
    }
    this.land = new Float32Array(pts);
    this.landCount = pts.length / 3;

    /* ---- borders → per-country packed rings ---- */
    var SC = g.scale || 20;
    var rings = [];
    var src = g.borders || {};
    Object.keys(src).forEach(function (cc) {
      var entry = src[cc];
      var d = atob(entry.d);
      var n16 = new Int16Array(d.length / 2);
      for (var k = 0; k < n16.length; k++) {
        n16[k] = (d.charCodeAt(k * 2) | (d.charCodeAt(k * 2 + 1) << 8)) << 16 >> 16;
      }
      var o = 0;
      entry.n.forEach(function (n, ri) {
        var xy = new Float32Array(n * 2); // lon,lat in degrees
        var px = 0, py = 0;
        for (var p = 0; p < n; p++) {
          px += n16[o++];
          py += n16[o++];
          xy[p * 2] = px / SC;
          xy[p * 2 + 1] = py / SC;
        }
        rings.push({ cc: cc, xy: xy, n: n, d: 0, sx: new Float32Array(n), sy: new Float32Array(n) });
      });
    });
    this.rings = rings;
  };

  Globe.prototype.buildMarkers = function () {
    var countries = (this.geo && this.geo.countries) || [];
    var key = this.filter === 'mobile' ? 'mobile' : (this.filter === 'secure' ? 'secure' : 'all');
    /* Every country with live configs stays in `all` so the filters,
       the list and the totals add up. Only countries with real
       coordinates become globe markers. */
    var all = countries.map(function (c) {
      return { cc: c.cc, ru: c.ru, en: c.en, lat: c.lat, lon: c.lon, n: c[key] || 0,
               ms: c.ms, mbps: c.mbps, all: c.all, mobile: c.mobile, secure: c.secure };
    }).filter(function (c) { return c.n > 0; });
    all.sort(function (a, b) { return b.n - a.n; });

    var list = all.filter(function (c) {
      return c.lat != null && c.lon != null && isFinite(c.lat) && isFinite(c.lon);
    });

    var maxN = list.length ? list[0].n : 1;
    var lonR, latR, cl;
    list.forEach(function (c) {
      lonR = c.lon * D2R; latR = c.lat * D2R; cl = Math.cos(latR);
      c.x = cl * Math.sin(lonR);
      c.y = Math.sin(latR);
      c.z = cl * Math.cos(lonR);
      c.rad = 2.6 + 6.4 * Math.sqrt(c.n / maxN);
    });
    this.markers = list;

    // per-country lookup for borders
    this.byCc = {};
    list.forEach(function (c) { this.byCc[c.cc] = c; }, this);
    if (this.hooks.onData) this.hooks.onData(this.geo, all, key);
  };

  Globe.prototype.setFilter = function (f) {
    if (this.filter === f) return;
    this.filter = f;
    this.buildMarkers();
    if (this.hooks.onData) this.hooks.onData(this.geo, this.markers, f);
  };

  /* ---------------- layout ---------------- */

  Globe.prototype.resize = function () {
    var c = this.canvas;
    if (!c) return this;
    var rect = c.getBoundingClientRect();
    var prevW = this.w, prevH = this.h;
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    // fall back to the attribute size when the element is not laid out yet
    var w = Math.max(240, Math.round(rect.width || c.width || 960));
    var h = Math.max(240, Math.round(rect.height || c.height || 640));
    this.w = w; this.h = h; this.dpr = dpr;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cx = w / 2;
    this.cy = h / 2;
    this.R = Math.min(w, h) * 0.42;
    // fewer land dots on small canvases
    this.landStride = (w * dpr < 620) ? 2 : 1;
    // repaint immediately so a resize never leaves a blank canvas
    if ((w !== prevW || h !== prevH) && this.geo) {
      this.draw(performance.now());
    }
    return this;
  };

  /* ---------------- animation ---------------- */

  Globe.prototype.start = function () {
    if (this._raf) return;
    var self = this;
    this.visible = true;
    var last = performance.now();
    (function loop(now) {
      self._raf = requestAnimationFrame(loop);
      var dt = Math.min(now - last, 60);
      last = now;
      self.step(dt, now);
      self.draw(now);
    })(last);
    // guarantee at least one painted frame even if RAF is throttled
    // (background tab, headless capture, reduced-motion environments)
    this.draw(performance.now());
  };

  Globe.prototype.stop = function () {
    this.visible = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  };

  Globe.prototype.step = function (dt, now) {
    if (this.fly) {
      var f = this.fly;
      f.t = Math.min(1, f.t + dt / f.dur);
      var e = easeInOut(f.t);
      this.yaw = f.y0 + (f.y1 - f.y0) * e;
      this.pitch = f.p0 + (f.p1 - f.p0) * e;
      if (f.t >= 1) this.fly = null;
      this.autoSpin = true;
    } else if (!this.drag) {
      if (Math.abs(this.inertia) > 0.00002) {
        this.yaw += this.inertia * dt;
        this.inertia *= Math.pow(0.94, dt / 16);
      } else if (this.autoSpin && this.visible) {
        this.yaw += this.spinSpeed * dt;
      }
    }
    this.zoom += (this.tZoom - this.zoom) * Math.min(1, dt / 140);
  };

  Globe.prototype.flyTo = function (lat, lon) {
    var targetYaw = -lon * D2R - Math.PI / 2;
    var targetPitch = clamp(lat * D2R, -1.15, 1.15);
    // choose the equivalent yaw closest to the current one (no unwinding)
    var y1 = this.yaw;
    var turns = Math.round((y1 - targetYaw) / (2 * Math.PI));
    targetYaw += turns * 2 * Math.PI;
    this.fly = { y0: this.yaw, y1: targetYaw, p0: this.pitch, p1: targetPitch, t: 0, dur: 900 };
    this.autoSpin = false;
  };

  /* ---------------- projection helpers ---------------- */

  Globe.prototype._rot = function () {
    var cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    var cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    return { cy: cy, sy: sy, cp: cp, sp: sp };
  };

  Globe.prototype.project = function (x, y, z, r) {
    // yaw around Y
    var x1 = x * r.cy + z * r.sy;
    var z1 = -x * r.sy + z * r.cy;
    // pitch around X
    var y2 = y * r.cp - z1 * r.sp;
    var z2 = y * r.sp + z1 * r.cp;
    return { x: x1, y: y2, z: z2 };
  };

  Globe.prototype.projectLonLat = function (lon, lat, r) {
    var lonR = lon * D2R, latR = lat * D2R, cl = Math.cos(latR);
    return this.project(cl * Math.sin(lonR), Math.sin(latR), cl * Math.cos(lonR), r);
  };

  /* ---------------- drawing ---------------- */

  Globe.prototype.draw = function (now) {
    var ctx = this.ctx, w = this.w, h = this.h;
    var R = this.R * this.zoom;
    var cx = this.cx, cy = this.cy;
    var r = this._rot();
    var t = (now - this.t0) / 1000;

    ctx.clearRect(0, 0, w, h);

    /* --- atmosphere: tight rim bloom hugging the sphere --- */
    var atmo = ctx.createRadialGradient(cx, cy, R * 0.99, cx, cy, R * 1.06);
    atmo.addColorStop(0, 'rgba(255,130,40,0.00)');
    atmo.addColorStop(0.5, 'rgba(255,145,60,0.13)');
    atmo.addColorStop(1, 'rgba(255,106,0,0.00)');
    ctx.fillStyle = atmo;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2);
    ctx.fill();

    /* --- vector thumb (back layer) --- */
    var body = ctx.createRadialGradient(cx - R * 0.28, cy - R * 0.34, R * 0.08, cx, cy, R);
    body.addColorStop(0, 'rgba(26,26,32,0.98)');
    body.addColorStop(0.72, 'rgba(12,12,16,0.98)');
    body.addColorStop(1, 'rgba(6,6,9,0.99)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    /* --- land dots --- */
    var pts = this.land, N = this.landCount, stride = this.landStride;
    ctx.fillStyle = 'rgba(150,150,165,0.42)';
    ctx.beginPath();
    var s = this.zoom > 1.4 ? 1.7 : 1.35;
    for (var i = 0; i < N; i += stride) {
      var p = this.project(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2], r);
      if (p.z <= 0.02) continue;
      var a = Math.pow(p.z, 0.7);
      if (a < 0.12) continue;
      ctx.rect(cx + p.x * R - s / 2, cy - p.y * R - s / 2, s, s);
    }
    ctx.fill();

    /* --- graticule --- */
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    var gl;
    for (gl = -60; gl <= 60; gl += 30) this._parallel(ctx, r, R, cx, cy, gl);
    for (gl = -150; gl <= 180; gl += 30) this._meridian(ctx, r, R, cx, cy, gl);

    /* --- country outlines (only countries that carry configs) --- */
    if (this.rings) {
      ctx.lineWidth = 0.8;
      var activeCc = this.active || (this.hover && this.hover.cc);
      for (var ri = 0; ri < this.rings.length; ri++) {
        var ring = this.rings[ri];
        var hasData = !!this.byCc[ring.cc];
        var isActive = activeCc === ring.cc;
        if (!hasData && this.zoom < 2) continue;
        ctx.beginPath();
        var n = ring.n, xy = ring.xy, open = false;
        var prevX = 0, prevY = 0, span = 0;
        for (var k = 0; k < n; k++) {
          var q = this.projectLonLat(xy[k * 2], xy[k * 2 + 1], r);
          var sx = cx + q.x * R, sy = cy - q.y * R;
          if (q.z > 0.015) {
            if (open) {
              // guard against antimeridian jumps that would draw a chord
              var dx = sx - prevX, dy = sy - prevY;
              if (dx * dx + dy * dy > (R * 0.18) * (R * 0.18)) {
                ctx.moveTo(sx, sy);
              } else {
                ctx.lineTo(sx, sy);
              }
            } else {
              ctx.moveTo(sx, sy);
              open = true;
            }
            prevX = sx; prevY = sy;
          } else {
            open = false;
          }
        }
        ctx.strokeStyle = isActive
          ? 'rgba(255,150,60,0.85)'
          : (hasData ? 'rgba(255,140,50,0.24)' : 'rgba(255,255,255,0.10)');
        ctx.lineWidth = isActive ? 1.5 : (hasData ? 0.9 : 0.7);
        ctx.stroke();
      }
    }

    /* --- terminator rim --- */
    ctx.strokeStyle = 'rgba(255,160,80,0.20)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    /* --- markers --- */
    var maxN = this.markers.length ? this.markers[0].n : 1;
    var hoverCc = this.hover && this.hover.cc;
    var pt;
    this.markers.forEach(function (c) {
      pt = this.project(c.x, c.y, c.z, r);
      c._x = cx + pt.x * R;
      c._y = cy - pt.y * R;
      c._z = pt.z;
      c._vis = pt.z > 0.02;
      if (!c._vis) return;

      var isHot = (c.cc === hoverCc) || (c.cc === this.active);
      var depth = Math.pow(clamp(pt.z, 0, 1), 0.55);
      var ready = this.filter === 'all' ? c.all : (this.filter === 'mobile' ? c.mobile : c.secure);
      var base = c.rad * (ready / Math.max(1, c.n)) * 0.4 + c.rad * 0.75;

      /* pulsing halo */
      var pulseT = this.pulse[c.cc];
      var halo = 0;
      if (pulseT) {
        var age = (now - pulseT) / 1400;
        if (age < 1) halo = (1 - age) * 34;
        else delete this.pulse[c.cc];
      }
      if (halo > 0) {
        ctx.beginPath();
        ctx.arc(c._x, c._y, base + halo * 0.9, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,150,60,' + (0.28 * (1 - halo / 34)) + ')';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      /* glow */
      var glowR = base * (isHot ? 4.2 : 2.9);
      var g2 = ctx.createRadialGradient(c._x, c._y, 0, c._x, c._y, glowR);
      var alpha = (isHot ? 0.55 : 0.30) * depth;
      g2.addColorStop(0, 'rgba(255,150,60,' + alpha + ')');
      g2.addColorStop(1, 'rgba(255,106,0,0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(c._x, c._y, glowR, 0, Math.PI * 2);
      ctx.fill();

      /* core */
      ctx.beginPath();
      ctx.arc(c._x, c._y, Math.max(1.6, base * (isHot ? 1.25 : 1)), 0, Math.PI * 2);
      ctx.fillStyle = isHot
        ? 'rgba(255,224,190,' + (0.7 + 0.3 * depth) + ')'
        : 'rgba(255,180,110,' + (0.45 + 0.5 * depth) + ')';
      ctx.fill();
    }, this);

    /* --- breathing scan ring --- */
    var scan = (t % 5) / 5;
    ctx.beginPath();
    ctx.arc(cx, cy, R * (0.25 + scan * 0.75), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,140,60,' + (0.10 * (1 - scan)) + ')';
    ctx.lineWidth = 1;
    ctx.stroke();

    /* --- label for the hovered/active country --- */
    var label = this.hover || this.activeMark();
    if (label && label._vis) this._label(ctx, label, cx, cy, R);
  };

  Globe.prototype.activeMark = function () {
    if (!this.active) return null;
    for (var i = 0; i < this.markers.length; i++) {
      if (this.markers[i].cc === this.active) return this.markers[i];
    }
    return null;
  };

  Globe.prototype._parallel = function (ctx, r, R, cx, cy, lat) {
    ctx.beginPath();
    var latR = lat * D2R, cl = Math.cos(latR), sl = Math.sin(latR), open = false;
    for (var lon = -180; lon <= 180; lon += 4) {
      var lonR = lon * D2R;
      var p = this.project(cl * Math.sin(lonR), sl, cl * Math.cos(lonR), r);
      if (p.z <= 0.01) { open = false; continue; }
      var sx = cx + p.x * R, sy = cy - p.y * R;
      if (open) ctx.lineTo(sx, sy); else { ctx.moveTo(sx, sy); open = true; }
    }
    ctx.stroke();
  };

  Globe.prototype._meridian = function (ctx, r, R, cx, cy, lon) {
    ctx.beginPath();
    var lonR = lon * D2R, open = false;
    for (var lat = -90; lat <= 90; lat += 4) {
      var p = this.projectLonLat(lon, lat, r);
      if (p.z <= 0.01) { open = false; continue; }
      var sx = cx + p.x * R, sy = cy - p.y * R;
      if (open) ctx.lineTo(sx, sy); else { ctx.moveTo(sx, sy); open = true; }
    }
    ctx.stroke();
  };

  Globe.prototype._label = function (ctx, c, cx, cy, R) {
    var title = c.ru || c.en || c.cc;
    var sub = (this.filter === 'all' ? c.all : (this.filter === 'mobile' ? c.mobile : c.secure)) + ' конфигов';
    if (c.ms) sub += ' · ' + c.ms + ' ms';
    ctx.font = '600 12px Inter, system-ui, sans-serif';
    var w1 = ctx.measureText(title).width;
    ctx.font = '500 10px ui-monospace, monospace';
    var w2 = ctx.measureText(sub).width;
    var bw = Math.max(w1, w2) + 20;
    var bh = 38;
    var bx = clamp(c._x - bw / 2, 6, this.w - bw - 6);
    var by = c._y - bh - 14;
    if (by < 6) by = c._y + 14;

    ctx.save();
    ctx.beginPath();
    var rad = 9;
    ctx.moveTo(bx + rad, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + bh, rad);
    ctx.arcTo(bx + bw, by + bh, bx, by + bh, rad);
    ctx.arcTo(bx, by + bh, bx, by, rad);
    ctx.arcTo(bx, by, bx + bw, by, rad);
    ctx.closePath();
    ctx.fillStyle = 'rgba(12,12,16,0.94)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,140,60,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '600 12px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(title, bx + 10, by + 7);
    ctx.fillStyle = 'rgba(255,178,110,0.95)';
    ctx.font = '500 10px ui-monospace, monospace';
    ctx.fillText(sub, bx + 10, by + 22);
    ctx.restore();
  };

  /* ---------------- interaction ---------------- */

  Globe.prototype._bind = function () {
    var self = this;
    var c = this.canvas;

    function pick(ev) {
      var rect = c.getBoundingClientRect();
      var mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
      var best = null, bestD = 26 * 26;
      for (var i = 0; i < self.markers.length; i++) {
        var m = self.markers[i];
        if (!m._vis) continue;
        var dx = mx - m._x, dy = my - m._y;
        var d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = m; }
      }
      return best;
    }

    c.addEventListener('pointermove', function (ev) {
      if (self.drag) {
        var dx = ev.clientX - self.drag.x;
        var dy = ev.clientY - self.drag.y;
        self.yaw += dx * 0.006 * (1 / self.zoom);
        self.pitch = clamp(self.pitch - dy * 0.006, -1.2, 1.2);
        self.inertia = dx * 0.00016;
        self.drag.x = ev.clientX;
        self.drag.y = ev.clientY;
        self.autoSpin = false;
        return;
      }
      var hit = pick(ev);
      if (hit !== self.hover) {
        self.hover = hit;
        c.style.cursor = hit ? 'pointer' : 'grab';
        if (self.hooks.onHover) self.hooks.onHover(hit);
      }
    });

    c.addEventListener('pointerleave', function () {
      self.hover = null;
      if (self.hooks.onHover) self.hooks.onHover(null);
    });

    c.addEventListener('pointerdown', function (ev) {
      self.drag = { x: ev.clientX, y: ev.clientY };
      self.autoSpin = false;
      self.inertia = 0;
      c.style.cursor = 'grabbing';
      if (c.setPointerCapture) { try { c.setPointerCapture(ev.pointerId); } catch (e) {} }
    });

    function release() {
      self.drag = null;
      c.style.cursor = 'grab';
      self.autoSpin = true;
    }
    c.addEventListener('pointerup', release);
    c.addEventListener('pointercancel', release);

    c.addEventListener('click', function (ev) {
      var hit = pick(ev);
      if (hit && self.hooks.onPick) self.hooks.onPick(hit);
    });

    c.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      self.tZoom = clamp(self.tZoom * (ev.deltaY > 0 ? 0.9 : 1.11), 1, 3.4);
    }, { passive: false });

    c.addEventListener('dblclick', function () {
      self.tZoom = self.tZoom > 1.6 ? 1 : 2.1;
    });
  };

  Globe.prototype.highlight = function (cc, fly) {
    this.active = cc;
    if (cc) this.pulse[cc] = performance.now();
    var m = this.activeMark();
    if (m && fly) this.flyTo(m.lat, m.lon);
  };

  global.FlareGlobe = Globe;
})(window);
