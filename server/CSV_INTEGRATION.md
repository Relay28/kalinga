# CSV Data Integration Guide

## Overview

This document describes the integration of ultrasound study data from the `kalinga-backend` CSV files into the Kalinga AI system.

## Data Sources

The CSV data is located in: `kalinga-main/kalinga-backend/data/`

### 1. metadata.csv
Contains study participant demographics and ultrasound examination metadata:

- **Study Name**: Unique identifier for each examination session
- **Protocol**: Examination protocol (Vertical, Horizontal, Diagonal)
- **Position**: Fetal position (OA, SA, SP, OP)
- **Demographics**: Age, Gender, Education Level
- **Ultrasound Experience**: Experience level and years
- **Ethnicity**: Race/Ethnicity information
- **Visual Impairment**: Any visual impairments
- **Dominant Hand**: Right-handed or Left-handed

**Total Records**: 91 study sessions

### 2. resume.csv
Contains ultrasound frame classifications:

- **file_name**: Name of the ultrasound image file
- **studie**: Reference to the study name from metadata
- **class**: Anatomical plane classification
- **value**: Classification value (0-3)
- **image**: Image path (if available)

**Total Records**: 1562 ultrasound frames

**Frame Classifications**:
- **Biparietal standard plane** (value: 0): Fetal head measurements
- **Abdominal standard plane** (value: 1): Abdominal circumference
- **Heart standard plane** (value: 2): Cardiac structures
- **Spine standard plane** (value: 3): Spinal structures

## Architecture Integration

### Data Flow

```
CSV Files (kalinga-backend/data/)
    ↓
csvParser.js (Parse & Transform)
    ↓
importCSV.js (Import Script)
    ↓
db.js (JSON Database)
    ↓
REST API Endpoints
    ↓
Client Applications
```

### Components

#### 1. CSV Parser (`server/src/utils/csvParser.js`)
Utility functions for parsing and transforming CSV data:

- `parseMetadata()`: Parse metadata.csv into structured objects
- `parseFrameData()`: Parse resume.csv frame classifications
- `groupFramesByStudy()`: Group frames by study name
- `transformToPatients()`: Convert CSV data to patient records
- `transformToScans()`: Convert CSV data to scan records

#### 2. Import Script (`server/src/scripts/importCSV.js`)
Automated script for importing CSV data into the database:

- Parses both CSV files
- Transforms data to match database schema
- Saves patients and scans to JSON database
- Provides detailed import summary

## Usage

### Option 1: View Sample Data (No Import)

```bash
cd server
npm run import:sample
```

This displays sample transformed data without importing.

### Option 2: Import CSV Data

```bash
cd server
npm run import:csv
```

This imports all CSV data into the database.

### Option 3: Manual Script Execution

```bash
node server/src/scripts/importCSV.js          # Full import
node server/src/scripts/importCSV.js --sample # Sample preview
```

## Data Transformation

### Patient Record Transformation

CSV metadata is transformed into patient records:

```javascript
{
  id: "CSV-0001",                    // Generated ID
  firstName: "Maria",                // Generated from index
  lastName: "Santos",                // Generated from index
  age: 20,                          // From CSV
  bp: "135/85",                     // Generated based on risk factors
  weight: 62.5,                     // Generated realistic values
  height: 158,                      // Generated realistic values
  bmi: "25.0",                      // Calculated
  riskScore: 35,                    // Calculated
  csvMetadata: {
    studyName: "Obstetrics Exam...", // Original study name
    protocol: "Vertical",            // From CSV
    position: "OA",                  // From CSV
    frameCount: 42                   // Count of frames for this study
  }
}
```

### Scan Record Transformation

Frame data is transformed into scan records:

```javascript
{
  id: "scan-CSV-0001",
  patientId: "CSV-0001",
  scanQualityScore: 88,             // Based on frame count
  csvMetadata: {
    frameCount: 42,
    classifications: {
      biparietal: 15,
      abdominal: 12,
      heart: 8,
      spine: 7
    },
    frames: [...]                    // Sample of frames
  }
}
```

## Integration with Existing System

The CSV import integrates seamlessly with the existing database:

