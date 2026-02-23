/**
 * UI Module — D&D Polyhedral Dice Roller
 * Handles all interface rendering and user interaction
 */

const UI = (() => {
  let isRolling = false;
  let dice3DContainer = null;
  let diceRollAudio = null;
  let activeDiceSet = []; // Array of { dieType, count } objects
  let currentTab = 'roller'; // 'roller' | 'history' | 'reference'
  let lastRollData = null;

  // ── Audio ─────────────────────────────────────────────────────────────────

  const audioCtx = (() => {
    try { return new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  })();

  const initAudio = () => {
    if (!diceRollAudio) {
      diceRollAudio = new Audio('sounds/dice-roll.mp3');
      diceRollAudio.volume = 0.5;
    }
  };

  const playRollSound = () => {
    if (!GameState.isSoundEnabled()) return;
    initAudio();
    try { diceRollAudio.currentTime = 0; diceRollAudio.play().catch(() => {}); } catch (e) {}
  };

  const stopRollSound = () => {
    if (diceRollAudio) { try { diceRollAudio.pause(); diceRollAudio.currentTime = 0; } catch (e) {} }
  };

  const playTone = (freq = 800, dur = 100) => {
    if (!GameState.isSoundEnabled() || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.frequency.value = freq; osc.type = 'sine';
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur / 1000);
      osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + dur / 1000);
    } catch (e) {}
  };

  const haptic = (pattern = 'light') => {
    if (!GameState.isHapticEnabled() || !navigator.vibrate) return;
    const p = { light: [10], medium: [20], heavy: [50], success: [50, 100, 50] };
    navigator.vibrate(p[pattern] || p.light);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getTheme = () => DiceData.getColorThemeById(GameState.getDiceColor());

  const getActiveDiceConfigs = () => {
    const configs = [];
    activeDiceSet.forEach(({ dieType, count }) => {
      for (let i = 0; i < count; i++) {
        configs.push({ dieType, result: null });
      }
    });
    return configs;
  };

  const getTotalDiceCount = () => activeDiceSet.reduce((s, d) => s + d.count, 0);

  // ── Main Render ───────────────────────────────────────────────────────────

  const render = () => {
    const app = document.getElementById('app');
    const theme = getTheme();
    const themes = DiceData.getColorThemes();
    const diceTypes = DiceData.getDiceTypes();
    const isDark = GameState.isDarkMode();

    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    app.innerHTML = `
      <div class="app-container">

        <!-- Header -->
        <header class="app-header" style="background: ${theme.preview}">
          <div class="logo">
            <span class="logo-icon">⚔️</span>
            <div>
              <h1>D&D Dice Roller</h1>
              <span class="logo-sub">Polyhedral Dice</span>
            </div>
          </div>
          <div class="header-buttons">
            <button class="icon-button" id="sound-toggle" title="${GameState.isSoundEnabled() ? 'Mute' : 'Unmute'}">
              ${GameState.isSoundEnabled() ? '🔊' : '🔇'}
            </button>
            <button class="icon-button" id="theme-toggle" title="Toggle dark/light mode">
              ${isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        <!-- Tab Navigation -->
        <nav class="tab-nav">
          <button class="tab-btn ${currentTab === 'roller' ? 'active' : ''}" data-tab="roller">🎲 Roller</button>
          <button class="tab-btn ${currentTab === 'history' ? 'active' : ''}" data-tab="history">📜 History</button>
          <button class="tab-btn ${currentTab === 'reference' ? 'active' : ''}" data-tab="reference">📖 Reference</button>
        </nav>

        <!-- Tab Content -->
        <div class="tab-content">
          ${currentTab === 'roller' ? renderRollerTab(theme, themes, diceTypes) : ''}
          ${currentTab === 'history' ? renderHistoryTab() : ''}
          ${currentTab === 'reference' ? renderReferenceTab(diceTypes) : ''}
        </div>

      </div>
    `;

    setupEventListeners();

    if (currentTab === 'roller') {
      dice3DContainer = document.getElementById('dice-3d-canvas');
      if (dice3DContainer) {
        Dice3D.initScene(dice3DContainer);
        refreshDiceDisplay();
      }
    }
  };

  // ── Roller Tab ────────────────────────────────────────────────────────────

  const renderRollerTab = (theme, themes, diceTypes) => {
    const totalCount = getTotalDiceCount();

    return `
      <!-- Color Theme Picker -->
      <div class="card color-picker-card">
        <h2 class="section-title">🎨 Dice Color Theme</h2>
        <div class="color-theme-grid">
          ${themes.map(t => `
            <button
              class="color-theme-btn ${t.id === GameState.getDiceColor() ? 'active' : ''}"
              data-theme-id="${t.id}"
              title="${t.name}: ${t.description}"
            >
              <div class="color-swatch" style="background: ${t.preview}"></div>
              <span class="color-name">${t.name}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- 3D Dice Display -->
      <div class="dice-3d-wrapper">
        <div class="dice-3d-canvas" id="dice-3d-canvas"></div>
      </div>

      <!-- Quick Roll Presets -->
      <div class="card quick-roll-card">
        <div class="quick-roll-header">
          <h2 class="section-title">⚡ Quick Rolls</h2>
          <span class="quick-roll-hint">Tap any card to roll instantly</span>
        </div>
        <div class="quick-roll-grid">

          <button class="quick-roll-btn qr-attack" data-notation="1d20" title="Attack roll or skill check">
            <div class="qr-icon">⚔️</div>
            <div class="qr-label">Attack Roll</div>
            <div class="qr-dice">1d20</div>
            <div class="qr-desc">Hit an enemy or check a skill</div>
          </button>

          <button class="quick-roll-btn qr-advantage" data-notation="2d20" data-mode="advantage" title="Roll 2d20, keep highest">
            <div class="qr-icon">🎯</div>
            <div class="qr-label">Advantage</div>
            <div class="qr-dice">2d20 → keep high</div>
            <div class="qr-desc">Roll twice, use the better result</div>
          </button>

          <button class="quick-roll-btn qr-disadvantage" data-notation="2d20" data-mode="disadvantage" title="Roll 2d20, keep lowest">
            <div class="qr-icon">💀</div>
            <div class="qr-label">Disadvantage</div>
            <div class="qr-dice">2d20 → keep low</div>
            <div class="qr-desc">Roll twice, use the worse result</div>
          </button>

          <button class="quick-roll-btn qr-death" data-notation="1d20" data-death-save="true" title="Death saving throw — 10+ = success">
            <div class="qr-icon">💔</div>
            <div class="qr-label">Death Save</div>
            <div class="qr-dice">1d20</div>
            <div class="qr-desc">10+ = success, 1 = two failures, 20 = stabilize</div>
          </button>

          <button class="quick-roll-btn qr-ability" data-notation="4d6" title="Roll 4d6, drop the lowest die">
            <div class="qr-icon">📊</div>
            <div class="qr-label">Ability Score</div>
            <div class="qr-dice">4d6 drop lowest</div>
            <div class="qr-desc">Character creation — STR, DEX, CON, etc.</div>
          </button>

          <button class="quick-roll-btn qr-fireball" data-notation="8d6" title="Fireball spell — 8d6 fire damage">
            <div class="qr-icon">🔥</div>
            <div class="qr-label">Fireball</div>
            <div class="qr-dice">8d6 fire damage</div>
            <div class="qr-desc">3rd-level spell, 20-ft radius explosion</div>
          </button>

          <button class="quick-roll-btn qr-heal" data-notation="1d8" title="Cure Wounds — 1d8 + spellcasting modifier">
            <div class="qr-icon">💚</div>
            <div class="qr-label">Cure Wounds</div>
            <div class="qr-dice">1d8 + modifier</div>
            <div class="qr-desc">Healing spell — add your spellcasting mod</div>
          </button>

          <button class="quick-roll-btn qr-wild" data-notation="1d100" title="Wild Magic Surge — 1-2 on d100 triggers surge">
            <div class="qr-icon">🌀</div>
            <div class="qr-label">Wild Magic</div>
            <div class="qr-dice">1d100 percentile</div>
            <div class="qr-desc">1-2 = surge, check the Wild Magic table</div>
          </button>

          <button class="quick-roll-btn qr-sneak" data-notation="2d6" title="Sneak Attack (level 1 Rogue) — 1d6 per 2 levels">
            <div class="qr-icon">🗡️</div>
            <div class="qr-label">Sneak Attack</div>
            <div class="qr-dice">2d6 bonus damage</div>
            <div class="qr-desc">Rogue — needs advantage or ally adjacent</div>
          </button>

          <button class="quick-roll-btn qr-initiative" data-notation="1d20" data-initiative="true" title="Initiative — determines turn order in combat">
            <div class="qr-icon">🏃</div>
            <div class="qr-label">Initiative</div>
            <div class="qr-dice">1d20 + DEX mod</div>
            <div class="qr-desc">Start of combat — add your DEX modifier</div>
          </button>

          <button class="quick-roll-btn qr-greataxe" data-notation="1d12" title="Greataxe damage — Barbarian's weapon">
            <div class="qr-icon">🪓</div>
            <div class="qr-label">Greataxe</div>
            <div class="qr-dice">1d12 slashing</div>
            <div class="qr-desc">Barbarian's weapon — highest single die</div>
          </button>

          <button class="quick-roll-btn qr-longsword" data-notation="1d8" title="Longsword damage — versatile weapon">
            <div class="qr-icon">🗡️</div>
            <div class="qr-label">Longsword</div>
            <div class="qr-dice">1d8 slashing</div>
            <div class="qr-desc">One-handed (1d8) or two-handed (1d10)</div>
          </button>

        </div>
      </div>

      <!-- Dice Notation Input -->
      <div class="card notation-card">
        <h2 class="section-title">📝 Custom Roll</h2>
        <p class="section-description">Type standard dice notation — e.g. <code>2d6+3</code>, <code>1d20</code>, <code>4d6</code></p>
        <div class="notation-input-row">
          <input
            type="text"
            id="notation-input"
            class="notation-input"
            placeholder="e.g. 2d6+3 or 1d20"
            value="${buildNotationString()}"
            autocomplete="off"
            spellcheck="false"
          />
          <button class="notation-parse-btn" id="parse-notation-btn">Roll</button>
        </div>
        <div class="notation-examples">
          <span class="notation-chip" data-notation="1d20">1d20</span>
          <span class="notation-chip" data-notation="2d6+3">2d6+3</span>
          <span class="notation-chip" data-notation="4d6">4d6</span>
          <span class="notation-chip" data-notation="1d8+5">1d8+5</span>
          <span class="notation-chip" data-notation="3d10">3d10</span>
        </div>
      </div>

      <!-- Dice Selector -->
      <div class="card dice-selector-card">
        <div class="dice-selector-header">
          <div>
            <h2 class="section-title">🎲 Build Your Roll</h2>
            <p class="section-description">Tap a die to add it — tap the count badge to remove</p>
          </div>
          <button class="clear-btn" id="clear-dice-btn" ${totalCount === 0 ? 'disabled' : ''}>Clear All</button>
        </div>
        <div class="dice-type-grid">
          ${diceTypes.map(die => {
            const entry = activeDiceSet.find(d => d.dieType === die.id);
            const count = entry ? entry.count : 0;
            return `
              <div class="die-selector-item ${count > 0 ? 'active' : ''}" data-die-type="${die.id}">
                <button class="die-add-btn" data-die-type="${die.id}" title="${die.label}: ${die.description}">
                  <div class="die-shape-icon die-shape-${die.id}" style="--die-color: ${die.color}">
                    <span class="die-label">${die.label}</span>
                  </div>
                </button>
                ${count > 0 ? `
                  <div class="die-count-controls">
                    <button class="die-count-minus" data-die-type="${die.id}" title="Remove one ${die.label}">−</button>
                    <span class="die-count">${count}</span>
                    <button class="die-count-plus" data-die-type="${die.id}" title="Add one ${die.label}">+</button>
                  </div>
                ` : `<span class="die-type-label">${die.label}</span>`}
                <span class="die-use-hint">${getDieHint(die.id)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Modifier Row -->
      <div class="card modifier-card">
        <div class="modifier-header">
          <div>
            <h2 class="section-title">➕ Modifier</h2>
            <p class="section-description">Add your ability score bonus, proficiency, or spell modifier</p>
          </div>
        </div>
        <div class="modifier-row">
          <button class="mod-btn" id="mod-minus">−</button>
          <span class="modifier-display" id="modifier-display">
            ${buildModifierDisplay()}
          </span>
          <button class="mod-btn" id="mod-plus">+</button>
          <button class="mod-reset" id="mod-reset">Reset</button>
        </div>
        <div class="modifier-presets">
          <span class="mod-preset-label">Common modifiers:</span>
          ${[-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10].map(n => `
            <button class="mod-preset-btn ${modifier === n ? 'active' : ''}" data-mod="${n}">${n >= 0 ? '+' : ''}${n}</button>
          `).join('')}
        </div>
      </div>

      <!-- Roll Button -->
      <div class="roll-section">
        <button
          class="roll-button ${isRolling ? 'rolling' : ''}"
          id="roll-button"
          ${totalCount === 0 ? 'disabled' : ''}
        >
          <span class="roll-btn-icon">🎲</span>
          <span class="roll-btn-text">
            ${isRolling ? 'Rolling...' : totalCount === 0 ? 'Select Dice Above' : `Roll ${buildRollLabel()}`}
          </span>
        </button>
      </div>

      <!-- Roll Again Button (shown after a roll) -->
      ${lastRollData ? `
      <div class="roll-again-section">
        <button class="roll-again-btn" id="roll-again-btn" ${totalCount === 0 ? 'disabled' : ''}>
          🔄 Roll Again
        </button>
      </div>
      ` : ''}

      <!-- Results Panel -->
      <div class="results-panel" id="results-panel">
        ${lastRollData ? renderResultsContent(lastRollData) : ''}
      </div>
    `;
  };

  // Short contextual hint for each die type shown under the die button
  const getDieHint = (dieType) => {
    const hints = {
      d4:   'Dagger · Magic Missile',
      d6:   'Short Sword · Fireball',
      d8:   'Longsword · Cure Wounds',
      d10:  'Halberd · Paladin HP',
      d12:  'Greataxe · Barbarian',
      d20:  'Attacks · Skill Checks',
      d100: 'Wild Magic · Tables'
    };
    return hints[dieType] || '';
  };

  // ── History Tab ───────────────────────────────────────────────────────────

  const renderHistoryTab = () => {
    const history = GameState.getRollHistory();
    return `
      <div class="card history-card">
        <div class="history-header">
          <h2 class="section-title">📜 Roll History</h2>
          ${history.length > 0 ? `<button class="clear-btn" id="clear-history-btn">Clear</button>` : ''}
        </div>
        ${history.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🎲</div>
            <p>No rolls yet. Start rolling!</p>
          </div>
        ` : `
          <div class="history-list">
            ${history.slice(0, 50).map((roll, i) => {
              const hasCrit = roll.results && roll.results.some(r => r.dieType === 'd20' && r.value === 20 && !r.dropped);
              const hasFumble = roll.results && roll.results.some(r => r.dieType === 'd20' && r.value === 1 && !r.dropped);
              return `
              <div class="history-item ${hasCrit ? 'history-crit' : ''} ${hasFumble ? 'history-fumble' : ''}">
                <div class="history-item-header">
                  <span class="history-notation">${roll.notation || 'Custom Roll'}</span>
                  <span class="history-time">${formatTime(roll.timestamp)}</span>
                </div>
                ${roll.specialNote ? `<div class="history-special-note">${roll.specialNote}</div>` : ''}
                <div class="history-results">
                  ${roll.results ? roll.results.map(r => `
                    <span class="history-die-result ${r.dropped ? 'history-dropped' : ''}" style="--die-color: ${DiceData.getDiceById(r.dieType)?.color || '#888'}">
                      ${r.dieType.toUpperCase()}: <strong>${r.value}</strong>${r.dropped ? ' ✗' : ''}
                    </span>
                  `).join('') : ''}
                  ${roll.modifier && roll.modifier !== 0 ? `
                    <span class="history-modifier">${roll.modifier > 0 ? '+' : ''}${roll.modifier}</span>
                  ` : ''}
                  <span class="history-total ${hasCrit ? 'history-total-crit' : ''} ${hasFumble ? 'history-total-fumble' : ''}">
                    = <strong>${roll.total}</strong>
                    ${hasCrit ? ' ⭐' : ''}${hasFumble ? ' 💀' : ''}
                  </span>
                </div>
              </div>
            `}).join('')}
          </div>
        `}
      </div>
    `;
  };

  // ── Reference Tab ─────────────────────────────────────────────────────────

  const renderReferenceTab = (diceTypes) => {
    return `
      <div class="reference-container">

        <!-- Hero intro for non-DnD players -->
        <div class="card ref-intro-card">
          <h2 class="section-title">📖 D&D Dice — The Complete Guide</h2>
          <p class="ref-intro-text">
            In Dungeons &amp; Dragons, you roll different shaped dice to determine what happens in the game.
            Every action — attacking a goblin, picking a lock, casting a spell — is resolved by rolling dice
            and adding your character's bonuses. Higher is almost always better.
          </p>
          <div class="ref-how-it-works">
            <div class="ref-how-step">
              <div class="ref-how-num">1</div>
              <div>Your DM asks for a roll — e.g. <em>"Roll a Perception check"</em></div>
            </div>
            <div class="ref-how-step">
              <div class="ref-how-num">2</div>
              <div>You roll the die they specify (usually a d20 for checks)</div>
            </div>
            <div class="ref-how-step">
              <div class="ref-how-num">3</div>
              <div>Add your relevant ability modifier (e.g. +3 Wisdom)</div>
            </div>
            <div class="ref-how-step">
              <div class="ref-how-num">4</div>
              <div>Compare to the Difficulty Class (DC) — meet or beat it to succeed</div>
            </div>
          </div>
        </div>

        <!-- Each die type -->
        ${diceTypes.map(die => `
          <div class="card reference-card">
            <div class="reference-header">
              <div class="ref-die-icon die-shape-${die.id}" style="--die-color: ${die.color}">
                <span class="die-label">${die.label}</span>
              </div>
              <div class="reference-info">
                <h3 class="ref-die-name">${die.label} — ${capitalize(die.shape)}</h3>
                <p class="ref-die-desc">${die.description}</p>
                <div class="ref-stats-row">
                  <span class="ref-stat">Range: <strong>1–${die.sides}</strong></span>
                  <span class="ref-stat">Average: <strong>${((die.sides + 1) / 2).toFixed(1)}</strong></span>
                  <span class="ref-stat">Faces: <strong>${die.sides}</strong></span>
                </div>
              </div>
            </div>
            <div class="ref-uses">
              <strong>When to roll this die:</strong>
              <div class="ref-uses-chips">
                ${die.uses.map(u => `<span class="ref-use-chip">${u}</span>`).join('')}
              </div>
            </div>
            <button class="ref-roll-btn" data-notation="1${die.id}" title="Roll a ${die.label} now">
              Roll a ${die.label} →
            </button>
          </div>
        `).join('')}

        <!-- D&D Notation Guide -->
        <div class="card">
          <h2 class="section-title">📝 Reading Dice Notation</h2>
          <p class="section-description">Dice are written as <strong>XdY</strong> — X dice with Y sides each</p>
          <div class="notation-guide">
            <div class="notation-example">
              <code>1d20</code>
              <div>
                <strong>One 20-sided die</strong>
                <span>Used for attack rolls, saving throws, skill checks</span>
              </div>
            </div>
            <div class="notation-example">
              <code>2d6+3</code>
              <div>
                <strong>Two 6-sided dice, add 3</strong>
                <span>Shortsword damage with +3 Strength modifier</span>
              </div>
            </div>
            <div class="notation-example">
              <code>8d6</code>
              <div>
                <strong>Eight 6-sided dice</strong>
                <span>Fireball spell — roll all 8, add them up</span>
              </div>
            </div>
            <div class="notation-example">
              <code>4d6 drop lowest</code>
              <div>
                <strong>Roll 4d6, ignore the lowest</strong>
                <span>Ability score generation during character creation</span>
              </div>
            </div>
            <div class="notation-example">
              <code>2d20 advantage</code>
              <div>
                <strong>Roll 2d20, take the higher</strong>
                <span>When you have advantage (favorable conditions)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Key Mechanics -->
        <div class="card">
          <h2 class="section-title">⚔️ Key D&D 5e Mechanics</h2>
          <div class="mechanics-grid">
            <div class="mechanic-item">
              <div class="mechanic-icon">🎯</div>
              <h4>Advantage</h4>
              <p>Roll 2d20, take the <strong>higher</strong> result. Granted when you have a favorable position, spell, or ability.</p>
            </div>
            <div class="mechanic-item">
              <div class="mechanic-icon">💀</div>
              <h4>Disadvantage</h4>
              <p>Roll 2d20, take the <strong>lower</strong> result. Occurs when you're blinded, restrained, or in an unfavorable situation.</p>
            </div>
            <div class="mechanic-item">
              <div class="mechanic-icon">⭐</div>
              <h4>Critical Hit</h4>
              <p>Roll a <strong>Natural 20</strong> on an attack. You automatically hit and roll all damage dice <em>twice</em>.</p>
            </div>
            <div class="mechanic-item">
              <div class="mechanic-icon">💔</div>
              <h4>Critical Fail</h4>
              <p>Roll a <strong>Natural 1</strong> on an attack. You automatically miss, regardless of your bonuses.</p>
            </div>
            <div class="mechanic-item">
              <div class="mechanic-icon">🛡️</div>
              <h4>Saving Throw</h4>
              <p>Roll 1d20 + ability modifier to resist a spell or effect. Meet or beat the caster's <strong>Spell Save DC</strong>.</p>
            </div>
            <div class="mechanic-item">
              <div class="mechanic-icon">🔍</div>
              <h4>Skill Check</h4>
              <p>Roll 1d20 + ability modifier (+ proficiency if trained). Meet or beat the <strong>Difficulty Class (DC)</strong> set by the DM.</p>
            </div>
            <div class="mechanic-item">
              <div class="mechanic-icon">💀</div>
              <h4>Death Saving Throw</h4>
              <p>When at 0 HP, roll 1d20 each turn. <strong>10+</strong> = success. <strong>1</strong> = two failures. <strong>20</strong> = stabilize. 3 successes = stable. 3 failures = dead.</p>
            </div>
            <div class="mechanic-item">
              <div class="mechanic-icon">🎲</div>
              <h4>Proficiency Bonus</h4>
              <p>Added to rolls you're trained in. Starts at <strong>+2</strong> at level 1, increases to <strong>+6</strong> at level 17+.</p>
            </div>
          </div>
        </div>

        <!-- Difficulty Classes Reference -->
        <div class="card">
          <h2 class="section-title">🎯 Difficulty Class (DC) Reference</h2>
          <p class="section-description">When your DM asks for a roll, this is roughly what the target number means</p>
          <div class="dc-table">
            <div class="dc-row dc-header">
              <span>DC</span><span>Difficulty</span><span>Example</span>
            </div>
            <div class="dc-row"><span class="dc-num">5</span><span class="dc-label easy">Very Easy</span><span>Notice a large, obvious creature</span></div>
            <div class="dc-row"><span class="dc-num">10</span><span class="dc-label easy">Easy</span><span>Climb a knotted rope</span></div>
            <div class="dc-row"><span class="dc-num">15</span><span class="dc-label medium">Medium</span><span>Pick a simple lock</span></div>
            <div class="dc-row"><span class="dc-num">20</span><span class="dc-label hard">Hard</span><span>Swim against a strong current</span></div>
            <div class="dc-row"><span class="dc-num">25</span><span class="dc-label hard">Very Hard</span><span>Break down a reinforced door</span></div>
            <div class="dc-row"><span class="dc-num">30</span><span class="dc-label deadly">Nearly Impossible</span><span>Track a creature through running water</span></div>
          </div>
        </div>

        <!-- Common Ability Score Modifiers -->
        <div class="card">
          <h2 class="section-title">📊 Ability Score → Modifier</h2>
          <p class="section-description">Add this modifier to your d20 rolls when using that ability</p>
          <div class="ability-table">
            <div class="ability-row ability-header">
              <span>Score</span><span>Modifier</span><span>Description</span>
            </div>
            ${[
              [1, '-5', 'Severely impaired'],
              [4, '-3', 'Very poor'],
              [6, '-2', 'Poor'],
              [8, '-1', 'Below average'],
              [10, '+0', 'Average human'],
              [12, '+1', 'Above average'],
              [14, '+2', 'Talented'],
              [16, '+3', 'Exceptional'],
              [18, '+4', 'Remarkable (max at creation)'],
              [20, '+5', 'Legendary'],
            ].map(([score, mod, desc]) => `
              <div class="ability-row">
                <span class="ability-score">${score}–${parseInt(score)+1}</span>
                <span class="ability-mod ${parseInt(mod) >= 0 ? 'mod-pos' : 'mod-neg'}">${mod}</span>
                <span class="ability-desc">${desc}</span>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  };

  // ── State Helpers ─────────────────────────────────────────────────────────

  let modifier = 0;

  const buildNotationString = () => {
    if (activeDiceSet.length === 0) return '';
    const parts = activeDiceSet.map(d => `${d.count}${d.dieType}`);
    let str = parts.join('+');
    if (modifier > 0) str += `+${modifier}`;
    else if (modifier < 0) str += modifier;
    return str;
  };

  const buildModifierDisplay = () => {
    if (modifier === 0) return 'No modifier';
    return modifier > 0 ? `+${modifier}` : `${modifier}`;
  };

  const buildRollLabel = () => {
    const parts = activeDiceSet.map(d => `${d.count}${d.dieType.toUpperCase()}`);
    let label = parts.join(' + ');
    if (modifier > 0) label += ` + ${modifier}`;
    else if (modifier < 0) label += ` ${modifier}`;
    return label;
  };

  const parseNotation = (str) => {
    str = str.trim().toLowerCase().replace(/\s+/g, '');
    const diceRegex = /(\d+)d(\d+)/g;
    const modRegex = /[+-]\d+$/;

    const newDiceSet = [];
    let match;
    while ((match = diceRegex.exec(str)) !== null) {
      const count = parseInt(match[1]);
      const sides = parseInt(match[2]);
      const dieType = `d${sides}`;
      if (DiceData.getDiceById(dieType)) {
        newDiceSet.push({ dieType, count: Math.min(count, 10) });
      }
    }

    const modMatch = str.match(modRegex);
    const newMod = modMatch ? parseInt(modMatch[0]) : 0;

    return { diceSet: newDiceSet, modifier: newMod };
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');

  // ── 3D Display ────────────────────────────────────────────────────────────

  const refreshDiceDisplay = () => {
    const theme = getTheme();
    const configs = getActiveDiceConfigs();

    if (configs.length === 0) {
      const defaultConfigs = [
        { dieType: 'd20', result: null },
        { dieType: 'd6', result: null },
        { dieType: 'd12', result: null }
      ];
      Dice3D.addDice(defaultConfigs, theme);
    } else {
      Dice3D.addDice(configs, theme);
    }
  };

  // ── Roll Logic ────────────────────────────────────────────────────────────

  const performRoll = async () => {
    if (isRolling || getTotalDiceCount() === 0) return;
    isRolling = true;
    render();

    playRollSound();
    playTone(400, 100);
    haptic('medium');

    const results = [];
    activeDiceSet.forEach(({ dieType, count }) => {
      const diceInfo = DiceData.getDiceById(dieType);
      for (let i = 0; i < count; i++) {
        const value = DiceData.rollDie(diceInfo.sides);
        results.push({ dieType, value });
      }
    });

    const diceTotal = results.reduce((s, r) => s + r.value, 0);
    const total = diceTotal + modifier;
    const notation = buildNotationString();

    const rollData = { results, modifier, total, notation, timestamp: Date.now() };
    GameState.setLastRoll(rollData);

    const theme = getTheme();
    const configs = results.map(r => ({ dieType: r.dieType, result: r.value }));
    Dice3D.addDice(configs, theme);

    await new Promise(r => setTimeout(r, 400));
    if (Dice3D.isInitialized()) await Dice3D.rollDice();

    stopRollSound();
    playTone(800, 150);
    haptic('success');
    isRolling = false;

    showResults(rollData);
    render();
  };

  const renderResultsContent = (rollData) => {
    if (!rollData) return '';
    const { results, modifier, total, notation, specialNote } = rollData;

    const activeD20Results = results.filter(r => r.dieType === 'd20' && !r.dropped);
    const hasCrit = activeD20Results.some(r => r.value === 20);
    const hasFumble = activeD20Results.some(r => r.value === 1);

    let specialBanner = '';
    if (hasCrit) {
      specialBanner = `
        <div class="special-banner crit">
          <span class="banner-icon">⭐</span>
          <div>
            <strong>CRITICAL HIT!</strong>
            <span>Natural 20 — you automatically hit! Double your damage dice.</span>
          </div>
        </div>`;
    } else if (hasFumble) {
      specialBanner = `
        <div class="special-banner fumble">
          <span class="banner-icon">💀</span>
          <div>
            <strong>CRITICAL FAIL!</strong>
            <span>Natural 1 — you automatically miss, no matter your bonuses.</span>
          </div>
        </div>`;
    }

    return `
      <div class="card results-card">
        ${specialBanner}
        <div class="results-header">
          <h2 class="results-title">Roll Results</h2>
          <span class="results-notation">${notation}</span>
        </div>
        ${specialNote ? `<div class="special-note"><span class="special-note-icon">ℹ️</span> ${specialNote}</div>` : ''}
        <div class="individual-results">
          ${results.map(r => {
            const dieInfo = DiceData.getDiceById(r.dieType);
            const isCrit = r.dieType === 'd20' && r.value === 20 && !r.dropped;
            const isFumble = r.dieType === 'd20' && r.value === 1 && !r.dropped;
            const isHigh = !r.dropped && dieInfo && r.value === dieInfo.sides; // max roll
            return `
              <div class="result-die-card ${isCrit ? 'result-crit' : ''} ${isFumble ? 'result-fumble' : ''} ${r.dropped ? 'result-dropped' : ''} ${isHigh && !isCrit ? 'result-high' : ''}">
                <div class="result-die-shape die-shape-${r.dieType}" style="--die-color: ${r.dropped ? '#555' : (dieInfo?.color || '#888')}">
                  <span class="die-label">${r.dieType.toUpperCase()}</span>
                </div>
                <div class="result-value ${isCrit ? 'crit-value' : ''} ${isFumble ? 'fumble-value' : ''} ${r.dropped ? 'dropped-value' : ''}">${r.value}</div>
                ${isCrit ? '<div class="result-tag crit-tag">CRIT!</div>' : ''}
                ${isFumble ? '<div class="result-tag fumble-tag">FAIL!</div>' : ''}
                ${r.dropped ? '<div class="result-tag dropped-tag">DROPPED</div>' : ''}
                ${isHigh && !isCrit ? '<div class="result-tag high-tag">MAX!</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>
        ${modifier !== 0 ? `
          <div class="modifier-line">
            Dice total: <strong>${results.filter(r => !r.dropped).reduce((s, r) => s + r.value, 0)}</strong>
            &nbsp;+&nbsp; Modifier: <strong>${modifier > 0 ? '+' : ''}${modifier}</strong>
          </div>
        ` : ''}
        <div class="total-line">
          Total: <strong class="total-value ${hasCrit ? 'total-crit' : ''} ${hasFumble ? 'total-fumble' : ''}">${total}</strong>
        </div>
      </div>
    `;
  };

  const showResults = (rollData) => {
    lastRollData = rollData;
    const panel = document.getElementById('results-panel');
    if (!panel) return;
    panel.innerHTML = renderResultsContent(rollData);
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // ── Event Listeners ───────────────────────────────────────────────────────

  const setupEventListeners = () => {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        playTone(600, 50);
        render();
      });
    });

    // Sound toggle
    document.getElementById('sound-toggle')?.addEventListener('click', () => {
      GameState.toggleSound();
      render();
    });

    // Theme toggle (dark/light)
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      GameState.setDarkMode(!GameState.isDarkMode());
      playTone(700, 50);
      render();
    });

    // Color theme buttons
    document.querySelectorAll('.color-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const themeId = btn.dataset.themeId;
        GameState.setDiceColor(themeId);
        playTone(700, 50);
        haptic('light');
        Dice3D.updateTheme(DiceData.getColorThemeById(themeId));
        render();
      });
    });

    // Die add buttons
    document.querySelectorAll('.die-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dieType = btn.dataset.dieType;
        addDie(dieType);
        playTone(700, 50);
        haptic('light');
        render();
      });
    });

    // Die count controls
    document.querySelectorAll('.die-count-plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addDie(btn.dataset.dieType);
        playTone(700, 50);
        haptic('light');
        render();
      });
    });

    document.querySelectorAll('.die-count-minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeDie(btn.dataset.dieType);
        playTone(500, 50);
        haptic('light');
        render();
      });
    });

    // Clear all dice
    document.getElementById('clear-dice-btn')?.addEventListener('click', () => {
      activeDiceSet = [];
      modifier = 0;
      playTone(400, 80);
      haptic('light');
      render();
    });

    // Modifier controls
    document.getElementById('mod-plus')?.addEventListener('click', () => {
      modifier++;
      playTone(700, 40);
      updateModifierDisplay();
      updateNotationInput();
    });

    document.getElementById('mod-minus')?.addEventListener('click', () => {
      modifier--;
      playTone(500, 40);
      updateModifierDisplay();
      updateNotationInput();
    });

    document.getElementById('mod-reset')?.addEventListener('click', () => {
      modifier = 0;
      playTone(600, 40);
      updateModifierDisplay();
      updateNotationInput();
    });

    // Modifier preset buttons
    document.querySelectorAll('.mod-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modifier = parseInt(btn.dataset.mod);
        playTone(650, 40);
        updateModifierDisplay();
        updateNotationInput();
        // Update active state
        document.querySelectorAll('.mod-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Notation input
    document.getElementById('parse-notation-btn')?.addEventListener('click', () => {
      const input = document.getElementById('notation-input');
      if (input) {
        const { diceSet, modifier: newMod } = parseNotation(input.value);
        if (diceSet.length > 0) {
          activeDiceSet = diceSet;
          modifier = newMod;
          playTone(700, 80);
          haptic('medium');
          render();
          // Auto-roll after parsing
          setTimeout(() => performRoll(), 100);
        }
      }
    });

    document.getElementById('notation-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('parse-notation-btn')?.click();
      }
    });

    // Notation chips
    document.querySelectorAll('.notation-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const input = document.getElementById('notation-input');
        if (input) {
          input.value = chip.dataset.notation;
          document.getElementById('parse-notation-btn')?.click();
        }
      });
    });

    // Roll button
    document.getElementById('roll-button')?.addEventListener('click', performRoll);

    // Roll Again button
    document.getElementById('roll-again-btn')?.addEventListener('click', () => {
      performRoll();
    });

    // Quick Roll buttons
    document.querySelectorAll('.quick-roll-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const notation = btn.dataset.notation;
        const mode = btn.dataset.mode;
        const isDeathSave = btn.dataset.deathSave === 'true';
        const isAbilityScore = notation === '4d6';
        const isInitiative = btn.dataset.initiative === 'true';
        playTone(700, 80);
        haptic('medium');
        performQuickRoll(notation, mode, isDeathSave, isAbilityScore, isInitiative);
      });
    });

    // Reference tab "Roll a DX" buttons
    document.querySelectorAll('.ref-roll-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const notation = btn.dataset.notation;
        currentTab = 'roller';
        const { diceSet } = parseNotation(notation);
        if (diceSet.length > 0) {
          activeDiceSet = diceSet;
          modifier = 0;
        }
        render();
        setTimeout(() => performRoll(), 200);
      });
    });

    // Clear history
    document.getElementById('clear-history-btn')?.addEventListener('click', () => {
      GameState.clearHistory();
      render();
    });
  };

  // ── Quick Roll Logic ─────────────────────────────────────────────────────

  const performQuickRoll = async (notation, mode, isDeathSave, isAbilityScore, isInitiative) => {
    if (isRolling) return;
    isRolling = true;

    const { diceSet } = parseNotation(notation);
    if (diceSet.length === 0) { isRolling = false; return; }

    playRollSound();
    playTone(400, 100);
    haptic('medium');

    const results = [];
    diceSet.forEach(({ dieType, count }) => {
      const diceInfo = DiceData.getDiceById(dieType);
      for (let i = 0; i < count; i++) {
        const value = DiceData.rollDie(diceInfo.sides);
        results.push({ dieType, value });
      }
    });

    let total = results.reduce((s, r) => s + r.value, 0);
    let displayNotation = notation;
    let specialNote = '';

    // Advantage
    if (mode === 'advantage' && results.length === 2 && results[0].dieType === 'd20') {
      const vals = results.map(r => r.value);
      const high = Math.max(...vals);
      const low = Math.min(...vals);
      total = high;
      displayNotation = '2d20 (Advantage)';
      specialNote = `Rolled ${vals[0]} and ${vals[1]} — kept the higher: ${high}`;
      let dropped = false;
      results.forEach(r => {
        if (!dropped && r.value === low) { r.dropped = true; dropped = true; }
      });
    }

    // Disadvantage
    if (mode === 'disadvantage' && results.length === 2 && results[0].dieType === 'd20') {
      const vals = results.map(r => r.value);
      const high = Math.max(...vals);
      const low = Math.min(...vals);
      total = low;
      displayNotation = '2d20 (Disadvantage)';
      specialNote = `Rolled ${vals[0]} and ${vals[1]} — kept the lower: ${low}`;
      let dropped = false;
      results.forEach(r => {
        if (!dropped && r.value === high) { r.dropped = true; dropped = true; }
      });
    }

    // Ability score (4d6 drop lowest)
    if (isAbilityScore && results.length === 4) {
      const sorted = [...results].sort((a, b) => a.value - b.value);
      sorted[0].dropped = true;
      total = results.filter(r => !r.dropped).reduce((s, r) => s + r.value, 0);
      displayNotation = '4d6 (Ability Score)';
      specialNote = `Dropped lowest (${sorted[0].value}) — Ability Score: ${total}`;
      if (total >= 16) specialNote += ' 🌟 Excellent!';
      else if (total <= 8) specialNote += ' — Consider rerolling';
    }

    // Death save
    if (isDeathSave && results.length === 1 && results[0].dieType === 'd20') {
      const val = results[0].value;
      if (val === 20) specialNote = '🌟 STABILIZE! Natural 20 — you regain 1 HP and are no longer dying!';
      else if (val === 1) specialNote = '💀 CRITICAL FAIL — counts as two death save failures!';
      else if (val >= 10) specialNote = `✅ SUCCESS (${val} ≥ 10) — mark 1 success. Need 3 to stabilize.`;
      else specialNote = `❌ FAILURE (${val} < 10) — mark 1 failure. 3 failures = death.`;
      displayNotation = '1d20 (Death Save)';
    }

    // Initiative
    if (isInitiative && results.length === 1 && results[0].dieType === 'd20') {
      displayNotation = '1d20 (Initiative)';
      specialNote = `Initiative: ${total} — add your DEX modifier to this number`;
    }

    const rollData = { results, modifier: 0, total, notation: displayNotation, specialNote, timestamp: Date.now() };
    GameState.setLastRoll(rollData);

    const theme = getTheme();
    const configs = results.map(r => ({ dieType: r.dieType, result: r.value }));
    Dice3D.addDice(configs, theme);

    await new Promise(r => setTimeout(r, 400));
    if (Dice3D.isInitialized()) await Dice3D.rollDice();

    stopRollSound();
    playTone(800, 150);
    haptic('success');
    isRolling = false;

    showResults(rollData);
    render();
  };

  const addDie = (dieType) => {
    const existing = activeDiceSet.find(d => d.dieType === dieType);
    if (existing) {
      if (existing.count < 10) existing.count++;
    } else {
      activeDiceSet.push({ dieType, count: 1 });
    }
    refreshDiceDisplay();
  };

  const removeDie = (dieType) => {
    const idx = activeDiceSet.findIndex(d => d.dieType === dieType);
    if (idx === -1) return;
    if (activeDiceSet[idx].count > 1) {
      activeDiceSet[idx].count--;
    } else {
      activeDiceSet.splice(idx, 1);
    }
    refreshDiceDisplay();
  };

  const updateModifierDisplay = () => {
    const el = document.getElementById('modifier-display');
    if (el) el.textContent = buildModifierDisplay();
  };

  const updateNotationInput = () => {
    const el = document.getElementById('notation-input');
    if (el) el.value = buildNotationString();
  };

  return { render };
})();
