(function () {
  'use strict';

  // Classic 90s hit counter in the page footer, drawn as 7-segment LED digits.
  // GitHub Pages has no backend, so the number lives in the free Abacus
  // counter service (no account, CORS open). A visit is counted once per
  // browser session; every other page load in that session only reads it.
  var API = 'https://abacus.jasoncameron.dev';
  var NAMESPACE = '8bitretro.tech';
  var KEY = 'visits';
  var DIGITS = 7;
  var SESSION_FLAG = 'hc-counted';

  var HEBREW = document.documentElement.lang === 'he';
  var LABEL = HEBREW ? 'מבקרים' : 'VISITORS';

  //   aaa
  //  f   b
  //   ggg
  //  e   c
  //   ddd
  var SEGMENTS = {
    a: '3,1 15,1 13,3 5,3',
    b: '16,2 16,14 14,13 14,4',
    c: '16,16 16,28 14,26 14,17',
    d: '3,29 15,29 13,27 5,27',
    e: '2,16 4,17 4,26 2,28',
    f: '2,2 4,4 4,13 2,14',
    g: '3,15 5,14 13,14 15,15 13,16 5,16'
  };
  var LIT = {
    '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg',
    '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
    '-': 'g'
  };

  function injectStyles() {
    if (document.getElementById('hc-styles')) return;
    var css = ''
      + '#hit-counter{position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;gap:.5rem;margin:0 auto;padding:1.5rem 0 3rem;direction:ltr;}'
      + '#hit-counter .hc-label{font-family:"Press Start 2P",monospace;font-size:8px;letter-spacing:2px;color:#00fff3;text-shadow:0 0 6px rgba(0,255,243,.6);}'
      + '#hit-counter .hc-box{display:flex;gap:3px;padding:6px 8px;border-radius:6px;background:#0b0008;border:1px solid rgba(255,45,210,.45);box-shadow:0 0 18px rgba(255,45,210,.25),inset 0 0 12px rgba(0,0,0,.9);}'
      // Press Start 2P has no Hebrew glyphs, so the Hebrew label falls back to
      // the body font, where the pixel letter-spacing only pulls letters apart.
      + '#hit-counter .hc-label.hc-he{font-family:inherit;font-size:12px;letter-spacing:0;}'
      + '#hit-counter svg{width:14px;height:24px;display:block;}'
      + '#hit-counter polygon{fill:rgba(255,45,210,.08);}'
      + '#hit-counter polygon.on{fill:#ff2dd2;filter:drop-shadow(0 0 2px #ff2dd2);}'
      + '#hit-counter.hc-offline polygon.on{fill:rgba(255,45,210,.35);filter:none;}';
    var el = document.createElement('style');
    el.id = 'hc-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function digitSvg() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 18 30');
    svg.setAttribute('aria-hidden', 'true');
    for (var name in SEGMENTS) {
      var p = document.createElementNS(ns, 'polygon');
      p.setAttribute('points', SEGMENTS[name]);
      p.setAttribute('data-seg', name);
      svg.appendChild(p);
    }
    return svg;
  }

  function render(root, text) {
    var svgs = root.querySelectorAll('svg');
    for (var i = 0; i < svgs.length; i++) {
      var lit = LIT[text.charAt(i)] || '';
      var segs = svgs[i].querySelectorAll('polygon');
      for (var j = 0; j < segs.length; j++) {
        var on = lit.indexOf(segs[j].getAttribute('data-seg')) !== -1;
        segs[j].setAttribute('class', on ? 'on' : '');
      }
    }
  }

  function pad(n) {
    var s = String(Math.max(0, Math.floor(n)));
    if (s.length > DIGITS) s = s.slice(-DIGITS);
    while (s.length < DIGITS) s = '0' + s;
    return s;
  }

  // Roll up from zero, like the counter is still catching up.
  function show(root, value) {
    root.setAttribute('aria-label', LABEL + ': ' + value);
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || value < 10) { render(root, pad(value)); return; }
    var start = null, duration = 1200;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      render(root, pad(value * eased));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function sessionGet() {
    try { return sessionStorage.getItem(SESSION_FLAG); } catch (e) { return null; }
  }
  function sessionSet() {
    try { sessionStorage.setItem(SESSION_FLAG, '1'); } catch (e) {}
  }

  function fetchCount(root) {
    var counted = sessionGet();
    var url = API + (counted ? '/get/' : '/hit/') + NAMESPACE + '/' + KEY;
    fetch(url, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        if (typeof data.value !== 'number') throw new Error('no value');
        if (!counted) sessionSet();
        show(root, data.value);
      })
      .catch(function () {
        root.className = 'hc-offline';
        render(root, new Array(DIGITS + 1).join('-'));
      });
  }

  function build() {
    if (document.getElementById('hit-counter')) return;
    var root = document.createElement('footer');
    root.id = 'hit-counter';
    root.setAttribute('role', 'status');

    var box = document.createElement('div');
    box.className = 'hc-box';
    for (var i = 0; i < DIGITS; i++) box.appendChild(digitSvg());

    var label = document.createElement('div');
    label.className = HEBREW ? 'hc-label hc-he' : 'hc-label';
    if (HEBREW) label.dir = 'rtl';
    label.textContent = LABEL;

    root.appendChild(box);
    root.appendChild(label);
    document.body.appendChild(root);

    render(root, pad(0));
    fetchCount(root);
  }

  function init() {
    injectStyles();
    build();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
