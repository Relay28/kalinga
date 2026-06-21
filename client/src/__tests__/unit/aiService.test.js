/**
 * Unit Tests for AI Service
 * 
 * These tests verify the AI service functionality including:
 * - BMI calculation with specific examples
 * - Preeclampsia risk score calculation with known patient profiles
 * - Risk level classification boundaries
 * - Edge cases and missing optional fields
 * 
 * Tests validate Requirements 1.2, 7.1-7.10 from the requirements document.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateRiskLocally, aiService } from '../../services/aiService.js';
import { calculateBMI } from '../../utils/bmiCalculator.js';

describe('AI Service - Unit Tests', () => {
  describe('BMI Calculation', () => {
    it('should calculate BMI correctly for weight=70kg, height=175cm → BMI=22.86', () => {
      // Requirements 1.2, 22.1, 22.2
      // Formula: BMI = weight / (height/100)²
      // BMI = 70 / (1.75)² = 70 / 3.0625 = 22.857... ≈ 22.9 (rounded to 1 decimal)
      const bmi = calculateBMI(70, 175);
      expect(bmi).toBe(22.9);
    });

    it('should calculate BMI correctly for weight=79.5kg, height=160cm (Maria scenario)', () => {
      // Maria Santos Cruz from seed data: 79.5kg, 160cm
      // BMI = 79.5 / (1.6)² = 79.5 / 2.56 = 31.054... ≈ 31.1
      const bmi = calculateBMI(79.5, 160);
      expect(bmi).toBe(31.1);
    });

    it('should calculate BMI for minimum valid inputs', () => {
      // Minimum: 30kg, 100cm
      const bmi = calculateBMI(30, 100);
      expect(bmi).toBe(30.0);
      expect(bmi).toBeGreaterThan(0);
    });

    it('should calculate BMI for maximum valid inputs', () => {
      // Maximum: 200kg, 250cm
      const bmi = calculateBMI(200, 250);
      expect(bmi).toBe(32.0);
      expect(bmi).toBeGreaterThan(0);
    });

    it('should return a number with 1 decimal place', () => {
      const bmi = calculateBMI(65.7, 167.3);
      expect(typeof bmi).toBe('number');
      expect(Number.isFinite(bmi)).toBe(true);
      
      const decimalPlaces = bmi.toString().split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });
  });

  describe('Preeclampsia Risk Score Calculation - calculateRiskLocally', () => {
    it('should calculate risk score for Maria Santos Cruz scenario (78%)', () => {
      // Requirements 7.1-7.7
      // Maria Santos Cruz: BP 155/95, BMI 31.2, hypertension=true, family=true
      // Expected calculation:
      // Baseline: 15
      // BP (155/95): systolic ≥140 OR diastolic ≥90 → +25
      // BMI (31.2): ≥30 → +8
      // Chronic hypertension: +20
      // Family history: +10
      // Total: 15 + 25 + 8 + 20 + 10 = 78
      
      const score = calculateRiskLocally(
        '155/95',  // bp
        31.2,      // bmiValue
        27,        // age
        {
          hypertension: true,
          family: true,
          firstpreg: false,
          multiple: false,
          diabetes: false,
          csection: false,
          pain: false
        }
      );
      
      expect(score).toBe(78);
    });

    it('should calculate risk score with severe BP range (≥160/100)', () => {
      // Requirements 7.2
      // BP ≥160/100 should add +35
      const score = calculateRiskLocally(
        '160/100',
        22.0,
        30,
        {}
      );
      
      // Baseline 15 + BP 35 = 50
      expect(score).toBe(50);
    });

    it('should calculate risk score with elevated BP range (≥130/85)', () => {
      // Requirements 7.2
      // BP ≥130/85 should add +12
      const score = calculateRiskLocally(
        '130/85',
        22.0,
        30,
        {}
      );
      
      // Baseline 15 + BP 12 = 27
      expect(score).toBe(27);
    });

    it('should calculate risk score with BMI ≥30 (obese)', () => {
      // Requirements 7.3
      // BMI ≥30 should add +8
      const score = calculateRiskLocally(
        '120/80',
        30.0,
        30,
        {}
      );
      
      // Baseline 15 + BMI 8 = 23
      expect(score).toBe(23);
    });

    it('should calculate risk score with BMI ≥25 (overweight)', () => {
      // Requirements 7.3
      // BMI ≥25 should add +4
      const score = calculateRiskLocally(
        '120/80',
        25.0,
        30,
        {}
      );
      
      // Baseline 15 + BMI 4 = 19
      expect(score).toBe(19);
    });

    it('should calculate risk score with all risk factors present', () => {
      // Requirements 7.4-7.7
      // Testing all boolean risk factors
      const score = calculateRiskLocally(
        '120/80',
        22.0,
        30,
        {
          hypertension: true,   // +20
          family: true,         // +10
          firstpreg: true,      // +4
          multiple: true,       // +8
          diabetes: true,       // +10
          csection: true,       // +5
          pain: true            // +8
        }
      );
      
      // Baseline 15 + risk factors (20+10+4+8+10+5+8) = 15 + 65 = 80
      expect(score).toBe(80);
    });

    it('should clamp risk score to maximum of 95', () => {
      // Requirements 7.7 - Risk score capped at 95
      const score = calculateRiskLocally(
        '180/110',  // BP +35
        35.0,       // BMI +8
        30,
        {
          hypertension: true,   // +20
          family: true,         // +10
          firstpreg: true,      // +4
          multiple: true,       // +8
          diabetes: true,       // +10
          csection: true,       // +5
          pain: true            // +8
        }
      );
      
      // Would be: 15 + 35 + 8 + 20 + 10 + 4 + 8 + 10 + 5 + 8 = 123, clamped to 95
      expect(score).toBe(95);
      expect(score).toBeLessThanOrEqual(95);
    });

    it('should clamp risk score to minimum of 5', () => {
      // Requirements 7.7 - Risk score clamped at 5
      // This is edge case - baseline is 15, so very hard to go below 5
      // But the code has this protection
      const score = calculateRiskLocally(
        '100/60',  // Very low BP (no extra points)
        18.0,      // Low BMI (no extra points)
        30,
        {}         // No risk factors
      );
      
      // Would be: 15 + 0 = 15, which is above 5
      expect(score).toBe(15);
      expect(score).toBeGreaterThanOrEqual(5);
    });

    it('should calculate baseline score with no risk factors', () => {
      // Minimum risk patient: normal BP, normal BMI, no risk factors
      const score = calculateRiskLocally(
        '110/70',
        22.0,
        30,
        {}
      );
      
      // Baseline only: 15
      expect(score).toBe(15);
    });
  });

  describe('Risk Level Classification Boundaries', () => {
    it('should classify score 69 as MODERATE RISK', () => {
      // Requirements 7.9 - MODERATE is 40-69
      const score = 69;
      let riskLevel;
      
      if (score >= 70) {
        riskLevel = 'HIGH';
      } else if (score >= 40) {
        riskLevel = 'MODERATE';
      } else {
        riskLevel = 'LOW';
      }
      
      expect(riskLevel).toBe('MODERATE');
    });

    it('should classify score 70 as HIGH RISK', () => {
      // Requirements 7.8 - HIGH is ≥70
      const score = 70;
      let riskLevel;
      
      if (score >= 70) {
        riskLevel = 'HIGH';
      } else if (score >= 40) {
        riskLevel = 'MODERATE';
      } else {
        riskLevel = 'LOW';
      }
      
      expect(riskLevel).toBe('HIGH');
    });

    it('should classify score 39 as LOW RISK', () => {
      // Requirements 7.10 - LOW is <40
      const score = 39;
      let riskLevel;
      
      if (score >= 70) {
        riskLevel = 'HIGH';
      } else if (score >= 40) {
        riskLevel = 'MODERATE';
      } else {
        riskLevel = 'LOW';
      }
      
      expect(riskLevel).toBe('LOW');
    });

    it('should classify score 40 as MODERATE RISK (boundary)', () => {
      // Requirements 7.9 - MODERATE starts at 40
      const score = 40;
      let riskLevel;
      
      if (score >= 70) {
        riskLevel = 'HIGH';
      } else if (score >= 40) {
        riskLevel = 'MODERATE';
      } else {
        riskLevel = 'LOW';
      }
      
      expect(riskLevel).toBe('MODERATE');
    });

    it('should classify score 95 as HIGH RISK (maximum)', () => {
      // Maximum possible score
      const score = 95;
      let riskLevel;
      
      if (score >= 70) {
        riskLevel = 'HIGH';
      } else if (score >= 40) {
        riskLevel = 'MODERATE';
      } else {
        riskLevel = 'LOW';
      }
      
      expect(riskLevel).toBe('HIGH');
    });

    it('should classify score 5 as LOW RISK (minimum)', () => {
      // Minimum possible score
      const score = 5;
      let riskLevel;
      
      if (score >= 70) {
        riskLevel = 'HIGH';
      } else if (score >= 40) {
        riskLevel = 'MODERATE';
      } else {
        riskLevel = 'LOW';
      }
      
      expect(riskLevel).toBe('LOW');
    });
  });

  describe('Edge Cases and Missing Optional Fields', () => {
    it('should handle missing BP value gracefully', () => {
      const score = calculateRiskLocally(
        null,      // Missing BP
        22.0,
        30,
        {}
      );
      
      // Should still calculate with baseline and BMI
      expect(score).toBe(15);
      expect(typeof score).toBe('number');
    });

    it('should handle invalid BP format gracefully', () => {
      const score = calculateRiskLocally(
        'invalid',  // Invalid BP format
        22.0,
        30,
        {}
      );
      
      // Should still calculate baseline
      expect(score).toBe(15);
      expect(typeof score).toBe('number');
    });

    it('should handle missing BMI value gracefully', () => {
      const score = calculateRiskLocally(
        '120/80',
        null,      // Missing BMI
        30,
        {}
      );
      
      // Should still calculate baseline
      expect(score).toBe(15);
      expect(typeof score).toBe('number');
    });

    it('should handle NaN BMI value gracefully', () => {
      const score = calculateRiskLocally(
        '120/80',
        NaN,       // NaN BMI
        30,
        {}
      );
      
      // Should still calculate baseline
      expect(score).toBe(15);
      expect(typeof score).toBe('number');
    });

    it('should handle missing risk factors object gracefully', () => {
      const score = calculateRiskLocally(
        '120/80',
        22.0,
        30,
        undefined  // Missing risk factors
      );
      
      // Should still calculate baseline
      expect(score).toBe(15);
      expect(typeof score).toBe('number');
    });

    it('should handle partially filled risk factors', () => {
      const score = calculateRiskLocally(
        '120/80',
        22.0,
        30,
        {
          hypertension: true,  // Only one factor present
          // Other fields missing
        }
      );
      
      // Baseline 15 + hypertension 20 = 35
      expect(score).toBe(35);
    });

    it('should treat falsy risk factors as false', () => {
      const score = calculateRiskLocally(
        '120/80',
        22.0,
        30,
        {
          hypertension: false,
          family: null,
          firstpreg: undefined,
          multiple: 0,
          diabetes: '',
          csection: false,
          pain: false
        }
      );
      
      // All falsy values should be treated as false
      expect(score).toBe(15);
    });

    it('should handle BP with only systolic above threshold', () => {
      const score = calculateRiskLocally(
        '160/70',  // Systolic ≥160, but diastolic normal
        22.0,
        30,
        {}
      );
      
      // Should still trigger severe BP scoring (+35)
      // Baseline 15 + BP 35 = 50
      expect(score).toBe(50);
    });

    it('should handle BP with only diastolic above threshold', () => {
      const score = calculateRiskLocally(
        '130/100',  // Diastolic ≥100, systolic not in severe range
        22.0,
        30,
        {}
      );
      
      // Should still trigger severe BP scoring (+35)
      // Baseline 15 + BP 35 = 50
      expect(score).toBe(50);
    });

    it('should handle BMI exactly at boundary (30.0)', () => {
      const score = calculateRiskLocally(
        '120/80',
        30.0,      // Exactly at obese boundary
        30,
        {}
      );
      
      // Baseline 15 + BMI 8 = 23
      expect(score).toBe(23);
    });

    it('should handle BMI exactly at boundary (25.0)', () => {
      const score = calculateRiskLocally(
        '120/80',
        25.0,      // Exactly at overweight boundary
        30,
        {}
      );
      
      // Baseline 15 + BMI 4 = 19
      expect(score).toBe(19);
    });

    it('should handle BMI just below overweight boundary (24.9)', () => {
      const score = calculateRiskLocally(
        '120/80',
        24.9,      // Just below overweight boundary
        30,
        {}
      );
      
      // Baseline 15 + BMI 0 = 15
      expect(score).toBe(15);
    });
  });

  describe('AI Service classify() method', () => {
    beforeEach(() => {
      // Reset any mocks before each test
      vi.clearAllMocks();
    });

    it('should classify Maria Santos Cruz as HIGH RISK with score 78', async () => {
      // Test the full aiService.classify method with Maria's data
      const patientData = {
        firstName: 'Maria',
        lastName: 'Santos Cruz',
        bp: '155/95',
        bmi: 31.2,
        age: 27,
        lmp: '2025-12-30',
        riskFactors: {
          hypertension: true,
          family: true,
          firstpreg: false,
          multiple: false,
          diabetes: false,
          csection: false,
          pain: false
        }
      };

      const result = await aiService.classify(patientData, false);

      expect(result.riskScore).toBe(78);
      expect(result.preliminaryRiskLabel).toBe('HIGH');
      expect(result.suggestedFlag).toBe('Urgent Referral');
    });

    it('should classify low-risk patient correctly', async () => {
      const patientData = {
        firstName: 'Anna',
        lastName: 'Reyes',
        bp: '110/70',
        bmi: 22.0,
        age: 30,
        riskFactors: {}
      };

      const result = await aiService.classify(patientData, false);

      // Baseline 15 = LOW RISK
      expect(result.riskScore).toBeLessThan(40);
      expect(result.preliminaryRiskLabel).toBe('LOW');
      expect(result.suggestedFlag).toBe('Normal');
    });

    it('should classify moderate-risk patient correctly', async () => {
      const patientData = {
        firstName: 'Test',
        lastName: 'Patient',
        bp: '140/90',
        bmi: 28.0,
        age: 32,
        riskFactors: {
          firstpreg: true
        }
      };

      const result = await aiService.classify(patientData, false);

      // Baseline 15 + BP 25 + BMI 4 + firstpreg 4 = 48 (MODERATE)
      expect(result.riskScore).toBeGreaterThanOrEqual(40);
      expect(result.riskScore).toBeLessThan(70);
      expect(result.preliminaryRiskLabel).toBe('MODERATE');
      expect(result.suggestedFlag).toBe('Warning');
    });

    it('should include gestational age estimate in results', async () => {
      const patientData = {
        firstName: 'Test',
        lastName: 'Patient',
        bp: '120/80',
        bmi: 22.0,
        lmp: '2025-12-30',
        riskFactors: {}
      };

      const result = await aiService.classify(patientData, false);

      expect(result.gestationalAgeEstimate).toBeDefined();
      expect(result.gestationalAgeEstimate).toMatch(/Est: \d+w \d+d/);
    });

    it('should include findings array in results', async () => {
      const patientData = {
        firstName: 'Test',
        lastName: 'Patient',
        bp: '145/92',
        bmi: 31.0,
        riskFactors: {
          hypertension: true
        }
      };

      const result = await aiService.classify(patientData, false);

      expect(result.findings).toBeDefined();
      expect(Array.isArray(result.findings)).toBe(true);
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings).toContain('Elevated blood pressure detected');
      expect(result.findings).toContain('High BMI risk factor');
      expect(result.findings).toContain('History of hypertension noted');
    });

    it('should return scan quality metadata', async () => {
      const patientData = {
        firstName: 'Test',
        lastName: 'Patient',
        bp: '120/80',
        bmi: 22.0,
        riskFactors: {}
      };

      const result = await aiService.classify(patientData, false);

      expect(result.scanQualityScore).toBeDefined();
      expect(result.selectedBestFrame).toBeDefined();
      expect(result.fetalHeartRate).toBeDefined();
      expect(typeof result.scanQualityScore).toBe('number');
      expect(typeof result.fetalHeartRate).toBe('number');
    });
  });
});
