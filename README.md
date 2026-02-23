# D&D Dice Roller — Polyhedral Dice

A full-featured Dungeons & Dragons polyhedral dice roller with 3D dice rendering, gradient color themes, and all standard D&D dice types.

## Features

### Dice Types
All 7 standard polyhedral dice from a D&D set:
- **D4** (Tetrahedron) — Dagger damage, Bard inspiration
- **D6** (Cube) — Short sword, Fireball, ability score generation
- **D8** (Octahedron) — Longsword, Cure Wounds, Cleric HP
- **D10** (Pentagonal Trapezohedron) — Halberd, Paladin HP
- **D12** (Dodecahedron) — Greataxe, Barbarian HP
- **D20** (Icosahedron) — Attack rolls, saving throws, skill checks
- **D100** (Percentile) — Wild Magic Surge, random tables

### Quick Rolls
One-tap preset rolls for common D&D situations:
- **Attack Roll** — 1d20
- **Advantage** — 2d20, takes highest
- **Disadvantage** — 2d20, takes lowest
- **Death Save** — 1d20 with pass/fail feedback
- **Ability Score** — 4d6 drop lowest
- **Fireball** — 8d6
- **Cure Wounds** — 1d8
- **Wild Magic** — 1d100

### Color Themes
8 gradient color themes inspired by real D&D dice sets:
- Arcane Storm (purple & blue)
- Ocean Depths (sapphire & teal)
- Dragon Fire (crimson & orange)
- Enchanted Forest (emerald & gold)
- Void Black (obsidian & silver)
- Rose Quartz (pink & magenta)
- Golden Dragon (rich gold & amber)
- Glacial Ice (frost white & blue)

### Other Features
- **3D Dice Rendering** — Real polyhedral shapes with rolling animation
- **Dice Notation** — Type standard notation like `2d6+3`, `1d20`, `4d6`
- **Modifier Support** — Add/subtract modifiers from rolls
- **Critical Hit/Fail Detection** — Natural 20 and Natural 1 banners
- **Roll History** — Last 100 rolls saved with timestamps
- **Reference Guide** — D&D dice info, notation guide, key mechanics
- **Dark/Light Mode** — Toggle between themes
- **Sound Effects** — Audio feedback on rolls
- **Persistent State** — Settings saved to localStorage

## How to Use

### Desktop (Recommended)
Open `index.html` directly in a modern browser (Chrome, Firefox, Edge, Safari).

### Local Server
For best experience, serve from a local web server:
```bash
python3 -m http.server 8080
# Then open http://localhost:8080
```

### As a PWA
The app includes a web manifest for installation as a Progressive Web App.

## File Structure
```
DND Dice Roller/
├── index.html          — Main app entry point
├── manifest.json       — PWA manifest
├── README.md           — This file
├── css/
│   └── app.css         — All styles
├── js/
│   ├── state.js        — State management & localStorage
│   ├── dice-data.js    — Dice types, color themes, random rolls
│   ├── dice-3d.js      — Three.js 3D dice rendering
│   ├── ui.js           — UI rendering & event handlers
│   └── app.js          — App initialization
└── icons/
    └── favicon.png     — App icon
```

## D&D Dice Quick Reference

| Die  | Shape                     | Range  | Avg | Common Use                    |
|------|---------------------------|--------|-----|-------------------------------|
| D4   | Tetrahedron               | 1–4    | 2.5 | Dagger, small weapons         |
| D6   | Cube                      | 1–6    | 3.5 | Short sword, Fireball         |
| D8   | Octahedron                | 1–8    | 4.5 | Longsword, Cure Wounds        |
| D10  | Pentagonal Trapezohedron  | 1–10   | 5.5 | Halberd, Paladin HP           |
| D12  | Dodecahedron              | 1–12   | 6.5 | Greataxe, Barbarian HP        |
| D20  | Icosahedron               | 1–20   | 10.5| Attack rolls, saving throws   |
| D100 | Percentile (2×D10)        | 1–100  | 50.5| Wild Magic, random tables     |
