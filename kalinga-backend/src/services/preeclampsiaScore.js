"use strict";

/**
 * Deterministic preeclampsia triage scoring for the Kalinga AI MVP demo.
 *
 * This module is intentionally lightweight and predictable for hackathon demos.
 * It supports independent vitals assessment and integrates with existing patient records.
 * It can run in Node.js and browser-compatible bundlers.
 *
 * INTEGRATION GUIDE:
 * ──────────────────
 *
 * 1. Import and score patients from patients.json:
 *    const { scoreDemoPatients } = require('./preeclampsiaScore.js');
 *    const patients = JSON.parse(fs.readFileSync('./data/mock_db/patients.json'));
 *    const assessments = scoreDemoPatients(patients);
 *
 * 2. Direct vitals scoring (for live clinical inputs):
 *    const { calculateRiskScore } = require('./preeclampsiaScore.js');
 *    const result = calculateRiskScore({
 *      systolic_bp: 150,
 *      diastolic_bp: 95,
 *      age: 28,
 *      pre_existing_hypertension: true,
 *      ai_ultrasound_findings: "Normal"
 *    });
 *
 * 3. Ultrasound simulation frames (separate file):
 *    const ultrasoundFrames = JSON.parse(fs.readFileSync('./data/mock_db/ultrasoundSimulation.json'));
 *    // Use frames in midwife UI to show real-time 8-second sweep guidance
 */

const ALLOWED_FINDINGS = new Set([
  "Normal",
  "Placenta Previa",
  "Fetal Malpresentation",
]);

/**
 * Validate a vitals object with clinical measurements.
 * Throws early to keep the demo deterministic and safe.
 *
 * @param {object} vitalsObject - Must contain: systolic_bp, diastolic_bp, age, pre_existing_hypertension, ai_ultrasound_findings
 */
function validateVitalsObject(vitalsObject) {
  if (!vitalsObject || typeof vitalsObject !== "object") {
    throw new TypeError("vitalsObject must be a non-null object");
  }

  const requiredNumericFields = ["age", "systolic_bp", "diastolic_bp"];
  for (const field of requiredNumericFields) {
    if (typeof vitalsObject[field] !== "number" || Number.isNaN(vitalsObject[field])) {
      throw new TypeError(`${field} must be a valid number`);
    }
  }

  if (typeof vitalsObject.pre_existing_hypertension !== "boolean") {
    throw new TypeError("pre_existing_hypertension must be a boolean");
  }

  if (!ALLOWED_FINDINGS.has(vitalsObject.ai_ultrasound_findings)) {
    throw new TypeError(
      "ai_ultrasound_findings must be one of: Normal, Placenta Previa, Fetal Malpresentation"
    );
  }
}

/**
 * Attach demo vitals to a patient from patients.json based on risk_factors.
 * Allows deterministic demo scoring with real patient records.
 *
 * @param {object} patient - Patient record from patients.json
 * @returns {object} Patient augmented with demo vitals data
 */
function attachDemoVitalsToPatient(patient) {
  if (!patient || typeof patient !== "object") {
    throw new TypeError("patient must be a non-null object");
  }

  // Risk-factor-based demo vitals assignment
  const hasChronicHypertension = patient.risk_factors?.includes("chronic_hypertension");
  const hasGestationalDiabetes = patient.risk_factors?.includes("gestational_diabetes");
  const hasNoRiskFactors = !patient.risk_factors || patient.risk_factors.length === 0;

  if (hasChronicHypertension) {
    // HIGH RISK demo scenario
    return {
      ...patient,
      systolic_bp: 168,
      diastolic_bp: 112,
      bmi: 31.4,
      pre_existing_hypertension: true,
      ai_ultrasound_findings: "Placenta Previa",
      gestational_age_weeks: 33.0,
    };
  } else if (hasGestationalDiabetes) {
    // MODERATE RISK demo scenario
    return {
      ...patient,
      systolic_bp: 135,
      diastolic_bp: 85,
      bmi: 27.2,
      pre_existing_hypertension: false,
      ai_ultrasound_findings: "Fetal Malpresentation",
      gestational_age_weeks: 27.5,
    };
  } else if (hasNoRiskFactors) {
    // LOW RISK demo scenario
    return {
      ...patient,
      systolic_bp: 115,
      diastolic_bp: 75,
      bmi: 22.8,
      pre_existing_hypertension: false,
      ai_ultrasound_findings: "Normal",
      gestational_age_weeks: 24.0,
    };
  }

  // Fallback for unknown risk factors: conservative moderate risk
  return {
    ...patient,
    systolic_bp: 130,
    diastolic_bp: 82,
    bmi: 25.0,
    pre_existing_hypertension: false,
    ai_ultrasound_findings: "Normal",
    gestational_age_weeks: 28.0,
  };
}

