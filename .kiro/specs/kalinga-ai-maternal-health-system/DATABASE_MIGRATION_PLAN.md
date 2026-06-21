# Database Migration Plan: JSON to PostgreSQL

## Overview

This document outlines the comprehensive migration strategy from the current Phase 1 JSON file-based database to a production-grade PostgreSQL database with Sequelize ORM for Phase 2 of the Kalinga AI Maternal Health System.

**Current State (Phase 1)**:
- JSON file-based database (`server/data/db.json`)
- In-memory caching with 5-minute validity
- Synchronous file I/O with atomic write pattern
- Manual backup system (keeps last 10 backups)
- No relationships enforcement
- No indexing (linear search)
- No transaction support

**Target State (Phase 2)**:
- PostgreSQL relational database
- Sequelize ORM for database operations
- Proper foreign key relationships and constraints
- Indexed queries for performance
- ACID transaction support
- Connection pooling
- Automated backup and replication

## Migration Strategy

### Phase 1: Preparation (Pre-Migration)
1. **Database Analysis**: Analyze current JSON database structure and data volume
2. **Schema Design**: Design normalized PostgreSQL schema with relationships
3. **Model Creation**: Implement Sequelize models matching schema
4. **Migration Script Development**: Build data import script with validation
5. **Testing Environment**: Set up PostgreSQL instance for testing

### Phase 2: Parallel Operation (Transition)
1. **Dual-Write Mode**: Write to both JSON and PostgreSQL databases
2. **Read Verification**: Compare results between databases
3. **Performance Testing**: Benchmark PostgreSQL queries vs JSON operations
4. **Data Validation**: Verify data integrity and consistency

### Phase 3: Cutover (Production Switch)
1. **Final Data Sync**: Ensure all JSON data migrated to PostgreSQL
2. **Read Switch**: Change application to read from PostgreSQL
3. **Write Switch**: Stop writing to JSON database
4. **JSON Archive**: Archive JSON database files for rollback capability
5. **Monitoring**: Monitor PostgreSQL performance and error rates

### Phase 4: Cleanup (Post-Migration)
1. **Remove JSON Code**: Clean up JSON database module references
2. **Backup Consolidation**: Consolidate backup strategy to PostgreSQL backups
3. **Documentation Update**: Update all documentation to reflect PostgreSQL usage
4. **Rollback Plan Archival**: Store rollback procedures for 90 days post-migration

## PostgreSQL Schema Design

### Database: `kalinga_ai`

### Table: `patients`

```sql
CREATE TABLE patients (
  id VARCHAR(50) PRIMARY KEY,              -- PhilHealth ID or generated UUID
  philhealth_id VARCHAR(50) UNIQUE,        -- Philippine national health insurance ID
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  age INTEGER,                              -- Computed from DOB, stored for reporting
  mobile VARCHAR(20),
  
  -- Clinical measurements
  bp_systolic INTEGER,                      -- mmHg
  bp_diastolic INTEGER,                     -- mmHg
  weight DECIMAL(5,2),                      -- kg (e.g., 79.50)
  height DECIMAL(5,2),                      -- cm (e.g., 160.00)
  bmi DECIMAL(4,1),                         -- Computed: weight / (height/100)^2
  
  -- Obstetric history
  lmp DATE,                                 -- Last menstrual period
  obstetric_history VARCHAR(20),            -- e.g., "G2 P1" (Gravida, Para)
  
  -- Risk factors (boolean flags)
  chronic_hypertension BOOLEAN DEFAULT FALSE,
  family_history_preeclampsia BOOLEAN DEFAULT FALSE,
  is_first_pregnancy BOOLEAN DEFAULT FALSE,
  is_multiple_pregnancy BOOLEAN DEFAULT FALSE,
  has_diabetes BOOLEAN DEFAULT FALSE,
  has_previous_csection BOOLEAN DEFAULT FALSE,
  has_abdominal_pain BOOLEAN DEFAULT FALSE,
  
  -- Location and assignment
  location TEXT,
  midwife_id VARCHAR(50),                   -- Foreign key to midwives table (Phase 2+)
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'Registered',  -- Registered, Ready to Scan, Submitted, Reviewed
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- CSV import metadata (for imported data tracking)
  csv_metadata JSONB                        -- Stores original CSV fields if imported
);

-- Indexes for performance
CREATE INDEX idx_patients_philhealth ON patients(philhealth_id);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_patients_midwife ON patients(midwife_id);
CREATE INDEX idx_patients_created ON patients(created_at DESC);
CREATE INDEX idx_patients_name ON patients(last_name, first_name);
```

### Table: `scans`

