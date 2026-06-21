const fs = require('fs').promises;
const path = require('path');

/**
 * CSV Parser Utility for Kalinga Backend
 * Parses metadata.csv and resume.csv from the kalinga-backend data folder
 */

/**
 * Parse CSV file into array of objects
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array<Object>>} Parsed CSV data
 */
async function parseCSV(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.trim().split('\n');
    
    if (lines.length < 2) {
      return [];
    }
    
    // Parse header row
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] ? values[index].trim() : '';
      });
      
      data.push(row);
    }
    
    return data;
  } catch (error) {
    console.error(`Error parsing CSV file ${filePath}:`, error);
    return [];
  }
}

/**
 * Parse metadata.csv - Contains study participant demographics
 * @param {string} csvPath - Path to metadata.csv
 * @returns {Promise<Array<Object>>} Parsed metadata
 */
async function parseMetadata(csvPath) {
  const data = await parseCSV(csvPath);
  
  return data.map(row => ({
    studyName: row['Study Name'],
    protocol: row['protocol'],
    position: row['position'],
    age: parseInt(row['Age']) || 0,
    gender: row['Gender'],
    education: row['Level of Education'],
    ultrasoundExperience: parseInt(row['Ultrasound Experience']) || 1,
    yearsExperience: parseInt(row['Years of Experience']) || 0,
    ethnicity: row['Race/Ethnicity'],
    visualImpairment: row['Visual Impairment'],
    impairmentDetails: row['specify'],
    dominantHand: row['dominant hand']
  }));
}

/**
 * Parse resume.csv - Contains ultrasound frame classifications
 * @param {string} csvPath - Path to resume.csv
 * @returns {Promise<Array<Object>>} Parsed frame data
 */
async function parseFrameData(csvPath) {
  const data = await parseCSV(csvPath);
  
  return data.map(row => ({
    fileName: row['file_name'],
    studyName: row['studie'],
    classification: row['class'],
    classValue: parseInt(row['value']) || 0,
    imagePath: row['image'] || ''
  }));
}

/**
 * Group frame data by study name
 * @param {Array<Object>} frameData - Parsed frame data
 * @returns {Object} Frames grouped by study name
 */
function groupFramesByStudy(frameData) {
  const grouped = {};
  
  frameData.forEach(frame => {
    if (!grouped[frame.studyName]) {
      grouped[frame.studyName] = [];
    }
    grouped[frame.studyName].push(frame);
  });
  
  return grouped;
}

/**
 * Transform CSV data into patient records compatible with db schema
 * @param {Array<Object>} metadata - Parsed metadata
 * @param {Object} framesByStudy - Frames grouped by study
 * @returns {Array<Object>} Patient records
 */
function transformToPatients(metadata, framesByStudy) {
  return metadata.map((record, index) => {
    const frames = framesByStudy[record.studyName] || [];
    const patientId = `CSV-${String(index + 1).padStart(4, '0')}`;
    
    // Extract name components from study name if possible
    // Study names are like "Obstetrics Exam - 02-May-2024_1144_AM"
    const nameParts = generateDemoName(index);
    
    // Calculate sample vitals based on age and other factors
    const vitals = generateSampleVitals(record.age, record.gender);
    
    return {
      id: patientId,
      firstName: nameParts.firstName,
      middleName: '',
      lastName: nameParts.lastName,
      dob: calculateDOB(record.age),
      age: record.age,
      mobile: generateMobileNumber(),
      bp: vitals.bp,
      weight: vitals.weight,
      height: vitals.height,
      bmi: vitals.bmi,
      lmp: generateLMP(),
      history: vitals.history,
      location: 'Various Study Locations',
      midwifeId: 'MW-CSV-IMPORT',
      timestamp: extractTimestampFromStudy(record.studyName),
      riskFactors: {
        hypertension: vitals.hypertension,
        family: Math.random() > 0.7,
        firstpreg: vitals.history === 'G1 P0',
        multiple: Math.random() > 0.9,
        diabetes: Math.random() > 0.85,
        csection: Math.random() > 0.7,
        pain: Math.random() > 0.8
      },
      status: 'CSV Import',
      riskScore: vitals.riskScore,
      heartRate: null,
      fetalAge: null,
      csvMetadata: {
        studyName: record.studyName,
        protocol: record.protocol,
        position: record.position,
        education: record.education,
        ultrasoundExperience: record.ultrasoundExperience,
        ethnicity: record.ethnicity,
        visualImpairment: record.visualImpairment,
        dominantHand: record.dominantHand,
        frameCount: frames.length
      }
    };
  });
}

/**
 * Transform CSV data into scan records
 * @param {Array<Object>} patients - Patient records
 * @param {Object} framesByStudy - Frames grouped by study
 * @returns {Array<Object>} Scan records
 */
