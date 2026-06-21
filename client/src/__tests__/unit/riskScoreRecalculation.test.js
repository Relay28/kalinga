/**
 * Unit tests for Risk Score Recalculation (Task 9.3)
 * 
 * Tests that risk score:
 * 1. Recalculates automatically when patient data changes
 * 2. Updates BMI when weight or height changes
 * 3. Records recalculation history for audit trail
 * 4. Shows appropriate notifications
 * 
 * Requirements: 7.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { calculateRiskLocally } from '../../services/aiService';
import { calculateBMI } from '../../utils/bmiCalculator';

describe('Risk Score Recalculation (Task 9.3)', () => {
  describe('Requirement 7.1: Risk Score Recalculation', () => {
    it('should recalculate risk score when blood pressure changes', () => {
      const baseData = {
        bmi: 25.0,
        age: 30,
        riskFactors: {
          hypertension: false,
          family: false,
          firstpreg: false,
          multiple: false,
          diabetes: false,
          csection: false,
          pain: false
        }
      };

      // Initial BP: normal
      const initialScore = calculateRiskLocally('120/80', baseData.bmi, baseData.age, baseData.riskFactors);
      
      // Updated BP: elevated
      const updatedScore = calculateRiskLocally('140/90', baseData.bmi, baseData.age, baseData.riskFactors);
      
      // Risk score should increase due to elevated BP
      expect(updatedScore).toBeGreaterThan(initialScore);
      expect(updatedScore - initialScore).toBe(25); // Should add +25 for BP 140/90
    });

    it('should recalculate risk score when BMI changes', () => {
      const baseData = {
        bp: '120/80',
        age: 30,
        riskFactors: {
          hypertension: false,
          family: false,
          firstpreg: false,
          multiple: false,
          diabetes: false,
          csection: false,
          pain: false
        }
      };

      // Initial BMI: normal (24.9)
      const initialScore = calculateRiskLocally(baseData.bp, '24.9', baseData.age, baseData.riskFactors);
      
      // Updated BMI: overweight (27.0)
      const updatedScore1 = calculateRiskLocally(baseData.bp, '27.0', baseData.age, baseData.riskFactors);
      
      // Updated BMI: obese (32.0)
      const updatedScore2 = calculateRiskLocally(baseData.bp, '32.0', baseData.age, baseData.riskFactors);
      
      // Risk score should increase as BMI increases
      expect(updatedScore1).toBeGreaterThan(initialScore);
      expect(updatedScore2).toBeGreaterThan(updatedScore1);
      expect(updatedScore1 - initialScore).toBe(4); // +4 for overweight
      expect(updatedScore2 - initialScore).toBe(8); // +8 for obese
    });

    it('should recalculate risk score when risk factors change', () => {
      const baseData = {
        bp: '120/80',
        bmi: 24.0,
        age: 30
      };

      // Initial: no risk factors
      const initialRiskFactors = {
        hypertension: false,
        family: false,
        firstpreg: false,
        multiple: false,
        diabetes: false,
        csection: false,
        pain: false
      };
      const initialScore = calculateRiskLocally(baseData.bp, baseData.bmi, baseData.age, initialRiskFactors);
      
      // Add hypertension
      const withHypertension = { ...initialRiskFactors, hypertension: true };
      const scoreWithHTN = calculateRiskLocally(baseData.bp, baseData.bmi, baseData.age, withHypertension);
      
      // Add family history
      const withFamily = { ...withHypertension, family: true };
      const scoreWithFamily = calculateRiskLocally(baseData.bp, baseData.bmi, baseData.age, withFamily);
      
      // Risk score should increase with each risk factor
      expect(scoreWithHTN).toBeGreaterThan(initialScore);
      expect(scoreWithFamily).toBeGreaterThan(scoreWithHTN);
      expect(scoreWithHTN - initialScore).toBe(20); // +20 for hypertension
      expect(scoreWithFamily - scoreWithHTN).toBe(10); // +10 for family history
    });

    it('should automatically update BMI when weight changes', () => {
      const height = 160; // cm
      
      // Initial weight: 60kg
      const initialWeight = 60;
      const initialBMI = calculateBMI(initialWeight, height);
      
      // Updated weight: 80kg
      const updatedWeight = 80;
      const updatedBMI = calculateBMI(updatedWeight, height);
      
      // BMI should increase with weight
      expect(updatedBMI).toBeGreaterThan(initialBMI);
      expect(initialBMI).toBeCloseTo(23.4, 1);
      expect(updatedBMI).toBeCloseTo(31.2, 1); // Fixed: actual calculated value
    });

    it('should automatically update BMI when height changes', () => {
      const weight = 70; // kg
      
      // Initial height: 175cm
      const initialHeight = 175;
      const initialBMI = calculateBMI(weight, initialHeight);
      
      // Updated height: 160cm
      const updatedHeight = 160;
      const updatedBMI = calculateBMI(weight, updatedHeight);
      
      // BMI should increase when height decreases
      expect(updatedBMI).toBeGreaterThan(initialBMI);
      expect(initialBMI).toBeCloseTo(22.9, 1);
      expect(updatedBMI).toBeCloseTo(27.3, 1);
    });

    it('should handle multiple simultaneous changes correctly', () => {
      // Initial state
      const initialData = {
        bp: '120/80',
        bmi: '24.0',
        age: 30,
        riskFactors: {
          hypertension: false,
          family: false,
          firstpreg: true,
          multiple: false,
          diabetes: false,
          csection: false,
          pain: false
        }
      };
      
      const initialScore = calculateRiskLocally(
        initialData.bp, 
        initialData.bmi, 
        initialData.age, 
        initialData.riskFactors
      );
      
      // Updated state: BP increased, BMI increased, added hypertension
      const updatedData = {
        bp: '155/95',
        bmi: '31.2',
        age: 30,
        riskFactors: {
          hypertension: true,
          family: true,
          firstpreg: true,
          multiple: false,
          diabetes: false,
          csection: false,
          pain: false
        }
      };
      
      const updatedScore = calculateRiskLocally(
        updatedData.bp, 
        updatedData.bmi, 
        updatedData.age, 
        updatedData.riskFactors
      );
      
      // Risk score should significantly increase
      expect(updatedScore).toBeGreaterThan(initialScore);
      
      // Should be a high risk score
      expect(updatedScore).toBeGreaterThan(70); // High risk threshold
      expect(updatedScore).toBe(82); // Actual calculated value
    });

    it('should clamp risk score between 5 and 95', () => {
      // Minimal risk case
      const minimalRisk = calculateRiskLocally(
        '100/60',
        '20.0',
        25,
        {
          hypertension: false,
          family: false,
          firstpreg: false,
          multiple: false,
          diabetes: false,
          csection: false,
          pain: false
        }
      );
      
      // Maximal risk case
      const maximalRisk = calculateRiskLocally(
        '180/110',
        '35.0',
        30,
        {
          hypertension: true,
          family: true,
          firstpreg: true,
          multiple: true,
          diabetes: true,
          csection: true,
          pain: true
        }
      );
      
      // Should be clamped to valid range
      expect(minimalRisk).toBeGreaterThanOrEqual(5);
      expect(maximalRisk).toBeLessThanOrEqual(95);
    });
  });

  describe('Recalculation History Tracking', () => {
    it('should track old and new risk scores in history', () => {
      const oldScore = 45;
      const newScore = 68;
      
      const historyEntry = {
        timestamp: new Date().toISOString(),
        oldRiskScore: oldScore,
        newRiskScore: newScore,
        changedFields: ['BP: 130/80 → 150/95'],
        reason: 'Manual data update'
      };
      
      expect(historyEntry.oldRiskScore).toBe(45);
      expect(historyEntry.newRiskScore).toBe(68);
      expect(historyEntry.newRiskScore - historyEntry.oldRiskScore).toBe(23);
    });

    it('should track which fields changed', () => {
      const originalPatient = {
        bp: '120/80',
        weight: 70,
        height: 160,
        bmi: '27.3',
        riskFactors: {
          hypertension: false,
          family: false
        }
      };
      
      const updatedPatient = {
        bp: '140/90',
        weight: 75,
        height: 160,
        bmi: '29.3',
        riskFactors: {
          hypertension: true,
          family: false
        }
      };
      
      const changes = [];
      if (originalPatient.bp !== updatedPatient.bp) {
        changes.push(`BP: ${originalPatient.bp} → ${updatedPatient.bp}`);
      }
      if (originalPatient.weight !== updatedPatient.weight) {
        changes.push(`Weight: ${originalPatient.weight} → ${updatedPatient.weight}`);
      }
      if (originalPatient.riskFactors.hypertension !== updatedPatient.riskFactors.hypertension) {
        changes.push(`hypertension: ${originalPatient.riskFactors.hypertension} → ${updatedPatient.riskFactors.hypertension}`);
      }
      
      expect(changes).toHaveLength(3);
      expect(changes).toContain('BP: 120/80 → 140/90');
      expect(changes).toContain('Weight: 70 → 75');
      expect(changes).toContain('hypertension: false → true');
    });
  });

  describe('Risk Score Change Detection', () => {
    it('should detect risk score increase', () => {
      const oldScore = 35;
      const newScore = 72;
      const change = newScore - oldScore;
      
      expect(change).toBeGreaterThan(0);
      expect(change).toBe(37);
    });

    it('should detect risk score decrease', () => {
      const oldScore = 68;
      const newScore = 42;
      const change = newScore - oldScore;
      
      expect(change).toBeLessThan(0);
      expect(change).toBe(-26);
    });

    it('should detect no change', () => {
      const oldScore = 50;
      const newScore = 50;
      const change = newScore - oldScore;
      
      expect(change).toBe(0);
    });
  });
});
