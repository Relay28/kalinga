import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateBMI } from '../../utils/bmiCalculator.js';

/**
 * Property 1: BMI Calculation Correctness
 * **Validates: Requirements 1.2, 22.1, 22.2**
 * 
 * This property test verifies that the BMI calculation follows the formula:
 * BMI = weight / (height/100)²
 * 
 * For all valid weight (30-200kg) and height (100-250cm) inputs,
 * the calculated BMI should match the expected formula result
 * within a floating-point tolerance.
 */

describe('Property 1: BMI Calculation Correctness', () => {
  it('should calculate BMI correctly for all valid weight and height inputs', () => {
    fc.assert(
      fc.property(
        // Generate valid weight values: 30-200 kg
        fc.double({ min: 30, max: 200, noNaN: true }),
        // Generate valid height values: 100-250 cm
        fc.double({ min: 100, max: 250, noNaN: true }),
        (weight, height) => {
          // Calculate BMI using the function under test
          const actualBMI = calculateBMI(weight, height);
          
          // Calculate expected BMI using the formula: weight / (height/100)²
          const heightInMeters = height / 100;
          const expectedBMI = weight / (heightInMeters * heightInMeters);
          const expectedBMIRounded = parseFloat(expectedBMI.toFixed(1));
          
          // Verify the result matches within floating-point tolerance
          // We use a small epsilon for floating-point comparison
          const epsilon = 0.01; // Allow 0.01 difference due to rounding
          const difference = Math.abs(actualBMI - expectedBMIRounded);
          
          // Assert that the difference is within acceptable tolerance
          expect(difference).toBeLessThanOrEqual(epsilon);
          
          // Additional sanity checks:
          // 1. BMI should be a valid number
          expect(actualBMI).toBeTypeOf('number');
          expect(isNaN(actualBMI)).toBe(false);
          
          // 2. BMI should be positive for positive inputs
          expect(actualBMI).toBeGreaterThan(0);
          
          // 3. BMI should have at most 1 decimal place (as per implementation)
          const decimalPlaces = (actualBMI.toString().split('.')[1] || '').length;
          expect(decimalPlaces).toBeLessThanOrEqual(1);
        }
      ),
      {
        numRuns: 1000, // Run 1000 random test cases
        verbose: true, // Show detailed output on failure
      }
    );
  });

  it('should handle boundary values correctly', () => {
    // Test minimum valid values
    const bmiMin = calculateBMI(30, 250); // Minimum weight, maximum height
    expect(bmiMin).toBeGreaterThan(0);
    expect(isNaN(bmiMin)).toBe(false);
    
    // Test maximum valid values
    const bmiMax = calculateBMI(200, 100); // Maximum weight, minimum height
    expect(bmiMax).toBeGreaterThan(0);
    expect(isNaN(bmiMax)).toBe(false);
    
    // Test typical values
    const bmiTypical = calculateBMI(70, 175); // 70kg, 175cm
    const expectedTypical = 70 / (1.75 * 1.75); // ~22.86
    expect(Math.abs(bmiTypical - parseFloat(expectedTypical.toFixed(1)))).toBeLessThanOrEqual(0.01);
  });

  it('should produce consistent results for repeated calculations', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 30, max: 200, noNaN: true }),
        fc.double({ min: 100, max: 250, noNaN: true }),
        (weight, height) => {
          // Calculate BMI twice with same inputs
          const result1 = calculateBMI(weight, height);
          const result2 = calculateBMI(weight, height);
          
          // Results should be identical (deterministic)
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce higher BMI for higher weight with same height', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 30, max: 199, noNaN: true }), // weight1
        fc.double({ min: 100, max: 250, noNaN: true }), // height
        (weight1, height) => {
          const weight2 = weight1 + 1; // Slightly higher weight
          
          const bmi1 = calculateBMI(weight1, height);
          const bmi2 = calculateBMI(weight2, height);
          
          // Higher weight should produce higher or equal BMI
          // (equal due to rounding to 1 decimal place)
          expect(bmi2).toBeGreaterThanOrEqual(bmi1 - 0.1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce lower BMI for higher height with same weight', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 30, max: 200, noNaN: true }), // weight
        fc.double({ min: 100, max: 249, noNaN: true }), // height1
        (weight, height1) => {
          const height2 = height1 + 1; // Slightly higher height
          
          const bmi1 = calculateBMI(weight, height1);
          const bmi2 = calculateBMI(weight, height2);
          
          // Higher height should produce lower or equal BMI
          // (equal due to rounding to 1 decimal place)
          expect(bmi2).toBeLessThanOrEqual(bmi1 + 0.1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
