/**
 * D&D Dice Roller — App Entry Point
 */

document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme immediately to avoid flash
  const isDark = GameState.isDarkMode();
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

  // Render the app
  UI.render();
});
