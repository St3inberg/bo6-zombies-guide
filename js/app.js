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

  /** Auto-inject a screenshot image slot into every checklist step */
  function injectImageSlots(mapId) {
    document.querySelectorAll('.checklist-item[data-step-id]').forEach(item => {
      const stepId   = item.dataset.stepId;
      const content  = item.querySelector('.step-content');
      if (!content || content.querySelector('.step-image-slot')) return; // guard

      const imgPath  = `images/${mapId}/${stepId}.webp`;
      const slot     = document.createElement('div');
      slot.className = 'step-image-slot';
      slot.setAttribute('aria-hidden', 'true');

      const img      = document.createElement('img');
      img.src        = imgPath;
      img.alt        = '';
      img.loading    = 'lazy';
      img.addEventListener('load',  () => slot.classList.add('img-loaded'));
      img.addEventListener('error', () => slot.classList.add('img-missing'));

      const ph       = document.createElement('div');
      ph.className   = 'img-slot-placeholder';
      ph.innerHTML   = `<span class="img-slot-icon">📷</span>
        <span class="img-slot-path">Add screenshot here:<br><code>${imgPath}</code></span>`;

      slot.appendChild(img);
      slot.appendChild(ph);
      content.appendChild(slot);
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
   6. MAIN INIT
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

  // Active nav link (landing page)
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });
});
