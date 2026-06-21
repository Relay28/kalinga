/**
 * Unit tests for BMI interpretation logic
 * 
 * Tests BMI categorization and guidance messages for:
 * - Underweight: BMI < 18.5
 * - Normal Weight: 18.5 ≤ BMI ≤ 24.9
 * - Overweight: 25 ≤ BMI ≤ 29.9
 * - Obese: BMI ≥ 30
 * 
 * These categories are used in PatientRegistration.jsx to provide
 * clinical guidance to midwives about preeclampsia risk factors.
 */

import { describe, it, expect } from 'vitest';
import { calculateBMI } from '../../utils/bmiCalculator';

/**
 * Helper function to get BMI interpretation (mirrors PatientRegistration.jsx logic)
 */
function getBMIInterpretation(bmiValue) {
  if (!bmiValue || isNaN(bmiValue)) return null;

  if (bmiValue < 18.5) {
    return {
      category: 'Underweight',
      className: 'underweight',
      icon: '⚠️',
      guidance: 'May increase risk of complications. Monitor nutritional status.'
    };
  } else if (bmiValue >= 18.5 && bmiValue <= 24.9) {
    return {
      category: 'Normal Weight',
      className: 'normal',
      icon: '✓',
      guidance: 'Healthy weight range for pregnancy.'
    };
  } else if (bmiValue >= 25 && bmiValue <= 29.9) {
    return {
      category: 'Overweight',
      className: 'overweight',
      icon: '⚠️',
      guidance: 'Increased preeclampsia risk (+4 points). Monitor closely.'
    };
  } else { // >= 30
    return {
      category: 'Obese',
      className: 'obese',
      icon: '⚠️',
      guidance: 'High preeclampsia risk (+8 points). Requires close monitoring.'
    };
  }
}

