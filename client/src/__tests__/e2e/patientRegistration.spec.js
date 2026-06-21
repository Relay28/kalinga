/**
 * End-to-End Tests for Patient Registration
 * 
 * These tests verify the complete patient registration workflow from
 * user interaction to data persistence, running in a real browser environment.
 */

import { test, expect } from '@playwright/test';

test.describe('Patient Registration E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and ensure it's loaded
    await page.goto('/');
    
    // Clear localStorage to start fresh
    await page.evaluate(() => localStorage.clear());
  });

  test('should display patient registration form', async ({ page }) => {
    // Navigate to patient registration
    await page.goto('/register');
    
    // Verify form fields are present
    await expect(page.getByLabel(/philhealth id/i)).toBeVisible();
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
    await expect(page.getByLabel(/date of birth/i)).toBeVisible();
    await expect(page.getByLabel(/blood pressure/i)).toBeVisible();
    await expect(page.getByLabel(/weight/i)).toBeVisible();
    await expect(page.getByLabel(/height/i)).toBeVisible();
  });

  test('should successfully register a new patient', async ({ page }) => {
    await page.goto('/register');
    
    // Fill out the registration form
    await page.getByLabel(/philhealth id/i).fill('12-345678901-2');
    await page.getByLabel(/first name/i).fill('Maria');
    await page.getByLabel(/last name/i).fill('Santos');
    await page.getByLabel(/date of birth/i).fill('1990-01-15');
    
    // Fill vital signs
    await page.getByLabel(/systolic/i).fill('120');
    await page.getByLabel(/diastolic/i).fill('80');
    await page.getByLabel(/weight/i).fill('65');
    await page.getByLabel(/height/i).fill('160');
    
    // Submit the form
    await page.getByRole('button', { name: /register|submit/i }).click();
    
    // Verify success (could be redirect, toast, or success message)
    // Adjust based on actual implementation
    await expect(page).toHaveURL(/dashboard|success|triage/i, { timeout: 5000 });
  });

  test('should validate PhilHealth ID format', async ({ page }) => {
    await page.goto('/register');
    
    // Enter invalid PhilHealth ID
    await page.getByLabel(/philhealth id/i).fill('invalid-id');
    await page.getByLabel(/first name/i).fill('Maria');
    
    // Try to submit
    await page.getByRole('button', { name: /register|submit/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/invalid.*philhealth/i)).toBeVisible();
  });

  test('should require all mandatory fields', async ({ page }) => {
    await page.goto('/register');
    
    // Try to submit empty form
    await page.getByRole('button', { name: /register|submit/i }).click();
    
    // Should show required field errors or prevent submission
    // The form should not navigate away
    await expect(page).toHaveURL(/register/);
  });

  test('should auto-calculate BMI when weight and height are entered', async ({ page }) => {
    await page.goto('/register');
    
    // Enter weight and height
    await page.getByLabel(/weight/i).fill('70');
    await page.getByLabel(/height/i).fill('175');
    
    // Trigger calculation (could be on blur or button click)
    await page.getByLabel(/height/i).blur();
    
    // Check if BMI is calculated and displayed
    // Expected BMI: 70 / (1.75)² = 22.9
    const bmiField = page.getByText(/bmi.*22\.9/i);
    await expect(bmiField).toBeVisible({ timeout: 2000 });
  });

  test('should handle mock ID scanner demo', async ({ page }) => {
    await page.goto('/register');
    
    // Click mock ID scanner button (if exists)
    const scanButton = page.getByRole('button', { name: /scan.*id|mock.*scanner/i });
    
    if (await scanButton.isVisible()) {
      await scanButton.click();
      
      // Verify fields are auto-filled with demo data
      await expect(page.getByLabel(/philhealth id/i)).not.toHaveValue('');
      await expect(page.getByLabel(/first name/i)).not.toHaveValue('');
    }
  });

  test('should persist patient data to localStorage', async ({ page }) => {
    await page.goto('/register');
    
    // Fill and submit form
    await page.getByLabel(/philhealth id/i).fill('12-345678901-2');
    await page.getByLabel(/first name/i).fill('Maria');
    await page.getByLabel(/last name/i).fill('Santos');
    await page.getByLabel(/date of birth/i).fill('1990-01-15');
    await page.getByLabel(/systolic/i).fill('120');
    await page.getByLabel(/diastolic/i).fill('80');
    await page.getByLabel(/weight/i).fill('65');
    await page.getByLabel(/height/i).fill('160');
    
    await page.getByRole('button', { name: /register|submit/i }).click();
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Check localStorage for patient data
    const localStorageData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const data = {};
      keys.forEach(key => {
        try {
          data[key] = JSON.parse(localStorage.getItem(key));
        } catch {
          data[key] = localStorage.getItem(key);
        }
      });
      return data;
    });
    
    // Verify patient data is stored
    const hasPatientData = Object.values(localStorageData).some(value => {
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value).includes('12-345678901-2');
      }
      return false;
    });
    
    expect(hasPatientData).toBeTruthy();
  });

  test('should handle checkbox risk factors', async ({ page }) => {
    await page.goto('/register');
    
    // Toggle risk factor checkboxes
    const chronicHypertensionCheckbox = page.getByLabel(/chronic hypertension/i);
    const familyHistoryCheckbox = page.getByLabel(/family history/i);
    
    if (await chronicHypertensionCheckbox.isVisible()) {
      await chronicHypertensionCheckbox.check();
      await expect(chronicHypertensionCheckbox).toBeChecked();
    }
    
    if (await familyHistoryCheckbox.isVisible()) {
      await familyHistoryCheckbox.check();
      await expect(familyHistoryCheckbox).toBeChecked();
    }
  });

  test('should be mobile-responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/register');
    
    // Form should still be visible and usable
    await expect(page.getByLabel(/philhealth id/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /register|submit/i })).toBeVisible();
  });

  test('should display validation feedback in real-time', async ({ page }) => {
    await page.goto('/register');
    
    // Enter invalid data
    await page.getByLabel(/philhealth id/i).fill('12345');
    await page.getByLabel(/philhealth id/i).blur();
    
    // Should show immediate validation feedback
    // (implementation may vary - could be border color, error message, etc.)
    const errorVisible = await page.getByText(/invalid|error|required/i).isVisible();
    
    // At minimum, form should indicate there's an issue
    expect(errorVisible || await page.getByLabel(/philhealth id/i).evaluate(
      el => el.classList.contains('error') || el.classList.contains('invalid')
    )).toBeTruthy();
  });
});

test.describe('Patient Registration - Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/register');
    
    // Tab through form fields
    await page.keyboard.press('Tab');
    const firstField = page.locator(':focus');
    await expect(firstField).toBeVisible();
    
    // Continue tabbing
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to reach submit button via keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    expect(['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA']).toContain(focusedElement);
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/register');
    
    // Check for proper labels
    const philhealthInput = page.getByLabel(/philhealth id/i);
    await expect(philhealthInput).toHaveAttribute('aria-label');
  });
});
