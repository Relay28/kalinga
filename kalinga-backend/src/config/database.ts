import { Pool } from '@neondatabase/serverless';
import { config } from './env.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Check if we are running in mock database mode
const isMock = config.DATABASE_URL.toLowerCase() === 'mock';

// Define the directory for mock database JSON files
const MOCK_DB_DIR = path.join(process.cwd(), 'data', 'mock_db');

// Helper to initialize and load mock data
function loadMockData<T>(filename: string, defaultData: T[] = []): T[] {
  if (!fs.existsSync(MOCK_DB_DIR)) {
    fs.mkdirSync(MOCK_DB_DIR, { recursive: true });
  }
  const filePath = path.join(MOCK_DB_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`[MockDB] Error reading ${filename}, resetting to empty:`, err);
    return defaultData;
  }
}

// Helper to save mock data
function saveMockData<T>(filename: string, data: T[]) {
  if (!fs.existsSync(MOCK_DB_DIR)) {
    fs.mkdirSync(MOCK_DB_DIR, { recursive: true });
  }
  const filePath = path.join(MOCK_DB_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// In-memory/file mock database implementation
class MockPool {
  on(event: string, callback: (...args: any[]) => void) {
    // No-op for mock pool events
  }

  async query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
    // Normalise SQL spacing
    const normalizedSql = sql.replace(/\s+/g, ' ').trim();
    
    // Load fresh data on each query to simulate database transaction consistency across requests
    const users = loadMockData<any>('users.json');
    const patients = loadMockData<any>('patients.json');
    const packets = loadMockData<any>('triage_packets.json');
    const syncEvents = loadMockData<any>('sync_events.json');

    // 1. SELECT id FROM users WHERE email = $1
    if (normalizedSql.includes('SELECT id FROM users WHERE email = $1')) {
      const email = params[0]?.toLowerCase();
      const user = users.find(u => u.email === email);
      return { rows: user ? [{ id: user.id }] : [] };
    }

    // 2. INSERT INTO users ... RETURNING id, email, full_name, role
    if (normalizedSql.includes('INSERT INTO users')) {
      const [email, password_hash, full_name, role, license_number, barangay, specialization] = params;
      const newUser = {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        password_hash,
        full_name,
        role,
        license_number: license_number || null,
        barangay: barangay || null,
        specialization: specialization || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      users.push(newUser);
      saveMockData('users.json', users);
      return { rows: [{ id: newUser.id, email: newUser.email, full_name: newUser.full_name, role: newUser.role }] };
    }

    // 3. SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1 AND is_active = true
    if (normalizedSql.includes('SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1')) {
      const email = params[0]?.toLowerCase();
      const user = users.find(u => u.email === email && u.is_active);
      return { rows: user ? [user] : [] };
    }

    // 4. SELECT id, email, full_name, role... FROM users WHERE id = $1
    if (normalizedSql.includes('FROM users WHERE id = $1')) {
      const id = params[0];
      const user = users.find(u => u.id === id);
      return { rows: user ? [user] : [] };
    }

    // 5. INSERT INTO patients ... ON CONFLICT (id) DO UPDATE SET
    if (normalizedSql.includes('INSERT INTO patients')) {
      const [
        id, midwife_id, full_name, philhealth_id, age, lmp, estimated_due_date,
        gravida, para, risk_factors, barangay, municipality, province, contact_number
      ] = params;

      const existingIndex = patients.findIndex(p => p.id === id);
      const patientData = {
        id,
        midwife_id,
        full_name,
        philhealth_id: philhealth_id || null,
        age,
        lmp: lmp || null,
        estimated_due_date: estimated_due_date || null,
        gravida,
        para,
        risk_factors: risk_factors || [],
        barangay: barangay || null,
        municipality: municipality || null,
        province: province || null,
        contact_number: contact_number || null,
        created_at: existingIndex >= 0 ? patients[existingIndex].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        patients[existingIndex] = patientData;
      } else {
        patients.push(patientData);
      }
      saveMockData('patients.json', patients);
      return { rows: [patientData] };
    }

    // 6. SELECT * FROM patients WHERE midwife_id = $1 ORDER BY full_name ASC
    if (normalizedSql.includes('FROM patients WHERE midwife_id = $1')) {
      const midwifeId = params[0];
      const midwifePatients = patients
        .filter(p => p.midwife_id === midwifeId)
        .sort((a, b) => a.full_name.localeCompare(b.full_name));
      return { rows: midwifePatients };
    }

    // 7. SELECT * FROM patients WHERE id = $1
    if (normalizedSql.includes('FROM patients WHERE id = $1') || normalizedSql.includes('SELECT id FROM patients WHERE id = $1')) {
      const id = params[0];
      const patient = patients.find(p => p.id === id);
      return { rows: patient ? [patient] : [] };
    }

    // 8. INSERT INTO triage_packets
    if (normalizedSql.includes('INSERT INTO triage_packets')) {
      const [
        id, patient_id, midwife_id,
        systolic_bp, diastolic_bp, heart_rate,
        gestational_age_weeks, bmi, protein_urine, symptoms,
        frame_base64, frame_thumbnail_b64,
        ai_prediction_normal, ai_prediction_abnormal, ai_prediction_inconcl,
        ai_inference_time_ms, risk_score, triage_level,
        client_captured_at, barangay_station, gps_latitude, gps_longitude
      ] = params;

      const existingIndex = packets.findIndex(p => p.id === id);
      const packetData = {
        id,
        patient_id,
        midwife_id,
        systolic_bp,
        diastolic_bp,
        heart_rate: heart_rate || null,
        gestational_age_weeks,
        bmi: bmi || null,
        protein_urine,
        symptoms: symptoms || [],
        frame_base64: frame_base64 || null,
        frame_thumbnail_b64: frame_thumbnail_b64 || null,
        ai_prediction_normal,
        ai_prediction_abnormal,
        ai_prediction_inconcl,
        ai_inference_time_ms,
        risk_score,
        triage_level,
        specialist_id: existingIndex >= 0 ? packets[existingIndex].specialist_id : null,
        specialist_verdict: existingIndex >= 0 ? packets[existingIndex].specialist_verdict : 'pending',
        specialist_notes: existingIndex >= 0 ? packets[existingIndex].specialist_notes : null,
        specialist_recommendations: existingIndex >= 0 ? packets[existingIndex].specialist_recommendations : null,
        override_risk_score: existingIndex >= 0 ? packets[existingIndex].override_risk_score : null,
        reviewed_at: existingIndex >= 0 ? packets[existingIndex].reviewed_at : null,
        client_captured_at,
        synced_at: new Date().toISOString(),
        barangay_station: barangay_station || null,
        gps_latitude: gps_latitude || null,
        gps_longitude: gps_longitude || null,
        created_at: existingIndex >= 0 ? packets[existingIndex].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        packets[existingIndex] = packetData;
      } else {
        packets.push(packetData);
      }
      saveMockData('triage_packets.json', packets);
      return { rows: [packetData] };
    }

    // 9. INSERT INTO sync_events
    if (normalizedSql.includes('INSERT INTO sync_events')) {
      const [midwife_id, packets_synced, sync_source, device_info] = params;
      const newEvent = {
        id: crypto.randomUUID(),
        midwife_id,
        packets_synced,
        sync_source,
        device_info: typeof device_info === 'string' ? JSON.parse(device_info) : device_info,
        synced_at: new Date().toISOString()
      };
      syncEvents.push(newEvent);
      saveMockData('sync_events.json', syncEvents);
      return { rows: [newEvent] };
    }

    // 10. COUNT FILTER stats for dashboard
    if (normalizedSql.includes('COUNT(*) FILTER')) {
      const pendingCount = packets.filter(p => p.specialist_verdict === 'pending').length;
      const criticalCount = packets.filter(p => p.triage_level === 'HIGH' && p.specialist_verdict === 'pending').length;
      const reviewedCount = packets.filter(p => p.specialist_verdict !== 'pending').length;
      const totalCount = packets.length;
      return {
        rows: [{
          pending: pendingCount,
          critical: criticalCount,
          reviewed: reviewedCount,
          total: totalCount
        }]
      };
    }

    // 11. OB-GYN verification queue (prioritised list)
    if (normalizedSql.includes('tp.specialist_verdict = $3') || normalizedSql.includes('WHERE tp.specialist_verdict = $3') || normalizedSql.includes('WHERE specialist_verdict = $1')) {
      const targetVerdict = params[2] || params[0] || 'pending';
      const filteredPackets = packets.filter(p => p.specialist_verdict === targetVerdict);

      const rows = filteredPackets.map(tp => {
        const patient = patients.find(p => p.id === tp.patient_id) || {};
        const midwife = users.find(u => u.id === tp.midwife_id) || {};
        return {
          id: tp.id,
          risk_score: tp.risk_score,
          triage_level: tp.triage_level,
          systolic_bp: tp.systolic_bp,
          diastolic_bp: tp.diastolic_bp,
          gestational_age_weeks: tp.gestational_age_weeks,
          protein_urine: tp.protein_urine,
          symptoms: tp.symptoms,
          frame_thumbnail_b64: tp.frame_thumbnail_b64,
          ai_prediction_abnormal: tp.ai_prediction_abnormal,
          specialist_verdict: tp.specialist_verdict,
          client_captured_at: tp.client_captured_at,
          synced_at: tp.synced_at,
          patient_name: patient.full_name || 'Unknown Patient',
          patient_age: patient.age || 0,
          gravida: patient.gravida || 1,
          para: patient.para || 0,
          midwife_name: midwife.full_name || 'BHW Midwife',
          station: tp.barangay_station || midwife.barangay || 'BHS Station'
        };
      });

      // Sort by risk_score DESC, synced_at ASC
      rows.sort((a, b) => b.risk_score - a.risk_score || new Date(a.synced_at).getTime() - new Date(b.synced_at).getTime());

      // Apply limit and offset if specified
      const limit = params[0] || 20;
      const offset = params[1] || 0;
      const paginatedRows = rows.slice(offset, offset + limit);

      return { rows: paginatedRows };
    }

    // 12. GET /api/triage/:id — Retrieve detailed triage packet
    if (normalizedSql.includes('FROM triage_packets tp') && normalizedSql.includes('WHERE tp.id = $1')) {
      const id = params[0];
      const tp = packets.find(p => p.id === id);
      if (!tp) return { rows: [] };
      const patient = patients.find(p => p.id === tp.patient_id) || {};
      return {
        rows: [{
          ...tp,
          patient_name: patient.full_name || 'Unknown Patient',
          patient_age: patient.age || 0,
          gravida: patient.gravida || 1,
          para: patient.para || 0
        }]
      };
    }

    // 13. UPDATE triage_packets VERDICT
    if (normalizedSql.includes('UPDATE triage_packets SET specialist_id = $1')) {
      const [specialist_id, specialist_verdict, specialist_notes, specialist_recommendations, override_risk_score, id] = params;
      const index = packets.findIndex(p => p.id === id);
      if (index >= 0) {
        packets[index].specialist_id = specialist_id;
        packets[index].specialist_verdict = specialist_verdict;
        packets[index].specialist_notes = specialist_notes;
        packets[index].specialist_recommendations = specialist_recommendations;
        packets[index].override_risk_score = override_risk_score !== undefined ? override_risk_score : null;
        packets[index].reviewed_at = new Date().toISOString();
        packets[index].updated_at = new Date().toISOString();
        
        saveMockData('triage_packets.json', packets);
        return {
          rows: [{
            id: packets[index].id,
            specialist_verdict: packets[index].specialist_verdict,
            risk_score: packets[index].risk_score,
            override_risk_score: packets[index].override_risk_score
          }]
        };
      }
      return { rows: [] };
    }

    // 14. GET /api/triage/:id/report — Retrieve diagnostic report details
    if (normalizedSql.includes('tp.id AS triage_id') && normalizedSql.includes('WHERE tp.id = $1')) {
      const id = params[0];
      const tp = packets.find(p => p.id === id);
      if (!tp) return { rows: [] };
      
      const patient = patients.find(p => p.id === tp.patient_id) || {};
      const midwife = users.find(u => u.id === tp.midwife_id) || {};
      const doctor = users.find(u => u.id === tp.specialist_id) || {};

      return {
        rows: [{
          triage_id: tp.id,
          systolic_bp: tp.systolic_bp,
          diastolic_bp: tp.diastolic_bp,
          heart_rate: tp.heart_rate,
          gestational_age_weeks: tp.gestational_age_weeks,
          bmi: tp.bmi,
          protein_urine: tp.protein_urine,
          symptoms: tp.symptoms,
          risk_score: tp.risk_score,
          triage_level: tp.triage_level,
          specialist_verdict: tp.specialist_verdict,
          specialist_notes: tp.specialist_notes,
          specialist_recommendations: tp.specialist_recommendations,
          override_risk_score: tp.override_risk_score,
          reviewed_at: tp.reviewed_at,
          client_captured_at: tp.client_captured_at,
          barangay_station: tp.barangay_station,
          gps_latitude: tp.gps_latitude,
          gps_longitude: tp.gps_longitude,
          patient_name: patient.full_name || 'Unknown Patient',
          patient_age: patient.age || 0,
          patient_lmp: patient.lmp || null,
          patient_edd: patient.estimated_due_date || null,
          gravida: patient.gravida || 1,
          para: patient.para || 0,
          risk_factors: patient.risk_factors || [],
          midwife_name: midwife.full_name || 'BHW Midwife',
          specialist_name: doctor.full_name || 'OB-GYN Consultant',
          specialist_license: doctor.license_number || 'N/A'
        }]
      };
    }

    // Default fallback (returns empty rows)
    console.warn(`[MockDB] Unhandled SQL query: "${normalizedSql}"`);
    return { rows: [] };
  }
}

// Export the mock pool if isMock, otherwise export Neon serverless pool
export const pool = isMock
  ? (new MockPool() as unknown as Pool)
  : new Pool({
      connectionString: config.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

if (isMock) {
  console.log('🔌 [Kalinga:DB] Operating in Local Mock Database mode (JSON-based files).');
} else {
  // Real database connection error listener
  pool.on('error', (err) => {
    console.error('[Kalinga:DB] Unexpected error on idle client:', err);
  });
}
