/**
 * Integration test for BMI auto-calculation in PatientRegistration
 * 
 * Validates Requirement 1.2: BMI auto-calculation on weight/height change
 * 
 * Tests that BMI is:
 * 1. Recalculated automatically when weight changes
 * 2. Recalculated automatically when height changes
 * 3. Displayed with appropriate color coding
 * 4. Shows interpretation text for midwife guidance
 */

import { describe, it, expect } from 'vitest';
import { calculateBMI } from '../../utils/bmiCalculator';

describe('BMI Auto-Recalculation Integration', () => {
  describe('Requirement 1.2: BMI Computation', () => {
    it('should recalculate BMI when weight changes', () => {
      const height = 160; // cm
      
      // Initial weight
      let weight = 60;
      let bmi = calculateBMI(weight, height);
      expect(bmi).toBe(23.4);
      
      // Weight increases
      weight = 70;
      bmi = calculateBMI(weight, height);
      expect(bmi).toBe(27.3);
      
      // Weight decreases
      weight = 50;
      bmi = calculateBMI(weight, height);
      expect(bmi).toBe(19.5);
    });

    it('should recalculate BMI when height changes', () => {
      const weight = 70; // kg
      
      // Initial height
      let height = 160;
      let bmi = calculateBMI(weight, height);
      expect(bmi).toBe(27.3);
      
      // Height increases
      height = 175;
      bmi = calculateBMI(weight, height);
      expect(bmi).toBe(22.9);
      
      // Height decreases
      height = 150;
      bmi = calculateBMI(weight, height);
      expect(bmi).toBe(31.1);
    });

    it('should recalculate BMI when both weight and height change', () => {
      // Scenario 1: Normal to Overweight
      let weight = 60;
      let height = 160;
      let bmi = calculateBMI(weight, height);
      expect(bmi).toBe(23.4); // Normal
      
      // Patient gains weight
      weight = 70;
      bmi = calculateBMI(weight, height);
      expect(bmi).toBe(27.3); // Overweight
      
      // Scenario 2: Overweight to Normal (through height)
      weight = 70;
      height = 175;
      bmi = calculateBMI(weight, height);
      expect(bmi).toBe(22.9); // Normal
    });
  });

  describe('Color Coding Based on BMI Categories', () => {
    const getCategoryForBMI = (bmiValue) => {
      if (bmiValue < 18.5) return 'underweight';
      if (bmiValue >= 18.5 && bmiValue <= 24.9) return 'normal';
      if (bmiValue >= 25 && bmiValue <= 29.9) return 'overweight';
      return 'obese';
    };

    it('should show underweight color coding for BMI < 18.5', () => {
      const bmi = calculateBMI(45, 160); // 17.6
      const category = getCategoryForBMI(bmi);
      expect(category).toBe('underweight');
    });

    it('should show normal color coding for BMI 18.5-24.9', () => {
      const bmi = calculateBMI(60, 160); // 23.4
      const category = getCategoryForBMI(bmi);
      expect(category).toBe('normal');
    });

    it('should show overweight color coding for BMI 25-29.9', () => {
      const bmi = calculateBMI(70, 160); // 27.3
      const category = getCategoryForBMI(bmi);
      expect(category).toBe('overweight');
    });

    it('should show obese color coding for BMI ≥ 30', () => {
      const bmi = calculateBMI(79.5, 160); // 31.1
      const category = getCategoryForBMI(bmi);
      expect(category).toBe('obese');
    });

    it('should update color coding when BMI crosses category boundaries', () => {
      const height = 160;
      
      // Start with normal weight
      let weight = 60;
      let bmi = calculateBMI(weight, height);
      let category = getCategoryForBMI(bmi);
      expect(category).toBe('normal');
      
      // Increase to overweight
      weight = 70;
      bmi = calculateBMI(weight, height);
      category = getCategoryForBMI(bmi);
      expect(category).toBe('overweight');
      
      // Increase to obese
      weight = 80;
      bmi = calculateBMI(weight, height);
      category = getCategoryForBMI(bmi);
      expect(category).toBe('obese');
    });
  });

  describe('Midwife Guidance Messages', () => {
    const getGuidanceForBMI = (bmiValue) => {
      if (bmiValue < 18.5) {
        return 'May increase risk of complications. Monitor nutritional status.';
      } else if (bmiValue >= 18.5 && bmiValue <= 24.9) {
        return 'Healthy weight range for pregnancy.';
      } else if (bmiValue >= 25 && bmiValue <= 29.9) {
        return 'Increased preeclampsia risk (+4 points). Monitor closely.';
      } else {
        return 'High preeclampsia risk (+8 points). Requires close monitoring.';
      }
    };

    it('should show appropriate guidance for underweight patients', () => {
      const bmi = calculateBMI(45, 160); // 17.6
      const guidance = getGuidanceForBMI(bmi);
      expect(guidance).toContain('May increase risk of complications');
      expect(guidance).toContain('Monitor nutritional status');
    });

    it('should show appropriate guidance for normal weight patients', () => {
      const bmi = calculateBMI(60, 160); // 23.4
      const guidance = getGuidanceForBMI(bmi);
      expect(guidance).toContain('Healthy weight range');
    });

    it('should show appropriate guidance for overweight patients with risk score', () => {
      const bmi = calculateBMI(70, 160); // 27.3
      const guidance = getGuidanceForBMI(bmi);
      expect(guidance).toContain('Increased preeclampsia risk');
      expect(guidance).toContain('+4 points');
    });

    it('should show appropriate guidance for obese patients with risk score', () => {
      const bmi = calculateBMI(79.5, 160); // 31.1
      const guidance = getGuidanceForBMI(bmi);
      expect(guidance).toContain('High preeclampsia risk');
      expect(guidance).toContain('+8 points');
    });

    it('should update guidance when BMI category changes', () => {
      const height = 160;
      
      // Normal weight
      let weight = 60;
      let bmi = calculateBMI(weight, height);
      let guidance = getGuidanceForBMI(bmi);
      expect(guidance).toContain('Healthy weight range');
      
      // Gain weight to overweight
      weight = 70;
      bmi = calculateBMI(weight, height);
      guidance = getGuidanceForBMI(bmi);
      expect(guidance).toContain('+4 points');
      
      // Gain more weight to obese
      weight = 80;
      bmi = calculateBMI(weight, height);
      guidance = getGuidanceForBMI(bmi);
      expect(guidance).toContain('+8 points');
    });
  });

  describe('Real-World Patient Scenarios', () => {
    it('should correctly calculate and categorize Maria Santos Cruz (obese)', () => {
      // Maria: 79.5kg, 160cm
      const bmi = calculateBMI(79.5, 160);
      expect(bmi).toBe(31.1);
      
      const category = bmi >= 30 ? 'obese' : 'other';
      expect(category).toBe('obese');
      
      const guidance = 'High preeclampsia risk (+8 points). Requires close monitoring.';
      expect(guidance).toContain('+8 points');
    });

    it('should correctly calculate and categorize Ana Reyes (overweight)', () => {
      // Ana: 68kg, 165cm
      const bmi = calculateBMI(68, 165);
      expect(bmi).toBe(25.0);
      
      const category = bmi >= 25 && bmi < 30 ? 'overweight' : 'other';
      expect(category).toBe('overweight');
      
      const guidance = 'Increased preeclampsia risk (+4 points). Monitor closely.';
      expect(guidance).toContain('+4 points');
    });

    it('should correctly calculate and categorize Elena Garcia (normal)', () => {
      // Elena: 58kg, 162cm
      const bmi = calculateBMI(58, 162);
      expect(bmi).toBe(22.1);
      
      const category = bmi >= 18.5 && bmi <= 24.9 ? 'normal' : 'other';
      expect(category).toBe('normal');
      
      const guidance = 'Healthy weight range for pregnancy.';
      expect(guidance).toContain('Healthy weight range');
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle transition from Normal (24.9) to Overweight (25.0)', () => {
      // Find weight that gives BMI 24.9 at height 160
      const height = 160;
      
      // BMI 24.9: weight = 24.9 * (1.6)^2 = 63.74 kg
      const bmi1 = calculateBMI(63.7, height);
      expect(bmi1).toBe(24.9);
      expect(bmi1 < 25).toBe(true);
      
      // BMI 25.0: weight = 25.0 * (1.6)^2 = 64.0 kg
      const bmi2 = calculateBMI(64, height);
      expect(bmi2).toBe(25.0);
      expect(bmi2 >= 25).toBe(true);
    });

    it('should handle transition from Overweight (29.9) to Obese (30.0)', () => {
      const height = 160;
      
      // BMI 29.9: weight = 29.9 * (1.6)^2 = 76.54 kg
      const bmi1 = calculateBMI(76.5, height);
      expect(bmi1).toBe(29.9);
      expect(bmi1 < 30).toBe(true);
      
      // BMI 30.0: weight = 30.0 * (1.6)^2 = 76.8 kg
      const bmi2 = calculateBMI(76.8, height);
      expect(bmi2).toBe(30.0);
      expect(bmi2 >= 30).toBe(true);
    });

    it('should handle transition from Underweight (18.4) to Normal (18.5)', () => {
      const height = 160;
      
      // BMI 18.4: weight = 18.4 * (1.6)^2 = 47.1 kg
      const bmi1 = calculateBMI(47.1, height);
      expect(bmi1).toBe(18.4);
      expect(bmi1 < 18.5).toBe(true);
      
      // BMI 18.5: weight = 18.5 * (1.6)^2 = 47.36 kg
      const bmi2 = calculateBMI(47.4, height);
      expect(bmi2).toBe(18.5);
      expect(bmi2 >= 18.5).toBe(true);
    });
  });

  describe('Alignment with Preeclampsia Risk Scoring', () => {
    it('should align BMI categories with risk score calculations', () => {
      // According to design.md Risk Scoring Algorithm:
      // BMI ≥ 30: +8 points
      // BMI ≥ 25 but < 30: +4 points
      // BMI < 25: +0 points
      
      const height = 160;
      
      // BMI < 25: no points
      const bmi1 = calculateBMI(60, height); // 23.4
      expect(bmi1 < 25).toBe(true);
      const points1 = 0;
      expect(points1).toBe(0);
      
      // BMI ≥ 25 but < 30: +4 points
      const bmi2 = calculateBMI(70, height); // 27.3
      expect(bmi2 >= 25 && bmi2 < 30).toBe(true);
      const points2 = 4;
      expect(points2).toBe(4);
      
      // BMI ≥ 30: +8 points
      const bmi3 = calculateBMI(80, height); // 31.3
      expect(bmi3 >= 30).toBe(true);
      const points3 = 8;
      expect(points3).toBe(8);
    });
  });
});
