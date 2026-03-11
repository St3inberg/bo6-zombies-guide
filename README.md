# BO6 Zombies Easter Egg Guide

A fully client-side, interactive walkthrough web app for Black Ops 6 Zombies main quest Easter Eggs. No frameworks, no build step — open in any browser or deploy straight to GitHub Pages.

---

## Live Features

| Feature | Detail |
|---|---|
| **Dynamic Checklists** | Tick off each quest step; progress bar updates in real time |
| **LocalStorage Persistence** | Progress survives page refreshes and browser restarts |
| **Sidebar Scroll Spy** | Active section highlights automatically as you read |
| **Stopwatch Timer** | Round timer with lap support; Space-bar shortcut |
| **Symbol Decoder** | Interactive puzzle solver for Terminus computer codes (Terminals A, B, C) |
| **Substep Accordions** | Expand detailed sub-instructions only when needed |
| **Mobile-First Responsive** | Bottom nav on mobile; two-column layout on desktop |
| **Neon-on-Black Theme** | Per-map accent colours (cyan / orange / purple) |

---

## Map Coverage

| Map | Difficulty | Avg Time | Steps |
|---|---|---|---|
| Terminus | ★★★ Hard | 2–3 h | 22 |
| Liberty Falls | ★★☆ Medium | 1.5–2 h | 20 |
| Citadelle des Morts | ★★★ Hard | 3–4 h | 26 |

---

## Project Structure

```
bo6-zombies-guide/
├── index.html              Landing page — map selector
├── terminus.html           Terminus Easter Egg guide
├── liberty-falls.html      Liberty Falls Easter Egg guide
├── citadelle.html          Citadelle des Morts Easter Egg guide
├── css/
│   └── style.css           Global stylesheet (all pages, all themes)
├── js/
│   ├── app.js              Core modules: Checklist, Accordion, Timer, ScrollSpy, Engagement
│   └── terminus-decoder.js Symbol → computer-code puzzle solver (Terminus only)
└── README.md
```

---

## Running Locally

No build step required.

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/bo6-zombies-guide.git
cd bo6-zombies-guide

# Option A — just open the file
start index.html          # Windows
open index.html           # macOS

# Option B — serve with Python for proper MIME types
python -m http.server 8080
# then open http://localhost:8080
```

---

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Set Source to `Deploy from a branch` → `main` branch → `/ (root)`.
4. Click **Save**. Your guide will be live at `https://YOUR_USERNAME.github.io/bo6-zombies-guide/` within ~60 seconds.

No CI, no build pipeline, no `npm install` needed.

---

## Technical Notes

- **localStorage key schema**: `bo6_${mapId}_${stepId}` (e.g. `bo6_terminus_t007`)
- **Visit tracking**: `bo6_visits_${mapId}` — increments each page load
- **ScrollSpy**: Uses `IntersectionObserver` with a `rootMargin` of `-40% 0px -55% 0px`
- **Timer**: 50 ms `setInterval` accumulator; formats to `HH:MM:SS.cc`
- **Terminus Decoder formulas**:
  - Terminal A: `(sym_a + sym_b + sym_c) % 100`
  - Terminal B: `|sym_a × sym_b − sym_c|`
  - Terminal C: `((sym_a + sym_c) × sym_b) % 100`

---

## Lighthouse Targets

Optimised for:
- Performance ≥ 90 (no external scripts/fonts, no render-blocking resources)
- Accessibility ≥ 90 (ARIA roles, labels, keyboard navigation)
- Best Practices ≥ 95
- SEO ≥ 90 (meta descriptions, semantic HTML)

---

## Disclaimer

Fan-made guide. Not affiliated with, endorsed by, or connected to Activision, Treyarch, or any related entities. Black Ops 6 and all associated trademarks are the property of their respective owners.