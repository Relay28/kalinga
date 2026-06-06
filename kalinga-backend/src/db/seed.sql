-- db/seed.sql

-- Clear existing data
TRUNCATE TABLE sync_events CASCADE;
TRUNCATE TABLE triage_packets CASCADE;
TRUNCATE TABLE patients CASCADE;
TRUNCATE TABLE users CASCADE;

-- Insert Seed Users
-- Hashed password is for 'password123' using bcrypt ($2b$10$N9qo8uLOqp.9Wy.S5X7oMe1q3Sg9OplqfV7Zc8gB3kLh5tSvy.7v2)
INSERT INTO users (id, email, password_hash, full_name, role, license_number, barangay, specialization)
VALUES
  (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'midwife@kalinga.gov.ph',
    '$2b$10$N9qo8uLOqp.9Wy.S5X7oMe1q3Sg9OplqfV7Zc8gB3kLh5tSvy.7v2',
    'Juana Dela Cruz, RM',
    'midwife',
    'RM-1029384',
    'Barangay Guinsaugon',
    NULL
  ),
  (
    'f6e5d4c3-b2a1-0f9e-8d7c-6b5a4f3e2d1c',
    'obgyn@kalinga.gov.ph',
    '$2b$10$N9qo8uLOqp.9Wy.S5X7oMe1q3Sg9OplqfV7Zc8gB3kLh5tSvy.7v2',
    'Dr. Evelyn Santos, MD, FPOGS',
    'obgyn',
    'MD-506070',
    NULL,
    'Maternal and Fetal Medicine'
  );

-- Insert Seed Patients
INSERT INTO patients (id, midwife_id, full_name, philhealth_id, age, lmp, estimated_due_date, gravida, para, risk_factors, barangay, municipality, province, contact_number)
VALUES
  (
    '11111111-2222-3333-4444-555555555555',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Maria Clara Salcedo',
    '01-025346789-3',
    28,
    '2025-10-15',
    '2026-07-22',
    2,
    1,
    ARRAY['chronic_hypertension'],
    'Guinsaugon',
    'Saint Bernard',
    'Southern Leyte',
    '+639171234567'
  ),
  (
    '22222222-3333-4444-5555-666666666666',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Ana Patricia Perez',
    '12-054637281-5',
    32,
    '2025-09-05',
    '2026-06-12',
    3,
    2,
    ARRAY['gestational_diabetes'],
    'Guinsaugon',
    'Saint Bernard',
    'Southern Leyte',
    '+639187654321'
  ),
  (
    '33333333-4444-5555-6666-777777777777',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Joy Montefalco',
    '09-087654321-2',
    24,
    '2025-11-01',
    '2026-08-08',
    1,
    0,
    ARRAY[]::TEXT[],
    'Catmon',
    'Saint Bernard',
    'Southern Leyte',
    '+639191112222'
  );

-- Insert Seed Triage Packets (Simulating scanned packets pending review)
INSERT INTO triage_packets (
    id, patient_id, midwife_id,
    systolic_bp, diastolic_bp, heart_rate,
    gestational_age_weeks, bmi, protein_urine, symptoms,
    frame_base64, frame_thumbnail_b64,
    ai_prediction_normal, ai_prediction_abnormal, ai_prediction_inconcl,
    ai_inference_time_ms, risk_score, triage_level,
    specialist_id, specialist_verdict, specialist_notes, specialist_recommendations, override_risk_score, reviewed_at,
    client_captured_at, synced_at, barangay_station, gps_latitude, gps_longitude
) VALUES
  (
    '99999999-8888-7777-6666-555555555555',
    '11111111-2222-3333-4444-555555555555',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    158, 102, 88,
    28.5, 26.5, '+3', ARRAY['headache', 'edema'],
    NULL, NULL, -- No base64 data for seed speed
    0.10, 0.85, 0.05,
    42, 92, 'HIGH',
    NULL, 'pending', NULL, NULL, NULL, NULL,
    NOW() - INTERVAL '2 hours', NOW(), 'Barangay Guinsaugon BHS', 10.1172, 125.0411
  ),
  (
    '88888888-7777-6666-5555-444444444444',
    '22222222-3333-4444-5555-666666666666',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    142, 91, 80,
    32.1, 24.2, '+1', ARRAY['edema'],
    NULL, NULL,
    0.25, 0.65, 0.10,
    38, 71, 'HIGH',
    NULL, 'pending', NULL, NULL, NULL, NULL,
    NOW() - INTERVAL '3 hours', NOW(), 'Barangay Guinsaugon BHS', 10.1172, 125.0411
  ),
  (
    '77777777-6666-5555-4444-333333333333',
    '33333333-4444-5555-6666-777777777777',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    125, 82, 75,
    24.0, 21.8, 'negative', ARRAY[]::TEXT[],
    NULL, NULL,
    0.80, 0.10, 0.10,
    40, 22, 'LOW',
    'f6e5d4c3-b2a1-0f9e-8d7c-6b5a4f3e2d1c', 'confirmed', 'Normal clinical parameters matching ultrasound sweeps.', 'Recommended routine follow-up as scheduled.', NULL, NOW(),
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours', 'Barangay Catmon BHS', 10.1256, 125.0505
  );
