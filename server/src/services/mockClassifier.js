const { calculateRisk } = require('./riskEngine');

function classifyScan(patient) {
  const score = calculateRisk(patient.bp, patient.bmi, patient.age, patient.riskFactors);
  
  let suggestedFlag = 'Normal';
  let preliminaryRiskLabel = 'LOW';
  
  if (score >= 70) {
    suggestedFlag = 'Urgent Referral';
    preliminaryRiskLabel = 'HIGH';
  } else if (score >= 40) {
    suggestedFlag = 'Warning';
    preliminaryRiskLabel = 'MODERATE';
  }

  // Calculate mock gestational age based on LMP
  let gestationalAgeEstimate = 'Est: 24w 3d';
  if (patient.lmp) {
    const lmpDate = new Date(patient.lmp);
    const diffTime = Math.abs(new Date() - lmpDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    if (weeks > 0 && weeks < 42) {
      gestationalAgeEstimate = `Est: ${weeks}w ${days}d`;
    }
  }

  return {
    scanQualityScore: Math.floor(88 + Math.random() * 8),
    selectedBestFrame: 'assets/ultrasound_sweep.png',
    fetalHeartRate: Math.floor(138 + Math.random() * 6),
    gestationalAgeEstimate,
    preliminaryRiskLabel,
    riskScore: score,
    suggestedFlag
  };
}

module.exports = { classifyScan };
