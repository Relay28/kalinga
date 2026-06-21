import { describe, it, expect } from 'vitest';
import {
  validatePatientData,
  validateScanData,
  validateTriagePackage,
  createTriagePackage
} from '../../utils/triagePackageValidator';
import { generateUuidV4 } from '../../utils/uuid';

describe('Triage Package Validator', () => {
  const validPatient = {
    id: 'patient-123',
    philhealthId: '12-345678901-2',
    firstName: 'Maria',
    lastName: 'Cruz',
    dateOfBirth: '1997-01-15',
    age: 27,
    bp: '155/95',
    weight: 65,
    height: 160,
    bmi: '25.4',
    riskFactors: {
      hypertension: true,
      family: false
    },
    location: 'Langkas, Dalaguete, Cebu',
    lmp: '2024-01-01'
  };

  const validScan = {
    selectedBestFrame: 'assets/ultrasound_sweep.png',
    scanQualityScore: 92,
    fetalHeartRate: 140,
    gestationalAgeEstimate: 'Est: 24w 3d',
    riskScore: 78,
    preliminaryRiskLabel: 'HIGH',
    suggestedFlag: 'Urgent Referral',
    findings: ['Elevated blood pressure detected'],
    riskDescription: 'Potential Preeclampsia Indicators Detected',
    status: 'Ready for Submission'
  };

  describe('validatePatientData', () => {
    it('should validate correct patient data', () => {
      const result = validatePatientData(validPatient);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing patient object', () => {
      const result = validatePatientData(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Patient data is missing');
    });

    it('should reject missing patient ID', () => {
      const patient = { ...validPatient, id: undefined };
      const result = validatePatientData(patient);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Patient ID is required');
    });

    it('should reject missing first name', () => {
      const patient = { ...validPatient, firstName: '' };
      const result = validatePatientData(patient);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Patient first name is required');
    });

    it('should reject missing last name', () => {
      const patient = { ...validPatient, lastName: '' };
      const result = validatePatientData(patient);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Patient last name is required');
    });

    it('should reject invalid blood pressure format', () => {
      const patient = { ...validPatient, bp: '155' };
      const result = validatePatientData(patient);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Blood pressure is required (format: systolic/diastolic)');
    });

    it('should reject missing BMI', () => {
      const patient = { ...validPatient, bmi: undefined };
      const result = validatePatientData(patient);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('BMI is required and must be a number');
    });

    it('should reject non-numeric BMI', () => {
      const patient = { ...validPatient, bmi: 'not-a-number' };
      const result = validatePatientData(patient);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('BMI is required and must be a number');
    });
  });

  describe('validateScanData', () => {
    it('should validate correct scan data', () => {
      const result = validateScanData(validScan);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing scan object', () => {
      const result = validateScanData(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Scan data is missing');
    });

    it('should reject missing risk score', () => {
      const scan = { ...validScan, riskScore: undefined };
      const result = validateScanData(scan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Risk score is required');
    });

    it('should reject risk score below 5', () => {
      const scan = { ...validScan, riskScore: 3 };
      const result = validateScanData(scan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Risk score must be a number between 5 and 95');
    });

    it('should reject risk score above 95', () => {
      const scan = { ...validScan, riskScore: 100 };
      const result = validateScanData(scan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Risk score must be a number between 5 and 95');
    });

    it('should reject missing fetal heart rate', () => {
      const scan = { ...validScan, fetalHeartRate: undefined };
      const result = validateScanData(scan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Fetal heart rate is required');
    });

    it('should reject missing gestational age', () => {
      const scan = { ...validScan, gestationalAgeEstimate: undefined };
      const result = validateScanData(scan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Gestational age estimate is required');
    });
  });

  describe('validateTriagePackage', () => {
    it('should validate complete triage package', () => {
      const scanId = generateUuidV4();
      const triagePackage = createTriagePackage(validPatient, validScan, scanId);
      const result = validateTriagePackage(triagePackage);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing package ID', () => {
      const scanId = generateUuidV4();
      const triagePackage = createTriagePackage(validPatient, validScan, scanId);
      triagePackage.id = undefined;
      const result = validateTriagePackage(triagePackage);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Package ID is required (must be UUID v4)');
    });

    it('should reject missing patient ID', () => {
      const scanId = generateUuidV4();
      const triagePackage = createTriagePackage(validPatient, validScan, scanId);
      triagePackage.patientId = undefined;
      const result = validateTriagePackage(triagePackage);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Patient ID is required');
    });

    it('should reject missing timestamp', () => {
      const scanId = generateUuidV4();
      const triagePackage = createTriagePackage(validPatient, validScan, scanId);
      triagePackage.timestamp = undefined;
      const result = validateTriagePackage(triagePackage);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Timestamp is required');
    });

    it('should reject invalid timestamp format', () => {
      const scanId = generateUuidV4();
      const triagePackage = createTriagePackage(validPatient, validScan, scanId);
      triagePackage.timestamp = 'not-a-valid-date';
      const result = validateTriagePackage(triagePackage);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Timestamp must be a valid ISO 8601 date string');
    });

    it('should validate risk level matches risk score - HIGH', () => {
      const scan = { ...validScan, riskScore: 75, preliminaryRiskLabel: 'HIGH' };
      const scanId = generateUuidV4();
      const triagePackage = createTriagePackage(validPatient, scan, scanId);
      const result = validateTriagePackage(triagePackage);
      expect(result.valid).toBe(true);
    });

    it('should validate risk level matches risk score - MODERATE', () => {
      const scan = { ...validScan, riskScore: 55, preliminaryRiskLabel: 'MODERATE' };
      const scanId = generateUuidV4();
      const triagePackage = createTriagePackage(validPatient, scan, scanId);
      const result = validateTriagePackage(triagePackage);
      expect(result.valid).toBe(true);
    });

    it('should validate risk level matches risk score - LOW', () => {
      const scan = { ...validScan, riskScore: 30, preliminaryRiskLabel: 'LOW' };
      const scanId = generateUuidV4();
      const triagePackage = createTriagePackage(validPatient, scan, scanId);
      const result = validateTriagePackage(triagePackage);
      expect(result.valid).toBe(true);
    });

    it('should reject mismatched risk level - HIGH score with MODERATE label', () => {
      const scan = { ...validScan, riskScore: 75, preliminaryRiskLabel: 'MODERATE' };
      const scanId = generateUuidV4();
      const triagePackage = createTriagePackage(validPatient, scan, scanId);
      const result = validateTriagePackage(triagePackage);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Risk level mismatch'))).toBe(true);
    });

    it('should reject mismatched risk level - MODERATE score with LOW label', () => {
      const scan = { ...validScan, riskScore: 55, preliminaryRiskLabel: 'LOW' };
      const scanId = generateUuidV4();
      const triagePackage = createTriagePackage(validPatient, scan, scanId);
      const result = validateTriagePackage(triagePackage);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Risk level mismatch'))).toBe(true);
    });
  });

  describe('createTriagePackage', () => {
    it('should create complete triage package with all required fields', () => {
      const scanId = generateUuidV4();
      const triagePackage = createTriagePackage(validPatient, validScan, scanId);
      
      // Package identifiers
      expect(triagePackage.id).toBe(scanId);
      expect(triagePackage.patientId).toBe(validPatient.id);
      expect(triagePackage.timestamp).toBeTruthy();
      
      // Validate timestamp is ISO 8601
      const date = new Date(triagePackage.timestamp);
      expect(date.toISOString()).toBe(triagePackage.timestamp);
      
      // Patient data
      expect(triagePackage.patient).toBeDefined();
      expect(triagePackage.patient.id).toBe(validPatient.id);
      expect(triagePackage.patient.firstName).toBe(validPatient.firstName);
      expect(triagePackage.patient.lastName).toBe(validPatient.lastName);
      expect(triagePackage.patient.bp).toBe(validPatient.bp);
      expect(triagePackage.patient.bmi).toBe(validPatient.bmi);
      
      // Scan data
      expect(triagePackage.fetalHeartRate).toBe(validScan.fetalHeartRate);
      expect(triagePackage.gestationalAgeEstimate).toBe(validScan.gestationalAgeEstimate);
      expect(triagePackage.riskScore).toBe(validScan.riskScore);
      expect(triagePackage.preliminaryRiskLabel).toBe(validScan.preliminaryRiskLabel);
    });

    it('should generate ISO 8601 timestamp', () => {
      const scanId = generateUuidV4();
      const triagePackage = createTriagePackage(validPatient, validScan, scanId);
      
      // Validate ISO 8601 format
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(isoRegex.test(triagePackage.timestamp)).toBe(true);
      
      // Validate timestamp is recent (within last second)
      const now = new Date();
      const packageDate = new Date(triagePackage.timestamp);
      const diffMs = now - packageDate;
      expect(diffMs).toBeLessThan(1000);
    });

    it('should include all patient fields in package', () => {
      const scanId = generateUuidV4();
      const triagePackage = createTriagePackage(validPatient, validScan, scanId);
      
      const patientFields = [
        'id', 'philhealthId', 'firstName', 'lastName', 'dateOfBirth', 
        'age', 'bp', 'weight', 'height', 'bmi', 'riskFactors', 'location', 'lmp'
      ];
      
      patientFields.forEach(field => {
        expect(triagePackage.patient).toHaveProperty(field);
      });
    });

    it('should include all scan fields in package', () => {
      const scanId = generateUuidV4();
      const triagePackage = createTriagePackage(validPatient, validScan, scanId);
      
      const scanFields = [
        'fetalHeartRate', 'gestationalAgeEstimate', 'riskScore', 
        'preliminaryRiskLabel', 'suggestedFlag', 'selectedBestFrame', 
        'scanQualityScore', 'findings', 'riskDescription', 'status'
      ];
      
      scanFields.forEach(field => {
        expect(triagePackage).toHaveProperty(field);
      });
    });
  });
});
