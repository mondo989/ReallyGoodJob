/**
 * Theme Management for ReallyGoodJob
 * Handles dark/light mode toggle with localStorage persistence
 */

class ThemeManager {
  constructor() {
    this.storageKey = 'reallygoodjob-theme';
    this.themes = {
      LIGHT: 'light',
      DARK: 'dark'
    };
    
    this.init();
  }
  
  init() {
    // Get saved theme or default to light
    const savedTheme = this.getSavedTheme();
    const systemPrefersDark = this.getSystemPreference();
    
    // Use saved theme, or system preference, or default to light
    const initialTheme = savedTheme || (systemPrefersDark ? this.themes.DARK : this.themes.LIGHT);
    
    this.setTheme(initialTheme, false); // Don't save on init
    this.setupToggleButtons();
    this.setupSystemPreferenceListener();
  }
  
  getSavedTheme() {
    try {
      return localStorage.getItem(this.storageKey);
    } catch (e) {
      console.warn('localStorage not available for theme persistence');
      return null;
    }
  }
  
  saveTheme(theme) {
    try {
      localStorage.setItem(this.storageKey, theme);
    } catch (e) {
      console.warn('Could not save theme preference');
    }
  }
  
  getSystemPreference() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || this.themes.LIGHT;
  }
  
  setTheme(theme, save = true) {
    // Validate theme
    if (!Object.values(this.themes).includes(theme)) {
      console.warn(`Invalid theme: ${theme}. Using light theme.`);
      theme = this.themes.LIGHT;
    }
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update body class for additional styling if needed
    document.body.classList.toggle('dark-theme', theme === this.themes.DARK);
    
    // Save preference
    if (save) {
      this.saveTheme(theme);
    }
    
    // Update toggle buttons
    this.updateToggleButtons(theme);
    
    // Dispatch custom event for other components to listen to
    this.dispatchThemeChangeEvent(theme);
  }
  
  toggleTheme() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === this.themes.DARK ? this.themes.LIGHT : this.themes.DARK;
    this.setTheme(newTheme);
    
    // Add a subtle animation class
    document.body.classList.add('theme-transitioning');
    setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
    }, 300);
  }
  
  setupToggleButtons() {
    // Find all theme toggle buttons
    const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
    
    toggleButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleTheme();
      });
      
      // Add keyboard support
      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleTheme();
        }
      });
    });
  }
  
  updateToggleButtons(theme) {
    const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
    const isDark = theme === this.themes.DARK;
    
    toggleButtons.forEach(button => {
      // Update aria-label for accessibility
      button.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
      
      // Update title attribute
      button.setAttribute('title', `Switch to ${isDark ? 'light' : 'dark'} mode`);
      
      // Update button content if it has specific elements
      const sunIcon = button.querySelector('.theme-toggle__sun');
      const moonIcon = button.querySelector('.theme-toggle__moon');
      
      if (sunIcon && moonIcon) {
        sunIcon.style.opacity = isDark ? '0' : '1';
        moonIcon.style.opacity = isDark ? '1' : '0';
      }
      
      // Update data attribute
      button.setAttribute('data-current-theme', theme);
    });
  }
  
  setupSystemPreferenceListener() {
    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      mediaQuery.addEventListener('change', (e) => {
        // Only auto-switch if user hasn't manually set a preference
        if (!this.getSavedTheme()) {
          this.setTheme(e.matches ? this.themes.DARK : this.themes.LIGHT, false);
        }
      });
    }
  }
  
  dispatchThemeChangeEvent(theme) {
    const event = new CustomEvent('themechange', {
      detail: { theme, isDark: theme === this.themes.DARK }
    });
    document.dispatchEvent(event);
  }
  
  // Public API methods
  isDarkMode() {
    return this.getCurrentTheme() === this.themes.DARK;
  }
  
  isLightMode() {
    return this.getCurrentTheme() === this.themes.LIGHT;
  }
  
  setDarkMode() {
    this.setTheme(this.themes.DARK);
  }
  
  setLightMode() {
    this.setTheme(this.themes.LIGHT);
  }
  
  resetToSystemPreference() {
    const systemPrefersDark = this.getSystemPreference();
    this.setTheme(systemPrefersDark ? this.themes.DARK : this.themes.LIGHT);
  }
}

// Initialize theme manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
  });
} else {
  window.themeManager = new ThemeManager();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}

// Add some CSS for smooth transitions
const style = document.createElement('style');
style.textContent = `
  * {
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease !important;
  }
  
  .theme-transitioning * {
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease !important;
  }
  
  /* Reduce motion for users who prefer it */
  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
    }
  }
`;
document.head.appendChild(style); 