/**
 * Calculate the deterministic risk score for vitals data.
 *
 * Rules implemented per hackathon specification:
 * - BP points: severe=3, moderate=2, pre-hypertensive=1
 * - Maternal history: pre-existing HTN=2
 * - Age extremes (<18 or >35)=1
 * - Ultrasound findings: Placenta Previa=3, Fetal Malpresentation=2
 * - Red-flag override: severe BP OR Placenta Previa => HIGH RISK + immediate transport
 *
 * @param {object} vitalsObject - Object with systolic_bp, diastolic_bp, age, pre_existing_hypertension, ai_ultrasound_findings
 * @returns {{total_points: number, risk_tier: string, requires_immediate_transport: boolean}}
 */
function calculateRiskScore(vitalsObject) {
  validateVitalsObject(vitalsObject);

  const systolic = vitalsObject.systolic_bp;
  const diastolic = vitalsObject.diastolic_bp;
  const finding = vitalsObject.ai_ultrasound_findings;

  let totalPoints = 0;

  // Blood pressure contribution.
  if (systolic >= 160 || diastolic >= 110) {
    totalPoints += 3;
  } else if (systolic >= 140 || diastolic >= 90) {
    totalPoints += 2;
  } else if (systolic >= 130 || diastolic >= 80) {
    totalPoints += 1;
  }

  // History and demographic contribution.
  if (vitalsObject.pre_existing_hypertension) {
    totalPoints += 2;
  }

  if (vitalsObject.age < 18 || vitalsObject.age > 35) {
    totalPoints += 1;
  }

  // AI ultrasound finding contribution.
  if (finding === "Placenta Previa") {
    totalPoints += 3;
  } else if (finding === "Fetal Malpresentation") {
    totalPoints += 2;
  }

  const hasRedFlag =
    systolic >= 160 ||
    diastolic >= 110 ||
    finding === "Placenta Previa";

  let riskTier = "LOW RISK";
  let requiresImmediateTransport = false;

  // Red-flag protocol supersedes numeric bands for patient safety.
  if (hasRedFlag) {
    riskTier = "HIGH RISK";
    requiresImmediateTransport = true;
  } else if (totalPoints >= 5) {
    riskTier = "HIGH RISK";
    requiresImmediateTransport = true;
  } else if (totalPoints >= 3) {
    riskTier = "MODERATE RISK";
  }

  return {
    total_points: totalPoints,
    risk_tier: riskTier,
    requires_immediate_transport: requiresImmediateTransport,
  };
}

/**
 * Score a patient from patients.json by attaching demo vitals first.
 * Integrates cleanly with existing patient database.
 *
 * @param {object} patient - Patient record from patients.json
 * @returns {{patient_id: string, full_name: string, assessment: {total_points: number, risk_tier: string, requires_immediate_transport: boolean}}}
 */
function scoreDemoPatient(patient) {
  if (!patient || typeof patient !== "object") {
    throw new TypeError("patient must be a non-null object");
  }

  const patientWithVitals = attachDemoVitalsToPatient(patient);
  return {
    patient_id: patient.id,
    full_name: patient.full_name,
    risk_factors: patient.risk_factors,
    assessment: calculateRiskScore(patientWithVitals),
  };
}

/**
 * Batch helper that scores multiple patients from patients.json.
 *
 * @param {object[]} patients - Array of patient records
 * @returns {Array<{patient_id: string, full_name: string, assessment: {total_points: number, risk_tier: string, requires_immediate_transport: boolean}}>}
 */
function scoreDemoPatients(patients) {
  if (!Array.isArray(patients)) {
    throw new TypeError("patients must be an array");
  }

  return patients.map((patient) => scoreDemoPatient(patient));
}

module.exports = {
  calculateRiskScore,
  scoreDemoPatient,
  scoreDemoPatients,
  attachDemoVitalsToPatient,
  ALLOWED_FINDINGS,
};
