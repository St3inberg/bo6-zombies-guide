/**
 * BO6 Zombies Guide — Terminus Symbol Decoder
 * 
 * The Terminus Main Quest involves finding glowing symbols around the
 * island and entering corresponding codes on prisoner computers.
 * This decoder converts the 3 symbol sequence into the correct code.
 *
 * Symbol → Number mapping is based on the in-game cipher chart.
 * Each of the 3 computer terminals requires a different code.
 */

const TerminusDecoder = (() => {

  // The 20 symbols found on Terminus Island, each maps to a digit
  const SYMBOLS = [
    { id: 'tri',    glyph: '△',  name: 'Triangle',  value: 1  },
    { id: 'sq',     glyph: '□',  name: 'Square',    value: 2  },
    { id: 'circ',   glyph: '○',  name: 'Circle',    value: 3  },
    { id: 'cross',  glyph: '✕',  name: 'Cross',     value: 4  },
    { id: 'star',   glyph: '★',  name: 'Star',      value: 5  },
    { id: 'hex',    glyph: '⬡',  name: 'Hexagon',   value: 6  },
    { id: 'arrow',  glyph: '➤',  name: 'Arrow',     value: 7  },
    { id: 'wave',   glyph: '〜',  name: 'Wave',      value: 8  },
    { id: 'eye',    glyph: '👁',  name: 'Eye',       value: 9  },
    { id: 'bolt',   glyph: '⚡',  name: 'Bolt',      value: 0  },
    { id: 'skull',  glyph: '☠',  name: 'Skull',     value: 11 },
    { id: 'crown',  glyph: '♛',  name: 'Crown',     value: 12 },
    { id: 'biohaz', glyph: '☣',  name: 'Biohazard', value: 13 },
    { id: 'atom',   glyph: '⚛',  name: 'Atom',      value: 14 },
    { id: 'anchor', glyph: '⚓',  name: 'Anchor',    value: 15 },
    { id: 'drop',   glyph: '💧',  name: 'Drop',      value: 16 },
    { id: 'fire',   glyph: '🔥',  name: 'Flame',     value: 17 },
    { id: 'key',    glyph: '🗝',  name: 'Key',       value: 18 },
    { id: 'moon',   glyph: '☽',  name: 'Crescent',  value: 19 },
    { id: 'sun',    glyph: '☀',  name: 'Sun',       value: 20 },
  ];

  // Each computer terminal uses a specific formula to combine the 3 symbol values
  const TERMINALS = [
    {
      id: 'pc1',
      label: 'Computer A',
      desc: 'Bio-Lab Terminal (underground)',
      formula: (a, b, c) => ((a + b + c) % 100),
      note: 'Sum of all three symbol values, mod 100',
    },
    {
      id: 'pc2',
      label: 'Computer B',
      desc: 'Research Wing Terminal',
      formula: (a, b, c) => Math.abs(a * b - c),
      note: 'A × B minus C (absolute value)',
    },
    {
      id: 'pc3',
      label: 'Computer C',
      desc: 'Control Room Terminal',
      formula: (a, b, c) => ((a + c) * b) % 100,
      note: '(A + C) × B, mod 100',
    },
  ];

  // State: 3 selected slots
  let slots = [null, null, null];
  let activeTerminal = 0;

  /** Render the symbol selection grid */
  function renderGrid(container) {
    container.innerHTML = '';
    SYMBOLS.forEach(sym => {
      const btn  = document.createElement('button');
      btn.className   = 'symbol-btn';
      btn.dataset.id  = sym.id;
      btn.title       = `${sym.name} = ${sym.value}`;
      btn.innerHTML   = `<span class="sym-glyph">${sym.glyph}</span><span>${sym.name}</span>`;
      btn.addEventListener('click', () => onSymbolClick(sym, btn));
      container.appendChild(btn);
    });
    updateGridHighlight();
  }

  /** Render the 3 input slots */
  function renderSlots(container) {
    container.innerHTML = '';
    ['Symbol 1', 'Symbol 2', 'Symbol 3'].forEach((label, idx) => {
      const slot = document.createElement('div');
      slot.className    = 'solver-slot';
      slot.dataset.idx  = idx;
      slot.innerHTML    = `
        <span class="slot-label">${label}</span>
        <span class="slot-symbol">?</span>
        <span class="slot-name">—</span>
        <button class="slot-clear" title="clear">✕</button>
      `;
      slot.querySelector('.slot-clear').addEventListener('click', e => {
        e.stopPropagation();
        clearSlot(idx);
      });
      container.appendChild(slot);
    });
    renderSlotValues(container);
  }

  function clearSlot(idx) {
    slots[idx] = null;
    const container = document.getElementById('decoder-slots');
    if (container) renderSlotValues(container);
    updateGridHighlight();
    computeOutput();
  }

  function renderSlotValues(container) {
    const slotEls = container.querySelectorAll('.solver-slot');
    slotEls.forEach((el, idx) => {
      const sym = slots[idx];
      const symEl  = el.querySelector('.slot-symbol');
      const nameEl = el.querySelector('.slot-name');
      if (sym) {
        el.classList.add('filled');
        symEl.textContent  = sym.glyph;
        nameEl.textContent = `${sym.name} (${sym.value})`;
      } else {
        el.classList.remove('filled');
        symEl.textContent  = '?';
        nameEl.textContent = '—';
      }
    });
  }

  /** When player clicks a symbol glyph */
  function onSymbolClick(sym, btn) {
    // Find first empty slot
    const emptyIdx = slots.findIndex(s => s === null);
    if (emptyIdx === -1) {
      // All filled — replace slot matching this symbol, or first slot
      const existingIdx = slots.findIndex(s => s && s.id === sym.id);
      if (existingIdx !== -1) {
        clearSlot(existingIdx);
      }
      return;
    }
    slots[emptyIdx] = sym;
    const slotsContainer = document.getElementById('decoder-slots');
    if (slotsContainer) renderSlotValues(slotsContainer);
    updateGridHighlight();
    computeOutput();
  }

  function updateGridHighlight() {
    document.querySelectorAll('.symbol-btn').forEach(btn => {
      const symId   = btn.dataset.id;
      const isUsed  = slots.some(s => s && s.id === symId);
      btn.classList.toggle('selected', isUsed);
    });
  }

  /** Compute and display the code for all terminals */
  function computeOutput() {
    const outputEl = document.getElementById('decoder-output');
    if (!outputEl) return;

    if (slots.some(s => s === null)) {
      outputEl.classList.remove('visible');
      return;
    }

    const [a, b, c] = slots.map(s => s.value);
    const terminal  = TERMINALS[activeTerminal];
    const code      = terminal.formula(a, b, c);
    const display   = String(code).padStart(2, '0');

    outputEl.classList.add('visible');
    outputEl.querySelector('.solver-output-code').textContent = display;

    // Also fill all-terminals view if present
    const allResults = document.getElementById('all-terminal-results');
    if (allResults) {
      allResults.innerHTML = TERMINALS.map(t => {
        const v = t.formula(a, b, c);
        return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid var(--border-subtle);">
            <div>
              <div style="font-size:0.78rem;font-weight:700;color:var(--text-primary)">${t.label}</div>
              <div style="font-size:0.68rem;color:var(--text-secondary)">${t.desc}</div>
            </div>
            <div style="font-size:1.5rem;font-weight:900;font-family:monospace;color:var(--neon-green);text-shadow:var(--glow-green)">${String(v).padStart(2,'0')}</div>
          </div>`;
      }).join('');
    }
  }

  /** Terminal tab switcher */
  function bindTerminalTabs() {
    const tabs = document.querySelectorAll('.terminal-tab');
    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => {
        activeTerminal = idx;
        tabs.forEach((t, i) => t.classList.toggle('active', i === idx));
        computeOutput();
      });
    });
  }

  /** Reset decoder */
  function resetDecoder() {
    slots = [null, null, null];
    const slotsContainer = document.getElementById('decoder-slots');
    const gridContainer  = document.getElementById('decoder-grid');
    if (slotsContainer) renderSlotValues(slotsContainer);
    if (gridContainer)  updateGridHighlight();
    const outputEl = document.getElementById('decoder-output');
    if (outputEl) outputEl.classList.remove('visible');
  }

  function init() {
    const gridContainer  = document.getElementById('decoder-grid');
    const slotsContainer = document.getElementById('decoder-slots');
    if (!gridContainer || !slotsContainer) return;

    renderGrid(gridContainer);
    renderSlots(slotsContainer);
    bindTerminalTabs();

    const resetBtn = document.getElementById('decoder-reset');
    if (resetBtn) resetBtn.addEventListener('click', resetDecoder);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  TerminusDecoder.init();
});
