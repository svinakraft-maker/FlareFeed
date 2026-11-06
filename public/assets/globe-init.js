/* =========================================================
   FlareFeed · globe-init.js
   Wires the 3D globe section: lazy load, list, filters,
   sorting, counters, keyboard access.
   ========================================================= */
(function () {
  'use strict';

  var shell = document.getElementById('globeShell');
  if (!shell || !window.FlareGlobe) return;

  var canvas = document.getElementById('globeCanvas');
  if (!canvas) return;
  var listEl = document.getElementById('globeList');
  var readout = document.getElementById('globeReadout');
  var readoutText = document.getElementById('globeReadoutText');
  var countBadge = document.getElementById('globeCount');

  var state = { sort: 'n', filter: 'all', data: null, list: [] };
  var globe = null;
  var started = false;

  /* ---------------- helpers ---------------- */
  function fmt(n) {
    return (n || 0).toLocaleString('ru-RU');
  }

  function setReadout(text) {
    readoutText.textContent = text;
    readout.classList.add('is-hot');
  }

  function clearReadout() {
    readoutText.textContent = 'Наведите курсор на точку, чтобы увидеть страну';
    readout.classList.remove('is-hot');
  }

  function sortList(list) {
    var arr = list.slice();
    if (state.sort === 'ms') {
      arr.sort(function (a, b) {
        var av = a.ms == null ? 99999 : a.ms;
        var bv = b.ms == null ? 99999 : b.ms;
        return av - bv;
      });
    } else if (state.sort === 'mbps') {
      arr.sort(function (a, b) {
        var av = a.mbps == null ? -1 : a.mbps;
        var bv = b.mbps == null ? -1 : b.mbps;
        return bv - av;
      });
    } else {
      arr.sort(function (a, b) { return b.n - a.n; });
    }
    return arr;
  }

  /* ---------------- list rendering ---------------- */
  function renderList() {
    if (!state.list.length) {
      listEl.innerHTML = '<li class="globe-list-empty">Нет данных для этого набора.</li>';
      return;
    }
    var sorted = sortList(state.list);
    var max = sorted[0] ? Math.max.apply(null, sorted.map(function (c) { return c.n; })) : 1;
    var frag = document.createDocumentFragment();

    sorted.forEach(function (c, i) {
      var li = document.createElement('li');
      li.className = 'globe-item';
      li.dataset.cc = c.cc;
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-label', c.ru + ', ' + c.n + ' конфигов');

      var meta = ['ALL ' + fmt(c.all)];
      if (c.mobile) meta.push('MOBILE ' + fmt(c.mobile));
      if (c.secure) meta.push('TOP ' + fmt(c.secure));
      if (c.ms) meta.push('пинг ' + c.ms + ' ms');
      if (c.mbps) meta.push(c.mbps + ' Mb/s');

      li.innerHTML =
        '<span class="globe-item-name"><span>' + c.ru + '</span>' +
        '<i class="globe-item-cc">' + c.cc + '</i></span>' +
        '<span class="globe-item-count">' + fmt(c.n) + '</span>' +
        '<span class="globe-item-meta">' + meta.map(function (m) {
          return '<b>' + m + '</b>';
        }).join('') + '</span>' +
        '<span class="globe-item-bar"><i></i></span>';

      li.style.animationDelay = Math.min(i * 22, 520) + 'ms';
      frag.appendChild(li);

      var bar = li.querySelector('.globe-item-bar i');
      requestAnimationFrame(function () {
        bar.style.width = Math.max(3, (c.n / max) * 100) + '%';
      });

      function activate() {
        Array.prototype.forEach.call(listEl.children, function (el) {
          el.classList.remove('is-on');
        });
        li.classList.add('is-on');
        if (globe) globe.highlight(c.cc, true);
        setReadout(c.ru + ' · ' + fmt(c.n) + ' конфигов' +
          (c.ms ? ' · лучший пинг ' + c.ms + ' ms' : '') +
          (c.mbps ? ' · до ' + c.mbps + ' Mb/s' : ''));
      }

      li.addEventListener('click', activate);
      li.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); activate(); }
      });
    });

    listEl.innerHTML = '';
    listEl.appendChild(frag);
  }

  /* ---------------- counters ---------------- */
  function countUp(el, to, suffix) {
    if (!el) return;
    to = Number(to) || 0;
    var finalText = to.toLocaleString('ru-RU') + (suffix || '');
    // cancel any in-flight animation for this element
    if (el.__countRaf) { cancelAnimationFrame(el.__countRaf); el.__countRaf = null; }
    el.classList.remove('is-loading');

    // Always commit the real value first: the count-up is decoration only,
    // so a throttled/absent RAF can never leave a wrong number on screen.
    el.textContent = finalText;

    if (to === 0) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof requestAnimationFrame !== 'function') return;

    var from = Math.max(0, Math.round(to * 0.72));
    var dur = 620;
    var t0 = performance.now();
    function tick(now) {
      var p = Math.min(1, Math.max(0, (now - t0) / dur));
      if (p >= 1) { el.__countRaf = null; el.textContent = finalText; return; }
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e).toLocaleString('ru-RU') + (suffix || '');
      el.__countRaf = requestAnimationFrame(tick);
    }
    el.__countRaf = requestAnimationFrame(tick);
    // safety: guarantee the exact final value even if the RAF loop never finishes
    setTimeout(function () {
      if (el.__countRaf) { cancelAnimationFrame(el.__countRaf); el.__countRaf = null; }
      el.textContent = finalText;
    }, dur + 400);
  }

  function updateCounters(geo, list) {
    var total = 0, bestMs = null, protos = 0;
    list.forEach(function (c) {
      total += c.n;
      if (c.ms != null && (bestMs == null || c.ms < bestMs)) bestMs = c.ms;
    });
    if (geo && geo.protocols) protos = Object.keys(geo.protocols).length;

    countUp(document.getElementById('factCountries'), list.length);
    countUp(document.getElementById('factConfigs'), total);
    countUp(document.getElementById('factProtocols'), protos);
    var topEl = document.getElementById('factTop');
    if (topEl) topEl.textContent = bestMs == null ? '—' : bestMs + ' ms';

    var nAll = 0, nMobile = 0, nSecure = 0;
    list.forEach(function (c) { nAll += c.all || 0; nMobile += c.mobile || 0; nSecure += c.secure || 0; });
    var el;
    if ((el = document.getElementById('gfAll'))) el.textContent = fmt(nAll);
    if ((el = document.getElementById('gfMobile'))) el.textContent = fmt(nMobile);
    if ((el = document.getElementById('gfSecure'))) el.textContent = fmt(nSecure);
  }

  /* ---------------- boot ---------------- */
  function boot() {
    if (started) return;
    started = true;
    Array.prototype.forEach.call(
      document.querySelectorAll('.fact-card'),
      function (c) { c.classList.add('is-loading'); });

    globe = new FlareGlobe(canvas, {
      onData: function (geo, list, key) {
        state.data = geo;
        state.list = list;
        countBadge.textContent = list.length + ' / ' + (geo.countries_total || list.length);
        renderList();
        updateCounters(geo, list);
      },
      onHover: function (c) {
        if (!c) { clearReadout(); return; }
        setReadout(c.ru + ' (' + c.cc + ') · ' + fmt(c.n) + ' конфигов' +
          (c.ms ? ' · ' + c.ms + ' ms' : '') +
          (c.mbps ? ' · ' + c.mbps + ' Mb/s' : ''));
      },
      onPick: function (c) {
        var li = listEl.querySelector('[data-cc="' + c.cc + '"]');
        if (li) {
          li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          li.click();
        }
      }
    });

    globe.load('/geo.json', '/globe.json').then(function () {
      globe.resize();
      globe.start();
      window.__flareGlobe = globe;
    }).catch(function (err) {
      listEl.innerHTML = '<li class="globe-list-empty">Не удалось загрузить данные карты.</li>';
      Array.prototype.forEach.call(
        document.querySelectorAll('.fact-card'),
        function (c) { c.classList.remove('is-loading'); });
      if (window.console) console.warn('[globe]', err);
    });

    /* filters */
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-globe-filter]'),
      function (btn) {
        btn.addEventListener('click', function () {
          Array.prototype.forEach.call(
            document.querySelectorAll('[data-globe-filter]'),
            function (b) { b.classList.remove('is-on'); });
          btn.classList.add('is-on');
          state.filter = btn.dataset.globeFilter;
          globe.setFilter(state.filter);
        });
      });

    /* sorting */
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-sort]'),
      function (btn) {
        btn.addEventListener('click', function () {
          Array.prototype.forEach.call(
            document.querySelectorAll('[data-sort]'),
            function (b) { b.classList.remove('is-on'); });
          btn.classList.add('is-on');
          state.sort = btn.dataset.sort;
          renderList();
        });
      });

    /* zoom + spin */
    var zi = document.getElementById('globeZoomIn');
    var zo = document.getElementById('globeZoomOut');
    var sp = document.getElementById('globeSpin');
    if (zi) zi.addEventListener('click', function () {
      globe.tZoom = Math.min(3.4, globe.tZoom * 1.22);
    });
    if (zo) zo.addEventListener('click', function () {
      globe.tZoom = Math.max(1, globe.tZoom / 1.22);
    });
    if (sp) sp.addEventListener('click', function () {
      globe.autoSpin = !globe.autoSpin;
      sp.classList.toggle('is-on', globe.autoSpin);
    });

    window.addEventListener('resize', function () {
      clearTimeout(boot._rz);
      boot._rz = setTimeout(function () { globe.resize(); }, 140);
    });
  }

  /* Lazy start: animate once the section is near the viewport.
     Safety net: always boot after a short delay so a missed observer
     callback (hidden tab, nested frame, no-IO browser) can never leave
     the section permanently empty. */
  var booted = false;
  function bootOnce() {
    if (booted) return;
    booted = true;
    boot();
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { bootOnce(); io.disconnect(); }
      });
    }, { rootMargin: '260px 0px' });
    io.observe(shell);
    setTimeout(function () {
      if (!booted && isNearViewport()) bootOnce();
    }, 1200);
    // hard fallback: never leave the section empty
    setTimeout(bootOnce, 6000);
  } else {
    bootOnce();
  }

  function isNearViewport() {
    var r = shell.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    return r.top < vh + 300 && r.bottom > -300;
  }
})();