```sql
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id VARCHAR(50) NOT NULL,
  
  -- Foreign key relationship
  CONSTRAINT fk_patient
    FOREIGN KEY (patient_id)
    REFERENCES patients(id)
    ON DELETE CASCADE,
  
  -- Scan metadata
  scan_type VARCHAR(50) DEFAULT 'Ultrasound',
  
  -- Risk assessment
  risk_score INTEGER CHECK (risk_score BETWEEN 5 AND 95),
  risk_level VARCHAR(20) CHECK (risk_level IN ('LOW RISK', 'MODERATE RISK', 'HIGH RISK')),
  
  -- Fetal measurements
  fetal_heart_rate INTEGER,                -- bpm
  gestational_age_estimate VARCHAR(50),    -- e.g., "Est: 24w 3d"
  
  -- Status and workflow
  status VARCHAR(50) DEFAULT 'Submitted',  -- Submitted, Under Review, Reviewed, Failed
  
  -- Specialist review
  specialist_id VARCHAR(50),               -- Foreign key to specialists table (Phase 2+)
  specialist_name VARCHAR(100),            -- Denormalized for Phase 1 compatibility
  verdict VARCHAR(50),                     -- Normal, High Risk, Urgent Referral
  specialist_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Scan capture time
  submitted_at TIMESTAMP,                  -- Upload time to server
  reviewed_at TIMESTAMP,                   -- Specialist completion time
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Encryption reference (Phase 2)
  encryption_key_id VARCHAR(100)           -- Reference to encryption key
);

-- Indexes for performance
CREATE INDEX idx_scans_patient ON scans(patient_id);
CREATE INDEX idx_scans_status ON scans(status);
CREATE INDEX idx_scans_created ON scans(created_at DESC);
CREATE INDEX idx_scans_risk_level ON scans(risk_level);
CREATE INDEX idx_scans_specialist ON scans(specialist_id);
```

### Table: `frames`

```sql
CREATE TABLE frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL,
  
  -- Foreign key relationship
  CONSTRAINT fk_scan
    FOREIGN KEY (scan_id)
    REFERENCES scans(id)
    ON DELETE CASCADE,
  
  -- Frame metadata
  sequence_number INTEGER NOT NULL,        -- 1-10 (order in sweep)
  timestamp_ms INTEGER,                    -- Milliseconds since scan start
  
  -- Image storage
  image_path TEXT,                         -- Path to stored image file or blob storage URL
  image_data TEXT,                         -- Phase 1: base64 encoded image (consider size limits)
  
  -- Quality metrics (Phase 2)
  quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 100),
  
  -- AI classification (FetalCLIP results)
  fetalclip_plane VARCHAR(50),            -- fetal_head, cardiac_4chamber, abdominal, femur, placenta
  fetalclip_confidence INTEGER CHECK (fetalclip_confidence BETWEEN 0 AND 100),
  
  -- DICOM metadata (Phase 2)
  probe_frequency DECIMAL(5,2),            -- MHz
  scan_depth DECIMAL(5,2),                 -- cm
  gain_db INTEGER,                         -- dB
  metadata JSONB,                          -- Additional metadata as JSON
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_frames_scan ON frames(scan_id);
CREATE INDEX idx_frames_sequence ON frames(scan_id, sequence_number);
CREATE INDEX idx_frames_quality ON frames(quality_score DESC);
```

