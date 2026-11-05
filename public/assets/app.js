(function () {
  'use strict';

  var $ = function (selector, root) {
    return (root || document).querySelector(selector);
  };
  var $$ = function (selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  };

  /* ---------- toast ---------- */
  var toastEl = $('#toast');
  var toastTimer = null;

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove('is-visible');
    }, 2100);
  }

  /* ---------- copy ---------- */
  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;width:2px;height:2px;padding:0;border:0;opacity:.01;';
    document.body.appendChild(area);
    area.focus();
    area.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  function flashButton(button) {
    if (!button) return;
    var use = button.querySelector('use');
    var previous = use ? use.getAttribute('href') : null;
    button.classList.add('is-copied');
    if (use) use.setAttribute('href', '#i-check');
    window.clearTimeout(button._copyTimer);
    button._copyTimer = window.setTimeout(function () {
      button.classList.remove('is-copied');
      if (use && previous) use.setAttribute('href', previous);
    }, 1600);
  }

  function copyText(text, button) {
    text = String(text || '');
    if (!text) {
      toast('Нечего копировать');
      return;
    }

    var done = function (ok) {
      if (ok) {
        flashButton(button);
        toast('Скопировано');
      } else {
        toast('Не удалось скопировать');
      }
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        done(true);
      }).catch(function () {
        done(fallbackCopy(text));
      });
    } else {
      done(fallbackCopy(text));
    }
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-copy]');
    if (!button) return;
    event.preventDefault();
    copyText(button.getAttribute('data-copy'), button);
  });

  /* ---------- mobile menu ---------- */
  var menuButton = $('#menuBtn');
  var mobileNav = $('#mobileNav');
  var menuBackdrop = $('#menuBackdrop');

  function setMenu(open, returnFocus) {
    if (!menuButton || !mobileNav) return;
    menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    mobileNav.hidden = !open;
    if (menuBackdrop) menuBackdrop.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    if (open) {
      var firstLink = mobileNav.querySelector('a');
      if (firstLink) firstLink.focus();
    } else if (returnFocus) {
      menuButton.focus();
    }
  }

  if (menuButton && mobileNav) {
    menuButton.addEventListener('click', function (event) {
      event.stopPropagation();
      setMenu(menuButton.getAttribute('aria-expanded') !== 'true', false);
    });

    $$('a, [data-copy]', mobileNav).forEach(function (item) {
      item.addEventListener('click', function () {
        setMenu(false, false);
      });
    });

    document.addEventListener('click', function (event) {
      if (mobileNav.hidden) return;
      if (mobileNav.contains(event.target) || menuButton.contains(event.target)) return;
      setMenu(false, true);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !mobileNav.hidden) {
        setMenu(false, true);
      }
    });

    if (window.matchMedia) {
      var desktop = window.matchMedia('(min-width: 961px)');
      var onChange = function (event) {
        if (event.matches) setMenu(false, false);
      };
      if (desktop.addEventListener) desktop.addEventListener('change', onChange);
      else if (desktop.addListener) desktop.addListener(onChange);
    }
  }

  /* ---------- mirror check ---------- */
  function probe(url) {
    return new Promise(function (resolve) {
      if (!window.fetch) {
        resolve(false);
        return;
      }
      var controller = window.AbortController ? new AbortController() : null;
      var finished = false;
      var finish = function (value) {
        if (finished) return;
        finished = true;
        window.clearTimeout(timer);
        resolve(value);
      };
      var timer = window.setTimeout(function () {
        if (controller) {
          try { controller.abort(); } catch (error) {}
        }
        finish(false);
      }, 7000);
      var options = { mode: 'no-cors', cache: 'no-store', redirect: 'follow' };
      if (controller) options.signal = controller.signal;
      try {
        window.fetch(url, options).then(function () {
          finish(true);
        }).catch(function () {
          finish(false);
        });
      } catch (error) {
        finish(false);
      }
    });
  }

  $$('[data-check]').forEach(function (button) {
    button.addEventListener('click', function () {
      var card = button.closest('.mirror-card');
      if (!card) return;

      var rows = $$('.mirror-row', card);
      if (!rows.length) return;

      var original = button.innerHTML;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-refresh"></use></svg> Проверяем…';

      var dots = rows.map(function (row) {
        var dot = $('.status-dot', row);
        if (dot) {
          dot.classList.remove('is-ok', 'is-bad');
          dot.classList.add('is-checking');
        }
        return dot;
      });

      var urls = rows.map(function (row) {
        var link = $('.mirror-url', row);
        return link ? link.href : '';
      });

      Promise.all(urls.map(function (url) {
        return url ? probe(url) : Promise.resolve(false);
      })).then(function (results) {
        var okCount = 0;
        results.forEach(function (ok, index) {
          var dot = dots[index];
          if (!dot) return;
          dot.classList.remove('is-checking');
          dot.classList.add(ok ? 'is-ok' : 'is-bad');
          dot.title = ok ? 'Хост отвечает' : 'Нет ответа из вашей сети';
          if (ok) okCount += 1;
        });

        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg> ' + okCount + '/' + results.length;
        toast('Доступно зеркал: ' + okCount + ' из ' + results.length);

        window.setTimeout(function () {
          button.innerHTML = original;
        }, 7000);
      });
    });
  });

  /* ---------- live stats from the subscription header ---------- */
  function loadLiveStats() {
    if (!window.fetch || !window.TextDecoder || location.protocol === 'file:') return;
    if (navigator.connection && navigator.connection.saveData) return;

    var controller = window.AbortController ? new AbortController() : null;
    if (controller) {
      window.setTimeout(function () {
        try { controller.abort(); } catch (error) {}
      }, 6000);
    }

    var options = { cache: 'no-store', credentials: 'same-origin' };
    if (controller) options.signal = controller.signal;

    window.fetch('/podpiska.txt?ts=' + Date.now(), options).then(function (response) {
      if (!response.ok || !response.body || !response.body.getReader) return;

      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var text = '';

      function readChunk() {
        return reader.read().then(function (chunk) {
          if (chunk.value) text += decoder.decode(chunk.value, { stream: true });
          if (chunk.done || /#announce:[^\n]*/.test(text) || text.length > 12000) {
            try { reader.cancel(); } catch (error) {}
            return text;
          }
          return readChunk();
        });
      }

      return readChunk().then(function (header) {
        var announceMatch = header.match(/#announce:[^\n]*/i);
        if (!announceMatch) return;
        var announce = announceMatch[0];

        var countMatch = announce.match(/(\d[\d\s]*)\s+configs/i);
        var dateMatch = announce.match(/last update:\s*([^\n]+)/i);
        var count = countMatch ? parseInt(countMatch[1].replace(/\s/g, ''), 10) : 0;

        if (count > 0) {
          var formatted = new Intl.NumberFormat('ru-RU').format(count).replace(/\u00A0|\u202F/g, ' ');
          $$('[data-live="count"]').forEach(function (node) {
            node.textContent = formatted;
          });
          var liveCount = $('#liveCount');
          if (liveCount) liveCount.textContent = formatted + ' конфигов';
        }

        if (dateMatch && dateMatch[1]) {
          var dateText = dateMatch[1].trim();
          var time = $('#lastUpdated');
          if (time) {
            time.textContent = dateText;
            var parts = dateText.match(/(\d{1,2}):(\d{2})\s+(\d{2})\/(\d{2})\/(\d{4})/);
            if (parts) {
              var iso = parts[5] + '-' + parts[4] + '-' + parts[3] + 'T' + parts[1].padStart(2, '0') + ':' + parts[2];
              time.setAttribute('datetime', iso);
            }
          }
        }
      });
    }).catch(function () {
      /* Keep the static fallback: the page must never depend on this request. */
    });
  }

  if (document.readyState === 'complete') {
    window.setTimeout(loadLiveStats, 1200);
  } else {
    window.addEventListener('load', function () {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(loadLiveStats, { timeout: 2500 });
      } else {
        window.setTimeout(loadLiveStats, 1200);
      }
    }, { once: true });
  }
})();
