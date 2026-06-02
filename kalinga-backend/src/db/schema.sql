-- db/schema.sql

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users (midwives + OB-GYN specialists)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('midwife', 'obgyn', 'admin')),
    license_number  VARCHAR(50),
    barangay        VARCHAR(255),               -- For midwives: assigned health station
    specialization  VARCHAR(255),               -- For OB-GYNs: sub-specialty
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- TABLE: patients
-- ============================================
CREATE TABLE IF NOT EXISTS patients (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    midwife_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name           VARCHAR(255) NOT NULL,
    philhealth_id       VARCHAR(50),             -- PhilHealth ID for Konsulta mapping
    age                 INTEGER CHECK (age >= 12 AND age <= 60),
    lmp                 DATE,                   -- Last Menstrual Period
    estimated_due_date  DATE,
    gravida             INTEGER DEFAULT 1,
    para                INTEGER DEFAULT 0,
    risk_factors        TEXT[],                  -- Array: ['chronic_hypertension', 'diabetes', ...]
    barangay            VARCHAR(255),
    municipality        VARCHAR(255),
    province            VARCHAR(255),
    contact_number      VARCHAR(20),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_midwife ON patients(midwife_id);

-- ============================================
-- TABLE: triage_packets (core data entity)
-- ============================================
CREATE TABLE IF NOT EXISTS triage_packets (
    id                      UUID PRIMARY KEY,    -- Client-generated UUIDv4
    patient_id              UUID REFERENCES patients(id) ON DELETE CASCADE,
    midwife_id              UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Vitals
    systolic_bp             INTEGER NOT NULL,
    diastolic_bp            INTEGER NOT NULL,
    heart_rate              INTEGER,
    gestational_age_weeks   REAL NOT NULL,
    bmi                     REAL,                -- Maternal BMI
    protein_urine           VARCHAR(10) CHECK (protein_urine IN (
                                'negative', 'trace', '+1', '+2', '+3', '+4'
                            )),
    symptoms                TEXT[],              -- Array: ['edema', 'headache', ...]

    -- AI Analysis
    frame_base64            TEXT,                -- JPEG Base64 of captured US frame
    frame_thumbnail_b64     TEXT,                -- 128×128 preview thumbnail
    ai_prediction_normal    REAL,                -- Probability [0-1]
    ai_prediction_abnormal  REAL,
    ai_prediction_inconcl   REAL,
    ai_inference_time_ms    INTEGER,
    risk_score              INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    triage_level            VARCHAR(10) NOT NULL CHECK (triage_level IN (
                                'LOW', 'MODERATE', 'HIGH'
                            )),

    -- Specialist Verification
    specialist_id           UUID REFERENCES users(id) ON DELETE SET NULL,
    specialist_verdict      VARCHAR(20) CHECK (specialist_verdict IN (
                                'confirmed', 'escalated', 'overridden', 'pending'
                            )) DEFAULT 'pending',
    specialist_notes        TEXT,
    specialist_recommendations TEXT,              -- Specialist clinical recommendations
    override_risk_score     INTEGER CHECK (override_risk_score >= 0 AND override_risk_score <= 100),
    reviewed_at             TIMESTAMPTZ,

    -- Sync Metadata
    client_captured_at      TIMESTAMPTZ NOT NULL,
    synced_at               TIMESTAMPTZ DEFAULT NOW(),
    barangay_station        VARCHAR(255),
    gps_latitude            DOUBLE PRECISION,    -- Latitude for epidemiological mapping
    gps_longitude           DOUBLE PRECISION,    -- Longitude for epidemiological mapping

    -- Audit
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- High-priority: OB-GYN dashboard sorts by risk_score DESC
CREATE INDEX IF NOT EXISTS idx_triage_risk_score ON triage_packets(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_triage_verdict ON triage_packets(specialist_verdict);
CREATE INDEX IF NOT EXISTS idx_triage_level ON triage_packets(triage_level);
CREATE INDEX IF NOT EXISTS idx_triage_patient ON triage_packets(patient_id);
CREATE INDEX IF NOT EXISTS idx_triage_midwife ON triage_packets(midwife_id);
CREATE INDEX IF NOT EXISTS idx_triage_synced ON triage_packets(synced_at DESC);

-- ============================================
-- TABLE: sync_events (audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS sync_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    midwife_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    packets_synced  INTEGER NOT NULL,
    sync_source     VARCHAR(50),     -- 'background_sync' | 'manual' | 'periodic'
    device_info     JSONB,           -- User-Agent, screen size, etc.
    synced_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VIEW: verification_queue (OB-GYN dashboard)
-- ============================================
CREATE OR REPLACE VIEW verification_queue AS
SELECT
    tp.id,
    tp.risk_score,
    tp.triage_level,
    tp.systolic_bp,
    tp.diastolic_bp,
    tp.gestational_age_weeks,
    tp.protein_urine,
    tp.symptoms,
    tp.frame_thumbnail_b64,
    tp.ai_prediction_abnormal,
    tp.specialist_verdict,
    tp.client_captured_at,
    tp.synced_at,
    p.full_name AS patient_name,
    p.age AS patient_age,
    p.gravida,
    p.para,
    u.full_name AS midwife_name,
    u.barangay AS station
FROM triage_packets tp
JOIN patients p ON tp.patient_id = p.id
LEFT JOIN users u ON tp.midwife_id = u.id
WHERE tp.specialist_verdict = 'pending'
ORDER BY tp.risk_score DESC, tp.synced_at ASC;
