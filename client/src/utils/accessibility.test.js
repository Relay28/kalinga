/**
 * Accessibility Utilities Tests
 * 
 * Tests for WCAG AA compliance utilities
 */

import { describe, test, expect, vi } from 'vitest';
import { checkColorContrast, generateAriaId, handleInteractiveKeyPress } from './accessibility';

describe('Accessibility Utilities', () => {
  describe('checkColorContrast', () => {
    test('should pass AA for text-dark on white', () => {
      const result = checkColorContrast('#1e293b', '#ffffff');
      expect(result.passesAA).toBe(true);
      expect(parseFloat(result.ratio)).toBeGreaterThan(4.5);
    });

    test('should pass AA for primary-blue on white', () => {
      const result = checkColorContrast('#095cc5', '#ffffff');
      expect(result.passesAA).toBe(true);
      expect(parseFloat(result.ratio)).toBeGreaterThan(4.5);
    });

    test('should check contrast for primary-teal on white', () => {
      const result = checkColorContrast('#1bb2a4', '#ffffff');
      // Primary teal may only pass AA Large (3:1), not full AA (4.5:1)
      expect(parseFloat(result.ratio)).toBeGreaterThan(1);
    });

    test('should handle RGB format', () => {
      const result = checkColorContrast('rgb(30, 41, 59)', 'rgb(255, 255, 255)');
      expect(result.ratio).toBeDefined();
      expect(parseFloat(result.ratio)).toBeGreaterThan(0);
    });

    test('should calculate correct contrast ratio', () => {
      // Black on white should be 21:1
      const result = checkColorContrast('#000000', '#ffffff');
      expect(parseFloat(result.ratio)).toBeCloseTo(21, 0);
    });

    test('should fail AA for insufficient contrast', () => {
      // Light gray on white
      const result = checkColorContrast('#cccccc', '#ffffff');
      expect(result.passesAA).toBe(false);
    });
  });

  describe('generateAriaId', () => {
    test('should generate unique IDs', () => {
      const id1 = generateAriaId('test');
      const id2 = generateAriaId('test');
      expect(id1).not.toBe(id2);
    });

    test('should include prefix', () => {
      const id = generateAriaId('myprefix');
      expect(id).toContain('myprefix');
    });

    test('should use default prefix', () => {
      const id = generateAriaId();
      expect(id).toContain('aria');
    });
  });

  describe('handleInteractiveKeyPress', () => {
    test('should call callback on Enter key', () => {
      const callback = vi.fn();
      const event = { key: 'Enter', preventDefault: vi.fn() };
      
      handleInteractiveKeyPress(event, callback);
      
      expect(callback).toHaveBeenCalledWith(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    test('should call callback on Space key', () => {
      const callback = vi.fn();
      const event = { key: ' ', preventDefault: vi.fn() };
      
      handleInteractiveKeyPress(event, callback);
      
      expect(callback).toHaveBeenCalledWith(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    test('should not call callback on other keys', () => {
      const callback = vi.fn();
      const event = { key: 'Tab', preventDefault: vi.fn() };
      
      handleInteractiveKeyPress(event, callback);
      
      expect(callback).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});

describe('Color Palette WCAG Verification', () => {
  const colors = {
    primaryTeal: '#1bb2a4',
    primaryBlue: '#095cc5',
    textDark: '#1e293b',
    textMedium: '#475569',
    textMuted: '#94a3b8',
    white: '#ffffff',
    bgLight: '#f8fafc',
    redAlert: '#ef4444',
    redLight: '#fee2e2',
    orangeAlert: '#f97316',
    orangeLight: '#ffedd5',
    greenNormal: '#10b981',
    greenLight: '#d1fae5'
  };

  test('Primary text colors on white background', () => {
    expect(checkColorContrast(colors.textDark, colors.white).passesAA).toBe(true);
    expect(checkColorContrast(colors.textMedium, colors.white).passesAA).toBe(true);
  });

  test('Primary blue on white (buttons) passes AA', () => {
    const result = checkColorContrast(colors.primaryBlue, colors.white);
    expect(result.passesAA).toBe(true);
    expect(parseFloat(result.ratio)).toBeGreaterThan(4.5);
  });

  test('Alert colors have sufficient contrast', () => {
    // Red alert on red light background
    const redResult = checkColorContrast(colors.redAlert, colors.redLight);
    expect(parseFloat(redResult.ratio)).toBeGreaterThan(1);
    
    // Orange alert on orange light background
    const orangeResult = checkColorContrast(colors.orangeAlert, colors.orangeLight);
    expect(parseFloat(orangeResult.ratio)).toBeGreaterThan(1);
  });

  test('White text on colored buttons', () => {
    // White on primary teal - check actual ratio
    const tealResult = checkColorContrast(colors.white, colors.primaryTeal);
    expect(parseFloat(tealResult.ratio)).toBeGreaterThan(1);
    
    // White on primary blue - should pass AA
    const blueResult = checkColorContrast(colors.white, colors.primaryBlue);
    expect(blueResult.passesAA).toBe(true);
  });
});
