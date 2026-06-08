import { getPendingSyncPackets, getPatient, updateSyncStatus, getAllPatients, savePatient, type Patient } from './db.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function syncOfflineData() {
  const token = localStorage.getItem('kalinga_auth_token') || 'mock-jwt-token';
  
  // 1. Gather all local patients with pending sync status
  try {
    const allLocalPatients = await getAllPatients();
    const pendingPatients = allLocalPatients.filter(p => p.syncStatus === 'pending');
    
    if (pendingPatients.length > 0) {
      const patientRes = await fetch(`${API_URL}/api/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(pendingPatients),
      });
      if (patientRes.ok) {
        for (const p of pendingPatients) {
          p.syncStatus = 'synced';
          await savePatient(p);
        }
      }
    }
  } catch (err) {
    console.error('[Kalinga:Sync] Failed to sync pending patients:', err);
  }

  // 2. Fetch all registered patients from central Postgres database and save locally
  try {
    const fetchRes = await fetch(`${API_URL}/api/patients`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (fetchRes.ok) {
      const dbPatients = await fetchRes.json();
      for (const dbPatient of dbPatients) {
        const patient: Patient = {
          id: dbPatient.id,
          fullName: dbPatient.full_name,
          philhealthId: dbPatient.philhealth_id,
          age: dbPatient.age,
          lmp: dbPatient.lmp,
          estimatedDueDate: dbPatient.estimated_due_date,
          gravida: dbPatient.gravida,
          para: dbPatient.para,
          riskFactors: dbPatient.risk_factors || [],
          barangay: dbPatient.barangay,
          municipality: dbPatient.municipality || 'Saint Bernard',
          province: dbPatient.province || 'Southern Leyte',
          contactNumber: dbPatient.contact_number,
          createdAt: dbPatient.created_at,
          syncStatus: 'synced',
        };
        await savePatient(patient);
      }
    }
  } catch (err) {
    console.error('[Kalinga:Sync] Failed to fetch remote patients:', err);
  }

  // 3. Gather pending triage packets
  const pendingPackets = await getPendingSyncPackets();
  
  if (pendingPackets.length === 0) {
    return { syncedCount: 0, error: null };
  }

  // Gather unique patient references for pending packets
  const patientIds = Array.from(new Set(pendingPackets.map(p => p.patientId)));
  const patientsToSync: Patient[] = [];
  for (const pid of patientIds) {
    const patient = await getPatient(pid);
    if (patient) {
      patientsToSync.push(patient);
    }
  }

  try {
    // Ensure all referenced patients are synced first
    if (patientsToSync.length > 0) {
      const patientRes = await fetch(`${API_URL}/api/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(patientsToSync),
      });
      if (!patientRes.ok) {
        throw new Error(`Patient reference sync failed with status ${patientRes.status}`);
      }
      for (const p of patientsToSync) {
        if (p.syncStatus !== 'synced') {
          p.syncStatus = 'synced';
          await savePatient(p);
        }
      }
    }

    // 4. Sync triage packets
    const payload = pendingPackets.map(packet => ({
      id: packet.id,
      patientId: packet.patientId,
      systolicBP: packet.systolicBP,
      diastolicBP: packet.diastolicBP,
      heartRate: packet.heartRate,
      gestationalAgeWeeks: packet.gestationalAgeWeeks,
      bmi: packet.bmi,
      proteinUrine: packet.proteinUrine,
      symptoms: packet.symptoms,
      frameBase64: packet.frameBase64,
      frameThumbnailB64: packet.frameThumbnailB64,
      aiPrediction: packet.aiPrediction,
      aiInferenceTimeMs: packet.aiInferenceTimeMs,
      riskScore: packet.riskScore,
      triageLevel: packet.triageLevel,
      clientCapturedAt: packet.clientCapturedAt,
      barangayStation: packet.barangayStation,
      gpsLatitude: packet.gpsLatitude,
      gpsLongitude: packet.gpsLongitude,
    }));

    // Mark packets as syncing
    for (const packet of pendingPackets) {
      await updateSyncStatus(packet.id, 'syncing');
    }

    const triageRes = await fetch(`${API_URL}/api/triage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!triageRes.ok) {
      throw new Error(`Triage sync failed with status ${triageRes.status}`);
    }

    const syncResult = await triageRes.json();

    // Mark successfully synced packets
    for (const id of syncResult.syncedIds || []) {
      await updateSyncStatus(id, 'synced');
    }

    // Mark errored packets
    for (const err of syncResult.errors || []) {
      await updateSyncStatus(err.id, 'error', err.error);
    }

    return {
      syncedCount: syncResult.synced || 0,
      error: syncResult.errors && syncResult.errors.length > 0 ? 'Some records failed validation' : null,
    };
  } catch (err) {
    console.error('[Kalinga:Sync] Core sync failed:', err);
    for (const packet of pendingPackets) {
      await updateSyncStatus(packet.id, 'pending', err instanceof Error ? err.message : 'Network failure');
    }
    return {
      syncedCount: 0,
      error: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}