function transformToScans(patients, framesByStudy) {
  return patients.map(patient => {
    const frames = framesByStudy[patient.csvMetadata.studyName] || [];
    
    // Get classification summary
    const classifications = {
      biparietal: frames.filter(f => f.classification.includes('Biparietal')).length,
      abdominal: frames.filter(f => f.classification.includes('Abdominal')).length,
      heart: frames.filter(f => f.classification.includes('Heart')).length,
      spine: frames.filter(f => f.classification.includes('Spine')).length
    };
    
    return {
      id: `scan-${patient.id}`,
      patientId: patient.id,
      timestamp: patient.timestamp,
      location: patient.location,
      bp: patient.bp,
      bmi: patient.bmi,
      scanQualityScore: calculateQualityScore(frames.length),
      selectedBestFrame: 'best_frame_seed.png',
      fetalHeartRate: 135 + Math.floor(Math.random() * 15),
      gestationalAgeEstimate: `Est: ${18 + Math.floor(Math.random() * 12)}w ${Math.floor(Math.random() * 7)}d`,
      preliminaryRiskLabel: getRiskLabel(patient.riskScore),
      riskScore: patient.riskScore,
      suggestedFlag: getSuggestedFlag(patient.riskScore),
      status: 'Submitted',
      recommendation: '',
      specialistName: '',
      verifiedTime: '',
      csvMetadata: {
        frameCount: frames.length,
        classifications: classifications,
        frames: frames.slice(0, 10).map(f => ({
          fileName: f.fileName,
          classification: f.classification
        }))
      }
    };
  });
}

// Helper functions

function generateDemoName(index) {
  const firstNames = ['Maria', 'Ana', 'Rosa', 'Elena', 'Sofia', 'Carmen', 'Lucia', 'Isabel', 'Teresa', 'Patricia'];
  const lastNames = ['Santos', 'Cruz', 'Reyes', 'Garcia', 'Dimaguiba', 'Torres', 'Fernandez', 'Lopez', 'Martinez', 'Gonzales'];
  
  return {
    firstName: firstNames[index % firstNames.length],
    lastName: lastNames[Math.floor(index / firstNames.length) % lastNames.length]
  };
}

function calculateDOB(age) {
  const currentYear = 2026; // System uses future dates
  const birthYear = currentYear - age;
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  return `${birthYear}-${month}-${day}`;
}

function generateMobileNumber() {
  return `09${Math.floor(100000000 + Math.random() * 900000000)}`;
}

function generateSampleVitals(age, gender) {
  // Generate realistic vitals based on age
  const baseWeight = gender === 'Female' ? 55 : 65;
  const baseHeight = gender === 'Female' ? 155 : 165;
  
  const weight = baseWeight + Math.floor(Math.random() * 30);
  const height = baseHeight + Math.floor(Math.random() * 20);
  const bmi = (weight / Math.pow(height / 100, 2)).toFixed(1);
  
  // Blood pressure
  const systolic = 110 + Math.floor(Math.random() * 40);
  const diastolic = 70 + Math.floor(Math.random() * 20);
  const bp = `${systolic}/${diastolic}`;
  
  // History
  const g = Math.floor(Math.random() * 4) + 1;
  const p = Math.floor(Math.random() * g);
  const history = `G${g} P${p}`;
  
  // Risk score calculation
  let riskScore = 15; // Base
  if (systolic >= 140) riskScore += 25;
  if (parseFloat(bmi) >= 30) riskScore += 8;
  else if (parseFloat(bmi) >= 25) riskScore += 4;
  
  riskScore = Math.min(95, Math.max(5, riskScore));
  
  return {
    weight,
    height,
    bmi,
    bp,
    history,
    hypertension: systolic >= 140,
    riskScore
  };
}

function generateLMP() {
  const date = new Date(2026, 0, 1); // Start from Jan 2026
  date.setDate(date.getDate() - Math.floor(Math.random() * 180)); // Up to 6 months ago
  return date.toISOString().split('T')[0];
}

function extractTimestampFromStudy(studyName) {
  // Extract date/time from study name like "Obstetrics Exam - 02-May-2024_1144_AM"
  const match = studyName.match(/(\d{2})-(\w+)-(\d{4})_(\d+)_(\w+)/);
  if (match) {
    const [, day, month, year, time, period] = match;
    const monthMap = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    const monthNum = monthMap[month] || '01';
    const hour = time.slice(0, -2);
    const minute = time.slice(-2);
    return `${month} ${day}, ${year} ${hour}:${minute} ${period}`;
  }
  return new Date().toLocaleString();
}

function calculateQualityScore(frameCount) {
  // More frames generally indicate better scan
  return Math.min(95, 70 + frameCount * 2);
}

function getRiskLabel(score) {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  return 'LOW';
}

function getSuggestedFlag(score) {
  if (score >= 70) return 'Urgent Referral';
  if (score >= 40) return 'Warning';
  return 'Normal';
}

module.exports = {
  parseMetadata,
  parseFrameData,
  groupFramesByStudy,
  transformToPatients,
  transformToScans
};
