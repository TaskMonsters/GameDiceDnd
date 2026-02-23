/**
 * DND Dice Data Module
 * Defines all polyhedral dice types and color gradient themes
 */

const DiceData = (() => {

  // All standard DND polyhedral dice
  const DICE_TYPES = [
    {
      id: 'd4',
      label: 'D4',
      sides: 4,
      shape: 'tetrahedron',
      description: 'Damage for daggers, slings, small weapons',
      uses: ['Dagger damage', 'Sling damage', 'Bard inspiration (lv 1-4)', 'Healing Word'],
      icon: '▲',
      color: '#f59e0b'
    },
    {
      id: 'd6',
      label: 'D6',
      sides: 6,
      shape: 'cube',
      description: 'Short swords, maces, Fireball spell, character stats',
      uses: ['Short sword damage', 'Fireball (multiple)', 'Wizard/Sorcerer HP', 'Ability score generation'],
      icon: '⬛',
      color: '#10b981'
    },
    {
      id: 'd8',
      label: 'D8',
      sides: 8,
      shape: 'octahedron',
      description: 'Longswords, rapiers, Cure Wounds spell',
      uses: ['Longsword damage', 'Rapier damage', 'Cure Wounds', 'Cleric/Druid/Monk HP'],
      icon: '◆',
      color: '#3b82f6'
    },
    {
      id: 'd10',
      label: 'D10',
      sides: 10,
      shape: 'pentagonal-trapezohedron',
      description: 'Heavy weapons, higher-level spells, Paladin/Fighter HP',
      uses: ['Halberd damage', 'Glaive damage', 'Paladin/Fighter HP', 'High-level spells'],
      icon: '⬟',
      color: '#8b5cf6'
    },
    {
      id: 'd12',
      label: 'D12',
      sides: 12,
      shape: 'dodecahedron',
      description: 'Greataxe, Barbarian HP, heavy weapon damage',
      uses: ['Greataxe damage', 'Barbarian HP', 'Reckless Attack', 'Some class features'],
      icon: '⬠',
      color: '#ec4899'
    },
    {
      id: 'd20',
      label: 'D20',
      sides: 20,
      shape: 'icosahedron',
      description: 'Attack rolls, saving throws, skill checks — the king of dice',
      uses: ['Attack rolls', 'Saving throws', 'Skill checks', 'Ability checks', 'Critical hits on 20'],
      icon: '⬡',
      color: '#ef4444'
    },
    {
      id: 'd100',
      label: 'D100',
      sides: 100,
      shape: 'percentile',
      description: 'Percentile rolls, wild magic surges, random tables',
      uses: ['Wild magic surge', 'Random encounter tables', 'Loot tables', 'Percentile skill checks'],
      icon: '%',
      color: '#06b6d4'
    }
  ];

  // Gradient color themes inspired by real DND dice sets
  const COLOR_THEMES = [
    {
      id: 'arcane',
      name: 'Arcane Storm',
      description: 'Deep purple & electric blue',
      gradient: ['#4c1d95', '#7c3aed', '#2563eb', '#1d4ed8'],
      faceColor: '#1e1b4b',
      numberColor: '#c4b5fd',
      glowColor: '#7c3aed',
      borderColor: '#a78bfa',
      preview: 'linear-gradient(135deg, #4c1d95, #7c3aed, #2563eb)'
    },
    {
      id: 'ocean',
      name: 'Ocean Depths',
      description: 'Sapphire blue & teal',
      gradient: ['#0c4a6e', '#0369a1', '#0891b2', '#06b6d4'],
      faceColor: '#0c2340',
      numberColor: '#7dd3fc',
      glowColor: '#0891b2',
      borderColor: '#38bdf8',
      preview: 'linear-gradient(135deg, #0c4a6e, #0369a1, #06b6d4)'
    },
    {
      id: 'inferno',
      name: 'Dragon Fire',
      description: 'Crimson red & molten orange',
      gradient: ['#7f1d1d', '#dc2626', '#ea580c', '#f59e0b'],
      faceColor: '#3b0a0a',
      numberColor: '#fca5a5',
      glowColor: '#dc2626',
      borderColor: '#f87171',
      preview: 'linear-gradient(135deg, #7f1d1d, #dc2626, #f59e0b)'
    },
    {
      id: 'forest',
      name: 'Enchanted Forest',
      description: 'Emerald green & gold',
      gradient: ['#14532d', '#15803d', '#16a34a', '#d97706'],
      faceColor: '#052e16',
      numberColor: '#86efac',
      glowColor: '#16a34a',
      borderColor: '#4ade80',
      preview: 'linear-gradient(135deg, #14532d, #16a34a, #d97706)'
    },
    {
      id: 'void',
      name: 'Void Black',
      description: 'Obsidian black & silver',
      gradient: ['#111827', '#1f2937', '#374151', '#9ca3af'],
      faceColor: '#030712',
      numberColor: '#e5e7eb',
      glowColor: '#6b7280',
      borderColor: '#9ca3af',
      preview: 'linear-gradient(135deg, #111827, #374151, #9ca3af)'
    },
    {
      id: 'rose',
      name: 'Rose Quartz',
      description: 'Pink & magenta shimmer',
      gradient: ['#831843', '#be185d', '#db2777', '#f472b6'],
      faceColor: '#4a0020',
      numberColor: '#fbcfe8',
      glowColor: '#db2777',
      borderColor: '#f9a8d4',
      preview: 'linear-gradient(135deg, #831843, #db2777, #f472b6)'
    },
    {
      id: 'gold',
      name: 'Golden Dragon',
      description: 'Rich gold & amber',
      gradient: ['#78350f', '#b45309', '#d97706', '#fbbf24'],
      faceColor: '#3b1a05',
      numberColor: '#fde68a',
      glowColor: '#d97706',
      borderColor: '#fcd34d',
      preview: 'linear-gradient(135deg, #78350f, #d97706, #fbbf24)'
    },
    {
      id: 'ice',
      name: 'Glacial Ice',
      description: 'Icy white & frost blue',
      gradient: ['#1e3a5f', '#2563eb', '#60a5fa', '#e0f2fe'],
      faceColor: '#0c1a2e',
      numberColor: '#bfdbfe',
      glowColor: '#60a5fa',
      borderColor: '#93c5fd',
      preview: 'linear-gradient(135deg, #1e3a5f, #60a5fa, #e0f2fe)'
    }
  ];

  const getDiceTypes = () => DICE_TYPES;
  const getDiceById = (id) => DICE_TYPES.find(d => d.id === id);
  const getColorThemes = () => COLOR_THEMES;
  const getColorThemeById = (id) => COLOR_THEMES.find(t => t.id === id) || COLOR_THEMES[0];

  /**
   * Generate a cryptographically secure random integer from 1 to max (inclusive)
   */
  const secureRandom = (max) => {
    if (!window.crypto || !window.crypto.getRandomValues) {
      return Math.floor(Math.random() * max) + 1;
    }
    // Use rejection sampling to avoid modulo bias
    const limit = Math.floor(0x100000000 / max) * max;
    let value;
    do {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      value = array[0];
    } while (value >= limit);
    return (value % max) + 1;
  };

  /**
   * Roll a single die of given sides
   */
  const rollDie = (sides) => secureRandom(sides);

  /**
   * Roll multiple dice: e.g. rollMultiple(3, 6) = roll 3d6
   */
  const rollMultiple = (count, sides) => {
    const rolls = [];
    for (let i = 0; i < count; i++) {
      rolls.push(secureRandom(sides));
    }
    return rolls;
  };

  return {
    getDiceTypes,
    getDiceById,
    getColorThemes,
    getColorThemeById,
    secureRandom,
    rollDie,
    rollMultiple
  };
})();
