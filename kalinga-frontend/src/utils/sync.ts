import { getPendingSyncPackets, getPatient, updateSyncStatus } from './db.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function syncOfflineData() {
  const token = localStorage.getItem('kalinga_auth_token') || 'mock-jwt-token';
  const pendingPackets = await getPendingSyncPackets();
  
  if (pendingPackets.length === 0) {
    return { syncedCount: 0, error: null };
  }

  // 1. Gather all unique patients that need syncing
  const patientIds = Array.from(new Set(pendingPackets.map(p => p.patientId)));
  const patientsToSync = [];
  for (const pid of patientIds) {
    const patient = await getPatient(pid);
    if (patient) {
      patientsToSync.push(patient);
    }
  }

  try {
    // 2. Sync patients first (satisfies foreign key constraints)
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
        throw new Error(`Patient sync failed with status ${patientRes.status}`);
      }
    }

    // 3. Sync triage packets
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
    // Restore syncing state to pending (with error details) for retry
    for (const packet of pendingPackets) {
      await updateSyncStatus(packet.id, 'pending', err instanceof Error ? err.message : 'Network failure');
    }
    return {
      syncedCount: 0,
      error: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}