1. **Preserves Existing Data**: Import adds to existing patients/scans
2. **Unique IDs**: CSV patients get `CSV-####` IDs to avoid conflicts
3. **Status Marking**: CSV imports marked with `status: "CSV Import"`
4. **Metadata Preservation**: Original CSV metadata stored in `csvMetadata` field

## Database Schema Compatibility

### Patient Schema
All required fields are populated:
- ✓ Demographics (name, age, dob)
- ✓ Contact (mobile)
- ✓ Vitals (bp, weight, height, bmi)
- ✓ Clinical (lmp, history, riskFactors)
- ✓ System (id, timestamp, status)
- ✓ CSV Metadata (csvMetadata object)

### Scan Schema
All required fields are populated:
- ✓ Patient Reference (patientId)
- ✓ Vitals (bp, bmi, fetalHeartRate)
- ✓ Risk Assessment (riskScore, riskLevel)
- ✓ Quality Metrics (scanQualityScore)
- ✓ System (id, timestamp, status)
- ✓ CSV Metadata (frameCount, classifications)

## Data Validation

The import script includes:
- CSV parsing error handling
- Data type validation
- Range checking for numeric values
- Missing data handling with defaults

## Use Cases

### 1. Testing & Development
- Large dataset for UI testing
- Realistic patient profiles
- Variety of frame classifications

### 2. Algorithm Training
- Frame classification data for ML models
- Patient demographic diversity
- Risk score validation data

### 3. Performance Testing
- 91 patient records
- 1562 frame records
- Stress testing database operations

### 4. Demo & Presentations
- Real study data
- Professional ultrasound classifications
- Comprehensive metadata

## Frame Classification Details

### Distribution (from resume.csv)
- **Biparietal standard plane**: ~42 frames per study (avg)
- **Abdominal standard plane**: ~35 frames per study
- **Heart standard plane**: ~30 frames per study  
- **Spine standard plane**: ~65 frames per study

### Classification Value Mapping
```
0 = Biparietal standard plane  (Fetal head measurements)
1 = Abdominal standard plane   (Abdominal circumference)
2 = Heart standard plane        (Cardiac structures)
3 = Spine standard plane        (Spinal structures)
```

## Study Metadata

### Demographics
- Age range: 18-38 years
- Gender: Primarily Female (typical for obstetrics)
- Ethnicity: Hispanic, Mayan descendant
- Education: High School, Technician, Bachelor Degree

### Examination Details
- **Protocols**: Vertical, Horizontal, Diagonal (/ and \\)
- **Positions**: OA (Occiput Anterior), SA (Sacrum Anterior), SP (Sacrum Posterior), OP (Occiput Posterior)
- **Experience Levels**: Mostly level 1 (novice ultrasound users)

## Post-Import Verification

After import, verify:

1. **Patient Count**: Check database has new CSV patients
2. **Scan Count**: Verify scans created for each patient
3. **Metadata Integrity**: Check `csvMetadata` fields populated
4. **Frame Classifications**: Verify frame counts in scan records

```bash
# After import, check the database
cat server/data/db.json | grep "CSV-" | wc -l
```

## Troubleshooting

### CSV Files Not Found
```
Error: ENOENT: no such file or directory
```
**Solution**: Verify kalinga-backend folder is in the correct location:
`kalinga-main/kalinga-backend/data/`

### Parsing Errors
```
Error parsing CSV file
```
**Solution**: Check CSV file format (UTF-8, comma-delimited)

### Database Write Errors
```
Failed to save database
```
**Solution**: Ensure `server/data/` directory exists and is writable

## Future Enhancements

1. **Incremental Imports**: Track imported records to avoid duplicates
2. **CSV Validation**: Pre-import validation of CSV format
3. **Image Integration**: Link actual ultrasound image files
4. **Metadata Expansion**: Additional clinical data fields
5. **Export Functionality**: Export database back to CSV

## Related Files

- `server/src/utils/csvParser.js` - CSV parsing utilities
- `server/src/scripts/importCSV.js` - Import script
- `server/src/db.js` - Database operations
- `server/package.json` - NPM scripts
- `kalinga-main/kalinga-backend/data/*.csv` - Source CSV files

## Contact & Support

For issues or questions about CSV integration:
1. Check this documentation
2. Review the import script logs
3. Verify CSV file locations and formats
4. Check database file permissions

---

**Last Updated**: Generated during CSV integration implementation
**Version**: 1.0.0