describe('BMI Interpretation', () => {
  describe('Category Classification', () => {
    it('should classify BMI < 18.5 as Underweight', () => {
      const interpretation = getBMIInterpretation(18.4);
      expect(interpretation.category).toBe('Underweight');
      expect(interpretation.className).toBe('underweight');
    });

    it('should classify BMI 18.5 as Normal Weight (boundary)', () => {
      const interpretation = getBMIInterpretation(18.5);
      expect(interpretation.category).toBe('Normal Weight');
      expect(interpretation.className).toBe('normal');
    });

    it('should classify BMI in range 18.5-24.9 as Normal Weight', () => {
      const interpretation = getBMIInterpretation(21.5);
      expect(interpretation.category).toBe('Normal Weight');
      expect(interpretation.className).toBe('normal');
    });

    it('should classify BMI 24.9 as Normal Weight (boundary)', () => {
      const interpretation = getBMIInterpretation(24.9);
      expect(interpretation.category).toBe('Normal Weight');
      expect(interpretation.className).toBe('normal');
    });

    it('should classify BMI 25.0 as Overweight (boundary)', () => {
      const interpretation = getBMIInterpretation(25.0);
      expect(interpretation.category).toBe('Overweight');
      expect(interpretation.className).toBe('overweight');
    });

    it('should classify BMI in range 25-29.9 as Overweight', () => {
      const interpretation = getBMIInterpretation(27.5);
      expect(interpretation.category).toBe('Overweight');
      expect(interpretation.className).toBe('overweight');
    });

    it('should classify BMI 29.9 as Overweight (boundary)', () => {
      const interpretation = getBMIInterpretation(29.9);
      expect(interpretation.category).toBe('Overweight');
      expect(interpretation.className).toBe('overweight');
    });

    it('should classify BMI 30.0 as Obese (boundary)', () => {
      const interpretation = getBMIInterpretation(30.0);
      expect(interpretation.category).toBe('Obese');
      expect(interpretation.className).toBe('obese');
    });

    it('should classify BMI > 30 as Obese', () => {
      const interpretation = getBMIInterpretation(35.5);
      expect(interpretation.category).toBe('Obese');
      expect(interpretation.className).toBe('obese');
    });
  });

  describe('Guidance Messages', () => {
    it('should provide appropriate guidance for Underweight', () => {
      const interpretation = getBMIInterpretation(17.0);
      expect(interpretation.guidance).toContain('May increase risk of complications');
      expect(interpretation.guidance).toContain('Monitor nutritional status');
    });

    it('should provide appropriate guidance for Normal Weight', () => {
      const interpretation = getBMIInterpretation(22.0);
      expect(interpretation.guidance).toContain('Healthy weight range');
    });

    it('should provide appropriate guidance for Overweight with risk score', () => {
      const interpretation = getBMIInterpretation(27.0);
      expect(interpretation.guidance).toContain('Increased preeclampsia risk');
      expect(interpretation.guidance).toContain('+4 points');
      expect(interpretation.guidance).toContain('Monitor closely');
    });

    it('should provide appropriate guidance for Obese with risk score', () => {
      const interpretation = getBMIInterpretation(32.0);
      expect(interpretation.guidance).toContain('High preeclampsia risk');
      expect(interpretation.guidance).toContain('+8 points');
      expect(interpretation.guidance).toContain('close monitoring');
    });
  });

  describe('Icons', () => {
    it('should use warning icon for Underweight', () => {
      const interpretation = getBMIInterpretation(17.0);
      expect(interpretation.icon).toBe('⚠️');
    });

    it('should use checkmark icon for Normal Weight', () => {
      const interpretation = getBMIInterpretation(22.0);
      expect(interpretation.icon).toBe('✓');
    });

    it('should use warning icon for Overweight', () => {
      const interpretation = getBMIInterpretation(27.0);
      expect(interpretation.icon).toBe('⚠️');
    });

    it('should use warning icon for Obese', () => {
      const interpretation = getBMIInterpretation(32.0);
      expect(interpretation.icon).toBe('⚠️');
    });
  });

  describe('Edge Cases', () => {
    it('should return null for invalid BMI (NaN)', () => {
      const interpretation = getBMIInterpretation(NaN);
      expect(interpretation).toBeNull();
    });

    it('should return null for null BMI', () => {
      const interpretation = getBMIInterpretation(null);
      expect(interpretation).toBeNull();
    });

    it('should return null for undefined BMI', () => {
      const interpretation = getBMIInterpretation(undefined);
      expect(interpretation).toBeNull();
    });

    it('should return null for empty string BMI', () => {
      const interpretation = getBMIInterpretation('');
      expect(interpretation).toBeNull();
    });
  });

  describe('Integration with BMI Calculator', () => {
    it('should correctly interpret BMI calculated from weight and height - Underweight', () => {
      const bmi = calculateBMI(45, 160); // 45kg, 160cm
      expect(bmi).toBe(17.6);
      const interpretation = getBMIInterpretation(bmi);
      expect(interpretation.category).toBe('Underweight');
    });

    it('should correctly interpret BMI calculated from weight and height - Normal', () => {
      const bmi = calculateBMI(60, 160); // 60kg, 160cm
      expect(bmi).toBe(23.4);
      const interpretation = getBMIInterpretation(bmi);
      expect(interpretation.category).toBe('Normal Weight');
    });

    it('should correctly interpret BMI calculated from weight and height - Overweight', () => {
      const bmi = calculateBMI(70, 160); // 70kg, 160cm
      expect(bmi).toBe(27.3);
      const interpretation = getBMIInterpretation(bmi);
      expect(interpretation.category).toBe('Overweight');
    });

    it('should correctly interpret BMI calculated from weight and height - Obese', () => {
      const bmi = calculateBMI(79.5, 160); // 79.5kg, 160cm (Maria Santos Cruz example)
      expect(bmi).toBe(31.1);
      const interpretation = getBMIInterpretation(bmi);
      expect(interpretation.category).toBe('Obese');
      expect(interpretation.guidance).toContain('+8 points');
    });
  });

  describe('Real Patient Scenarios', () => {
    it('should correctly classify Maria Santos Cruz (high risk patient)', () => {
      // Maria: 79.5kg, 160cm → BMI 31.1 (Obese)
      const bmi = calculateBMI(79.5, 160);
      const interpretation = getBMIInterpretation(bmi);
      expect(interpretation.category).toBe('Obese');
      expect(interpretation.guidance).toContain('+8 points');
    });

    it('should correctly classify Ana Reyes (moderate risk patient)', () => {
      // Ana: 68kg, 165cm → BMI 25.0 (Overweight)
      const bmi = calculateBMI(68, 165);
      const interpretation = getBMIInterpretation(bmi);
      expect(interpretation.category).toBe('Overweight');
      expect(interpretation.guidance).toContain('+4 points');
    });

    it('should correctly classify Elena Garcia (low risk patient)', () => {
      // Elena: 58kg, 162cm → BMI 22.1 (Normal)
      const bmi = calculateBMI(58, 162);
      const interpretation = getBMIInterpretation(bmi);
      expect(interpretation.category).toBe('Normal Weight');
      expect(interpretation.guidance).toContain('Healthy weight range');
    });
  });

  describe('Preeclampsia Risk Score Alignment', () => {
    it('should indicate +8 risk points for BMI ≥ 30', () => {
      const interpretation = getBMIInterpretation(30.0);
      expect(interpretation.guidance).toContain('+8 points');
    });

    it('should indicate +4 risk points for BMI ≥ 25 but < 30', () => {
      const interpretation = getBMIInterpretation(25.0);
      expect(interpretation.guidance).toContain('+4 points');
    });

    it('should not mention risk points for BMI < 25', () => {
      const normalInterpretation = getBMIInterpretation(22.0);
      expect(normalInterpretation.guidance).not.toContain('points');
      
      const underweightInterpretation = getBMIInterpretation(17.0);
      expect(underweightInterpretation.guidance).not.toContain('points');
    });
  });
});