### Table: `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id VARCHAR(50) NOT NULL,
  scan_id UUID NOT NULL,
  
  -- Foreign key relationships
  CONSTRAINT fk_notif_patient
    FOREIGN KEY (patient_id)
    REFERENCES patients(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_notif_scan
    FOREIGN KEY (scan_id)
    REFERENCES scans(id)
    ON DELETE CASCADE,
  
  -- Notification content
  notification_type VARCHAR(50) DEFAULT 'SCAN_REVIEWED',
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  verdict VARCHAR(50),                     -- Copy from scan.verdict
  specialist_name VARCHAR(100),
  
  -- Read status
  is_read BOOLEAN DEFAULT FALSE,
  
  -- Target recipient (Phase 2)
  midwife_id VARCHAR(50),                  -- Foreign key to midwives table
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_notifications_patient ON notifications(patient_id);
CREATE INDEX idx_notifications_scan ON notifications(scan_id);
CREATE INDEX idx_notifications_midwife ON notifications(midwife_id);
CREATE INDEX idx_notifications_read ON notifications(is_read, created_at DESC);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

### Future Tables (Phase 2+)

```sql
-- Midwives table for user management
CREATE TABLE midwives (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  location TEXT,
  license_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);


-- Specialists table for OB-GYN users
CREATE TABLE specialists (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  title VARCHAR(50),                       -- Dr., MD, OB-GYN
  credentials VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  hospital_affiliation TEXT,
  license_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);
```

## Sequelize Model Definitions

### Patient Model

```javascript
// server/src/models/Patient.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Patient = sequelize.define('Patient', {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    philhealthId: {
      type: DataTypes.STRING(50),
      unique: true,
      field: 'philhealth_id'
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name'
    },
    middleName: {
      type: DataTypes.STRING(100),
      field: 'middle_name'
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name'
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'date_of_birth'
    },
    age: {
      type: DataTypes.INTEGER
    },
    mobile: {
      type: DataTypes.STRING(20)
    },
    bpSystolic: {
      type: DataTypes.INTEGER,
      field: 'bp_systolic'
    },
    bpDiastolic: {
      type: DataTypes.INTEGER,
      field: 'bp_diastolic'
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2)
    },
    height: {
      type: DataTypes.DECIMAL(5, 2)
    },
    bmi: {
      type: DataTypes.DECIMAL(4, 1)
    },
    lmp: {
      type: DataTypes.DATEONLY
    },
    obstetricHistory: {
      type: DataTypes.STRING(20),
      field: 'obstetric_history'
    },
    chronicHypertension: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'chronic_hypertension'
    },
    familyHistoryPreeclampsia: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'family_history_preeclampsia'
    },
    isFirstPregnancy: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_first_pregnancy'
    },
    isMultiplePregnancy: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_multiple_pregnancy'
    },
    hasDiabetes: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_diabetes'
    },
    hasPreviousCsection: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_previous_csection'
    },
    hasAbdominalPain: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_abdominal_pain'
    },
    location: {
      type: DataTypes.TEXT
    },
    midwifeId: {
      type: DataTypes.STRING(50),
      field: 'midwife_id'
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'Registered'
    },
    csvMetadata: {
      type: DataTypes.JSONB,
      field: 'csv_metadata'
    }
  }, {
    tableName: 'patients',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Instance methods
  Patient.prototype.getFullName = function() {
    return `${this.firstName} ${this.middleName ? this.middleName + ' ' : ''}${this.lastName}`;
  };

  Patient.prototype.getBloodPressure = function() {
    return `${this.bpSystolic}/${this.bpDiastolic}`;
  };

  // Associations
  Patient.associate = (models) => {
    Patient.hasMany(models.Scan, {
      foreignKey: 'patientId',
      as: 'scans'
    });
    Patient.hasMany(models.Notification, {
      foreignKey: 'patientId',
      as: 'notifications'
    });
  };

  return Patient;
};
```


### Scan Model

```javascript
// server/src/models/Scan.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Scan = sequelize.define('Scan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patientId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'patient_id',
      references: {
        model: 'patients',
        key: 'id'
      }
    },
    scanType: {
      type: DataTypes.STRING(50),
      defaultValue: 'Ultrasound',
      field: 'scan_type'
    },
    riskScore: {
      type: DataTypes.INTEGER,
      validate: {
        min: 5,
        max: 95
      },
      field: 'risk_score'
    },
    riskLevel: {
      type: DataTypes.STRING(20),
      validate: {
        isIn: [['LOW RISK', 'MODERATE RISK', 'HIGH RISK']]
      },
      field: 'risk_level'
    },
    fetalHeartRate: {
      type: DataTypes.INTEGER,
      field: 'fetal_heart_rate'
    },
    gestationalAgeEstimate: {
      type: DataTypes.STRING(50),
      field: 'gestational_age_estimate'
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'Submitted'
    },
    specialistId: {
      type: DataTypes.STRING(50),
      field: 'specialist_id'
    },
    specialistName: {
      type: DataTypes.STRING(100),
      field: 'specialist_name'
    },
    verdict: {
      type: DataTypes.STRING(50)
    },
    specialistNotes: {
      type: DataTypes.TEXT,
      field: 'specialist_notes'
    },
    submittedAt: {
      type: DataTypes.DATE,
      field: 'submitted_at'
    },
    reviewedAt: {
      type: DataTypes.DATE,
      field: 'reviewed_at'
    },
    encryptionKeyId: {
      type: DataTypes.STRING(100),
      field: 'encryption_key_id'
    }
  }, {
    tableName: 'scans',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Associations
  Scan.associate = (models) => {
    Scan.belongsTo(models.Patient, {
      foreignKey: 'patientId',
      as: 'patient'
    });
    Scan.hasMany(models.Frame, {
      foreignKey: 'scanId',
      as: 'frames'
    });
    Scan.hasMany(models.Notification, {
      foreignKey: 'scanId',
      as: 'notifications'
    });
  };

  return Scan;
};
```


### Frame Model

```javascript
// server/src/models/Frame.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Frame = sequelize.define('Frame', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    scanId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'scan_id',
      references: {
        model: 'scans',
        key: 'id'
      }
    },
    sequenceNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'sequence_number'
    },
    timestampMs: {
      type: DataTypes.INTEGER,
      field: 'timestamp_ms'
    },
    imagePath: {
      type: DataTypes.TEXT,
      field: 'image_path'
    },
    imageData: {
      type: DataTypes.TEXT,
      field: 'image_data'
    },
    qualityScore: {
      type: DataTypes.INTEGER,
      validate: {
        min: 0,
        max: 100
      },
      field: 'quality_score'
    },
    fetalclipPlane: {
      type: DataTypes.STRING(50),
      field: 'fetalclip_plane'
    },
    fetalclipConfidence: {
      type: DataTypes.INTEGER,
      validate: {
        min: 0,
        max: 100
      },
      field: 'fetalclip_confidence'
    },
    probeFrequency: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'probe_frequency'
    },
    scanDepth: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'scan_depth'
    },
    gainDb: {
      type: DataTypes.INTEGER,
      field: 'gain_db'
    },
    metadata: {
      type: DataTypes.JSONB
    }
  }, {
    tableName: 'frames',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Associations
  Frame.associate = (models) => {
    Frame.belongsTo(models.Scan, {
      foreignKey: 'scanId',
      as: 'scan'
    });
  };

  return Frame;
};
```

### Notification Model

```javascript
// server/src/models/Notification.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patientId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'patient_id',
      references: {
        model: 'patients',
        key: 'id'
      }
    },
    scanId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'scan_id',
      references: {
        model: 'scans',
        key: 'id'
      }
    },
    notificationType: {
      type: DataTypes.STRING(50),
      defaultValue: 'SCAN_REVIEWED',
      field: 'notification_type'
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    verdict: {
      type: DataTypes.STRING(50)
    },
    specialistName: {
      type: DataTypes.STRING(100),
      field: 'specialist_name'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_read'
    },
    midwifeId: {
      type: DataTypes.STRING(50),
      field: 'midwife_id'
    },
    readAt: {
      type: DataTypes.DATE,
      field: 'read_at'
    }
  }, {
    tableName: 'notifications',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Associations
  Notification.associate = (models) => {
    Notification.belongsTo(models.Patient, {
      foreignKey: 'patientId',
      as: 'patient'
    });
    Notification.belongsTo(models.Scan, {
      foreignKey: 'scanId',
      as: 'scan'
    });
  };

  return Notification;
};
```


### Database Connection Configuration

```javascript
// server/src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'kalinga_ai',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    
    // Connection pool configuration
    pool: {
      max: 20,                    // Maximum connections
      min: 5,                     // Minimum connections
      acquire: 30000,             // Maximum time (ms) to get connection
      idle: 10000                 // Maximum idle time before releasing
    },
    
    // Retry configuration
    retry: {
      max: 3                      // Retry failed operations 3 times
    },
    
    // Define default settings for all models
    define: {
      underscored: true,          // Use snake_case for auto-generated fields
      timestamps: true,           // Add createdAt and updatedAt
      freezeTableName: true       // Don't pluralize table names
    }
  }
);

module.exports = sequelize;
```

### Model Initialization

```javascript
// server/src/models/index.js
const sequelize = require('../config/database');
const Patient = require('./Patient')(sequelize);
const Scan = require('./Scan')(sequelize);
const Frame = require('./Frame')(sequelize);
const Notification = require('./Notification')(sequelize);

// Initialize associations
const models = { Patient, Scan, Frame, Notification };

Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = {
  sequelize,
  ...models
};
```


## Migration Script

### JSON to PostgreSQL Data Import Script

```javascript
// server/src/scripts/migrateToPostgres.js
const fs = require('fs').promises;
const path = require('path');
const { sequelize, Patient, Scan, Frame, Notification } = require('../models');

/**
 * Migration script to import existing JSON database to PostgreSQL
 * Usage: node src/scripts/migrateToPostgres.js
 */

const JSON_DB_PATH = path.join(__dirname, '..', '..', 'data', 'db.json');

// Helper: Parse blood pressure string (e.g., "155/95")
function parseBP(bpString) {
  if (!bpString || !bpString.includes('/')) return { systolic: null, diastolic: null };
  const [systolic, diastolic] = bpString.split('/').map(v => parseInt(v));
  return { systolic, diastolic };
}

// Helper: Calculate age from date of birth
function calculateAge(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Step 1: Migrate Patients
async function migratePatients(jsonData) {
  console.log(`\nMigrating ${jsonData.patients.length} patients...`);
  let successCount = 0;
  let errorCount = 0;

  for (const patient of jsonData.patients) {
    try {
      const bp = parseBP(patient.bp);
      
      await Patient.create({
        id: patient.id,
        philhealthId: patient.id,  // Use ID as PhilHealth ID for existing data
        firstName: patient.firstName || '',
        middleName: patient.middleName || '',
        lastName: patient.lastName || '',
        dateOfBirth: patient.dob || null,
        age: patient.age || calculateAge(patient.dob),
        mobile: patient.mobile || null,
        bpSystolic: bp.systolic,
        bpDiastolic: bp.diastolic,
        weight: patient.weight || null,
        height: patient.height || null,
        bmi: patient.bmi ? parseFloat(patient.bmi) : null,
        lmp: patient.lmp || null,
        obstetricHistory: patient.history || null,
        chronicHypertension: patient.riskFactors?.hypertension || false,
        familyHistoryPreeclampsia: patient.riskFactors?.family || false,
        isFirstPregnancy: patient.riskFactors?.firstpreg || false,
        isMultiplePregnancy: patient.riskFactors?.multiple || false,
        hasDiabetes: patient.riskFactors?.diabetes || false,
        hasPreviousCsection: patient.riskFactors?.csection || false,
        hasAbdominalPain: patient.riskFactors?.pain || false,
        location: patient.location || null,
        midwifeId: patient.midwifeId || null,
        status: patient.status || 'Registered',
        csvMetadata: patient.csvMetadata || null,
        createdAt: patient.timestamp ? new Date(patient.timestamp) : new Date(),
        updatedAt: new Date()
      });
      
      successCount++;
      if (successCount % 10 === 0) {
        console.log(`  Migrated ${successCount} patients...`);
      }
    } catch (error) {
      errorCount++;
      console.error(`  Error migrating patient ${patient.id}:`, error.message);
    }
  }

  console.log(`Patients migration complete: ${successCount} success, ${errorCount} errors`);
  return { successCount, errorCount };
}

// Step 2: Migrate Scans (if any exist in JSON)
async function migrateScans(jsonData) {
  if (!jsonData.scans || jsonData.scans.length === 0) {
    console.log('\nNo scans to migrate.');
    return { successCount: 0, errorCount: 0 };
  }

  console.log(`\nMigrating ${jsonData.scans.length} scans...`);
  let successCount = 0;
  let errorCount = 0;

  for (const scan of jsonData.scans) {
    try {
      await Scan.create({
        id: scan.id,
        patientId: scan.patientId,
        scanType: scan.scanType || 'Ultrasound',
        riskScore: scan.riskScore || null,
        riskLevel: scan.riskLevel || null,
        fetalHeartRate: scan.fetalHeartRate || null,
        gestationalAgeEstimate: scan.gestationalAgeEstimate || null,
        status: scan.status || 'Submitted',
        specialistId: scan.specialistId || null,
        specialistName: scan.specialistName || null,
        verdict: scan.verdict || null,
        specialistNotes: scan.specialistNotes || null,
        createdAt: scan.createdAt ? new Date(scan.createdAt) : new Date(),
        submittedAt: scan.submittedAt ? new Date(scan.submittedAt) : null,
        reviewedAt: scan.reviewedAt ? new Date(scan.reviewedAt) : null,
        updatedAt: new Date()
      });
      
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`  Error migrating scan ${scan.id}:`, error.message);
    }
  }

  console.log(`Scans migration complete: ${successCount} success, ${errorCount} errors`);
  return { successCount, errorCount };
}

// Step 3: Migrate Notifications
async function migrateNotifications(jsonData) {
  if (!jsonData.notifications || jsonData.notifications.length === 0) {
    console.log('\nNo notifications to migrate.');
    return { successCount: 0, errorCount: 0 };
  }

  console.log(`\nMigrating ${jsonData.notifications.length} notifications...`);
  let successCount = 0;
  let errorCount = 0;

  for (const notif of jsonData.notifications) {
    try {
      await Notification.create({
        id: notif.id,
        patientId: notif.patientId,
        scanId: notif.scanId,
        notificationType: notif.type || 'SCAN_REVIEWED',
        title: notif.title || `Notification for ${notif.patientName}`,
        message: notif.message || `Scan reviewed with verdict: ${notif.verdict}`,
        verdict: notif.verdict || null,
        specialistName: notif.specialist || null,
        isRead: notif.status === 'read',
        midwifeId: notif.midwifeId || null,
        createdAt: notif.createdAt ? new Date(notif.createdAt) : new Date(),
        readAt: notif.readAt ? new Date(notif.readAt) : null,
        updatedAt: new Date()
      });
      
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`  Error migrating notification ${notif.id}:`, error.message);
    }
  }

  console.log(`Notifications migration complete: ${successCount} success, ${errorCount} errors`);
  return { successCount, errorCount };
}

// Main migration function
async function runMigration() {
  console.log('=================================');
  console.log('Kalinga AI Database Migration');
  console.log('JSON to PostgreSQL');
  console.log('=================================\n');

  try {
    // Step 0: Test database connection
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection successful.\n');

    // Step 1: Load JSON data
    console.log('Loading JSON database...');
    const jsonContent = await fs.readFile(JSON_DB_PATH, 'utf8');
    const jsonData = JSON.parse(jsonContent);
    console.log(`Loaded JSON data: ${jsonData.patients.length} patients, ${jsonData.scans?.length || 0} scans, ${jsonData.notifications?.length || 0} notifications\n`);

    // Step 2: Sync database schema (creates tables if they don't exist)
    console.log('Syncing database schema...');
    await sequelize.sync({ alter: true });  // Use { force: true } to drop and recreate tables
    console.log('Schema sync complete.\n');

    // Step 3: Run migrations
    const patientStats = await migratePatients(jsonData);
    const scanStats = await migrateScans(jsonData);
    const notifStats = await migrateNotifications(jsonData);

    // Summary
    console.log('\n=================================');
    console.log('Migration Summary');
    console.log('=================================');
    console.log(`Patients: ${patientStats.successCount} migrated, ${patientStats.errorCount} errors`);
    console.log(`Scans: ${scanStats.successCount} migrated, ${scanStats.errorCount} errors`);
    console.log(`Notifications: ${notifStats.successCount} migrated, ${notifStats.errorCount} errors`);
    console.log('=================================\n');

    // Step 4: Verify migration
    console.log('Verifying migration...');
    const patientCount = await Patient.count();
    const scanCount = await Scan.count();
    const notifCount = await Notification.count();
    console.log(`PostgreSQL counts: ${patientCount} patients, ${scanCount} scans, ${notifCount} notifications\n`);

    console.log('Migration complete!');
    process.exit(0);

  } catch (error) {
    console.error('\nMigration failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
```

## Environment Configuration

### .env Configuration for PostgreSQL

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kalinga_ai
DB_USER=postgres
DB_PASSWORD=your_password_here

# Application Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Phase 2: Encryption Keys (future)
ENCRYPTION_KEY=your_encryption_key_here
ENCRYPTION_ALGORITHM=aes-256-gcm
```


## Package Dependencies

### Update server/package.json

```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "joi": "^18.2.3",
    "pg": "^8.11.3",
    "pg-hstore": "^2.3.4",
    "sequelize": "^6.35.2"
  },
  "devDependencies": {
    "nodemon": "^3.1.0",
    "sequelize-cli": "^6.6.2"
  },
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "migrate": "node src/scripts/migrateToPostgres.js",
    "db:create": "sequelize-cli db:create",
    "db:drop": "sequelize-cli db:drop",
    "db:migrate": "sequelize-cli db:migrate",
    "db:seed": "sequelize-cli db:seed:all"
  }
}
```

## Execution Plan

### Step 1: Install Dependencies (15 minutes)
```bash
cd server
npm install pg pg-hstore sequelize
npm install --save-dev sequelize-cli
```

### Step 2: Set Up PostgreSQL (30 minutes)
1. Install PostgreSQL locally or provision cloud instance (AWS RDS, Azure Database, etc.)
2. Create database: `createdb kalinga_ai`
3. Configure `.env` file with connection credentials
4. Test connection: `psql -U postgres -d kalinga_ai`

### Step 3: Implement Models (1-2 hours)
1. Create `server/src/config/database.js` with Sequelize configuration
2. Create model files in `server/src/models/`:
   - `Patient.js`
   - `Scan.js`
   - `Frame.js`
   - `Notification.js`
3. Create `server/src/models/index.js` to initialize models and associations
4. Test model creation: `node -e "require('./src/models').sequelize.sync()"`


### Step 4: Create Migration Script (1-2 hours)
1. Create `server/src/scripts/migrateToPostgres.js` with data import logic
2. Add field mapping logic for JSON → PostgreSQL transformation
3. Add error handling and logging
4. Add data validation before insertion

### Step 5: Test Migration on Dev Environment (1 hour)
1. Create test database: `createdb kalinga_ai_test`
2. Run migration script: `npm run migrate`
3. Verify data integrity:
   ```sql
   SELECT COUNT(*) FROM patients;
   SELECT COUNT(*) FROM scans;
   SELECT COUNT(*) FROM notifications;
   SELECT * FROM patients LIMIT 5;
   ```
4. Test foreign key relationships:
   ```sql
   SELECT p.first_name, p.last_name, COUNT(s.id) AS scan_count
   FROM patients p
   LEFT JOIN scans s ON p.id = s.patient_id
   GROUP BY p.id;
   ```

### Step 6: Update API Routes (2-3 hours)
Update existing route handlers to use Sequelize instead of JSON database:

**Before (JSON DB)**:
```javascript
const db = require('../db');
const patients = await db.getPatients();
```

**After (Sequelize)**:
```javascript
const { Patient } = require('../models');
const patients = await Patient.findAll({
  order: [['createdAt', 'DESC']]
});
```

### Step 7: Implement Dual-Write Mode (Optional, 1-2 hours)
For gradual migration, write to both databases temporarily:

```javascript
// Save to both JSON and PostgreSQL
await db.savePatient(patient);  // JSON
await Patient.create(patient);  // PostgreSQL
```

### Step 8: Testing and Validation (2-3 hours)
1. Run all existing integration tests
2. Verify API endpoint responses match previous format
3. Test performance with realistic data volume
4. Load test with concurrent requests


### Step 9: Production Migration (2-4 hours)
1. **Backup**: Create full backup of JSON database
2. **Maintenance Window**: Schedule downtime or enable read-only mode
3. **Run Migration**: Execute migration script on production data
4. **Verification**: Validate all data migrated correctly
5. **Switch**: Update application to use PostgreSQL
6. **Monitor**: Watch for errors and performance issues
7. **Rollback Plan**: Keep JSON database accessible for 48 hours

### Step 10: Cleanup (1 hour)
1. Remove JSON database module code
2. Archive JSON database files
3. Update documentation
4. Remove dual-write logic (if implemented)

## Performance Considerations

### Indexing Strategy

**Critical Indexes** (implement immediately):
- `patients(id)` - Primary key, automatic
- `patients(philhealth_id)` - Unique lookups
- `patients(status)` - Filter by status
- `scans(patient_id)` - Foreign key joins
- `scans(status)` - Filter pending/reviewed
- `notifications(is_read, created_at)` - Unread notification queries

**Secondary Indexes** (add as needed):
- `patients(last_name, first_name)` - Name searches
- `patients(created_at)` - Chronological queries
- `scans(risk_level)` - Filter by severity
- `scans(created_at)` - Recent scans

### Query Optimization

**Use Eager Loading** for related data:
```javascript
// Bad: N+1 query problem
const patients = await Patient.findAll();
for (const patient of patients) {
  const scans = await Scan.findAll({ where: { patientId: patient.id }});
}

