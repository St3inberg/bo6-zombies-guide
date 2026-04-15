/**
 * BO6 Zombies Guide — Core Application Logic
 * Handles: Checklists + LocalStorage, Timer, Sidebar highlighting, Progress tracking
 */

/* ============================================================
   1. CHECKLIST ENGINE
   ============================================================ */

const Checklist = (() => {
  /** Build storage key from map ID + step ID */
  const storageKey = (mapId, stepId) => `bo6_${mapId}_${stepId}`;

  /** Auto-inject a screenshot image slot + reference links into every checklist step */
  function injectImageSlots(mapId) {
    document.querySelectorAll('.checklist-item[data-step-id]').forEach(item => {
      const stepId    = item.dataset.stepId;
      const content   = item.querySelector('.step-content');
      if (!content || content.querySelector('.step-image-slot')) return; // guard

      // --- Reference link bar (wiki / youtube) ---
      const wikiUrl   = item.dataset.wikiUrl   || null;
      const ytSearch  = item.dataset.ytSearch  || null;
      if (wikiUrl || ytSearch) {
        const refs = document.createElement('div');
        refs.className = 'step-refs';
        if (wikiUrl) {
          const a = document.createElement('a');
          a.href = wikiUrl;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.className = 'step-ref-btn step-ref-wiki';
          a.innerHTML = '📖 Wiki Guide';
          refs.appendChild(a);
        }
        if (ytSearch) {
          const a = document.createElement('a');
          a.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(ytSearch)}`;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.className = 'step-ref-btn step-ref-yt';
          a.innerHTML = '🎬 Video Guide';
          refs.appendChild(a);
        }
        content.appendChild(refs);
      }

      // --- Local screenshot slot DISABLED ---
      // Images are already embedded in HTML content, no need for dynamic slots
      // const imgPath  = `images/${mapId}/${stepId}.webp`;
      // ... rest of image slot code disabled
    });
  }

  /** Load all saved states for a given mapId, populate checkboxes */
  function init(mapId) {
    injectImageSlots(mapId);
    const items = document.querySelectorAll('.checklist-item[data-step-id]');
    items.forEach(item => {
      const stepId = item.dataset.stepId;
      const saved  = localStorage.getItem(storageKey(mapId, stepId));
      if (saved === 'done') markComplete(item);
    });
    updateProgress(mapId);
  }

  function markComplete(item) {
    item.classList.add('completed');
  }

  function markIncomplete(item) {
    item.classList.remove('completed');
  }

  /** Toggle a single checklist item */
  function toggle(item, mapId) {
    const stepId = item.dataset.stepId;
    if (!stepId) return;

    if (item.classList.contains('completed')) {
      markIncomplete(item);
      localStorage.removeItem(storageKey(mapId, stepId));
    } else {
      markComplete(item);
      localStorage.setItem(storageKey(mapId, stepId), 'done');
    }
    updateProgress(mapId);
  }

  /** Calculate + render progress bar & counter */
  function updateProgress(mapId) {
    const items     = document.querySelectorAll('.checklist-item[data-step-id]');
    const total     = items.length;
    const completed = document.querySelectorAll('.checklist-item.completed').length;
    const pct       = total === 0 ? 0 : Math.round((completed / total) * 100);

    const fill  = document.querySelector('.progress-bar-fill');
    const text  = document.querySelector('.progress-text .pct');
    const count = document.querySelector('.progress-text .count');

    if (fill)  fill.style.width  = pct + '%';
    if (text)  text.textContent  = pct + '%';
    if (count) count.textContent = `${completed}/${total}`;
  }

  /** Reset all progress for a map */
  function reset(mapId) {
    if (!confirm('Reset all progress for this map? This cannot be undone.')) return;
    const items = document.querySelectorAll('.checklist-item[data-step-id]');
    items.forEach(item => {
      const stepId = item.dataset.stepId;
      markIncomplete(item);
      localStorage.removeItem(storageKey(mapId, stepId));
    });
    updateProgress(mapId);
  }

  return { init, toggle, reset, updateProgress };
})();


/* ============================================================
   2. SUBSTEP ACCORDION
   ============================================================ */

const Accordion = (() => {
  function bindAll() {
    document.querySelectorAll('.substep-toggle').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const subsId = btn.dataset.target;
        const subs   = document.getElementById(subsId);
        if (!subs) return;
        const isOpen = subs.classList.contains('open');
        subs.classList.toggle('open', !isOpen);
        btn.classList.toggle('open', !isOpen);
        btn.querySelector('.toggle-icon').textContent = isOpen ? '▶' : '▼';
      });
    });
  }
  return { bindAll };
})();


/* ============================================================
   3. STOPWATCH / TIMER
   ============================================================ */

const Timer = (() => {
  let startTime   = null;
  let elapsed     = 0;
  let intervalId  = null;
  let laps        = [];
  let running     = false;

  const fmt = ms => {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1_000);
    const cs = Math.floor((ms % 1_000) / 10);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  };

  function tick() {
    const now = Date.now();
    const display = document.querySelector('.timer-display');
    if (display) display.textContent = fmt(elapsed + (now - startTime));
  }

  function start() {
    if (running) return;
    running   = true;
    startTime = Date.now();
    intervalId = setInterval(tick, 50);
    updateUI();
  }

  function pause() {
    if (!running) return;
    running  = false;
    elapsed += Date.now() - startTime;
    clearInterval(intervalId);
    updateUI();
  }

  function reset() {
    pause();
    elapsed = 0; laps = [];
    running = false;
    const display = document.querySelector('.timer-display');
    if (display) display.textContent = '00:00:00.00';
    const lapsEl = document.querySelector('.timer-laps');
    if (lapsEl) lapsEl.innerHTML = '';
    updateUI();
  }

  function lap() {
    if (!running) return;
    const now = Date.now();
    const lapTime = elapsed + (now - startTime);
    laps.push(lapTime);
    const lapsEl = document.querySelector('.timer-laps');
    if (!lapsEl) return;
    const row = document.createElement('div');
    row.className = 'timer-lap';
    row.innerHTML = `<span>Lap ${laps.length}</span><span>${fmt(lapTime)}</span>`;
    lapsEl.prepend(row);
  }

  function updateUI() {
    const fab = document.querySelector('.fab-timer');
    if (fab) fab.classList.toggle('running', running);
    const startBtn = document.querySelector('.timer-btn-start');
    const pauseBtn = document.querySelector('.timer-btn-pause');
    if (startBtn) startBtn.disabled = running;
    if (pauseBtn) pauseBtn.disabled = !running;
  }

  function bindModal() {
    const overlay  = document.querySelector('.timer-modal-overlay');
    const closeBtn = document.querySelector('.timer-modal-close');
    const startBtn = document.querySelector('.timer-btn-start');
    const pauseBtn = document.querySelector('.timer-btn-pause');
    const resetBtn = document.querySelector('.timer-btn-reset');
    const lapBtn   = document.querySelector('.timer-btn-lap');
    const fab      = document.querySelector('.fab-timer');
    const navBtn   = document.querySelector('.nav-timer-btn');

    const open  = () => overlay && (overlay.classList.add('open'));
    const close = () => overlay && (overlay.classList.remove('open'));

    if (fab)     fab.addEventListener('click',     open);
    if (navBtn)  navBtn.addEventListener('click',  open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    overlay?.addEventListener('click', e => { if (e.target === overlay) close(); });

    if (startBtn) startBtn.addEventListener('click', start);
    if (pauseBtn) pauseBtn.addEventListener('click', pause);
    if (resetBtn) resetBtn.addEventListener('click', reset);
    if (lapBtn)   lapBtn.addEventListener('click',   lap);

    // Keyboard shortcut: Space to toggle
    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && overlay?.classList.contains('open') && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        running ? pause() : start();
      }
    });
  }

  return { bindModal, start, pause, reset };
})();


/* ============================================================
   4. SIDEBAR SCROLL SPY
   ============================================================ */

const ScrollSpy = (() => {
  function init() {
    const sections = document.querySelectorAll('.guide-section[id]');
    const links    = document.querySelectorAll('.sidebar-nav a, .mobile-bottom-nav a');
    if (!sections.length || !links.length) return;

    const observer = new IntersectionObserver(entries => {
      let best = null;
      entries.forEach(e => { if (e.isIntersecting) best = e.target.id; });
      if (!best) return;
      links.forEach(a => {
        const href = a.getAttribute('href');
        a.classList.toggle('active', href === `#${best}`);
      });
    }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

    sections.forEach(s => observer.observe(s));
  }
  return { init };
})();


