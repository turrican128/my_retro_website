(function () {
  'use strict';

  // Pages under docs/en/ sit one directory deeper than docs/, so relative
  // asset paths need a hop up to resolve. Without this, every asset request
  // from an English page 404s against docs/en/assets/.
  var ASSET_BASE = /\/en\//.test(location.pathname) ? '../' : '';

  var MAX_VOL = 0.7;
  var STORAGE_KEY = '8bit_player_state';

  var PLAYLIST = [
    { title: 'Remark Music',                       artist: 'Jeroen Tel - Chiptunes!',                src: 'assets/music/global/01-jeroen-tel-remark-music.mp3' },
    { title: 'Rubicon V22 (wh00p wh00p)',          artist: 'Maniacs of Noise - Jeroen Tel',          src: 'assets/music/global/02-mon-jeroen-tel-rubicon-v22.mp3' },
    { title: "The Human Race (Kleiner'82 Remix)",  artist: "Rob Hubbard - Kleiner'82",               src: 'assets/music/global/03-kleiner82-rob-hubbard-human-race.mp3' },
    { title: "Timezone (Kleiner'82 Remix)",        artist: "Lords Of Sonics - Kleiner'82",           src: 'assets/music/global/04-kleiner82-lords-of-sonics-timezone.mp3' },
    { title: "Kaos (Kleiner'82 Remix)",            artist: "Markus Schneider - Kleiner'82",          src: 'assets/music/global/05-kleiner82-markus-schneider-kaos.mp3' },
    { title: "The Cat (Kleiner'82 Remix)",         artist: "Markus Müller - Kleiner'82",             src: 'assets/music/global/06-kleiner82-markus-muller-the-cat.mp3' },
    { title: "Contest Demo p1 (Kleiner'82 Remix)", artist: "Rock - Kleiner'82",                      src: 'assets/music/global/07-kleiner82-rock-contest-demo.mp3' },
    { title: "Checker Flag (Kleiner'82 Remix)",    artist: "Jeroen Tel - Kleiner'82",                src: 'assets/music/global/08-kleiner82-jeroen-tel-checker-flag.mp3' },
    { title: "Robocop (Kleiner'82 Remix)",         artist: "Jonathan Dunn - Kleiner'82",             src: 'assets/music/global/09-kleiner82-jonathan-dunn-robocop.mp3' },
    { title: "Afterburner Final Takeoff",          artist: "Adam Gilmore - Kleiner'82",              src: 'assets/music/global/10-kleiner82-adam-gilmore-afterburner.mp3' },
    { title: "Double Dragon (Kleiner'82 Remix)",   artist: "Charles Deenen - Kleiner'82",            src: 'assets/music/global/11-kleiner82-charles-deenen-double-dragon.mp3' },
    { title: "Flimbo's Quest intro",               artist: "Reyn Ouwehand - Kleiner'82",             src: 'assets/music/global/12-kleiner82-reyn-ouwehand-flimbos-quest.mp3' },
    { title: "Outrun Splash Wave",                 artist: "Jason Brooke - Kleiner'82",              src: 'assets/music/global/13-kleiner82-jason-brooke-outrun-splash-wave.mp3' }
  ];

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (typeof s !== 'object' || s === null) return null;
      return s;
    } catch (e) { return null; }
  }
  function saveState(patch) {
    try {
      var cur = loadState() || {};
      var next = Object.assign(cur, patch);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {}
  }

  function clampVol(v) {
    if (typeof v !== 'number' || isNaN(v)) v = MAX_VOL;
    if (v < 0) v = 0;
    if (v > MAX_VOL) v = MAX_VOL;
    return v;
  }

  function injectStyles() {
    if (document.getElementById('gp-styles')) return;
    var css = ''
      + '#gp-root{direction:ltr;font-family:"Press Start 2P",monospace;color:#cffafe;flex-shrink:0;}'
      + '#gp-root.gp-fallback{position:fixed;top:1rem;right:1rem;z-index:50;}'
      + '#gp-root *{box-sizing:border-box;}'
      + '#gp-pill{display:flex;align-items:center;gap:.5rem;background:rgba(0,0,0,.7);border:1px solid rgba(0,255,243,.45);border-radius:14px;padding:.45rem .55rem;box-shadow:0 0 18px rgba(0,255,243,.25),0 8px 30px rgba(0,0,0,.7);backdrop-filter:blur(6px);position:relative;overflow:hidden;}'
      + '#gp-pill::before{content:"";position:absolute;inset:0;pointer-events:none;background-image:repeating-linear-gradient(to bottom,rgba(0,0,0,.35),rgba(0,0,0,.35) 1px,transparent 1px,transparent 3px);opacity:.35;mix-blend-mode:soft-light;border-radius:14px;}'
      + '#gp-root.gp-playing #gp-pill{box-shadow:0 0 22px rgba(255,45,210,.45),0 0 40px rgba(0,255,243,.35);animation:gpGlow 2.6s ease-in-out infinite alternate;}'
      + '@keyframes gpGlow{0%{box-shadow:0 0 18px rgba(0,255,243,.45),0 0 32px rgba(255,45,210,.25);}100%{box-shadow:0 0 22px rgba(255,45,210,.55),0 0 42px rgba(0,255,243,.45);}}'
      + '#gp-root.gp-collapsed #gp-info,#gp-root.gp-collapsed #gp-controls,#gp-root.gp-collapsed #gp-vol-wrap{display:none;}'
      + '#gp-toggle{background:transparent;border:none;color:#00fff3;font:inherit;font-size:14px;cursor:pointer;padding:2px 4px;line-height:1;}'
      + '#gp-toggle:hover{color:#ff2dd2;}'
      + '#gp-info{display:flex;flex-direction:column;min-width:120px;max-width:170px;}'
      + '#gp-title{font-size:8px;color:#00fff3;text-shadow:0 0 6px rgba(0,255,243,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
      + '#gp-artist{font-size:6px;color:#ff8be0;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.85;}'
      + '#gp-controls{display:flex;align-items:center;gap:.25rem;}'
      + '.gp-btn{background:rgba(0,0,0,.4);border:1px solid rgba(0,255,243,.5);color:#00fff3;border-radius:6px;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font:inherit;font-size:10px;padding:0;transition:transform .12s,color .12s,box-shadow .12s;}'
      + '.gp-btn:hover{color:#ff2dd2;border-color:rgba(255,45,210,.7);box-shadow:0 0 10px rgba(255,45,210,.6);transform:translateY(-1px);}'
      + '#gp-play{width:32px;height:32px;font-size:12px;color:#ff2dd2;border-color:rgba(255,45,210,.6);}'
      + '#gp-root.gp-needs-click #gp-play{animation:gpPulse 1.4s ease-in-out infinite;}'
      + '@keyframes gpPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,45,210,.7);}50%{box-shadow:0 0 14px 4px rgba(255,45,210,.0);}}'
      + '#gp-vol-wrap{display:flex;align-items:center;gap:4px;}'
      + '#gp-vol{-webkit-appearance:none;appearance:none;width:60px;height:3px;background:rgba(255,255,255,.15);border-radius:2px;outline:none;}'
      + '#gp-vol::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:10px;height:10px;border-radius:50%;background:#00fff3;cursor:pointer;box-shadow:0 0 6px rgba(0,255,243,.8);border:none;}'
      + '#gp-vol::-moz-range-thumb{width:10px;height:10px;border-radius:50%;background:#00fff3;cursor:pointer;box-shadow:0 0 6px rgba(0,255,243,.8);border:none;}'
      + '#gp-eq{display:inline-flex;align-items:flex-end;gap:1px;height:14px;width:14px;}'
      + '#gp-eq span{display:block;width:2px;background:#00fff3;box-shadow:0 0 4px rgba(0,255,243,.8);height:30%;animation:gpEq 0.9s ease-in-out infinite;}'
      + '#gp-eq span:nth-child(2){animation-delay:.15s;background:#ff2dd2;box-shadow:0 0 4px rgba(255,45,210,.8);}'
      + '#gp-eq span:nth-child(3){animation-delay:.3s;}'
      + '#gp-eq span:nth-child(4){animation-delay:.45s;background:#ff2dd2;box-shadow:0 0 4px rgba(255,45,210,.8);}'
      + '@keyframes gpEq{0%,100%{height:30%;}50%{height:100%;}}'
      + '#gp-root:not(.gp-playing) #gp-eq span{animation-play-state:paused;height:30%;}'
      + '@media (max-width:520px){#gp-info{max-width:110px;}#gp-vol{width:46px;}}';
    var el = document.createElement('style');
    el.id = 'gp-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function buildDom() {
    var isHebrew = document.documentElement.lang === 'he';
    var root = document.createElement('div');
    root.id = 'gp-root';
    root.className = 'gp-needs-click gp-collapsed';
    root.innerHTML = ''
      + '<div id="gp-pill">'
      +   '<button id="gp-toggle" type="button" title="Expand/collapse">'
      +     '<span id="gp-eq" aria-hidden="true"><span></span><span></span><span></span><span></span></span>'
      +   '</button>'
      +   '<div id="gp-info">'
      +     '<div id="gp-title">8bitretro radio</div>'
      +     '<div id="gp-artist">' + (isHebrew ? 'לחץ כדי להתחיל' : 'Click to start') + '</div>'
      +   '</div>'
      +   '<div id="gp-controls">'
      +     '<button class="gp-btn" id="gp-prev" type="button" title="Previous" aria-label="Previous">⏮</button>'
      +     '<button class="gp-btn" id="gp-play" type="button" title="Play/Pause" aria-label="Play">▶</button>'
      +     '<button class="gp-btn" id="gp-next" type="button" title="Next" aria-label="Next">⏭</button>'
      +   '</div>'
      +   '<div id="gp-vol-wrap">'
      +     '<input id="gp-vol" type="range" min="0" max="0.7" step="0.01" value="0.7" title="Volume (max 70%)" />'
      +   '</div>'
      + '</div>';
    var nav = document.querySelector('header > nav');
    var logo = nav ? nav.querySelector(':scope > a') : null;
    if (nav && logo) {
      nav.insertBefore(root, logo);
    } else {
      root.classList.add('gp-fallback');
      document.body.appendChild(root);
    }
    return root;
  }

  function init() {
    if (window.GlobalPlayer) return;
    injectStyles();
    var root = buildDom();

    var audio = new Audio();
    audio.preload = 'metadata';

    var state = loadState() || {};
    var trackIndex = (typeof state.trackIndex === 'number' && state.trackIndex >= 0 && state.trackIndex < PLAYLIST.length) ? state.trackIndex : 0;
    var vol = clampVol(state.volume);
    var startPos = (typeof state.position === 'number' && state.position >= 0) ? state.position : 0;
    var wantPlay = state.isPlaying === true;
    var collapsed = (typeof state.collapsed === 'boolean') ? state.collapsed : (window.innerWidth < 900);

    audio.volume = vol;
    audio.src = ASSET_BASE + PLAYLIST[trackIndex].src;

    var elTitle = root.querySelector('#gp-title');
    var elArtist = root.querySelector('#gp-artist');
    var elPlay = root.querySelector('#gp-play');
    var elPrev = root.querySelector('#gp-prev');
    var elNext = root.querySelector('#gp-next');
    var elVol = root.querySelector('#gp-vol');
    var elToggle = root.querySelector('#gp-toggle');

    elVol.value = String(vol);

    function setCollapsed(c) {
      collapsed = c;
      root.classList.toggle('gp-collapsed', c);
      saveState({ collapsed: c });
    }
    setCollapsed(collapsed);

    function renderTrack() {
      var t = PLAYLIST[trackIndex];
      elTitle.textContent = t.title;
      elArtist.textContent = t.artist;
    }
    renderTrack();

    function setNeedsClick(needs) {
      root.classList.toggle('gp-needs-click', needs);
      elPlay.textContent = needs ? '▶' : (audio.paused ? '▶' : '⏸');
    }

    function setPlayingClass() {
      root.classList.toggle('gp-playing', !audio.paused && !audio.ended);
      elPlay.textContent = audio.paused || audio.ended ? '▶' : '⏸';
    }

    function pauseOtherAudios(except) {
      var all = document.querySelectorAll('audio');
      for (var i = 0; i < all.length; i++) {
        if (all[i] !== except && !all[i].paused) {
          try { all[i].pause(); } catch (e) {}
        }
      }
    }

    function play() {
      pauseOtherAudios(audio);
      var p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(function () {
          setNeedsClick(false);
          setPlayingClass();
          saveState({ isPlaying: true });
        }).catch(function () {
          setNeedsClick(true);
          setPlayingClass();
        });
      } else {
        setNeedsClick(false);
        setPlayingClass();
        saveState({ isPlaying: true });
      }
    }
    function pause() {
      audio.pause();
      setPlayingClass();
      saveState({ isPlaying: false });
    }
    function toggle() {
      if (audio.paused) play(); else pause();
    }
    function loadTrack(idx, autoPlay) {
      trackIndex = ((idx % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
      audio.src = ASSET_BASE + PLAYLIST[trackIndex].src;
      audio.currentTime = 0;
      renderTrack();
      saveState({ trackIndex: trackIndex, position: 0 });
      if (autoPlay) play(); else setPlayingClass();
    }

    elPlay.addEventListener('click', function () {
      if (collapsed) setCollapsed(false);
      toggle();
    });
    elPrev.addEventListener('click', function () { loadTrack(trackIndex - 1, !audio.paused || root.classList.contains('gp-needs-click') === false); });
    elNext.addEventListener('click', function () { loadTrack(trackIndex + 1, !audio.paused || root.classList.contains('gp-needs-click') === false); });
    elToggle.addEventListener('click', function () {
      if (root.classList.contains('gp-needs-click')) {
        if (collapsed) setCollapsed(false);
        toggle();
        return;
      }
      setCollapsed(!collapsed);
    });

    elVol.addEventListener('input', function () {
      var v = clampVol(parseFloat(elVol.value));
      audio.volume = v;
      saveState({ volume: v });
    });

    audio.addEventListener('timeupdate', function () {
      saveState({ position: audio.currentTime, trackIndex: trackIndex });
    });
    audio.addEventListener('ended', function () { loadTrack(trackIndex + 1, true); });
    audio.addEventListener('play', function () { setPlayingClass(); });
    audio.addEventListener('pause', function () { setPlayingClass(); });
    audio.addEventListener('volumechange', function () {
      if (audio.volume > MAX_VOL) audio.volume = MAX_VOL;
    });
    audio.addEventListener('error', function () {
      var err = audio.error;
      console.warn('[GlobalPlayer] audio error', err && err.code, 'src=', audio.currentSrc || audio.src);
      var isHebrew = document.documentElement.lang === 'he';
      elArtist.textContent = isHebrew ? 'שגיאה בטעינת הקובץ' : 'Error loading file';
    });

    // Persist on navigation
    function persist() {
      saveState({
        trackIndex: trackIndex,
        position: audio.currentTime || 0,
        isPlaying: !audio.paused,
        volume: audio.volume,
        collapsed: collapsed
      });
    }
    window.addEventListener('pagehide', persist);
    window.addEventListener('beforeunload', persist);

    // Detect other audio elements starting playback (e.g., kleiner82 album player)
    document.addEventListener('play', function (e) {
      if (e.target && e.target !== audio && e.target.tagName === 'AUDIO') {
        if (!audio.paused) pause();
      }
    }, true);

    // Restore position once metadata is ready
    audio.addEventListener('loadedmetadata', function () {
      if (startPos > 0 && startPos < (audio.duration || Infinity)) {
        try { audio.currentTime = startPos; } catch (e) {}
        startPos = 0;
      }
    });

    // Try to resume playback if previously playing
    if (wantPlay) {
      // Need metadata so currentTime restores; play() will trigger load
      setNeedsClick(false);
      var p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(function () {
          if (collapsed) setCollapsed(false);
          setPlayingClass();
        }).catch(function () {
          // Browser blocked autoplay — wait for click
          setNeedsClick(true);
        });
      }
    } else {
      setNeedsClick(true);
    }

    window.GlobalPlayer = {
      play: play,
      pause: pause,
      next: function () { loadTrack(trackIndex + 1, true); },
      prev: function () { loadTrack(trackIndex - 1, true); },
      audio: audio
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
