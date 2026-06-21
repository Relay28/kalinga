/**
 * Unit Tests for BMI Calculator
 * 
 * These tests verify specific examples and edge cases for the BMI calculation
 * functionality. They complement the property-based tests by testing concrete
 * scenarios and boundary conditions.
 */

import { describe, it, expect } from 'vitest';
import { calculateBMI } from '../../utils/bmiCalculator.js';

describe('BMI Calculator - Unit Tests', () => {
  describe('Standard calculations', () => {
    it('should calculate BMI correctly for typical values', () => {
      // 70kg, 175cm -> BMI = 70 / (1.75)² = 22.86 ≈ 22.9
      expect(calculateBMI(70, 175)).toBe(22.9);
      
      // 65kg, 160cm -> BMI = 65 / (1.6)² = 25.39 ≈ 25.4
      expect(calculateBMI(65, 160)).toBe(25.4);
      
      // 80kg, 180cm -> BMI = 80 / (1.8)² = 24.69 ≈ 24.7
      expect(calculateBMI(80, 180)).toBe(24.7);
    });
    
    it('should calculate BMI for underweight range', () => {
      // 45kg, 170cm -> BMI = 15.57 ≈ 15.6 (underweight)
      expect(calculateBMI(45, 170)).toBe(15.6);
    });
    
    it('should calculate BMI for normal weight range', () => {
      // 65kg, 170cm -> BMI = 22.49 ≈ 22.5 (normal)
      expect(calculateBMI(65, 170)).toBe(22.5);
    });
    
    it('should calculate BMI for overweight range', () => {
      // 75kg, 165cm -> BMI = 27.55 ≈ 27.5 (overweight)
      expect(calculateBMI(75, 165)).toBe(27.5);
    });
    
    it('should calculate BMI for obese range', () => {
      // 100kg, 170cm -> BMI = 34.60 ≈ 34.6 (obese)
      expect(calculateBMI(100, 170)).toBe(34.6);
    });
  });
  
  describe('Boundary values', () => {
    it('should handle minimum valid values', () => {
      // 30kg, 250cm (very short and light)
      const bmi = calculateBMI(30, 250);
      expect(bmi).toBeGreaterThan(0);
      expect(bmi).toBe(4.8);
    });
    
    it('should handle maximum valid values', () => {
      // 200kg, 100cm (very heavy and tall)
      const bmi = calculateBMI(200, 100);
      expect(bmi).toBeGreaterThan(0);
      expect(bmi).toBe(200.0);
    });
    
    it('should handle edge case: 50kg, 150cm', () => {
      // BMI = 50 / (1.5)² = 22.22 ≈ 22.2
      expect(calculateBMI(50, 150)).toBe(22.2);
    });
  });
  
  describe('Precision and rounding', () => {
    it('should round to 1 decimal place', () => {
      const bmi = calculateBMI(70.5, 175.5);
      const decimalPlaces = bmi.toString().split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });
    
    it('should handle whole number results', () => {
      // 80kg, 200cm -> BMI = 20.0
      expect(calculateBMI(80, 200)).toBe(20.0);
    });
  });
  
  describe('Return type validation', () => {
    it('should return a number', () => {
      const bmi = calculateBMI(70, 170);
      expect(typeof bmi).toBe('number');
    });
    
    it('should not return NaN', () => {
      const bmi = calculateBMI(70, 170);
      expect(Number.isNaN(bmi)).toBe(false);
    });
    
    it('should return a finite number', () => {
      const bmi = calculateBMI(70, 170);
      expect(Number.isFinite(bmi)).toBe(true);
    });
    
    it('should return a positive number', () => {
      const bmi = calculateBMI(70, 170);
      expect(bmi).toBeGreaterThan(0);
    });
  });
  
  describe('Realistic patient scenarios', () => {
    it('should calculate BMI for pregnant woman with normal weight', () => {
      // Pre-pregnancy: 60kg, 165cm -> BMI = 22.0
      expect(calculateBMI(60, 165)).toBe(22.0);
    });
    
    it('should calculate BMI for pregnant woman with overweight', () => {
      // Pre-pregnancy: 80kg, 165cm -> BMI = 29.4
      expect(calculateBMI(80, 165)).toBe(29.4);
    });
    
    it('should calculate BMI for high-risk patient', () => {
      // High BMI risk factor: 95kg, 160cm -> BMI = 37.1
      expect(calculateBMI(95, 160)).toBe(37.1);
    });
  });
});
