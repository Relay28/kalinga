const db = require('../db');

const initialPatients = [
  {
    id: '7102-4481-9352',
    firstName: 'Maria',
    middleName: 'Santos',
    lastName: 'Cruz',
    dob: '1998-05-12',
    age: 27,
    mobile: '09174829382',
    bp: '155/95',
    weight: 79.5,
    height: 160,
    bmi: '31.2',
    lmp: '2025-12-30',
    history: 'G2 P1',
    location: 'Langkas, Dalaguete, Cebu',
    midwifeId: 'MW-7729-01',
    timestamp: 'March 22, 2026 2:34 pm',
    riskFactors: {
      hypertension: true,
      family: true,
      firstpreg: false,
      multiple: false,
      diabetes: false,
      csection: false,
      pain: false
    },
    status: 'Reviewed',
    riskScore: 78,
    heartRate: 140,
    fetalAge: 'Est: 24w 3d'
  },
  {
    id: '1234-5678-9101',
    firstName: 'Anna',
    middleName: '',
    lastName: 'Reyes',
    dob: '1995-08-20',
    age: 30,
    mobile: '09182736452',
    bp: '135/85',
    weight: 62.0,
    height: 158,
    bmi: '24.8',
    lmp: '2026-01-15',
    history: 'G1 P0',
    location: 'Langkas, Dalaguete, Cebu',
    midwifeId: 'MW-7729-01',
    timestamp: 'March 22, 2026 3:12 pm',
    riskFactors: {
      hypertension: false,
      family: false,
      firstpreg: true,
      multiple: false,
      diabetes: false,
      csection: false,
      pain: false
    },
    status: 'Submitted',
    riskScore: 35,
    heartRate: 142,
    fetalAge: 'Est: 20w 1d'
  },
  {
    id: '1109-8765-4321',
    firstName: 'Leah',
    middleName: '',
    lastName: 'Dimaguiba',
    dob: '1992-11-04',
    age: 33,
    mobile: '09056453728',
    bp: '110/70',
    weight: 54.0,
    height: 152,
    bmi: '23.4',
    lmp: '2026-02-10',
    history: 'G3 P2',
    location: 'Langkas, Dalaguete, Cebu',
    midwifeId: 'MW-7729-01',
    timestamp: 'March 22, 2026 1:00 pm',
    riskFactors: {
      hypertension: false,
      family: false,
      firstpreg: false,
      multiple: false,
      diabetes: false,
      csection: true,
      pain: false
    },
    status: 'Submitted',
    riskScore: 20,
    heartRate: 138,
    fetalAge: 'Est: 18w 4d'
  }
];

const initialScans = [
  {
    id: 'scan-maria-cruz',
    patientId: '7102-4481-9352',
    timestamp: 'March 22, 2026 2:34 pm',
    location: 'Langkas, Dalaguete, Cebu',
    bp: '155/95',
    bmi: '31.2',
    scanQualityScore: 92,
    selectedBestFrame: 'best_frame_seed.png',
    fetalHeartRate: 140,
    gestationalAgeEstimate: 'Est: 24w 3d',
    preliminaryRiskLabel: 'HIGH',
    riskScore: 78,
    suggestedFlag: 'Urgent Referral',
    status: 'Reviewed',
    recommendation: 'Urgent Gynae referral requested. Fetal growth matches gestation timeline, maternal hypertension poses immediate warning signs.',
    specialistName: 'Dr. Duque',
    verifiedTime: 'March 22, 2026 4:00 pm'
  },
  {
    id: 'scan-anna-reyes',
    patientId: '1234-5678-9101',
    timestamp: 'March 22, 2026 3:12 pm',
    location: 'Langkas, Dalaguete, Cebu',
    bp: '135/85',
    bmi: '24.8',
    scanQualityScore: 88,
    selectedBestFrame: 'best_frame_seed.png',
    fetalHeartRate: 142,
    gestationalAgeEstimate: 'Est: 20w 1d',
    preliminaryRiskLabel: 'MODERATE',
    riskScore: 35,
    suggestedFlag: 'Warning',
    status: 'Submitted',
    recommendation: '',
    specialistName: '',
    verifiedTime: ''
  },
  {
    id: 'scan-leah-dimaguiba',
    patientId: '1109-8765-4321',
    timestamp: 'March 22, 2026 1:00 pm',
    location: 'Langkas, Dalaguete, Cebu',
    bp: '110/70',
    bmi: '23.4',
    scanQualityScore: 94,
    selectedBestFrame: 'best_frame_seed.png',
    fetalHeartRate: 138,
    gestationalAgeEstimate: 'Est: 18w 4d',
    preliminaryRiskLabel: 'LOW',
    riskScore: 20,
    suggestedFlag: 'Normal',
    status: 'Submitted',
    recommendation: '',
    specialistName: '',
    verifiedTime: ''
  }
];

const initialNotifications = [
  {
    id: 'notif-1',
    patientId: '7102-4481-9352',
    patientName: 'Maria Santos Cruz',
    verdict: 'Urgent Referral',
    specialistName: 'Dr. Duque',
    status: 'unread',
    iconType: 'red',
    createdAt: new Date().toISOString(),
    timestamp: 'March 22, 2026 4:00 pm'
  }
];

async function seed() {
  await db.init();
  const currentPatients = await db.getPatients();
  
  if (currentPatients.length === 0) {
    console.log("Seeding database with default records...");
    for (const p of initialPatients) {
      await db.savePatient(p);
    }
    for (const s of initialScans) {
      await db.saveScan(s);
    }
    for (const n of initialNotifications) {
      await db.saveNotification(n);
    }
    console.log("Seeding complete!");
  }
}

module.exports = { seed };