// Good: Single query with JOIN
const patients = await Patient.findAll({
  include: [{
    model: Scan,
    as: 'scans'
  }]
});
```

**Use Pagination** for large result sets:
```javascript
const patients = await Patient.findAll({
  limit: 20,
  offset: pageNumber * 20,
  order: [['createdAt', 'DESC']]
});
```


**Use Projections** to fetch only needed columns:
```javascript
const patients = await Patient.findAll({
  attributes: ['id', 'firstName', 'lastName', 'status']
});
```

### Connection Pool Tuning

- **Development**: 5-10 connections sufficient
- **Production**: 20-50 connections depending on load
- **Monitor**: Track active connections and adjust pool size
- **Timeout**: Set appropriate acquire timeout (30 seconds default)

### Backup Strategy

**Automated Daily Backups**:
```bash
# Add to crontab
0 2 * * * pg_dump -U postgres kalinga_ai > /backups/kalinga_ai_$(date +\%Y\%m\%d).sql
```

**Retention Policy**:
- Daily backups: 7 days
- Weekly backups: 4 weeks
- Monthly backups: 12 months

**Point-in-Time Recovery** (PITR):
- Enable WAL archiving for continuous backup
- Allows recovery to any point in time

## Rollback Plan

### Immediate Rollback (< 1 hour after migration)
1. Stop application server
2. Revert code to use JSON database
3. Verify JSON database integrity
4. Restart application
5. Monitor for issues

### Extended Rollback (> 1 hour, < 48 hours)
1. Export data from PostgreSQL to JSON format
2. Verify exported data matches expected format
3. Replace production JSON database
4. Revert application code
5. Restart and verify

### Data Recovery Script

```javascript
// server/src/scripts/exportFromPostgres.js
async function exportToJSON() {
  const patients = await Patient.findAll({ raw: true });
  const scans = await Scan.findAll({ raw: true });
  const notifications = await Notification.findAll({ raw: true });
  
  // Transform back to JSON format
  const jsonData = {
    patients: patients.map(transformPatientToJSON),
    scans: scans.map(transformScanToJSON),
    notifications: notifications.map(transformNotificationToJSON)
  };
  
  await fs.writeFile(
    'data/db_recovered.json',
    JSON.stringify(jsonData, null, 2)
  );
}
```


## Testing Checklist

### Pre-Migration Testing
- [ ] PostgreSQL instance accessible and credentials correct
- [ ] Sequelize models create tables without errors
- [ ] Migration script runs without errors on test database
- [ ] All foreign key relationships correctly established
- [ ] Data integrity constraints working (check constraints, NOT NULL, etc.)
- [ ] Indexes created successfully
- [ ] Sample queries return expected results

### Migration Testing
- [ ] Patient count matches: JSON vs PostgreSQL
- [ ] Scan count matches
- [ ] Notification count matches
- [ ] Random sampling: 10 patients data matches between JSON and PostgreSQL
- [ ] Special characters handled correctly (accents, apostrophes)
- [ ] NULL values preserved correctly
- [ ] Boolean risk factors mapped correctly
- [ ] Dates parsed and stored correctly (timezone considerations)
- [ ] JSON metadata fields stored correctly

### API Testing
- [ ] GET /api/patients returns all patients
- [ ] GET /api/patients/:id returns single patient
- [ ] POST /api/patients creates new patient
- [ ] GET /api/scans returns all scans with status filter
- [ ] POST /api/scans creates new scan
- [ ] PATCH /api/scans/:id/verify updates scan
- [ ] GET /api/notifications returns notifications
- [ ] PATCH /api/notifications/:id/read marks as read
- [ ] Response format matches previous JSON DB responses
- [ ] Error handling works correctly (404, 422, 500)

### Performance Testing
- [ ] Query response times < 100ms for simple queries
- [ ] Query response times < 500ms for complex joins
- [ ] Pagination works correctly for large datasets
- [ ] Concurrent writes handle correctly (no deadlocks)
- [ ] Connection pool doesn't exhaust under load
- [ ] Memory usage stable under sustained load

### Post-Migration Verification
- [ ] All application features work as before
- [ ] No data loss detected
- [ ] Foreign key constraints not violated
- [ ] Client application functions normally
- [ ] Specialist dashboard functions normally
- [ ] Notifications delivered correctly
- [ ] No errors in application logs
- [ ] No errors in PostgreSQL logs


## Common Migration Issues and Solutions

### Issue 1: Data Type Mismatches

**Problem**: JSON stores "31.2" as string, PostgreSQL expects DECIMAL
**Solution**:
```javascript
bmi: patient.bmi ? parseFloat(patient.bmi) : null
```

### Issue 2: Date Parsing Errors

**Problem**: Inconsistent date formats ("June 21, 2026 5:49 PM" vs ISO format)
**Solution**:
```javascript
createdAt: patient.timestamp ? new Date(patient.timestamp) : new Date()
```

### Issue 3: Nested Object Flattening

**Problem**: `riskFactors` object needs to be flattened to individual columns
**Solution**:
```javascript
chronicHypertension: patient.riskFactors?.hypertension || false,
familyHistoryPreeclampsia: patient.riskFactors?.family || false
// ... etc
```

### Issue 4: Missing Foreign Key References

**Problem**: Scan references non-existent patient ID
**Solution**: Add validation before insert:
```javascript
const patientExists = await Patient.findByPk(scan.patientId);
if (!patientExists) {
  console.warn(`Skipping scan ${scan.id}: patient ${scan.patientId} not found`);
  continue;
}
```

### Issue 5: Unicode Character Encoding

**Problem**: Special characters (ñ, é, etc.) not displaying correctly
**Solution**: Ensure PostgreSQL database uses UTF-8 encoding:
```sql
CREATE DATABASE kalinga_ai
  ENCODING 'UTF8'
  LC_COLLATE 'en_US.UTF-8'
  LC_CTYPE 'en_US.UTF-8';
