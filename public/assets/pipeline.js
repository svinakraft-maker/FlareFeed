/* =========================================================
   FlareFeed · pipeline.js
   Step sequencer + typing terminal log for the pipeline section.
   Pure vanilla; degrades to static text without JS.
   ========================================================= */
(function () {
  'use strict';

  var pipe = document.getElementById('pipe');
  var logEl = document.getElementById('pipeLog');
  if (!pipe || !logEl) return;

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var steps = [].slice.call(pipe.querySelectorAll('.pipe-step'));

  /* The log mirrors the real pipeline order. */
  var script = [
    ['$ flamefeed run --sources 42', 'dim'],
    ['источники опрошены · новых публикаций 118', 'ok'],
    ['извлечено ссылок ........ 3 104', ''],
    ['после дедупликации ..... 2 658', 'ok'],
    ['', ''],
    ['tcp-отсев ............... 1 977 отброшено', 'warn'],
    ['прошли сокет ............ 681', ''],
    ['', ''],
    ['глубокая проверка · целей 5', 'dim'],
    ['проверено ............... 681', ''],
    ['живых конфигов .......... 2 658', 'ok'],
    ['', ''],
    ['замер задержки и скорости', 'dim'],
    ['лучший пинг ............. 47 ms', 'ok'],
    ['', ''],
    ['запись наборов: all / mobile / top500', ''],
    ['публикация на 3 зеркала .. готово', 'ok'],
    ['прогон завершён · следующий через 58 мин', 'dim']
  ];

  /* ---------- step highlight ---------- */
  var active = 0;
  function setActive(i) {
    steps.forEach(function (s, k) {
      s.classList.toggle('is-active', k === i);
    });
    active = i;
  }

  /* ---------- typing log ---------- */
  var li = 0, ci = 0;
  var out = [];

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render(cursor) {
    var html = out.map(function (l) {
      return l.cls ? '<span class="' + l.cls + '">' + esc(l.text) + '</span>' : esc(l.text);
    }).join('\n');
    if (cursor) html += '<span class="cur"></span>';
    logEl.innerHTML = html;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function tick() {
    if (li >= script.length) {
      // finished: hold, then restart after a pause
      setTimeout(function () {
        out = []; li = 0; ci = 0;
        // let the step highlight loop keep running independently
        tick();
      }, 5200);
      return;
    }

    var entry = script[li];
    var text = entry[0];
    var cls = entry[1];

    if (!out[li]) out[li] = { text: '', cls: cls };

    if (ci <= text.length) {
      out[li].text = text.slice(0, ci);
      ci++;
      render(true);
      setTimeout(tick, cls === 'dim' ? 26 : 13);
    } else {
      // line done — advance a step roughly every two lines
      if (li % 2 === 0) setActive(Math.min(steps.length - 1, Math.floor(li / 2) % steps.length));
      li++;
      ci = 0;
      render(true);
      setTimeout(tick, 190);
    }
  }

  /* Kick off only when the section is visible (and always, eventually). */
  var started = false;
  function start() {
    if (started) return;
    started = true;
    if (reduce) {
      // no typing: print the whole log at once, no cursor
      script.forEach(function (e) { out.push({ text: e[0], cls: e[1] }); });
      render(false);
      return;
    }
    render(true);
    setTimeout(tick, 420);
  }

  /* Rotate the step highlight even if typing is disabled. */
  var rot = setInterval(function () {
    if (!started || reduce) return;
    setActive((active + 1) % steps.length);
  }, 2600);

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { start(); io.disconnect(); }
      });
    }, { rootMargin: '160px 0px' });
    io.observe(logEl);
    setTimeout(start, 5000);
  } else {
    start();
  }

  /* Clicking a step pins it. */
  steps.forEach(function (s, i) {
    s.addEventListener('mouseenter', function () { setActive(i); });
  });
  window.addEventListener('beforeunload', function () { clearInterval(rot); });
})();
