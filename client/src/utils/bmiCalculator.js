/**
 * Calculate Body Mass Index (BMI) from weight and height.
 * 
 * @param {number} weightKg - Weight in kilograms
 * @param {number} heightCm - Height in centimeters
 * @returns {number} BMI value calculated as weight / (height/100)²
 * 
 * Formula: BMI = weight (kg) / (height (m))²
 * Where height in meters = height in cm / 100
 * 
 * Valid ranges:
 * - Weight: 30-200 kg (realistic patient weight range)
 * - Height: 100-250 cm (realistic adult height range)
 */
export function calculateBMI(weightKg, heightCm) {
  const heightM = heightCm / 100; // Convert cm to meters
  const bmi = weightKg / (heightM * heightM);
  return parseFloat(bmi.toFixed(1)); // Round to 1 decimal place
}