```

### Issue 6: Transaction Timeouts

**Problem**: Large migration takes too long and times out
**Solution**: Batch insertions:
```javascript
const BATCH_SIZE = 100;
for (let i = 0; i < patients.length; i += BATCH_SIZE) {
  const batch = patients.slice(i, i + BATCH_SIZE);
  await Patient.bulkCreate(batch);
  console.log(`Migrated ${Math.min(i + BATCH_SIZE, patients.length)} patients`);
}
```


## Security Considerations

### Connection Security
- Use SSL/TLS for database connections in production
- Configure in Sequelize:
  ```javascript
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false  // Set to true with proper CA certificate
    }
  }
  ```

### Credential Management
- Never commit database passwords to version control
- Use environment variables or secret management service
- Rotate credentials periodically
- Use principle of least privilege for database user accounts

### Data Encryption at Rest (Phase 2)
- Enable PostgreSQL encryption at rest
- For AWS RDS: Enable encryption when creating instance
- For self-hosted: Use encrypted volumes (LUKS, BitLocker)

### Audit Logging
- Enable PostgreSQL audit logging for security events
- Log all schema changes, connection attempts, permission changes
- Monitor logs for suspicious activity

### Backup Security
- Encrypt backup files before storage
- Store backups in separate location from primary database
- Test backup restoration regularly
- Implement access controls on backup storage

## Monitoring and Maintenance

### Key Metrics to Monitor
1. **Connection Pool**: Active, idle, waiting connections
2. **Query Performance**: Slow query log (> 1 second)
3. **Database Size**: Total size, table sizes, index sizes
4. **Transaction Rate**: Commits, rollbacks per second
5. **Cache Hit Ratio**: Should be > 95% for optimal performance
6. **Replication Lag**: If using replication (Phase 2+)

### Monitoring Tools
- **pgAdmin**: GUI for PostgreSQL management
- **pg_stat_statements**: Track query performance
- **Prometheus + Grafana**: Time-series metrics and dashboards
- **CloudWatch/Azure Monitor**: For managed database instances

### Regular Maintenance Tasks
```sql
-- Weekly: Analyze tables to update statistics
ANALYZE;

