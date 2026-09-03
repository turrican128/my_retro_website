(function () {
  'use strict';

  // Pages under docs/en/ sit one directory deeper than docs/, so relative
  // asset paths need a hop up to resolve. Without this, every asset request
  // from an English page 404s against docs/en/assets/.
  var ASSET_BASE = /\/en\//.test(location.pathname) ? '../' : '';

  var LINKS = [
    { label: 'Facebook',  href: 'https://www.facebook.com/alex.goldblat',   img: 'assets/images/contacts/facebook.png' },
    { label: 'YouTube',   href: 'https://www.youtube.com/@Kleiner82-tf8bz', img: 'assets/images/contacts/youtube.png' },
    { label: 'Mixcloud',  href: 'https://www.mixcloud.com/alex-goldblat/',  img: 'assets/images/contacts/mixcloud.png' },
    { label: 'Bandcamp',  href: 'https://kleiner82.bandcamp.com/',          img: 'assets/images/contacts/bandcamp.png' },
    { label: 'CSDb',      href: 'https://csdb.dk/scener/?id=4140',          badge: 'CSDb' }
  ];

  function injectStyles() {
    if (document.getElementById('ss-styles')) return;
    var css = ''
      + '#social-strip{position:fixed;top:.4rem;right:.8rem;z-index:40;display:flex;align-items:center;gap:.55rem;direction:ltr;pointer-events:auto;}'
      + '#social-strip a{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;transition:transform .12s ease,filter .12s ease;}'
      + '#social-strip a:hover{transform:scale(1.12);filter:drop-shadow(0 0 8px #00fff3) drop-shadow(0 0 14px rgba(255,45,210,.5));}'
      + '#social-strip img{width:22px;height:22px;image-rendering:pixelated;display:block;}'
      + '#social-strip .ss-badge{font-family:"Press Start 2P",monospace;font-size:8px;color:#00fff3;border:1px solid rgba(0,255,243,.55);border-radius:6px;padding:4px 6px;background:rgba(0,0,0,.45);text-shadow:0 0 6px rgba(0,255,243,.6);line-height:1;letter-spacing:.5px;}'
      + '#social-strip a:hover .ss-badge{color:#ff2dd2;border-color:rgba(255,45,210,.7);}'
      + '@media (max-width:640px){#social-strip{gap:.4rem;right:.5rem;top:.3rem;}#social-strip img{width:18px;height:18px;}#social-strip .ss-badge{font-size:7px;padding:3px 5px;}}';
    var el = document.createElement('style');
    el.id = 'ss-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function build() {
    if (document.getElementById('social-strip')) return;
    var strip = document.createElement('div');
    strip.id = 'social-strip';
    for (var i = 0; i < LINKS.length; i++) {
      var item = LINKS[i];
      var a = document.createElement('a');
      a.href = item.href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = item.label;
      a.setAttribute('aria-label', item.label);
      if (item.img) {
        var img = document.createElement('img');
        img.src = ASSET_BASE + item.img;
        img.alt = item.label;
        img.loading = 'lazy';
        a.appendChild(img);
      } else if (item.badge) {
        var span = document.createElement('span');
        span.className = 'ss-badge';
        span.textContent = item.badge;
        a.appendChild(span);
      }
      strip.appendChild(a);
    }
    document.body.insertBefore(strip, document.body.firstChild);
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
