/**
 * State Management Module
 * Handles persistence of DND dice app state to localStorage
 */

const GameState = (() => {
  const STORAGE_KEY = 'dnd-dice-state';
  const DEFAULT_STATE = {
    soundEnabled: true,
    hapticEnabled: true,
    rollHistory: [],
    lastRoll: null,
    selectedDiceColor: 'arcane',
    darkMode: true
  };

  let state = (() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_STATE, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Error loading state:', e);
    }
    return { ...DEFAULT_STATE };
  })();

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving state:', e);
    }
  };

  const getState = () => ({ ...state });

  const setLastRoll = (rollData) => {
    state.lastRoll = rollData;
    state.rollHistory.unshift({ ...rollData, timestamp: Date.now() });
    if (state.rollHistory.length > 100) {
      state.rollHistory = state.rollHistory.slice(0, 100);
    }
    save();
  };

  const getLastRoll = () => state.lastRoll ? { ...state.lastRoll } : null;
  const getRollHistory = () => [...state.rollHistory];

  const toggleSound = () => { state.soundEnabled = !state.soundEnabled; save(); };
  const isSoundEnabled = () => state.soundEnabled;

  const toggleHaptic = () => { state.hapticEnabled = !state.hapticEnabled; save(); };
  const isHapticEnabled = () => state.hapticEnabled;

  const setDiceColor = (colorId) => { state.selectedDiceColor = colorId; save(); };
  const getDiceColor = () => state.selectedDiceColor;

  const setDarkMode = (val) => { state.darkMode = val; save(); };
  const isDarkMode = () => state.darkMode;

  const clearHistory = () => { state.rollHistory = []; save(); };

  const reset = () => { state = { ...DEFAULT_STATE }; save(); };

  return {
    getState, setLastRoll, getLastRoll, getRollHistory,
    toggleSound, isSoundEnabled,
    toggleHaptic, isHapticEnabled,
    setDiceColor, getDiceColor,
    setDarkMode, isDarkMode,
    clearHistory, reset
  };
})();