-- Monthly: Vacuum to reclaim space
VACUUM ANALYZE;

-- Quarterly: Reindex to rebuild indexes
REINDEX DATABASE kalinga_ai;
```


## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| **1. Preparation** |
| Install dependencies | 15 min | - |
| Set up PostgreSQL | 30 min | - |
| Implement models | 2 hours | PostgreSQL setup |
| Create migration script | 2 hours | Models |
| **2. Testing** |
| Test migration on dev | 1 hour | Migration script |
| Update API routes | 3 hours | Models |
| Integration testing | 3 hours | Updated routes |
| **3. Production** |
| Production migration | 4 hours | All testing complete |
| Cleanup and docs | 1 hour | Migration complete |
| **Total** | **16-17 hours** | |

**Recommended Schedule**:
- **Week 1**: Preparation and model implementation
- **Week 2**: Migration script and testing
- **Week 3**: API updates and integration testing
- **Week 4**: Production migration (schedule during low-traffic period)

## Success Criteria

Migration is considered successful when:

1. ✅ **Data Integrity**: All records migrated with no data loss
2. ✅ **Functionality**: All API endpoints work as before
3. ✅ **Performance**: Query response times meet SLA (< 500ms)
4. ✅ **Relationships**: All foreign keys correctly established
5. ✅ **Constraints**: Data validation constraints enforced
6. ✅ **Backward Compatibility**: Client applications work without changes
7. ✅ **Monitoring**: Metrics collection and alerting operational
8. ✅ **Documentation**: All documentation updated
9. ✅ **Rollback Tested**: Rollback procedure validated
10. ✅ **Stakeholder Approval**: Sign-off from technical lead

## Next Steps After Migration

1. **Implement Connection Pooling Optimization**: Fine-tune pool settings based on production load
2. **Add Query Performance Monitoring**: Set up slow query logging and alerting
3. **Implement Read Replicas** (Phase 2+): For high availability and load distribution
4. **Set Up Automated Backups**: Configure daily backups with retention policy
5. **Enable Point-in-Time Recovery**: Configure WAL archiving
6. **Implement Database Monitoring**: Set up Prometheus/Grafana dashboards
7. **Optimize Indexes**: Add indexes based on actual query patterns
8. **Implement Caching Layer** (Phase 2+): Redis for frequently accessed data
9. **Set Up Replication** (Phase 2+): For disaster recovery
10. **Plan for Scaling**: Sharding strategy for Phase 3+ if needed

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-XX  
**Author**: Kalinga AI Development Team  
**Status**: Ready for Implementation
