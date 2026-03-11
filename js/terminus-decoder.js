/**
 * BO6 Zombies Guide — Terminus Venn Diagram Solver
 *
 * The Terminus Main Quest puzzle ("No Mo' Modi"):
 *   After activating the beacon, 3 glowing Venn-diagram symbols appear.
 *   Each symbol has a numeric value based on its position in the triangular grid.
 *   Select all 3 (X, Y, Z) to compute the codes for the three terminals.
 *
 * Formulas (from ajlee1976/terminus-formula-solver, verified against in-game):
 *   Computer A  =  2X + 11
 *   Computer B  =  2Z + Y − 5
 *   Computer C  =  |Y + Z − X|
 *
 * Venn image CDN (MIT-licensed):
 *   https://raw.githubusercontent.com/ajlee1976/terminus-formula-solver/main/venns/
 */

const TerminusDecoder = (() => {

  const IMG_BASE = 'https://raw.githubusercontent.com/ajlee1976/terminus-formula-solver/main/venns/';

  /**
   * 6 Venn diagram icons in triangular grid:
   *
   *   col→   2      1      0
   * row 0:               [v0]
   * row 1:         [v11] [v10]
   * row 2:  [v22]  [v21] [v20]
   */
  const ICONS = [
    { id: 'v22', value: 22, img: 'term4.png', row: 2, col: 2, label: 'Venn 22' },
    { id: 'v21', value: 21, img: 'term5.png', row: 2, col: 1, label: 'Venn 21' },
    { id: 'v20', value: 20, img: 'term6.png', row: 2, col: 0, label: 'Venn 20' },
    { id: 'v11', value: 11, img: 'term3.png', row: 1, col: 1, label: 'Venn 11' },
    { id: 'v10', value: 10, img: 'term2.png', row: 1, col: 0, label: 'Venn 10' },
    { id: 'v0',  value: 0,  img: 'term1.png', row: 0, col: 0, label: 'Venn 0'  },
  ];

  const BY_ROW = ICONS.reduce((acc, ic) => {
    (acc[ic.row] = acc[ic.row] || []).push(ic);
    return acc;
  }, {});

  /* state: up to 3 selections = [X, Y, Z] */
  let selections = [null, null, null];
  let activeTerminal = 0;

  /* ── GRID RENDERER ────────────────────────────────────── */

  function renderGrid(container) {
    container.innerHTML = '';
    container.style.cssText = 'display:flex;flex-direction:column;gap:0.5rem;align-items:center;margin-bottom:1rem;';

    const colHeader = document.createElement('div');
    colHeader.style.cssText = 'display:flex;gap:0.5rem;align-items:center;width:100%;max-width:18rem;';
    colHeader.innerHTML = '<span style="width:1.6rem;flex-shrink:0;"></span>'
      + '<span style="flex:1;text-align:center;font-size:0.62rem;color:var(--text-muted);">Col 2</span>'
      + '<span style="flex:1;text-align:center;font-size:0.62rem;color:var(--text-muted);">Col 1</span>'
      + '<span style="flex:1;text-align:center;font-size:0.62rem;color:var(--text-muted);">Col 0</span>';
    container.appendChild(colHeader);

    [0, 1, 2].forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.style.cssText = 'display:flex;gap:0.5rem;align-items:center;width:100%;max-width:18rem;';

      const rowLabel = document.createElement('span');
      rowLabel.style.cssText = 'width:1.6rem;flex-shrink:0;font-size:0.62rem;color:var(--text-muted);text-align:right;';
      rowLabel.textContent = `R${row}`;
      rowEl.appendChild(rowLabel);

      // 3 column slots, left = col2, right = col0
      [2, 1, 0].forEach(col => {
        const icon = (BY_ROW[row] || []).find(ic => ic.col === col);
        const cell = document.createElement('div');
        cell.style.cssText = [
          'flex:1;aspect-ratio:1;border-radius:var(--radius-sm);overflow:hidden;',
          'transition:border-color 0.15s,box-shadow 0.15s,background 0.15s;',
        ].join('');

        if (!icon) {
          cell.style.background = 'rgba(255,255,255,0.02)';
          cell.style.border     = '1px dashed rgba(255,255,255,0.04)';
        } else {
          cell.style.cursor     = 'pointer';
          cell.style.border     = '1px solid rgba(255,255,255,0.12)';
          cell.style.background = 'rgba(255,255,255,0.04)';
          cell.dataset.id       = icon.id;
          cell.title            = `${icon.label} — value: ${icon.value}`;

          const img = document.createElement('img');
          img.src     = IMG_BASE + icon.img;
          img.alt     = icon.label;
          img.loading = 'lazy';
          img.style.cssText = 'width:100%;height:100%;object-fit:contain;padding:0.35rem;filter:invert(1) brightness(0.85);display:block;';
          cell.appendChild(img);

          const valLabel = document.createElement('div');
          valLabel.style.cssText = 'font-size:0.6rem;text-align:center;color:var(--text-muted);padding-bottom:0.15rem;';
          valLabel.textContent = icon.value;
          cell.appendChild(valLabel);

          cell.addEventListener('click', () => onIconClick(icon));
        }
        rowEl.appendChild(cell);
      });
      container.appendChild(rowEl);
    });

    updateGridHighlight();
  }

  /* ── SLOT RENDERER ────────────────────────────────────── */

  function renderSlots(container) {
    container.innerHTML = '';
    ['X', 'Y', 'Z'].forEach((label, idx) => {
      const slot = document.createElement('div');
      slot.className   = 'solver-slot';
      slot.dataset.idx = idx;
      slot.innerHTML = `
        <span class="slot-label">Symbol ${label}</span>
        <span class="slot-symbol" style="font-size:0.85rem;font-weight:900;margin:0.1rem 0;font-family:monospace;">—</span>
        <span class="slot-name" style="font-size:0.62rem;color:var(--text-muted);">not set</span>
        <button class="slot-clear" title="Remove">✕</button>
      `;
      slot.querySelector('.slot-clear').addEventListener('click', e => {
        e.stopPropagation();
        clearSlot(idx);
      });
      container.appendChild(slot);
    });
    updateSlots();
  }

  function updateSlots() {
    const container = document.getElementById('decoder-slots');
    if (!container) return;
    container.querySelectorAll('.solver-slot').forEach((el, idx) => {
      const ic     = selections[idx];
      const valEl  = el.querySelector('.slot-symbol');
      const nameEl = el.querySelector('.slot-name');
      if (ic) {
        el.classList.add('filled');
        valEl.textContent  = ic.value;
        nameEl.textContent = ic.label;
      } else {
        el.classList.remove('filled');
        valEl.textContent  = '—';
        nameEl.textContent = 'not set';
      }
    });
  }

  /* ── ICON CLICK ───────────────────────────────────────── */

  function onIconClick(icon) {
    const existingIdx = selections.findIndex(s => s && s.id === icon.id);
    if (existingIdx !== -1) { clearSlot(existingIdx); return; }
    const emptyIdx = selections.findIndex(s => s === null);
    if (emptyIdx === -1) return;
    selections[emptyIdx] = icon;
    updateSlots();
    updateGridHighlight();
    computeOutput();
  }

  function clearSlot(idx) {
    selections[idx] = null;
    updateSlots();
    updateGridHighlight();
    computeOutput();
  }

  function updateGridHighlight() {
    const gridEl = document.getElementById('decoder-grid');
    if (!gridEl) return;
    gridEl.querySelectorAll('[data-id]').forEach(cell => {
      const on = selections.some(s => s && s.id === cell.dataset.id);
      cell.style.borderColor = on ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.12)';
      cell.style.boxShadow   = on ? '0 0 10px var(--neon-cyan)' : 'none';
      cell.style.background  = on ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.04)';
    });
  }

  /* ── FORMULA ENGINE ───────────────────────────────────── */

  function computeOutput() {
    const outputEl = document.getElementById('decoder-output');
    if (!outputEl) return;

    if (!selections.every(s => s !== null)) {
      outputEl.classList.remove('visible');
      return;
    }

    const [x, y, z] = selections.map(s => s.value);
    const A = 2 * x + 11;
    const B = 2 * z + y - 5;
    const C = Math.abs(y + z - x);

    outputEl.classList.add('visible');

    const TERMINAL_DATA = [
      { label: 'Computer A', desc: 'Bio-Lab (underground)', formula: 'A = 2X + 11',    value: A },
      { label: 'Computer B', desc: 'Research Wing',         formula: 'B = 2Z + Y − 5', value: B },
      { label: 'Computer C', desc: 'Control Room',          formula: 'C = |Y + Z − X|', value: C },
    ];

    const codeEl = outputEl.querySelector('.solver-output-code');
    if (codeEl) codeEl.textContent = String(TERMINAL_DATA[activeTerminal].value).padStart(2, '0');

    const allResults = document.getElementById('all-terminal-results');
    if (allResults) {
      allResults.innerHTML = TERMINAL_DATA.map(t => `
        <div style="display:flex;justify-content:space-between;align-items:center;
             padding:0.5rem 0;border-bottom:1px solid var(--border-subtle);">
          <div>
            <div style="font-size:0.78rem;font-weight:700;color:var(--text-primary)">${t.label}</div>
            <div style="font-size:0.66rem;color:var(--text-secondary)">${t.desc}</div>
            <div style="font-size:0.62rem;color:var(--text-muted);font-family:monospace">${t.formula}</div>
          </div>
          <div style="font-size:1.5rem;font-weight:900;font-family:monospace;color:var(--neon-green);text-shadow:var(--glow-green)">${String(t.value).padStart(2,'0')}</div>
        </div>`).join('');
    }
  }

  /* ── TERMINAL TABS ────────────────────────────────────── */

  function bindTerminalTabs() {
    document.querySelectorAll('.terminal-tab').forEach((tab, idx) => {
      tab.addEventListener('click', () => {
        activeTerminal = idx;
        document.querySelectorAll('.terminal-tab').forEach((t, i) =>
          t.classList.toggle('active', i === idx));
        computeOutput();
      });
    });
  }

  /* ── RESET ────────────────────────────────────────────── */

  function resetDecoder() {
    selections = [null, null, null];
    updateSlots();
    updateGridHighlight();
    const outputEl = document.getElementById('decoder-output');
    if (outputEl) outputEl.classList.remove('visible');
  }

  /* ── INIT ─────────────────────────────────────────────── */

  function init() {
    const gridEl  = document.getElementById('decoder-grid');
    const slotsEl = document.getElementById('decoder-slots');
    if (!gridEl || !slotsEl) return;
    renderGrid(gridEl);
    renderSlots(slotsEl);
    bindTerminalTabs();
    const resetBtn = document.getElementById('decoder-reset');
    if (resetBtn) resetBtn.addEventListener('click', resetDecoder);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  TerminusDecoder.init();
});

