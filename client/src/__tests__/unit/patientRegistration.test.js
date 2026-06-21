/**
 * Unit Tests for Patient Registration Module
 * Tests BMI calculation and validation logic
 */

import { describe, it, expect } from 'vitest';

/**
 * BMI Calculation Function (extracted from component logic)
 * Formula: BMI = weight (kg) / (height (m))²
 */
function calculateBMI(weightKg, heightCm) {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return parseFloat(bmi.toFixed(1));
}

/**
 * BMI Interpretation Function (extracted from component logic)
 */
function getBMICategory(bmi) {
  if (bmi < 18.5) return 'underweight';
  if (bmi >= 18.5 && bmi <= 24.9) return 'normal';
  if (bmi >= 25 && bmi <= 29.9) return 'overweight';
  return 'obese'; // >= 30
}

describe('Patient Registration - BMI Calculation', () => {
  it('should calculate BMI correctly for normal weight', () => {
    // Weight: 70kg, Height: 175cm
    // Expected BMI: 70 / (1.75)² = 22.9
    const bmi = calculateBMI(70, 175);
    expect(bmi).toBe(22.9);
  });

  it('should calculate BMI correctly for underweight', () => {
    // Weight: 50kg, Height: 170cm
    // Expected BMI: 50 / (1.7)² = 17.3
    const bmi = calculateBMI(50, 170);
    expect(bmi).toBe(17.3);
  });

  it('should calculate BMI correctly for overweight', () => {
    // Weight: 80kg, Height: 165cm
    // Expected BMI: 80 / (1.65)² = 29.4
    const bmi = calculateBMI(80, 165);
    expect(bmi).toBe(29.4);
  });

  it('should calculate BMI correctly for obese', () => {
    // Weight: 79.5kg, Height: 160cm (Maria Santos Cruz from seed data)
    // Expected BMI: 79.5 / (1.6)² = 31.1
    const bmi = calculateBMI(79.5, 160);
    expect(bmi).toBe(31.1);
  });

  it('should round BMI to 1 decimal place', () => {
    // Weight: 68.7kg, Height: 172cm
    const bmi = calculateBMI(68.7, 172);
    // Should have exactly 1 decimal place
    expect(bmi.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(1);
  });
});

describe('Patient Registration - BMI Categorization', () => {
  it('should categorize BMI < 18.5 as underweight', () => {
    expect(getBMICategory(17.0)).toBe('underweight');
    expect(getBMICategory(18.4)).toBe('underweight');
  });

  it('should categorize BMI 18.5-24.9 as normal', () => {
    expect(getBMICategory(18.5)).toBe('normal');
    expect(getBMICategory(22.0)).toBe('normal');
    expect(getBMICategory(24.9)).toBe('normal');
  });

  it('should categorize BMI 25-29.9 as overweight', () => {
    expect(getBMICategory(25.0)).toBe('overweight');
    expect(getBMICategory(27.5)).toBe('overweight');
    expect(getBMICategory(29.9)).toBe('overweight');
  });

  it('should categorize BMI >= 30 as obese', () => {
    expect(getBMICategory(30.0)).toBe('obese');
    expect(getBMICategory(35.0)).toBe('obese');
    expect(getBMICategory(40.0)).toBe('obese');
  });

  it('should handle boundary values correctly', () => {
    // Test exact boundaries
    expect(getBMICategory(18.5)).toBe('normal'); // Lower boundary of normal
    expect(getBMICategory(24.9)).toBe('normal'); // Upper boundary of normal
    expect(getBMICategory(25.0)).toBe('overweight'); // Lower boundary of overweight
    expect(getBMICategory(29.9)).toBe('overweight'); // Upper boundary of overweight
    expect(getBMICategory(30.0)).toBe('obese'); // Lower boundary of obese
  });
});

describe('Patient Registration - Validation Functions', () => {
  const validatePhilHealth = (value) => {
    if (!value) return 'PhilHealth number is required';
    const philhealthRegex = /^\d{2}-\d{9}-\d{1}$/;
    if (!philhealthRegex.test(value)) {
      return 'Invalid format. Use: XX-XXXXXXXXX-X';
    }
    return null;
  };

  const validateBloodPressure = (value) => {
    if (!value) return 'Blood pressure is required';
    const bpRegex = /^\d{2,3}\/\d{2,3}$/;
    if (!bpRegex.test(value)) {
      return 'Format: systolic/diastolic (e.g., 120/80)';
    }
    const [systolic, diastolic] = value.split('/').map(Number);
    if (systolic < 70 || systolic > 250) {
      return 'Systolic must be between 70-250';
    }
    if (diastolic < 40 || diastolic > 150) {
      return 'Diastolic must be between 40-150';
    }
    return null;
  };

  it('should validate correct PhilHealth ID format', () => {
    expect(validatePhilHealth('71-024481935-2')).toBe(null);
    expect(validatePhilHealth('12-345678901-2')).toBe(null);
  });

  it('should reject invalid PhilHealth ID formats', () => {
    expect(validatePhilHealth('')).toBe('PhilHealth number is required');
    expect(validatePhilHealth('123-456789012-3')).toBe('Invalid format. Use: XX-XXXXXXXXX-X');
    expect(validatePhilHealth('12-34567890-1')).toBe('Invalid format. Use: XX-XXXXXXXXX-X');
    expect(validatePhilHealth('12-3456789012-1')).toBe('Invalid format. Use: XX-XXXXXXXXX-X');
  });

  it('should validate correct blood pressure format', () => {
    expect(validateBloodPressure('120/80')).toBe(null);
    expect(validateBloodPressure('155/95')).toBe(null);
    expect(validateBloodPressure('90/60')).toBe(null);
  });

  it('should reject invalid blood pressure formats', () => {
    expect(validateBloodPressure('')).toBe('Blood pressure is required');
    expect(validateBloodPressure('120')).toBe('Format: systolic/diastolic (e.g., 120/80)');
    expect(validateBloodPressure('120/80/90')).toBe('Format: systolic/diastolic (e.g., 120/80)');
  });

  it('should validate blood pressure ranges', () => {
    expect(validateBloodPressure('60/80')).toBe('Systolic must be between 70-250');
    expect(validateBloodPressure('260/80')).toBe('Systolic must be between 70-250');
    expect(validateBloodPressure('120/30')).toBe('Diastolic must be between 40-150');
    expect(validateBloodPressure('120/160')).toBe('Diastolic must be between 40-150');
  });
});

describe('Patient Registration - Real-world Scenarios', () => {
  it('should correctly process Maria Santos Cruz data (high risk patient)', () => {
    // From seed data: weight 79.5kg, height 160cm
    const bmi = calculateBMI(79.5, 160);
    const category = getBMICategory(bmi);
    
    expect(bmi).toBe(31.1);
    expect(category).toBe('obese');
    // This contributes +8 points to preeclampsia risk score
  });

  it('should correctly process normal weight patient', () => {
    // Example: weight 65kg, height 165cm
    const bmi = calculateBMI(65, 165);
    const category = getBMICategory(bmi);
    
    expect(bmi).toBe(23.9);
    expect(category).toBe('normal');
    // This contributes +0 points to preeclampsia risk score
  });

  it('should correctly process overweight patient', () => {
    // Example: weight 75kg, height 165cm
    const bmi = calculateBMI(75, 165);
    const category = getBMICategory(bmi);
    
    expect(bmi).toBe(27.5);
    expect(category).toBe('overweight');
    // This contributes +4 points to preeclampsia risk score
  });
});
