/* Wedding invitation: the envelope, the countdown and the RSVP card.
   Plain JavaScript, no libraries. Everything here is an enhancement:
   if this file never runs, the snippet in <head> reveals the invitation. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var EASE = {
    in: 'cubic-bezier(.55, 0, .85, .35)',
    out: 'cubic-bezier(.15, .65, .35, 1)',
    inOut: 'cubic-bezier(.65, 0, .35, 1)'
  };

  // A personal link like  ?to=Sarah%20%26%20James&seats=2  writes their names on
  // the envelope and says how many people the invitation is for.
  var guest = readGuestName();
  var seats = readSeats();

  safely(initEnvelope, revealNow);
  safely(initCountdown);
  safely(initRsvp);
  safely(initFab);
  window.__inviteReady = true;


  /* ------------------------------------------------------------------ */
  /* The envelope                                                         */
  /* ------------------------------------------------------------------ */

  function initEnvelope() {
    var scene = byId('scene');
    if (!scene) return;
    if (root.classList.contains('is-open')) { scene.parentNode.removeChild(scene); return; }

    var env = byId('envelope'), front = byId('env-front'), back = byId('env-back'),
        wall = byId('env-wall'), pocket = byId('env-pocket'),
        flapClosed = byId('flap-closed'), flapOpen = byId('flap-open'),
        seal = byId('env-seal'), letter = byId('letter'), card = byId('hero-card'),
        button = byId('open-invite'), hint = byId('scene-hint'), vignette = byId('scene-vignette'),
        sprigs = Array.prototype.slice.call(scene.querySelectorAll('.scene-sprig'));

    var started = false, finished = false, skipping = false, safety = 0;
    var running = [], waiters = [];

    if (guest) byId('recipient').textContent = guest;

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    buildLetter();
    var geo = layout();
    var onResize = debounce(function () { if (!started) geo = layout(); }, 120);
    window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (!started) geo = layout(); });
    }

    button.addEventListener('click', function () {
      if (!started) { started = true; begin(); }
      else skip();                       // a second tap skips to the end
    });

    // Three copies of the real invitation card, one per third of the letter.
    // While the letter is in the envelope a flat stand-in shows its folded
    // outside; the 3D folds only switch on once it is out (Chrome mis-layers
    // 3D-transformed children inside the turning envelope).
    function buildLetter() {
      var names = card.querySelector('.names');
      var date = card.querySelector('.hero-date');
      var fold = el('div', 'letter-fold');
      fold.appendChild(monogram());
      ['p2', 'p3', 'p1'].forEach(function (cls) {
        var panel = el('div', 'panel ' + cls);
        var faceIn = el('div', 'face face-in');
        var clone = card.cloneNode(true);
        clone.removeAttribute('id');
        clone.removeAttribute('tabindex');
        clone.classList.add('card-clone');
        Array.prototype.forEach.call(clone.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
        faceIn.appendChild(clone);
        panel.appendChild(faceIn);
        if (cls !== 'p2') {
          faceIn.classList.add('is-hidden');
          var faceOut = el('div', 'face face-out');
          if (cls === 'p1') faceOut.appendChild(monogram());
          panel.appendChild(faceOut);
          panel.appendChild(el('div', 'shade'));
        }
        letter.appendChild(panel);
      });
      letter.appendChild(fold);

      function monogram() {
        var mono = el('div', 'letter-mono');
        mono.appendChild(el('span', 'm-names', names ? names.textContent.replace(/\s+/g, ' ').trim() : ''));
        mono.appendChild(el('span', 'pearl-rule'));
        mono.appendChild(el('span', 'm-caps', date ? date.textContent : ''));
        return mono;
      }
    }

    // The letter is the invitation card scaled down, folded in three so it
    // fits the envelope. It keeps the card's exact proportions, so once it
    // is unfolded and scaled back up it lands precisely on the real card.
    function layout() {
      var sw = scene.clientWidth, sh = scene.clientHeight;
      var ew = env.offsetWidth, eh = env.offsetHeight;
      // fractional size, so the copies wrap their lines exactly like the card
      var box = card.getBoundingClientRect();
      var cw = box.width, ch = box.height;
      var r = cw / ch;
      var lw = Math.min(0.9 * ew, 2.58 * eh * r, 0.86 * sh * r);
      var lh = lw / r, t = lh / 3, s = lw / cw;
      var left = (ew - lw) / 2, top = 0.07 * eh - t;
      var st = letter.style;
      st.left = left + 'px';
      st.top = top + 'px';
      st.width = lw + 'px';
      st.height = lh + 'px';
      st.setProperty('--lw', lw + 'px');
      st.setProperty('--lh', lh + 'px');
      st.setProperty('--t', t + 'px');
      st.setProperty('--s', String(s));
      st.setProperty('--cw', cw + 'px');
      st.setProperty('--ch', ch + 'px');
      return { sw: sw, sh: sh, ew: ew, eh: eh, lw: lw, lh: lh, t: t, s: s, left: left, top: top };
    }

    function begin() {
      scene.classList.add('is-opening');
      safety = setTimeout(finish, 9000);   // never leave anyone stuck at the envelope
      if (reduceMotion) {
        play(scene, [{ opacity: 1 }, { opacity: 0 }], { duration: 350, easing: 'linear' }).then(finish);
        return;
      }
      run().then(finish, finish);
    }

    async function run() {
      geo = layout();
      var er = env.getBoundingClientRect();
      var cr = card.getBoundingClientRect();
      var lx = er.left + geo.left, ly = er.top + geo.top;   // where the letter box sits on screen

      // On laptops the page keeps the same sprigs on the table, so they stay put.
      var decor = byId('table-decor');
      var keepSprigs = !!decor && window.getComputedStyle(decor).display !== 'none';
      (keepSprigs ? [hint] : sprigs.concat(hint)).forEach(function (n) {
        play(n, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'linear' });
      });

      // 1. turn the envelope over
      await play(front, [{ transform: ry(0) }, { transform: ry(90) }], { duration: 300, easing: EASE.in });
      front.classList.add('is-hidden');
      var flip = play(back, [{ transform: ry(-90) }, { transform: ry(0) }], { duration: 360, easing: EASE.out });
      back.classList.remove('is-hidden');
      await flip;

      // 2. break the seal and lift the flap
      play(seal, [{ transform: 'scale(1) rotate(0deg)', opacity: 1 }, { transform: 'scale(1.2) rotate(-12deg)', opacity: 0 }], { duration: 260, delay: 60, easing: EASE.in });
      await play(flapClosed, [{ transform: rx(0, 800) }, { transform: rx(90, 800) }], { duration: 230, delay: 140, easing: EASE.in });
      flapClosed.classList.add('is-hidden');
      var lift = play(flapOpen, [{ transform: rx(90, 800) }, { transform: rx(180, 800) }], { duration: 280, easing: EASE.out });
      flapOpen.classList.remove('is-hidden');
      await lift;

      // 3. the letter slides up out of the envelope
      var rise = geo.t * 0.72 + geo.eh * 0.07;
      await play(letter, [{ transform: tr(0, 0, 1) }, { transform: tr(0, -rise, 1) }], { duration: 640, easing: EASE.inOut });

      // 4. the envelope drops off the bottom of the screen (opaque the whole
      //    way, so the liner never shows through) and the letter comes to
      //    the middle
      var drop = Math.round(geo.sh - er.top + 24);
      [wall, pocket, flapOpen].forEach(function (n) {
        play(n, [
          { translate: '0 0', opacity: 1, offset: 0 },
          { translate: '0 ' + Math.round(drop * 0.8) + 'px', opacity: 1, offset: 0.8 },
          { translate: '0 ' + drop + 'px', opacity: 0, offset: 1 }
        ], { duration: 560, easing: EASE.in });
      });
      await wait(150);
      var cx = geo.sw / 2 - lx - geo.lw / 2;
      var cy = geo.sh / 2 - ly - geo.t * 1.5;
      await play(letter, [{ transform: tr(0, -rise, 1) }, { transform: tr(cx, cy, 1) }], { duration: 560, easing: EASE.inOut });

      // 5. unfold the top third, then the bottom third. First swap the flat
      //    stand-in for the real folded panels (they look identical).
      var p1 = letter.querySelector('.p1'), p3 = letter.querySelector('.p3');
      p1.style.transform = rx(-180);
      p3.style.transform = rx(180);
      p1.style.visibility = p3.style.visibility = 'visible';
      letter.querySelector('.letter-fold').style.visibility = 'hidden';
      var top = unfold(p1, -180);
      await wait(330);
      await unfold(p3, 180);
      await top;

      // 6. the letter settles exactly where the card sits on the page
      play(vignette, [{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: 'linear' });
      await play(letter, [{ transform: tr(cx, cy, 1) }, { transform: tr(cr.left - lx, cr.top - ly, 1 / geo.s) }], { duration: 700, delay: 120, easing: EASE.inOut });

      // 7. hand over to the real page underneath
      await play(scene, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'linear' });
    }

    function unfold(panel, from) {
      var mid = from / 2;
      var out = panel.querySelector('.face-out');
      var inside = panel.querySelector('.face-in');
      var shade = panel.querySelector('.shade');
      play(shade, [{ opacity: 0 }, { opacity: 0.22 }], { duration: 250, easing: 'linear' });
      return play(panel, [{ transform: rx(from) }, { transform: rx(mid) }], { duration: 250, easing: EASE.in }).then(function () {
        out.classList.add('is-hidden');        // edge-on here, so the swap is invisible
        inside.classList.remove('is-hidden');
        play(shade, [{ opacity: 0.22 }, { opacity: 0 }], { duration: 310, easing: 'linear' });
        return play(panel, [{ transform: rx(mid) }, { transform: rx(0) }], { duration: 310, easing: EASE.out });
      });
    }

    function play(node, frames, opts) {
      var o = { duration: opts.duration, delay: opts.delay || 0, easing: opts.easing || EASE.inOut, fill: 'forwards' };
      if (skipping) { o.duration = 0; o.delay = 0; }
      if (!node.animate) return Promise.resolve();
      var a;
      try { a = node.animate(frames, o); } catch (e) { return Promise.resolve(); }
      running.push(a);
      return a.finished ? a.finished.then(noop, noop) : wait(o.duration + o.delay);
    }

    function wait(ms) {
      if (skipping) return Promise.resolve();
      return new Promise(function (resolve) {
        var id = setTimeout(resolve, ms);
        waiters.push(function () { clearTimeout(id); resolve(); });
      });
    }

    function skip() {
      if (skipping || finished) return;
      skipping = true;
      waiters.splice(0).forEach(function (release) { release(); });
      running.forEach(function (a) { try { a.finish(); } catch (e) { /* already done */ } });
    }

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(safety);
      window.removeEventListener('resize', onResize);
      root.classList.add('is-open');
      running.forEach(function (a) { try { a.cancel(); } catch (e) { /* ignore */ } });
      if (scene.parentNode) scene.parentNode.removeChild(scene);
      window.scrollTo(0, 0);
      try { card.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
    }
  }

  function revealNow() {
    root.classList.add('is-open');
    var scene = byId('scene');
    if (scene && scene.parentNode) scene.parentNode.removeChild(scene);
  }


  /* ------------------------------------------------------------------ */
  /* Countdown                                                            */
  /* ------------------------------------------------------------------ */

  function initCountdown() {
    var box = byId('countdown');
    if (!box) return;
    var target = Date.parse(box.getAttribute('data-countdown'));
    if (isNaN(target)) return;
    var parts = {};
    Array.prototype.forEach.call(box.querySelectorAll('[data-unit]'), function (n) {
      parts[n.getAttribute('data-unit')] = { num: n, label: n.nextElementSibling };
    });
    var timer = 0;

    function set(key, value, padded) {
      var p = parts[key];
      if (!p) return;
      var text = padded && value < 10 ? '0' + value : String(value);
      if (p.num.textContent !== text) p.num.textContent = text;
      var word = p.label.getAttribute(value === 1 ? 'data-one' : 'data-many');
      if (word && p.label.textContent !== word) p.label.textContent = word;
    }

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        box.hidden = true;
        byId('countdown-done').hidden = false;
        clearInterval(timer);
        return;
      }
      set('d', Math.floor(diff / 864e5), false);
      set('h', Math.floor(diff / 36e5) % 24, true);
      set('m', Math.floor(diff / 6e4) % 60, true);
      set('s', Math.floor(diff / 1e3) % 60, true);
    }

    tick();
    timer = setInterval(tick, 1000);
  }


  /* ------------------------------------------------------------------ */
  /* The RSVP card (posts to Formspree)                                   */
  /* ------------------------------------------------------------------ */

  // Shared set-up for a form that posts to Formspree.
  function formSender(form) {
    var endpoint = form.getAttribute('action') || '';
    var live = /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/.test(endpoint) && endpoint.indexOf('YOUR_FORM_ID') === -1;
    // the backup address is stored in two halves so spam bots don't harvest it
    var user = (form.getAttribute('data-fallback-user') || '').trim();
    var domain = (form.getAttribute('data-fallback-domain') || '').trim();
    form.noValidate = true;
    // record which personalised invitation (the ?to= name) a reply came from
    Array.prototype.forEach.call(form.querySelectorAll('.invitation-field'), function (n) { n.value = guest; });
    return {
      live: live,
      fallbackEmail: user && domain ? user + '@' + domain : '',
      send: function (data) {
        if (!live) return new Promise(function (resolve) { setTimeout(resolve, 900); });
        return fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
          .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); });
      }
    };
  }

  function showSendProblem(box, sender, what, subject, body) {
    box.textContent = '';
    box.appendChild(el('p', '', 'Your ' + what + ' didn’t go through. Please check your connection and try again.'));
    if (sender.fallbackEmail) {
      var p = el('p', '', 'If it still won’t send, email it to us at ');
      var a = document.createElement('a');
      a.href = 'mailto:' + sender.fallbackEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      a.textContent = sender.fallbackEmail;
      p.appendChild(a);
      p.appendChild(document.createTextNode('.'));
      box.appendChild(p);
    }
    box.hidden = false;
    box.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function summarise(data, labels) {
    var lines = [];
    Object.keys(labels).forEach(function (k) {
      var v = data.get(k);
      if (v) lines.push(labels[k] + ': ' + v);
    });
    return lines.join('\n');
  }

  function showError(input, msgEl, text) {
    msgEl.textContent = text;
    msgEl.hidden = false;
    if (input) input.setAttribute('aria-invalid', 'true');
  }

  function clearError(input, msgEl) {
    msgEl.hidden = true;
    if (input) input.removeAttribute('aria-invalid');
  }

  function initRsvp() {
    var form = byId('rsvp-form');
    if (!form) return;
    var sender = formSender(form);

    var nameInput = byId('rsvp-name'), subject = byId('rsvp-subject'),
        nameError = byId('rsvp-name-error'), attendError = byId('rsvp-attending-error'),
        problem = byId('rsvp-problem'), submit = byId('rsvp-submit'),
        submitLabel = byId('rsvp-submit-label'), done = byId('rsvp-done'),
        doneName = byId('done-name'), doneMessage = byId('done-message'),
        edit = byId('rsvp-edit'), previewNote = byId('preview-note'), head = byId('rsvp-head'),
        guestsField = byId('rsvp-guests-field'), guestsSelect = byId('rsvp-guests'),
        guestsHint = byId('rsvp-guests-hint'), invited = byId('rsvp-invited');
    var STORE_KEY = 'wedding-rsvp';

    if (!sender.live) previewNote.hidden = false;
    if (guest && !nameInput.value) nameInput.value = guest;

    // "How many of you?" offers 1 up to the number on the invitation, so nobody
    // can add extra people. A link without &seats= allows up to 2.
    var max = seats || 2;
    guestsSelect.textContent = '';
    for (var i = 1; i <= max; i++) {
      var opt = document.createElement('option');
      opt.textContent = String(i);
      guestsSelect.appendChild(opt);
    }
    guestsSelect.value = String(max);
    invited.value = seats ? String(seats) : '';
    if (max === 1) {
      guestsField.hidden = true;
    } else if (seats) {
      guestsHint.textContent = 'Your invitation is for ' + seats + '. If only some of you can come, tell us who in the note below.';
      guestsHint.hidden = false;
    }

    var saved = load();
    if (saved && saved.name) showDone(saved, false);

    nameInput.addEventListener('input', function () { clearError(nameInput, nameError); });
    Array.prototype.forEach.call(form.querySelectorAll('input[name="attending"]'), function (r) {
      r.addEventListener('change', function () { clearError(null, attendError); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submit.disabled) return;
      problem.hidden = true;

      var name = nameInput.value.replace(/\s+/g, ' ').trim();
      var choice = form.querySelector('input[name="attending"]:checked');
      var firstBad = null;
      if (!name) {
        showError(nameInput, nameError, 'Please add your name so we know who is replying.');
        firstBad = nameInput;
      }
      if (!choice) {
        showError(null, attendError, 'Please choose whether you can come.');
        firstBad = firstBad || byId('attend-yes');
      }
      if (firstBad) { firstBad.focus(); return; }

      var coming = choice.value === 'Joyfully accepts';
      subject.value = 'RSVP: ' + name + (coming ? ' (coming)' : ' (not coming)');
      var data = new FormData(form);
      if (!coming) ['guests', 'dietary', 'song_1', 'song_2'].forEach(function (k) { data.delete(k); });
      var songs = coming && (data.get('song_1') || data.get('song_2'));

      busy(true);
      sender.send(data).then(function () {
        var reply = { name: name, coming: coming, songs: !!songs, preview: !sender.live };
        save(reply);
        showDone(reply, true);
      }, function () {
        showSendProblem(problem, sender, 'reply', 'RSVP: ' + name, summarise(data, {
          invitation: 'Invitation', invited: 'Invited', name: 'Name', attending: 'Reply', guests: 'Coming',
          dietary: 'Dietary', email: 'Email', message: 'Note', song_1: 'Song', song_2: 'Another song'
        }));
      }).then(function () { busy(false); });
    });

    edit.addEventListener('click', function () {
      done.hidden = true;
      head.hidden = false;
      form.hidden = false;
      nameInput.focus();
    });

    function showDone(reply, moveFocus) {
      doneName.textContent = reply.name;
      doneMessage.textContent = reply.coming
        ? 'We can’t wait to celebrate with you.'
        : 'You’ll be missed. Thank you for letting us know.';
      if (reply.songs) doneMessage.textContent += ' Your songs are on our list.';
      if (reply.preview) doneMessage.textContent += ' (Preview only, so nothing was sent.)';
      // once they've replied, the card just says thank you
      head.hidden = true;
      form.hidden = true;
      done.hidden = false;
      if (moveFocus) done.focus();
    }

    function busy(on) {
      submit.disabled = on;
      submitLabel.textContent = on ? 'Sending…' : 'Send reply';
    }

    function load() {
      try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; }
    }

    function save(reply) {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(reply)); } catch (e) { /* private mode */ }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Floating RSVP shortcut                                               */
  /* ------------------------------------------------------------------ */

  function initFab() {
    var fab = byId('rsvp-fab'), hero = byId('top'), rsvp = byId('rsvp');
    if (!fab || !hero || !rsvp || !('IntersectionObserver' in window)) return;
    var inView = { top: true, rsvp: false };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { inView[en.target.id] = en.isIntersecting; });
      fab.classList.toggle('is-visible', !inView.top && !inView.rsvp);
    });
    io.observe(hero);
    io.observe(rsvp);
  }


  /* ------------------------------------------------------------------ */
  /* Helpers                                                              */
  /* ------------------------------------------------------------------ */

  function readGuestName() {
    try {
      var v = new URLSearchParams(window.location.search).get('to') || '';
      return v.replace(/\s+/g, ' ').trim().slice(0, 70);
    } catch (e) { return ''; }
  }

  function readSeats() {
    try {
      var n = parseInt(new URLSearchParams(window.location.search).get('seats'), 10);
      return n >= 1 && n <= 12 ? n : 0;
    } catch (e) { return 0; }
  }

  function safely(fn, onError) {
    try { fn(); } catch (e) {
      if (window.console) console.error(e);
      if (onError) onError();
    }
  }

  function byId(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function debounce(fn, ms) {
    var id = 0;
    return function () { clearTimeout(id); id = setTimeout(fn, ms); };
  }

  function ry(a) { return 'perspective(1100px) rotateY(' + a + 'deg)'; }
  function rx(a, p) { return 'perspective(' + (p || 1600) + 'px) rotateX(' + a + 'deg)'; }
  function tr(x, y, k) { return 'translate(' + x + 'px, ' + y + 'px) scale(' + k + ')'; }
  function noop() {}
})();
