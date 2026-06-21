/**
 * CSV Data Import Script for Kalinga AI
 * 
 * This script imports ultrasound study data from the kalinga-backend CSV files
 * and integrates it into the existing JSON database.
 * 
 * Usage: node server/src/scripts/importCSV.js
 */

const path = require('path');
const db = require('../db');
const {
  parseMetadata,
  parseFrameData,
  groupFramesByStudy,
  transformToPatients,
  transformToScans
} = require('../utils/csvParser');

// Paths to CSV files in kalinga-backend
const CSV_BASE_PATH = path.join(__dirname, '..', '..', '..', '..', 'kalinga-main', 'kalinga-backend', 'data');
const METADATA_CSV = path.join(CSV_BASE_PATH, 'metadata.csv');
const RESUME_CSV = path.join(CSV_BASE_PATH, 'resume.csv');

async function importCSVData() {
  console.log('========================================');
  console.log('  Kalinga AI - CSV Data Import Tool');
  console.log('========================================\n');
  
  try {
    // Initialize database
    console.log('[1/6] Initializing database...');
    await db.init();
    console.log('✓ Database initialized\n');
    
    // Parse CSV files
    console.log('[2/6] Parsing CSV files...');
    console.log(`  - Metadata: ${METADATA_CSV}`);
    console.log(`  - Frame Data: ${RESUME_CSV}`);
    
    const metadata = await parseMetadata(METADATA_CSV);
    const frameData = await parseFrameData(RESUME_CSV);
    
    console.log(`✓ Parsed ${metadata.length} study records`);
    console.log(`✓ Parsed ${frameData.length} frame records\n`);
    
    // Group frames by study
    console.log('[3/6] Grouping frames by study...');
    const framesByStudy = groupFramesByStudy(frameData);
    console.log(`✓ Organized into ${Object.keys(framesByStudy).length} studies\n`);
    
    // Transform to patient records
    console.log('[4/6] Transforming to patient records...');
    const patients = transformToPatients(metadata, framesByStudy);
    console.log(`✓ Generated ${patients.length} patient records\n`);
    
    // Transform to scan records
    console.log('[5/6] Transforming to scan records...');
    const scans = transformToScans(patients, framesByStudy);
    console.log(`✓ Generated ${scans.length} scan records\n`);
    
    // Save to database
    console.log('[6/6] Saving to database...');
    let patientCount = 0;
    let scanCount = 0;
    
    for (const patient of patients) {
      await db.savePatient(patient);
      patientCount++;
    }
    
    for (const scan of scans) {
      await db.saveScan(scan);
      scanCount++;
    }
    
    console.log(`✓ Saved ${patientCount} patients`);
    console.log(`✓ Saved ${scanCount} scans\n`);
    
    // Display summary
    console.log('========================================');
    console.log('  Import Summary');
    console.log('========================================');
    console.log(`Total Studies Processed: ${metadata.length}`);
    console.log(`Total Frames Processed: ${frameData.length}`);
    console.log(`Patients Added: ${patientCount}`);
    console.log(`Scans Added: ${scanCount}`);
    
    // Classification breakdown
    console.log('\nFrame Classifications:');
    const classifications = {};
    frameData.forEach(frame => {
      classifications[frame.classification] = (classifications[frame.classification] || 0) + 1;
    });
    Object.entries(classifications).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} frames`);
    });
    
    console.log('\n✓ CSV data import completed successfully!\n');
    
  } catch (error) {
    console.error('\n✗ Error during CSV import:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Display sample data
async function displaySampleData() {
  console.log('\nSample Patient Record:');
  console.log('----------------------------------------');
  const metadata = await parseMetadata(METADATA_CSV);
  const frameData = await parseFrameData(RESUME_CSV);
  const framesByStudy = groupFramesByStudy(frameData);
  const patients = transformToPatients(metadata.slice(0, 1), framesByStudy);
  const scans = transformToScans(patients, framesByStudy);
  
  console.log(JSON.stringify(patients[0], null, 2));
  console.log('\nSample Scan Record:');
  console.log('----------------------------------------');
  console.log(JSON.stringify(scans[0], null, 2));
  console.log('');
}

// Check if running with --sample flag
if (process.argv.includes('--sample')) {
  displaySampleData().then(() => {
    console.log('Use: node server/src/scripts/importCSV.js');
    console.log('To perform the actual import.\n');
  });
} else {
  importCSVData();
}
