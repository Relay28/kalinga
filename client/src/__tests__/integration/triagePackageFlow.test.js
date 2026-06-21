import { describe, it, expect, beforeEach } from 'vitest';
import { generateUuidV4 } from '../../utils/uuid';
import { validateTriagePackage, createTriagePackage } from '../../utils/triagePackageValidator';
import { calculateRiskLocally } from '../../services/aiService';

/**
 * Integration test for triage package creation flow
 * Simulates the complete workflow from patient registration through scan to package creation
 */
describe('Triage Package Creation Flow', () => {
  let mockPatient;
  let mockScanResult;

  beforeEach(() => {
    // Simulate patient data from PatientRegistration component
    mockPatient = {
      id: 'patient-7102-4481-9352',
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
        family: true,
        diabetes: false,
        firstpreg: false,
        multiple: false,
        csection: false,
        pain: false
      },
      location: 'Langkas, Dalaguete, Cebu',
      lmp: '2025-12-30'
    };

    // Simulate scan result from ScanSimulator component
    mockScanResult = {
      selectedBestFrame: 'http://localhost:5000/assets/ultrasound_sweep.png',
      scanQualityScore: 92,
      fetalHeartRate: 140,
      gestationalAge: '24w 3d',
      gestationalAgeEstimate: 'Est: 24w 3d',
      preliminaryRiskLabel: 'HIGH',
      riskScore: 78,
      riskDescription: 'Potential Preeclampsia Indicators Detected',
      suggestedFlag: 'Urgent Referral',
      findings: [
        'Elevated blood pressure detected',
        'High BMI risk factor',
        'Uterine artery resistance increased',
        'No nasal abnormality detected in this scan'
      ],
      status: 'Ready for Submission'
    };
  });

  it('should create valid triage package from patient and scan data', () => {
    // Step 1: Generate UUID v4 for scan
    const scanId = generateUuidV4();
    expect(scanId).toBeTruthy();
    
    // Step 2: Create triage package
    const triagePackage = createTriagePackage(mockPatient, mockScanResult, scanId);
    
    // Step 3: Validate package
    const validation = validateTriagePackage(triagePackage);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    
    // Verify package structure
    expect(triagePackage.id).toBe(scanId);
    expect(triagePackage.patientId).toBe(mockPatient.id);
    expect(triagePackage.timestamp).toBeTruthy();
    expect(triagePackage.riskScore).toBe(78);
    expect(triagePackage.preliminaryRiskLabel).toBe('HIGH');
  });

  it('should calculate risk score correctly for Maria Cruz scenario', () => {
    // Calculate risk using the rules-based algorithm
    const riskScore = calculateRiskLocally(
      mockPatient.bp,
      mockPatient.bmi,
      mockPatient.age,
      mockPatient.riskFactors
    );
    
    // Maria has: BP 155/95 (+25), BMI 25.4 (+4), hypertension (+20), family (+10), baseline (+15)
    // Expected: 15 + 25 + 4 + 20 + 10 = 74
    expect(riskScore).toBeGreaterThanOrEqual(70); // HIGH risk threshold
    expect(riskScore).toBeLessThanOrEqual(95); // Maximum score
    
    // Verify risk level classification
    const riskLevel = riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MODERATE' : 'LOW';
    expect(riskLevel).toBe('HIGH');
  });

  it('should handle moderate risk patient correctly', () => {
    // Create a moderate risk patient
    const moderatePatient = {
      ...mockPatient,
      bp: '135/88', // Elevated BP (+12)
      bmi: '26.0',  // Overweight (+4)
      riskFactors: {
        hypertension: false,
        family: true, // +10
        diabetes: false,
        firstpreg: true, // +4
        multiple: false,
        csection: false,
        pain: false
      }
    };
    
    // Calculate risk: 15 + 12 + 4 + 10 + 4 = 45 (MODERATE)
    const riskScore = calculateRiskLocally(
      moderatePatient.bp,
      moderatePatient.bmi,
      moderatePatient.age,
      moderatePatient.riskFactors
    );
    
    expect(riskScore).toBeGreaterThanOrEqual(40);
    expect(riskScore).toBeLessThan(70);
    
    const scanResult = {
      ...mockScanResult,
      riskScore,
      preliminaryRiskLabel: 'MODERATE',
      suggestedFlag: 'Warning'
    };
    
    const scanId = generateUuidV4();
    const triagePackage = createTriagePackage(moderatePatient, scanResult, scanId);
    const validation = validateTriagePackage(triagePackage);
    
    expect(validation.valid).toBe(true);
    expect(triagePackage.preliminaryRiskLabel).toBe('MODERATE');
  });

  it('should handle low risk patient correctly', () => {
    // Create a low risk patient
    const lowRiskPatient = {
      ...mockPatient,
      bp: '120/80',  // Normal BP (+0)
      bmi: '22.0',   // Normal BMI (+0)
      riskFactors: {
        hypertension: false,
        family: false,
        diabetes: false,
        firstpreg: false,
        multiple: false,
        csection: false,
        pain: false
      }
    };
    
    // Calculate risk: 15 + 0 + 0 + 0 = 15 (LOW)
    const riskScore = calculateRiskLocally(
      lowRiskPatient.bp,
      lowRiskPatient.bmi,
      lowRiskPatient.age,
      lowRiskPatient.riskFactors
    );
    
    expect(riskScore).toBeLessThan(40);
    
    const scanResult = {
      ...mockScanResult,
      riskScore,
      preliminaryRiskLabel: 'LOW',
      suggestedFlag: 'Normal'
    };
    
    const scanId = generateUuidV4();
    const triagePackage = createTriagePackage(lowRiskPatient, scanResult, scanId);
    const validation = validateTriagePackage(triagePackage);
    
    expect(validation.valid).toBe(true);
    expect(triagePackage.preliminaryRiskLabel).toBe('LOW');
  });

  it('should detect risk level mismatch', () => {
    // Create package with mismatched risk level
    const scanResult = {
      ...mockScanResult,
      riskScore: 75,                    // Should be HIGH
      preliminaryRiskLabel: 'MODERATE'  // Wrong label
    };
    
    const scanId = generateUuidV4();
    const triagePackage = createTriagePackage(mockPatient, scanResult, scanId);
    const validation = validateTriagePackage(triagePackage);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('Risk level mismatch'))).toBe(true);
  });

  it('should validate ISO 8601 timestamp format', () => {
    const scanId = generateUuidV4();
    const triagePackage = createTriagePackage(mockPatient, mockScanResult, scanId);
    
    // Verify timestamp is ISO 8601
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(isoRegex.test(triagePackage.timestamp)).toBe(true);
    
    // Verify timestamp is recent
    const packageDate = new Date(triagePackage.timestamp);
    const now = new Date();
    const diffMs = now - packageDate;
    expect(diffMs).toBeLessThan(1000); // Within 1 second
  });

  it('should include all required fields in package', () => {
    const scanId = generateUuidV4();
    const triagePackage = createTriagePackage(mockPatient, mockScanResult, scanId);
    
    // Package identifiers
    expect(triagePackage).toHaveProperty('id');
    expect(triagePackage).toHaveProperty('patientId');
    expect(triagePackage).toHaveProperty('timestamp');
    
    // Patient data
    expect(triagePackage).toHaveProperty('patient');
    expect(triagePackage.patient).toHaveProperty('id');
    expect(triagePackage.patient).toHaveProperty('firstName');
    expect(triagePackage.patient).toHaveProperty('lastName');
    expect(triagePackage.patient).toHaveProperty('bp');
    expect(triagePackage.patient).toHaveProperty('bmi');
    
    // Fetal vitals
    expect(triagePackage).toHaveProperty('fetalHeartRate');
    expect(triagePackage).toHaveProperty('gestationalAgeEstimate');
    
    // Risk assessment
    expect(triagePackage).toHaveProperty('riskScore');
    expect(triagePackage).toHaveProperty('preliminaryRiskLabel');
    expect(triagePackage).toHaveProperty('suggestedFlag');
  });

  it('should fail validation for missing required fields', () => {
    const scanId = generateUuidV4();
    
    // Create package with missing patient first name
    const invalidPatient = { ...mockPatient, firstName: '' };
    const triagePackage = createTriagePackage(invalidPatient, mockScanResult, scanId);
    const validation = validateTriagePackage(triagePackage);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('first name'))).toBe(true);
  });

  it('should fail validation for invalid risk score range', () => {
    const scanId = generateUuidV4();
    
    // Create package with out-of-range risk score
    const invalidScan = { ...mockScanResult, riskScore: 150 };
    const triagePackage = createTriagePackage(mockPatient, invalidScan, scanId);
    const validation = validateTriagePackage(triagePackage);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('between 5 and 95'))).toBe(true);
  });

  it('should preserve all patient risk factors in package', () => {
    const scanId = generateUuidV4();
    const triagePackage = createTriagePackage(mockPatient, mockScanResult, scanId);
    
    expect(triagePackage.patient.riskFactors).toEqual(mockPatient.riskFactors);
    expect(triagePackage.patient.riskFactors.hypertension).toBe(true);
    expect(triagePackage.patient.riskFactors.family).toBe(true);
    expect(triagePackage.patient.riskFactors.diabetes).toBe(false);
  });
});