/* ============================================================
   5. RETURN-VISIT COUNTER (Engagement Tracking via LocalStorage)
   ============================================================ */

const Engagement = (() => {
  function trackVisit(mapId) {
    if (!mapId) return;
    const key   = `bo6_visits_${mapId}`;
    const count = parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(count));
  }
  return { trackVisit };
})();


/* ============================================================
   6. BACKGROUND MUSIC PLAYER (LOCAL FILE)
   ============================================================ */

const MusicPlayer = (() => {
  const AUDIO_FILE = "Orion's Belt.mp3";
  const KEY_ENABLED = 'bo6_music_enabled';
  const KEY_VOLUME = 'bo6_music_volume';
  const DEFAULT_VOLUME = 0.12;

  let audio = null;
  let panel = null;
  let toggleBtn = null;
  let playBtn = null;
  let volumeSlider = null;

  function readEnabled() {
    const saved = localStorage.getItem(KEY_ENABLED);
    return saved === null ? true : saved === 'true';
  }

  function readVolume() {
    const raw = parseFloat(localStorage.getItem(KEY_VOLUME));
    if (Number.isNaN(raw)) return DEFAULT_VOLUME;
    return Math.min(1, Math.max(0, raw));
  }

  function setEnabled(enabled) {
    localStorage.setItem(KEY_ENABLED, String(enabled));
    if (toggleBtn) {
      toggleBtn.classList.toggle('active', enabled);
      toggleBtn.textContent = enabled ? 'MUSIC ON' : 'MUSIC OFF';
    }
    if (panel) panel.classList.toggle('open', enabled);
    if (!enabled && audio) audio.pause();
  }

  function setVolume(vol) {
    const safe = Math.min(1, Math.max(0, vol));
    localStorage.setItem(KEY_VOLUME, String(safe));
    if (audio) audio.volume = safe;
    if (volumeSlider) volumeSlider.value = String(Math.round(safe * 100));
  }

  function updatePlayButton() {
    if (!playBtn || !audio) return;
    playBtn.textContent = audio.paused ? 'PLAY' : 'PAUSE';
  }

  async function tryPlay() {
    if (!audio || !readEnabled()) return;
    try {
      await audio.play();
    } catch {
      // Browser blocked autoplay until interaction.
    }
    updatePlayButton();
  }

  function buildUI() {
    audio = new Audio(encodeURI(AUDIO_FILE));
    audio.loop = true;
    // Do not fetch multi-MB audio on first paint; load when user interacts.
    audio.preload = 'none';
    audio.volume = readVolume();
    audio.addEventListener('play', updatePlayButton);
    audio.addEventListener('pause', updatePlayButton);

    toggleBtn = document.createElement('button');
    toggleBtn.className = 'fab-music';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-label', 'Toggle music panel');

    panel = document.createElement('aside');
    panel.className = 'music-panel';
    panel.setAttribute('aria-label', 'Background music controls');
    panel.innerHTML = `
      <div class="music-panel-header">
        <p class="music-panel-title">Background Music</p>
      </div>
      <div class="music-row">
        <button class="music-play-btn" type="button">PLAY</button>
        <label class="music-volume-wrap" for="musicVolume">VOL</label>
        <input id="musicVolume" class="music-volume" type="range" min="0" max="100" step="1" value="12" aria-label="Music volume" />
      </div>
      <p class="music-panel-note">Looped, low-volume ambient track.</p>
    `;

    playBtn = panel.querySelector('.music-play-btn');
    volumeSlider = panel.querySelector('.music-volume');

    document.body.appendChild(panel);
    document.body.appendChild(toggleBtn);

    toggleBtn.addEventListener('click', async () => {
      const next = !readEnabled();
      setEnabled(next);
      if (next) await tryPlay();
    });

    playBtn?.addEventListener('click', async () => {
      if (!audio) return;
      if (audio.paused) {
        await tryPlay();
      } else {
        audio.pause();
        updatePlayButton();
      }
    });

    volumeSlider?.addEventListener('input', e => {
      const value = Number(e.target.value) / 100;
      setVolume(value);
    });
  }

  function init() {
    buildUI();
    setEnabled(readEnabled());
    setVolume(readVolume());
    updatePlayButton();

    const onFirstInteract = async () => {
      await tryPlay();
      document.removeEventListener('pointerdown', onFirstInteract);
      document.removeEventListener('keydown', onFirstInteract);
    };

    document.addEventListener('pointerdown', onFirstInteract, { once: true });
    document.addEventListener('keydown', onFirstInteract, { once: true });
  }

  return { init };
})();


/* ============================================================
  7. MAIN INIT
  ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const mapId = document.body.dataset.mapId || null;

  // Checklist
  if (mapId) {
    Checklist.init(mapId);

    document.querySelectorAll('.step-main').forEach(el => {
      el.addEventListener('click', () => {
        const item = el.closest('.checklist-item');
        if (item) Checklist.toggle(item, mapId);
      });
    });

    const resetBtn = document.querySelector('.sidebar-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', () => Checklist.reset(mapId));

    Engagement.trackVisit(mapId);
  }

  // Accordions
  Accordion.bindAll();

  // Timer
  Timer.bindModal();

  // Scroll spy
  ScrollSpy.init();

  // Background music
  MusicPlayer.init();

  // Active nav link (landing page)
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });
});
