/**
 * Accessibility Utilities
 * 
 * Provides functions for screen reader announcements, keyboard navigation,
 * and other accessibility features following WCAG AA standards.
 */

/**
 * Create a live region for screen reader announcements
 * This element is visually hidden but read by screen readers
 */
let liveRegion = null;

const createLiveRegion = () => {
  if (liveRegion) return liveRegion;

  liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  liveRegion.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  `;
  document.body.appendChild(liveRegion);
  return liveRegion;
};

/**
 * Announce a message to screen readers
 * @param {string} message - The message to announce
 * @param {string} priority - 'polite' (default) or 'assertive'
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const region = createLiveRegion();
  
  // Update aria-live attribute based on priority
  region.setAttribute('aria-live', priority);
  
  // Clear previous message
  region.textContent = '';
  
  // Use setTimeout to ensure the screen reader picks up the change
  setTimeout(() => {
    region.textContent = message;
  }, 100);
  
  // Clear after announcement
  setTimeout(() => {
    region.textContent = '';
  }, 3000);
};

/**
 * Trap focus within a modal or dialog
 * @param {HTMLElement} element - The container element
 * @returns {Function} Cleanup function to remove event listeners
 */
export const trapFocus = (element) => {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };

  element.addEventListener('keydown', handleKeyDown);
  
  // Focus first element
  firstFocusable?.focus();

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
};

/**
 * Handle Escape key to close modals/dialogs
 * @param {Function} callback - Function to call when Escape is pressed
 * @returns {Function} Cleanup function to remove event listener
 */
export const handleEscapeKey = (callback) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      callback();
    }
  };

  document.addEventListener('keydown', handleKeyDown);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
};

/**
 * Check if color contrast meets WCAG AA standards (4.5:1 for normal text)
 * @param {string} foreground - Foreground color (hex or rgb)
 * @param {string} background - Background color (hex or rgb)
 * @returns {Object} { ratio, passes, level }
 */
export const checkColorContrast = (foreground, background) => {
  const getLuminance = (color) => {
    // Convert hex to RGB
    let r, g, b;
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      r = parseInt(hex.substr(0, 2), 16) / 255;
      g = parseInt(hex.substr(2, 2), 16) / 255;
      b = parseInt(hex.substr(4, 2), 16) / 255;
    } else if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g);
      r = parseInt(match[0]) / 255;
      g = parseInt(match[1]) / 255;
      b = parseInt(match[2]) / 255;
    } else {
      return 0;
    }

    // Apply gamma correction
    r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  return {
    ratio: ratio.toFixed(2),
    passesAA: ratio >= 4.5,
    passesAALarge: ratio >= 3,
    passesAAA: ratio >= 7,
    level: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA Large' : 'Fail'
  };
};

/**
 * Generate a unique ID for ARIA relationships
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
export const generateAriaId = (prefix = 'aria') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Set page title for screen readers
 * @param {string} title - Page title
 */
export const setPageTitle = (title) => {
  document.title = `${title} - Kalinga AI`;
  announceToScreenReader(`Navigated to ${title}`);
};

/**
 * Create visually hidden text for screen readers only
 * @param {string} text - Text for screen readers
 * @returns {HTMLElement} Span element with sr-only class
 */
export const createScreenReaderText = (text) => {
  const span = document.createElement('span');
  span.className = 'sr-only';
  span.textContent = text;
  span.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  `;
  return span;
};

/**
 * Keyboard navigation helper for custom interactive elements
 * Triggers click on Enter or Space key
 * @param {Event} event - Keyboard event
 * @param {Function} callback - Function to call on Enter/Space
 */
export const handleInteractiveKeyPress = (event, callback) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    callback(event);
  }
};

export default {
  announceToScreenReader,
  trapFocus,
  handleEscapeKey,
  checkColorContrast,
  generateAriaId,
  setPageTitle,
  createScreenReaderText,
  handleInteractiveKeyPress
};
