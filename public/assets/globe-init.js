/* =========================================================
   FlareFeed · globe-init.js  (v3 · live data)
   Wires the 3D globe section: lazy load, list, filters,
   sorting, counters, keyboard access.

   Data flow:
     1. Render instantly from the static /geo.json snapshot so
        the section is never empty (fast first paint).
     2. Fetch the live subscriptions (podpiska.txt / fastest.txt
        / Top500.txt), parse country + ping + speed, and refresh
        markers, list and counters with current numbers.
        Numbers / countries therefore never go stale.
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

  /* ---------------- live subscription parsing ----------------
     podpiska.txt -> ALL     (every verified config)
     fastest.txt  -> MOBILE  (top 100 low-latency)
     Top500.txt   -> SECURE  (top 500 protected)
     A config line looks like:
       vless://…#0001 | 🇨🇦 Canada | [316ms11.2mbps] | 🏴 Black | TG: @FlareFeedtg
  ------------------------------------------------------------ */
  var SUBSCRIPTIONS = [
    { url: '/podpiska.txt', key: 'all' },
    { url: '/fastest.txt', key: 'mobile' },
    { url: '/Top500.txt', key: 'secure' }
  ];

  var STATS_RE = /\[\s*(\d+)\s*ms\s*([\d.]+)\s*mbps\s*\]/i;
  var FLAG_RE = /([\u{1F1E6}-\u{1F1FF}]{2})/u;

  var NAME_TO_CC = {
    'cloudflare': 'CF', 'usa': 'US', 'united states': 'US',
    'hong kong': 'HK', 'hongkong': 'HK', 'south korea': 'KR',
    'korea': 'KR', 'russia': 'RU', 'uk': 'GB', 'united kingdom': 'GB',
    'vietnam': 'VN', 'viet nam': 'VN', 'czechia': 'CZ', 'taiwan': 'TW',
    'china': 'CN', 'netherlands': 'NL', 'germany': 'DE', 'france': 'FR',
    'japan': 'JP', 'singapore': 'SG', 'canada': 'CA', 'india': 'IN',
    'turkey': 'TR', 'türkiye': 'TR', 'uae': 'AE', 'emirates': 'AE',
    'moldova': 'MD'
  };

  var COUNTRY_META = {};
  var PROTO_RE = /^([a-z0-9]+):\/\//i;

  function buildMeta(geo) {
    COUNTRY_META = {};
    var countries = (geo && geo.countries) || [];
    countries.forEach(function (c) {
      COUNTRY_META[c.cc] = { ru: c.ru, en: c.en, lat: c.lat, lon: c.lon };
    });
  }

  function flagToCc(flag) {
    return Array.from(flag).map(function (ch) {
      return String.fromCharCode(ch.codePointAt(0) - 0x1F1E6 + 65);
    }).join('');
  }

  function parseSubscriptions(text, key, acc, proto) {
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line || line.charAt(0) === '#' || line.indexOf('://') < 0) continue;

      var pm = line.match(PROTO_RE);
      if (pm) proto[pm[1].toLowerCase()] = 1;

      var hash = line.indexOf('#');
      var remark = hash >= 0 ? line.slice(hash + 1) : '';

      var cc = null;
      var fm = remark.match(FLAG_RE);
      if (fm) cc = flagToCc(fm[1]);
      if (!cc && remark.indexOf('\u2601') >= 0) cc = 'CF';
      if (!cc) {
        var low = remark.toLowerCase();
        for (var name in NAME_TO_CC) {
          if (low.indexOf(name) >= 0) { cc = NAME_TO_CC[name]; break; }
        }
      }
      if (!cc) cc = 'UN';

      var sm = remark.match(STATS_RE);
      var ms = sm ? parseInt(sm[1], 10) : null;
      var mbps = sm ? parseFloat(sm[2]) : null;

      var row = acc[cc];
      if (!row) row = acc[cc] = { n: 0, all: 0, mobile: 0, secure: 0, msSum: 0, msN: 0, mbps: 0 };
      row[key] += 1;
      row.n += 1;
      if (ms != null && ms > 0) { row.msSum += ms; row.msN += 1; }
      if (mbps != null && mbps > row.mbps) row.mbps = mbps;
    }
    return acc;
  }

  function mergeLiveCounters(acc) {
    var out = [];
    Object.keys(acc).forEach(function (cc) {
      var meta = COUNTRY_META[cc];
      if (!meta) return; /* no coordinates → cannot plot */
      var row = acc[cc];
      out.push({
        cc: cc, ru: meta.ru, en: meta.en, lat: meta.lat, lon: meta.lon,
        n: row.n, all: row.all, mobile: row.mobile, secure: row.secure,
        ms: row.msN ? Math.round(row.msSum / row.msN) : null,
        mbps: row.mbps ? Math.round(row.mbps * 10) / 10 : null
      });
    });
    out.sort(function (a, b) { return b.n - a.n; });
    return out;
  }

  function fetchText(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' -> ' + r.status);
      return r.text();
    });
  }

  function refreshFromLive() {
    return Promise.all(SUBSCRIPTIONS.map(function (s) {
      return fetchText(s.url).then(function (txt) {
        return { key: s.key, txt: txt };
      }).catch(function () {
        return { key: s.key, txt: null };
      });
    })).then(function (results) {
      var acc = {};
      var proto = {};
      var got = 0;
      results.forEach(function (r) {
        if (r.txt == null) return;
        got += 1;
        parseSubscriptions(r.txt, r.key, acc, proto);
      });
      if (!got) throw new Error('no live subscription available');
      return { countries: mergeLiveCounters(acc), protocols: proto };
    });
  }

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
    if (el.__countRaf) { cancelAnimationFrame(el.__countRaf); el.__countRaf = null; }
    el.classList.remove('is-loading');

    // Always commit the real value first: count-up is decoration only.
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

    globe.load('/geo.json', '/globe.json').then(function (geo) {
      globe.resize();
      globe.start();
      window.__flareGlobe = globe;

      /* snapshot rendered → now refresh from the live subscriptions */
      buildMeta(geo);
      var staticTotal = 0;
      (geo.countries || []).forEach(function (c) { staticTotal += c.n || 0; });

      refreshFromLive().then(function (live) {
        if (!live.countries.length) return;
        /* mutate the globe's OWN geo object — onData is fed from
           globe.geo, not from the local variable returned by load() */
        var target = globe.geo || geo;
        target.countries = live.countries;
        target.countries_total = live.countries.length;
        target.total_all = live.countries.reduce(function (s, c) { return s + (c.all || 0); }, 0);
        if (live.protocols && Object.keys(live.protocols).length) {
          target.protocols = live.protocols;
        }
        target.live = true;
        target.generated_at = new Date().toISOString();

        /* rebuild markers; buildMarkers() itself calls onData,
           which refreshes the list and every counter */
        globe.buildMarkers();
        globe.resize();
        window.__flareGlobeLive = true;
        shell.classList.add('is-live');
      }).catch(function (err) {
        /* keep the static snapshot; never blank the section */
        if (window.console) console.warn('[globe] live refresh failed, using snapshot', err);
      });
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
      globe.tZoom = Math.min(3.4, (globe.tZoom || globe.zoom || 1) * 1.18);
      if (globe.zoom != null) globe.zoom = globe.tZoom;
    });
    if (zo) zo.addEventListener('click', function () {
      globe.tZoom = Math.max(0.55, (globe.tZoom || globe.zoom || 1) / 1.18);
      if (globe.zoom != null) globe.zoom = globe.tZoom;
    });
    if (sp) sp.addEventListener('click', function () {
      globe.spin = !globe.spin;
      sp.classList.toggle('is-on', globe.spin);
    });
  }

  /* ---------------- lazy start ---------------- */
  function isNearViewport() {
    var r = shell.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    return r.top < vh + 300 && r.bottom > -300;
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { io.disconnect(); boot(); return; }
      }
    }, { rootMargin: '300px 0px' });
    io.observe(shell);
    /* fallback: always bootstrap, even if the observer never fires */
    setTimeout(function () {
      if (!started && isNearViewport()) boot();
    }, 2500);
    setTimeout(function () { if (!started) boot(); }, 6000);
  } else {
    boot();
  }
})();
