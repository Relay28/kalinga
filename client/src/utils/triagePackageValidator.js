/**
 * Validates triage package data before compilation
 * Ensures all required fields are present according to requirements 8.1, 8.5, 8.6
 */

/**
 * Validate patient data required for triage package
 * @param {Object} patient - Patient object
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validatePatientData(patient) {
  const errors = [];
  
  if (!patient) {
    errors.push('Patient data is missing');
    return { valid: false, errors };
  }
  
  // Required demographics (Requirement 1.1)
  if (!patient.id) errors.push('Patient ID is required');
  if (!patient.firstName || patient.firstName.trim() === '') {
    errors.push('Patient first name is required');
  }
  if (!patient.lastName || patient.lastName.trim() === '') {
    errors.push('Patient last name is required');
  }
  
  // Required vitals (Requirements 1.1, 7.2, 7.3)
  if (!patient.bp || !patient.bp.includes('/')) {
    errors.push('Blood pressure is required (format: systolic/diastolic)');
  }
  if (!patient.bmi || isNaN(parseFloat(patient.bmi))) {
    errors.push('BMI is required and must be a number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate scan data required for triage package
 * @param {Object} scan - Scan object
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateScanData(scan) {
  const errors = [];
  
  if (!scan) {
    errors.push('Scan data is missing');
    return { valid: false, errors };
  }
  
  // Required risk scoring (Requirement 7.1, 7.8-7.10)
  if (scan.riskScore === undefined || scan.riskScore === null) {
    errors.push('Risk score is required');
  } else if (typeof scan.riskScore !== 'number' || scan.riskScore < 5 || scan.riskScore > 95) {
    errors.push('Risk score must be a number between 5 and 95');
  }
  
  // Required fetal vitals (Requirement 8.1)
  if (!scan.fetalHeartRate || isNaN(parseInt(scan.fetalHeartRate))) {
    errors.push('Fetal heart rate is required');
  }
  
  if (!scan.gestationalAgeEstimate) {
    errors.push('Gestational age estimate is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate complete triage package before storage
 * @param {Object} triagePackage - Complete triage package
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateTriagePackage(triagePackage) {
  const errors = [];
  
  if (!triagePackage) {
    errors.push('Triage package is missing');
    return { valid: false, errors };
  }
  
  // Required package fields (Requirements 8.1, 8.5, 8.6)
  if (!triagePackage.id) {
    errors.push('Package ID is required (must be UUID v4)');
  }
  
  if (!triagePackage.patientId) {
    errors.push('Patient ID is required');
  }
  
  if (!triagePackage.timestamp) {
    errors.push('Timestamp is required');
  } else {
    // Validate timestamp is a valid ISO 8601 string
    const date = new Date(triagePackage.timestamp);
    if (isNaN(date.getTime())) {
      errors.push('Timestamp must be a valid ISO 8601 date string');
    }
  }
  
  // Validate patient data exists
  const patientValidation = validatePatientData(triagePackage.patient);
  if (!patientValidation.valid) {
    errors.push(...patientValidation.errors.map(e => `Patient: ${e}`));
  }
  
  // Validate scan data
  const scanValidation = validateScanData(triagePackage);
  if (!scanValidation.valid) {
    errors.push(...scanValidation.errors.map(e => `Scan: ${e}`));
  }
  
  // Validate risk level classification (Requirements 7.8-7.10)
  const riskScore = triagePackage.riskScore;
  const riskLevel = triagePackage.preliminaryRiskLabel;
  
  if (riskScore !== undefined && riskLevel) {
    if (riskScore >= 70 && riskLevel !== 'HIGH') {
      errors.push(`Risk level mismatch: score ${riskScore} should be HIGH, got ${riskLevel}`);
    } else if (riskScore >= 40 && riskScore < 70 && riskLevel !== 'MODERATE') {
      errors.push(`Risk level mismatch: score ${riskScore} should be MODERATE, got ${riskLevel}`);
    } else if (riskScore < 40 && riskLevel !== 'LOW') {
      errors.push(`Risk level mismatch: score ${riskScore} should be LOW, got ${riskLevel}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a complete triage package with all required fields
 * @param {Object} patient - Patient data
 * @param {Object} scan - Scan data
 * @param {string} scanId - UUID v4 for the scan
 * @returns {Object} Complete triage package
 */
export function createTriagePackage(patient, scan, scanId) {
  const timestamp = new Date().toISOString();
  
  return {
    // Package identifiers (Requirement 8.5, 8.6)
    id: scanId,
    patientId: patient.id,
    timestamp,
    
    // Patient demographics and vitals (Requirement 8.1)
    patient: {
      id: patient.id,
      philhealthId: patient.philhealthId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      age: patient.age,
      bp: patient.bp,
      weight: patient.weight,
      height: patient.height,
      bmi: patient.bmi,
      riskFactors: patient.riskFactors || {},
      location: patient.location,
      lmp: patient.lmp
    },
    
    // Scan data and frames (Requirement 8.1)
    selectedBestFrame: scan.selectedBestFrame || 'assets/ultrasound_sweep.png',
    scanQualityScore: scan.scanQualityScore || 92,
    
    // Fetal vitals (Requirement 8.1)
    fetalHeartRate: scan.fetalHeartRate,
    gestationalAgeEstimate: scan.gestationalAgeEstimate,
    
    // Risk assessment (Requirements 7.1-7.10, 8.1)
    riskScore: scan.riskScore,
    preliminaryRiskLabel: scan.preliminaryRiskLabel,
    suggestedFlag: scan.suggestedFlag,
    
    // Additional metadata
    findings: scan.findings || [],
    riskDescription: scan.riskDescription,
    
    // Status tracking
    status: scan.status || 'Ready for Submission',
    location: patient.location
  };
}
