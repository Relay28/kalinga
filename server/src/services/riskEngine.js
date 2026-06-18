function calculateRisk(bp, bmiValue, age, riskFactors) {
  let score = 15; // Baseline risk

  // 1. Analyze BP
  if (bp && bp.includes('/')) {
    const parts = bp.split('/');
    const systolic = parseInt(parts[0]);
    const diastolic = parseInt(parts[1]);
    
    if (systolic >= 160 || diastolic >= 100) {
      score += 35; // Severe range
    } else if (systolic >= 140 || diastolic >= 90) {
      score += 25; // Moderate range
    } else if (systolic >= 130 || diastolic >= 85) {
      score += 12; // Elevated range
    }
  }

  // 2. BMI Contribution
  const bmi = parseFloat(bmiValue);
  if (!isNaN(bmi)) {
    if (bmi >= 30) {
      score += 8; // Obese
    } else if (bmi >= 25) {
      score += 4; // Overweight
    }
  }

  // 3. Clinical Risk History Checklist Flags
  if (riskFactors.hypertension) score += 20;
  if (riskFactors.family) score += 10;
  if (riskFactors.firstpreg) score += 4;
  if (riskFactors.multiple) score += 8;
  if (riskFactors.diabetes) score += 10;
  if (riskFactors.csection) score += 5;
  if (riskFactors.pain) score += 8;

  // Cap outputs logically
  if (score > 95) score = 95;
  if (score < 5) score = 5;

  return Math.round(score);
}

module.exports = { calculateRisk };
